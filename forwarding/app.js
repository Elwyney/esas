import { searchDocuments, resendDocument } from './services/api.js';
import { auth } from '../shared/auth.js';
import { setCookies } from '../shared/http.js';
import { MONTHS } from '../shared/date.js';
import { USERNAME, PASSWORD } from '../shared/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BATCH_SIZE = 100;
const DELAY_MS = 1000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, 'logger.json');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function saveLogs(total) {
    fs.writeFileSync(LOG_PATH, JSON.stringify({
        успешные: total.success,
        пропущено: total.fail,
        количество: total.found,
        дата: new Date().toISOString()
    }, null, 2));
}

function collectVersionIds(searchResults) {
    return searchResults
        .flatMap(result => Array.isArray(result?.data) ? result.data : [])
        .map(doc => doc?.EMDVersion_id)
        .filter(Boolean);
}

async function processBatch(batch, batchNumber) {
    const results = await Promise.all(
        batch.map(async (versionId) => {
            try {
                const result = await resendDocument(versionId);
                const ok = result?.success !== false;
                console.log(ok ? '✅' : '❌', `EMDVersion_id=${versionId}`);
                return ok;
            } catch (error) {
                console.log('❌', `EMDVersion_id=${versionId}: ${error.message}`);
                return false;
            }
        })
    );

    const success = results.filter(Boolean).length;
    const fail = results.length - success;
    console.log(`Партия ${batchNumber}: ✅ ${success} / ❌ ${fail}`);

    return { success, fail };
}

async function main() {
    console.log("\x1b[91m%s\x1b[0m", 'Авторизация...');
    const cookie = await auth(USERNAME, PASSWORD);
    console.log("\x1b[96m%s\x1b[0m", 'Авторизация успешна');
    await setCookies(cookie);

    const startedAt = Date.now();
    const total = { success: 0, fail: 0, found: 0 };

    for (const { from, to, month } of MONTHS) {
        console.log(`\nСмотрим месяц: ${month}`);
        console.log('Поиск документов...');

        const searchResults = await searchDocuments(from, to);
        const versionIds = collectVersionIds(searchResults);
        const uniqueVersionIds = [...new Set(versionIds)];

        console.log(`Найдено документов: ${versionIds.length}`);
        if (uniqueVersionIds.length !== versionIds.length) {
            console.log(`После удаления дублей: ${uniqueVersionIds.length}`);
        }

        let monthSuccess = 0;
        let monthFail = 0;

        for (let i = 0; i < uniqueVersionIds.length; i += BATCH_SIZE) {
            const batch = uniqueVersionIds.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const result = await processBatch(batch, batchNumber);

            monthSuccess += result.success;
            monthFail += result.fail;

            if (i + BATCH_SIZE < uniqueVersionIds.length) {
                await wait(DELAY_MS);
            }
        }

        total.success += monthSuccess;
        total.fail += monthFail;
        total.found += uniqueVersionIds.length;

        console.log(`Итог за месяц ${month}: ✅ ${monthSuccess} / ❌ ${monthFail}`);
    }

    console.log(`\nИТОГО: найдено ${total.found}, успешно ${total.success}, ошибок ${total.fail}`);
    console.log(`Время выполнения: ${Math.round((Date.now() - startedAt) / 1000)} сек.`);
    saveLogs(total);
}

main().catch((error) => {
    console.error('\x1b[31m%s\x1b[0m', `Ошибка выполнения: ${error.message}`);
    process.exitCode = 1;
});

export { main };
