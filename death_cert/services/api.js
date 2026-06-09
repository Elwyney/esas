import { post } from '../../shared/http.js';
import { MED_STAFF_FACT_ID, CERT_ID } from '../../shared/config.js';
import { CURRENT_MONTH } from '../../shared/date.js';
import { signFile, computeGostHash } from '../../shared/crypto.js';
import path from 'path';
import fs from 'fs';

async function searchDocDeath() {
    const url = '?c=MedSvid&m=loadMedSvidDeathListGrid'
    const body = `Person_Surname=&Person_Firname=&Person_Secname=&Birth_Date=&Svid_Ser=&Svid_Num=&viewMode=1&IsActual=0&OrgType_id=&DeathSvidReviewStatus_id=&ReceptType_id=&Death_Date=&Give_Date=${CURRENT_MONTH.from}%20-%20${CURRENT_MONTH.to}&DeathCause=&Diag_Code_From=&Diag_Code_To=&DeathSetType_id=&DeathSetCause_id=&start=0&limit=6&withoutDraft=1&Lpu_id=21&begDate=25.05.2026&begTime=09%3A12%3A24`
    const result = await post(url, body);
    return result;
}
// Блокирует документ перед отправкой в ВИМИС
const checkoutAll = async (doc) => {
    const url = '?c=EMDVimisFLK&m=checkoutAll'
    const body = `EMDRegistry_ObjectID=${doc.EMDRegistry_ObjectID}&EMDRegistry_ObjectName=DeathSvid&MedStaffFact_id=414882&isPreview=true`
    const result = await post(url, body);
    return result;
}
// Отправляет данные в систему ВИМИС
const sendVimis = async (doc) => {
    const url = '?c=EMDVimis&m=doEventAll'
    const body = `docs=%5B%7B%22EMDRegistry_ObjectID%22%3A${doc.EMDRegistry_ObjectID}%2C%22EMDRegistry_ObjectName%22%3A%22DeathSvid%22%2C%22MedStaffFact_id%22%3A${'414882' || MED_STAFF_FACT_ID}%2C%22vimisTypeIds%22%3A%5B1%2C2%2C3%2C4%2C6%5D%7D%5D`
    const result = await post(url, body);
    return result;
}
// Проверяет документ перед подписанием
const checkBeforeSignDeath = async (doc) => {
    const url = '?c=EMD&m=checkBeforeSign'
    const body = `EMDRegistry_ObjectName=DeathSvid&EMDRegistry_ObjectID=${doc.EMDRegistry_ObjectID}&EMDPersonRole_id=6&MedStaffFact_id=${'414882' || MED_STAFF_FACT_ID}&PersonWork_id=&EMDCertificate_id=${doc.EMDCertificate_id || CERT_ID}&EMDVersion_id=${doc.EMDVersion_id}&isMOSign=&isDocArray=false&isPreview=`
    const result = await post(url, body);
    return result;
}
const loadEMDSignWindow = async (deathSvidIds) => {
    const url = '?c=EMD&m=loadEMDSignWindow&_dc=1779947153979'
    const body = `EMDRegistry_Objects=false&EMDRegistry_ObjectName=DeathSvid&EMDRegistry_ForeignObjectName=&EMDRegistry_ObjectIDs=[${deathSvidIds.join(',')}]&isMOSign=false&isDocArray=false&MedService_id=3068&page=1&start=0&limit=100`
    const result = await post(url, body);
    return result;
}

async function signDocument(element) {
    const certId = '97506'
    // --- 2. Подписание документа ---
    const startedAt = Date.now();
    console.log(`\n✍️ Подписание: ${element.EMDRegistry_ObjectID} | ID: ${element.EMDRegistry_ObjectID}`);
    // Шаг 1: Предварительная проверка
    const step1At = Date.now();

    // Шаг 2: Получение данных для подписи
    const step2At = Date.now();

    const signData = await post('?c=EMD&m=getEMDVersionSignData', `EMDRegistry_ObjectName=DeathSvid&EMDRegistry_ObjectID=${element.EMDRegistry_ObjectID}&MedStaffFact_id=414882&EMDCertificate_id=${certId}&isPreview=true&EMDVersion_VersionNum=${element.EMDVersion_VersionNum}&isMOSign=`);
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
    console.log(`вресия${element.EMDVersion_id}`);

    console.log('4️⃣ saveEMDSignatures...');
    const result = await post('?c=EMD&m=saveEMDSignatures',
        `EMDRegistry_ObjectName=DeathSvid&EMDRegistry_ObjectID=${element.EMDRegistry_ObjectID}&EMDDocumentTypeLocal_id=${element.EMDDocumentTypeLocal_id}&EMDVersion_id=${element.EMDVersion_id}&Signatures_Hash=${doc.hashBase64}&Signatures_SignedData=${encodeURIComponent(signature)}&EMDCertificate_id=${certId}&EMDPersonRole_id=6&signType=cryptopro&isMOSign=&MedStaffFact_id=414882&PersonWork_id=&LpuSection_id=&MedService_id=3068&isDocArray=false`
    );
    console.log(`✅ Подписание завершено за ${Date.now() - startedAt} ms`);
    return result;
}
export { searchDocDeath, checkoutAll, sendVimis, checkBeforeSignDeath, loadEMDSignWindow, signDocument }
