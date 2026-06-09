import express from 'express';
import cors from 'cors';
import path from 'path';
import { logger } from './app.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, 'logger.json');

const app = express();

function readSavedStats() {
    try {
        const rawData = fs.readFileSync(LOG_PATH);
        const data = JSON.parse(rawData);
        const sum = data.sum ?? data;
        return {
            totalDocs: Number(sum.количество ?? 0) || 0,
            signedCount: Number(sum.успешные ?? 0) || 0,
            unsignedCount: Number(sum.пропущено ?? 0) || 0,
        };
    } catch {
        return { totalDocs: 0, signedCount: 0, unsignedCount: 0 };
    }
}

function getStats() {
    const stats = logger.reduce((acc, item) => {
        acc.totalDocs += Number(item.total ?? item.количество ?? 0);
        acc.signedCount += Number(item.ok ?? item.успешные ?? 0);
        acc.unsignedCount += Number(item.fail ?? item.пропущено ?? 0);
        return acc;
    }, { totalDocs: 0, signedCount: 0, unsignedCount: 0 });

    return stats.totalDocs > 0 ? stats : readSavedStats();
}

app.use(cors());
app.get('/api/results', (req, res) => {
    const stats = getStats();

    res.json({
        stats: {
            successRate: stats.totalDocs > 0 ? Math.round((stats.signedCount / stats.totalDocs) * 100) : 0,
            totalDocs: stats.totalDocs,
            signedCount: stats.signedCount,
            unsignedCount: stats.unsignedCount,
            agentActivity: logger.length,
        }
    });
});

export default app;
