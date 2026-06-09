import { searchDocDeath, checkoutAll, sendVimis, checkBeforeSignDeath, loadEMDSignWindow, signDocument } from "./services/api.js";
import { auth } from '../shared/auth.js';
import { USERNAME, PASSWORD, CERT_ID } from '../shared/config.js';
import { setCookies } from '../shared/http.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, 'logger.json');

const loggerList = []

function saveLogs() {
  const sum = loggerList.reduce((acc, item) => {
    acc.успешные += item.успешные;
    acc.пропущено += item.пропущено;
    acc.количество += item.количество;
    return acc;
  }, { успешные: 0, пропущено: 0, количество: 0 });
  fs.writeFileSync(LOG_PATH, JSON.stringify(sum, null, 2));
}
const main = async () => {
  const results = [];
  console.log("\x1b[91m%s\x1b[0m", `Авторизация...`);
  const cookie = await auth(USERNAME, PASSWORD);
  console.log("\x1b[96m%s\x1b[0m", `Авторизация успешна`);
  console.log("\x1b[90m%s\x1b[0m", `Куки: ${cookie}`);
  await setCookies(cookie);

  const docsToSign = await searchDocDeath()
  const deathSvidIds = docsToSign.data.map(item => item.DeathSvid_id);
  console.log(`Найдено документов: ${deathSvidIds.length}`);
  const listDoc = await loadEMDSignWindow(deathSvidIds)

  for (const element of listDoc) {
    console.log('Идет блокировка документа перед отправкой в ВИМИС:', '\x1b[32m' + element.EMDRegistry_ObjectID + '\x1b[0m');
    await checkoutAll(element);

    console.log('Идет отправка документа в ВИМИС', '\x1b[33m' + element.EMDRegistry_ObjectID + '\x1b[0m');
    await sendVimis(element);

    console.log('Идет проверка документа перед подписанием', '\x1b[33m' + element.EMDRegistry_ObjectID + '\x1b[0m');
    const checkResult = await checkBeforeSignDeath(element);


    if (checkResult.success === true && element.Document_Status === 2) {
      console.log('\x1b[32m%s\x1b[0m', `✅ Документ ${element.EMDRegistry_ObjectID}: Подписание возможно`);
      try {
        const signResult = await signDocument(element);
        results.push({ id: element.EMDRegistry_ObjectID, status: 'ok', result: signResult });
        console.log('\x1b[32m%s\x1b[0m', `✅ Документ ${element.EMDRegistry_ObjectID}: Успешно подписан`);
      } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', `❌ Документ ${element.EMDRegistry_ObjectID}: Ошибка подписания - ${error.message}`);
        results.push({ id: element.EMDRegistry_ObjectID, status: 'fail', error: error.message });
      }
    }
    else {
      console.log('\x1b[31m%s\x1b[0m', `❌ Документ ${element.EMDRegistry_ObjectID}: ${checkResult.Error_Msg || 'Статус документа не позволяет подписать'}`);
      console.log('\x1b[33m%s\x1b[0m', `⚠️ Документ ${element.EMDRegistry_ObjectID}: статус - success=${checkResult.success}, status=${element.Document_Status}`);
      results.push({ id: element.EMDRegistry_ObjectID, status: 'fail', error: 'Неизвестный статус документа' });
    }
    console.log('----------------------------------------');
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const fail = results.filter(r => r.status === 'fail').length;
  console.log(`\n🏁 ИТОГО: успешно ${ok}, прощено ${fail}, всего ${docsToSign.data.length}`);

  loggerList.push({
    успешные: ok,
    пропущено: fail,
    количество: docsToSign.data.length,
    дата: new Date().toISOString()
  });

  saveLogs();
}
main()
export { main };

