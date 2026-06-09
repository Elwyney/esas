// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { searchDocuments, signDocument } from './services/api.js';
import { auth } from '../shared/auth.js';
import { setCookies } from '../shared/http.js';
import { MONTHS } from '../shared/date.js';
import { USERNAME, PASSWORD, CERT_ID } from '../shared/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, 'logger.json');
const logger = []

function saveLogs() {
  const sum = logger.reduce((acc, item) => {
    acc.успешные += Number(item.ok ?? item.успешные ?? 0);
    acc.пропущено += Number(item.fail ?? item.пропущено ?? 0);
    acc.количество += Number(item.total ?? item.количество ?? 0);
    return acc;
  }, { успешные: 0, пропущено: 0, количество: 0 });

  fs.writeFileSync(LOG_PATH, JSON.stringify({
    sum,
    дата: new Date().toISOString(),
  }, null, 2));
}

async function main() {
  console.log("\x1b[91m%s\x1b[0m", `Авторизация...`);
  const cookie = await auth(USERNAME, PASSWORD);
  console.log("\x1b[96m%s\x1b[0m", `Авторизация успешна`);
  console.log("\x1b[90m%s\x1b[0m", `Куки: ${cookie}`);
  await setCookies(cookie);
  const startedAt = Date.now();
  const allResults = [];
  for (let index = 0; index < MONTHS.length; index++) {
    const { from, to, month } = MONTHS[index];
    console.log(`смотрим месяц ${month}`);
    console.log('Поиск документов...');

    const docsToSign = await searchDocuments(from, to);
    console.log(`Найдено документов: ${docsToSign.length}`);

    const BATCH_SIZE = 100;
    const DELAY_MS = 1000;
    const monthResults = [];

    for (let i = 0; i < docsToSign.length; i += BATCH_SIZE) {
      const batch = docsToSign.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async d => {
          const id = d.EMDRegistry_ObjectID;
          const fio = d.Person_FIO;
          try {
            const result = await signDocument({
              objectName: d.EMDRegistry_ObjectName,
              objectId: d.EMDRegistry_ObjectID,
              certId: CERT_ID,
              versionId: d.EMDVersion_id || '',
              versionNum: d.EMDVersion_VersionNum || '1',
              isMOSign: 'true',
              EMDRegistry_id: d.EMDRegistry_id
            });
            if (result === false) {
              const msg = result?.message || 'unknown error';
              console.log(`❌ Не подписан: ID=${id} ${fio ? `(${fio})` : ''}`.trim());
              logger.push({ type: 'doc', id, fio, status: 'fail', error: msg, date: new Date().toISOString() });
              return { id, fio, status: 'fail', error: msg };
            }
            console.log(`✅ Подписан: ID=${id} ${fio ? `(${fio})` : ''}`.trim());
            logger.push({ type: 'doc', id, fio, status: 'ok', date: new Date().toISOString() });
            return { id, fio, status: 'ok' };
          } catch (err) {
            console.log(`❌ Не подписан: ID=${id} ${fio ? `(${fio})` : ''}`.trim());
            logger.push({ type: 'doc', id, fio, status: 'fail', error: err.message, date: new Date().toISOString() });
            return { id, fio, status: 'fail', error: err.message };
          }
        })
      );

      monthResults.push(...batchResults);

      if (i + BATCH_SIZE < docsToSign.length) {
        console.log(`⏳ Пауза ${DELAY_MS / 1000} сек...`);
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }

    const ok = monthResults.filter(r => r.status === 'ok').length;
    const fail = monthResults.filter(r => r.status === 'fail').length;
    allResults.push(...monthResults);

    console.log(`\n🏁 ИТОГО: успешно ${ok}, ошибок ${fail}, всего ${docsToSign.length}`);
    console.log(`⏱️ Месяц за ${Date.now() - startedAt} ms`);

    logger.push({
      ok,
      fail,
      total: docsToSign.length,
      date: new Date().toISOString()
    });
    saveLogs();
  }
}

export { main, logger };
