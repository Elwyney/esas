process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { fetch, Agent } = require('undici');
const CRYPTCP = '/opt/cprocsp/bin/amd64/cryptcp';
const CPVERIFY = '/opt/cprocsp/bin/amd64/cpverify';

const BASE_URL = 'https://promedufa.promedweb.ru';
const THUMBPRINT = 'EB9F9A5F1DFA646133BD79E116380E3B835D194C';

// Берем из актуальной сессии в браузере (cookie).
const COOKIES = process.env.COOKIES || "";

function getCookieValue(cookieHeader, key) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match ? match[1] : '';
}

const HEADERS = {
  "accept": "*/*",
  "accept-language": "ru,en;q=0.9",
  "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\", \"YaBrowser\";v=\"25.2\", \"Yowser\";v=\"2.5\", \"YaBrowserCorp\";v=\"132.0\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Linux\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "x-requested-with": "XMLHttpRequest",
  "x-csrf-token": getCookieValue(COOKIES, 'csrfToken'),
  "cookie": COOKIES,
  "Referer": "https://promedufa.promedweb.ru/?c=promed",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};



const dispatcher = new Agent({
  allowH2: false,
  connectTimeout: 60_000,
  headersTimeout: 10 * 60_000,
  bodyTimeout: 10 * 60_000,
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 600_000,
});

async function post(...args) {
  const startedAt = Date.now();

  // Вариант 1: post(bodyString) -> EMDREMD/EMDSearchStrict
  if (args.length === 1 && typeof args[0] === 'string') {
    const body = args[0];
    console.log(`📤 Поиск EMDSearchStrict | body: ${body.length} chars`);

    const res = await fetch(`${BASE_URL}/?c=EMDREMD&m=EMDSearchStrict&_dc=1776237973127`, {
      method: 'POST',
      headers: HEADERS,
      body: body,
      dispatcher,
      signal: AbortSignal.timeout(120_000),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    if (text.trim().startsWith('<')) {
      throw new Error(`Ожидали JSON, пришёл HTML: ${text.slice(0, 500)}`);
    }
    console.log(`📥 Поиск ответ: HTTP ${res.status} | ${Date.now() - startedAt} ms`);
    return JSON.parse(text);
  }

  // Вариант 2: post(controller, method, paramsObject) -> EMD/controller + params
  const [controller, method, params] = args;
  const qs = new URLSearchParams({ c: String(controller), m: String(method) });
  const body =
    typeof params === 'string'
      ? params
      : new URLSearchParams(params || {}).toString();

  console.log(`[post] -> ${controller}/${method} | body length: ${body.length}`);

  const res = await fetch(`${BASE_URL}/?${qs.toString()}`, {
    method: 'POST',
    headers: HEADERS,
    body: body,
    dispatcher,
    signal: AbortSignal.timeout(120_000),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  if (text.trim().startsWith('<')) {
    throw new Error(`Ожидали JSON, пришёл HTML: ${text.slice(0, 500)}`);
  }
  console.log(`📥 ${controller}/${method}: HTTP ${res.status} | ${Date.now() - startedAt} ms`);
  return JSON.parse(text);
}


// --- Утилиты ---

function signFile(filePath) {
  const tmpDir = fs.mkdtempSync('/tmp/sign_');
  const tmpFile = path.join(tmpDir, 'doc.xml');
  fs.copyFileSync(filePath, tmpFile);

  try {
    execSync(
      `cd "${tmpDir}" && "${CRYPTCP}" -signf -thumbprint ${THUMBPRINT} -cert -addchain -strict -der "${tmpFile}"`,
      { encoding: 'utf-8', stdio: 'pipe', shell: '/bin/bash' }
    );

    const sgnFile = path.join(tmpDir, 'doc.xml.sgn');
    const signature = fs.readFileSync(sgnFile);
    fs.rmSync(tmpDir, { recursive: true });

    const base64 = signature.toString('base64');
    const lines = base64.match(/.{1,76}/g);
    return lines ? lines.join('\r\n') : base64;
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

function computeGostHash(filePath) {
  const hex = execSync(`"${CPVERIFY}" -mk -alg GR3411_2012_256 "${filePath}"`, {
    encoding: 'utf-8', stdio: 'pipe',
  }).trim();
  return Buffer.from(hex, 'hex').toString('base64');
}


// --- 1. Поиск документов ---


const arr = [334];

async function fetchData(buildingId) {
  const body = `EMDLpu_id=21&LpuBuilding_id=${buildingId}&EMDRegistry_EMDDate_period=01.01.2026%20%E2%80%94%2022.04.2026&EMDRegistry_Num=&EMDVersionStatus=&EMDDocumentType_Code=null&EMDErrorListGroup_id=&ReceptType_id=&isLpuSignNeeded=on&hidedeletedoc=1&isWithoutRegistration=on&isGlobalAndActive=true&limit=10000&LpuSection_id=null&Person_FIO=&MedPersonalFioIdArray=&EvnNum=&EvnClass_id=&Diag_Code_from=null&Diag_Code_to=null&TreatmentClass_id=&ResultClass_id=&VizitType_id=&PrehospType_id=&LeaveType_id=&PrehospArrive_id=&PrehospStatus_id=&page=1&start=0`;

  const response = await fetch("https://promedufa.promedweb.ru/?c=EMDREMD&m=EMDSearchStrict&_dc=1776765655867", {
    headers: HEADERS,
    "body": body,
    "method": "POST"
  });

  const result = await response.json();
  return result.data || [];
}

async function searchDocuments() {
  const promises = arr.map(id => fetchData(id));
  const results = await Promise.all(promises);

  // Объединяем все data в один массив
  const allData = results.flat();

  // Достаем все EMDRegistry_ObjectID

  // console.log(`📊 Статистика:`);
  // console.log(`   - Всего элементов: ${allData.length}`);
  // console.log(`   - Уникальных ObjectID: ${new Set(objectIds).size}`);
  // console.log(`   - Всего ObjectID (с дублями): ${objectIds.length}`);
  // console.log(`\n📝 Массив EMDRegistry_ObjectID:`, objectIds);

  return allData;
}


// --- 2. Подписание документа ---

async function signDocument({ objectName, objectId, certId, versionId, versionNum, isMOSign }) {
  const startedAt = Date.now();
  console.log(`\n✍️ Подписание: ${objectName} | ID: ${objectId}`);
  // Шаг 1: Предварительная проверка
  const step1At = Date.now();
  console.log('1️⃣ checkBeforeSign...');
  const check = await post('EMD', 'checkBeforeSign', {
    EMDRegistry_ObjectName: objectName,
    EMDRegistry_ObjectID: objectId,
    EMDCertificate_id: certId,
    EMDVersion_id: versionId,
    isMOSign: isMOSign,
    isDocArray: 'true',
    isPreview: '',
  });
  console.log(`   ⏱️ checkBeforeSign: ${Date.now() - step1At} ms`);
  console.log('   🧾 Ответ:', JSON.stringify(check).slice(0, 800) + (JSON.stringify(check).length > 800 ? '…' : ''));

  const checkOk = check && check.success === true;
  if (!checkOk) {
    const msg =
      check?.ErrorMsg ||
      check?.error ||
      check?.message ||
      (typeof check === 'string' ? check : JSON.stringify(check).slice(0, 400));
    throw new Error(`checkBeforeSign неуспешен: ${msg}`);
  }

  // Шаг 2: Получение данных для подписи
  const step2At = Date.now();
  console.log('2️⃣ getEMDVersionSignData...');
  const signData = await post('EMD', 'getEMDVersionSignData', {
    EMDRegistry_ObjectName: objectName,
    EMDRegistry_ObjectID: objectId,
    MedStaffFact_id: '',
    isMOSign: isMOSign,
    EMDCertificate_id: certId,
    isPreview: '',
    EMDVersion_VersionNum: versionNum,
  });
  console.log(`   ⏱️ getEMDVersionSignData: ${Date.now() - step2At} ms`);

  if (!signData.toSign || !signData.toSign.length) {
    const msg =
      signData?.ErrorMsg ||
      signData?.error ||
      signData?.message ||
      (typeof signData === 'string' ? signData : JSON.stringify(signData).slice(0, 400));
    throw new Error(`getEMDVersionSignData пустой toSign: ${msg}`);
  }

  const doc = signData.toSign[0];
  console.log('   Хэш сервера:', doc.hashBase64);

  // Шаг 3: Подписание через КриптоПро
  const step3At = Date.now();
  console.log('3️⃣ Подписание через КриптоПро...');
  const docBytes = Buffer.from(doc.docBase64, 'base64');
  const tmpDir = fs.mkdtempSync('/tmp/emd_');
  const tmpFile = path.join(tmpDir, 'doc.xml');
  fs.writeFileSync(tmpFile, docBytes);

  const localHash = computeGostHash(tmpFile);
  const signature = signFile(tmpFile);
  fs.rmSync(tmpDir, { recursive: true });

  console.log('   Хэш локальный:', localHash);
  console.log('   Хэши совпадают:', localHash === doc.hashBase64);
  console.log('   Подпись:', signature.length, 'символов');
  console.log(`   ⏱️ подпись: ${Date.now() - step3At} ms`);

  if (localHash !== doc.hashBase64) {
    throw new Error('Хэши не совпадают! Документ мог быть изменён.');
  }

  // Шаг 4: Отправка подписи
  const step4At = Date.now();
  console.log('4️⃣ saveEMDSignatures...');
  const result = await post('EMD', 'saveEMDSignatures', {
    EMDRegistry_ObjectName: objectName,
    EMDRegistry_ObjectID: objectId,
    EMDVersion_id: doc.EMDVersion_id || versionId,
    Signatures_Hash: doc.hashBase64,
    Signatures_SignedData: signature,
    EMDCertificate_id: certId,
    signType: 'cryptopro',
    isMOSign: isMOSign,
    LpuSection_id: '',
    MedService_id: '',
  });
  console.log(`   ⏱️ saveEMDSignatures: ${Date.now() - step4At} ms`);
  console.log('   📦 Результат:', JSON.stringify(result).slice(0, 800) + (JSON.stringify(result).length > 800 ? '…' : ''));
  console.log(`✅ Подписание завершено за ${Date.now() - startedAt} ms`);

  return result;
}

// --- Запуск ---

async function main() {
  const startedAt = Date.now();
  console.log('🚀 Старт');
  const ONLY_SEARCH = false;
  const MAX_DOCS = 99999;

  // Получить список документов за период
  const docs = await searchDocuments();

  const docsToSign = docs.slice(0, MAX_DOCS);
  console.log(`🧾 Будем подписывать: ${docsToSign.length} (MAX_DOCS=${MAX_DOCS})`);

  if (ONLY_SEARCH) {
    console.log('⏭️ ONLY_SEARCH=true, подписание пропущено');
    console.log(`⏱️ Готово за ${Date.now() - startedAt} ms`);
    return;
  }

  // Подписание пачками по 3 штуки с паузой между пачками
  const BATCH_SIZE = 3;
  const DELAY_MS = 1000;
  const results = [];
  console.log(`📚 Batch size: ${BATCH_SIZE}, задержка: ${DELAY_MS} ms`);

  for (let i = 0; i < docsToSign.length; i += BATCH_SIZE) {
    const batchStartedAt = Date.now();
    const batch = docsToSign.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Пачка #${Math.floor(i / BATCH_SIZE) + 1} — ${batch.length} документов`);

    const batchResults = [];
    for (const d of batch) {
      const id = d.EMDRegistry_ObjectID;
      const fio = d.Person_FIO;
      try {
        await signDocument({
          objectName: d.EMDRegistry_ObjectName,
          objectId: d.EMDRegistry_ObjectID,
          certId: '97506',
          versionId: d.EMDVersion_id || '',
          versionNum: d.EMDVersion_VersionNum || '1',
          isMOSign: 'true',
        });
        console.log(`✅ Подписан: ID=${id} ${fio ? `(${fio})` : ''}`.trim());
        batchResults.push({ id, fio, status: 'ok' });
      } catch (err) {
        console.log(`❌ Не подписан: ID=${id} ${fio ? `(${fio})` : ''}`.trim());
        batchResults.push({ id, fio, status: 'fail', error: err.message });
      }
    }

    results.push(...batchResults);
    console.log(`✅ Пачка завершена за ${Date.now() - batchStartedAt} ms`);

    if (i + BATCH_SIZE < docsToSign.length) {
      console.log(`⏳ Пауза ${DELAY_MS / 1000} сек...`);
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const fail = results.filter(r => r.status === 'fail').length;

  results.filter(r => r.status === 'fail').forEach(r => {
    console.error(`❌ Ошибка [${r.id}] ${r.fio}: ${r.error}`);
  });

  console.log(`\n🏁 ИТОГО: успешно ${ok}, ошибок ${fail}, всего ${docsToSign.length}`);
  console.log(`⏱️ Финал за ${Date.now() - startedAt} ms`);
}

main().catch(console.error);


// const fs = require('fs');
// const path = require('path');
// const puppeteer = require('puppeteer');

// const ECP_ORIGIN = 'https://promedufa.promedweb.ru';

// function cookiesToHeader(cookies) {
//   return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
// }

// async function authMain() {
//   const browser = await puppeteer.launch({
//     headless: true,
//     ignoreHTTPSErrors: true,
//     args: ['--ignore-certificate-errors'],
//   });

//   const page = await browser.newPage();
//   await page.goto(ECP_ORIGIN, { timeout: 160000 });
//   await page.waitForSelector('#promed-login');
//   await page.type('#promed-login', process.env.USERNAME);
//   await page.waitForSelector('#promed-password');
//   await page.type('#promed-password', process.env.PASSWORD);
//   await page.click('button[type="submit"]');


//   await page.goto(`${ECP_ORIGIN}/?c=promed`, {
//     waitUntil: 'domcontentloaded',
//     timeout: 60000,
//   });
//   await page.goto(ECP_ORIGIN, {
//     waitUntil: 'domcontentloaded'
//   });
//   const context = browser.defaultBrowserContext();
//   const forEcp = await context.cookies(ECP_ORIGIN);
  
//   const header = cookiesToHeader(forEcp);

//   if (header) {
//     fs.writeFileSync(
//       path.join(__dirname, 'session-cookie.txt'),
//       header,
//       'utf8'
//     );
//     console.log("\x1b[90m%s\x1b[0m", `Куки записаны`);
//   } else {
//     console.warn('Нет кук для ecp.giszrb.ru — проверьте вход на ЕЦП в браузере.');
//   }
//   return header;
// }
// // Простой перезапуск при ошибке
// async function auth() {
//   try {
//     return await authMain();
//   } catch (error) {
//     console.log('Ошибка:', error.message);
//     console.log('Перезапускаем...');
//     return auth(); // Запускаем снова
//   }
// }


// module.exports = { auth };
