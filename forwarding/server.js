import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, 'logger.json');
const app = express();

app.use(cors());
app.get('/api/forwarding', (req, res) => {
    const rawData = fs.readFileSync(LOG_PATH);
    const jsonData = JSON.parse(rawData);
    res.json(jsonData);
});

app.listen(3003);
export default app;
