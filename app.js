// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { searchDocuments, signDocument } = require('./components/api');
const { auth } = require('./components/auth');
const { setCookies } = require('./components/http');
const { createSpinner } = require('nanospinner');
const { MONTHS } = require('./components/date');
const fs = require('fs');
const { config } = require('dotenv');
console.log(`что здесь ${config.USERNAME}`);

const logger = []
async function main() {
  console.log("\x1b[91m%s\x1b[0m", `Авторизация...`);
  const cookie = await auth('nadyrgulov', '0426Nrb!gvrrvg*!');
  console.log("\x1b[96m%s\x1b[0m", `Авторизация успешна`);
  console.log("\x1b[90m%s\x1b[0m", `Куки: ${cookie}`);
  await setCookies(cookie);
  const startedAt = Date.now();
  for (let index = 0; index < MONTHS.length; index++) {
    const { from, to, month } = MONTHS[index];
    console.log(`смотрим месяц ${month}`);

    const spinner = createSpinner('Поиск документов...').start();
    const docsToSign = await searchDocuments(from, to);
    spinner.success(`Найдено документов: ${docsToSign.length}`);

    const BATCH_SIZE = 100;
    const DELAY_MS = 1000;
    const results = [];

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
              certId: '97506',
              versionId: d.EMDVersion_id || '',
              versionNum: d.EMDVersion_VersionNum || '1',
              isMOSign: 'true',
              EMDRegistry_id: d.EMDRegistry_id
            });
            if (result === false) {
              console.log(`❌ Не подписан: ID=${id} ${fio ? `(${fio})` : ''}`.trim());
              return { id, fio, status: 'fail', error: err.message };
            }
            console.log(`✅ Подписан: ID=${id} ${fio ? `(${fio})` : ''}`.trim());
            return { id, fio, status: 'ok' };
          } catch (err) {
            console.log(`❌ Не подписан: ID=${id} ${fio ? `(${fio})` : ''}`.trim());
            return { id, fio, status: 'fail', error: err.message };
          }
        })
      );

      results.push(...batchResults);

      if (i + BATCH_SIZE < docsToSign.length) {
        console.log(`⏳ Пауза ${DELAY_MS / 1000} сек...`);
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }

    const ok = results.filter(r => r.status === 'ok').length;
    const fail = results.filter(r => r.status === 'fail').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    results.filter(r => r.status === 'fail').forEach(r => {
      console.error(`❌ Ошибка [${r.id}] ${r.fio}: ${r.error}`);
    });

    console.log(`\n🏁 ИТОГО: успешно ${ok}, ошибок ${fail},всего ${docsToSign.length}`);
    console.log(`⏱️ Финал за ${Date.now() - startedAt} ms`);
    logger.push({
      month,
      ok,
      fail,
      skipped,
      total: docsToSign.length,
      date: new Date().toISOString()
    });
  }
  fs.writeFileSync('logger.json', JSON.stringify(logger, null, 2));
}

module.exports = { main };
