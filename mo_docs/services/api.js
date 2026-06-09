import { post } from '../../shared/http.js';
import { signFile, computeGostHash } from '../../shared/crypto.js';
import path from 'path';
import fs from 'fs';

// --- 1. Поиск документов ---
// --- 1. Поиск документов ---
async function fetchData(lpu, from, to, delay = 1000) {
    const url = `?c=EMD&m=loadEMDSignBundleWindow&_dc=${Date.now()}`;
    const body = `EMDLpu_id=21&LpuBuilding_id=${lpu}&EMDRegistry_EMDDate_period=${from}%20%E2%80%94%20${to}&EMDRegistry_Num=&EMDVersionStatus=&EMDDocumentType_Code=350,347,509,10,369,367,54,68,368,380,184,396,74,40,44,42,37,41,39,56,79,91,49,480,73,8,69,46,45,71,502,51,33,376,3,81,241,346,57,107,34,362,357,361,341,38,381,532,345,375,6,371,5,85,7,109,108,378,254,12,533,36,372,11,121,340,86,48,50,141,35,53,374,503,47,66,122,77,370,531,343,142,89,78,90,52,344,88,67,113,80,106,352,72,59,1,2,379,351&EMDErrorListGroup_id=&ReceptType_id=&isLpuSignNeeded=on&hidedeletedoc=1&page=1&LpuSection_id=null&Person_FIO=&MedPersonalFioIdArray=&EvnNum=&EvnClass_id=&Diag_Code_from=null&Diag_Code_to=null&TreatmentClass_id=&ResultClass_id=&VizitType_id=&PrehospType_id=&LeaveType_id=&PrehospArrive_id=&PrehospStatus_id=&limit=5000&isMOSign=true&start=0`;
    try {
        const result = await post(url, body);
        return result;
    } catch (error) {
        console.log('Ошибка запроса, повтор через', delay / 1000, 'секунд:', error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchData(lpu, from, to, Math.min(delay * 2, 30000));
    }
}

async function searchDocuments(from, to) {
    const DEPARTMENTS = [319, 303, 334, 313, 53, 2091, 2239, 2392, 2576, 2593, 2469, 2468, 2464, 2471, 2462, 2465, 2599, 2466, 2457, 2547, 2556, 2472, 2571, 2470, 2510, 2456, 2459, 2463, 2458, 2460, 2461, 2467, 2507, 2597, 2747, 4108, 4127, 4106, 4107, 4110, 4102, 4089, 4098, 4099, 4091, 4105, 4120, 4124, 4097, 4101, 4126, 4128, 4103, 4104, 4123, 4109, 4132, 4130, 4131, 4133, 4194, 4195, 4717, 5499, 5495, 5451, 5480, 5497, 5494, 5496, 5527, 5579, 5897, 5864, 5967, 5934];
    const promises = DEPARTMENTS.map(id => fetchData(id, from, to));
    const results = await Promise.all(promises);
    const allData = results.flat();
    return allData;
}

async function signDocument({ objectName, objectId, certId, versionId, versionNum, isMOSign }) {
    if (!versionId) throw new Error('Не удалось получить данные по документу. Возможно, документ был удален.');
    // --- 2. Подписание документа ---
    const startedAt = Date.now();
    console.log(`\n✍️ Подписание: ${objectName} | ID: ${objectId}`);
    // Шаг 1: Предварительная проверка
    const step1At = Date.now();
    const body = `EMDRegistry_ObjectName=${objectName}&EMDRegistry_ObjectID=${objectId}&EMDCertificate_id=${certId}&EMDVersion_id=${versionId}&isMOSign=${isMOSign}&isDocArray=true&isPreview=`;
    const check = await post('?c=EMD&m=checkBeforeSign', body);

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

    const signData = await post('?c=EMD&m=getEMDVersionSignData', `EMDRegistry_ObjectName=${objectName}&EMDRegistry_ObjectID=${objectId}&MedStaffFact_id=&isMOSign=${isMOSign}&EMDCertificate_id=${certId}&isPreview=true&EMDVersion_VersionNum=${versionNum}`);
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


    if (localHash !== doc.hashBase64) {
        throw new Error('Хэши не совпадают! Документ мог быть изменён.');
    }

    // Шаг 4: Отправка подписи
    console.log(`вресия${versionId}`);

    console.log('4️⃣ saveEMDSignatures...');
    const result = await post('?c=EMD&m=saveEMDSignatures', `EMDRegistry_ObjectName=${objectName}&EMDRegistry_ObjectID=${objectId}&EMDVersion_id=${versionId}&Signatures_Hash=${doc.hashBase64}&Signatures_SignedData=${encodeURIComponent(signature)}&EMDCertificate_id=${certId}&signType=cryptopro&isMOSign=${isMOSign}&LpuSection_id=&MedService_id=`);
    const saveOk = result?.success === true || result?.result === true || result?.status === 'success';
    if (!saveOk) {
        const msg =
            result?.ErrorMsg ||
            result?.error ||
            result?.message ||
            (typeof result === 'string' ? result : JSON.stringify(result).slice(0, 400));
        throw new Error(`saveEMDSignatures неуспешен: ${msg}`);
    }
    console.log(`✅ Подписание завершено за ${Date.now() - startedAt} ms`);
    return result;
}

export { searchDocuments, signDocument };












