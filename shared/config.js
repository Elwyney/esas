import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });
export const BASE_URL = process.env.BASE_URL;
export const USERNAME = process.env.USERNAME;
export const PASSWORD = process.env.PASSWORD;
export const CERT_ID = process.env.CERT_ID;
export const MED_STAFF_FACT_ID = process.env.MED_STAFF_FACT_ID;
export const PORT = process.env.PORT;
export const CRON_INTERVAL_HOURS = parseInt(process.env.CRON_INTERVAL_HOURS, 10) || 6;

export function getCronScheduleLabel() {
  const h = CRON_INTERVAL_HOURS;
  if (24 % h === 0) {
    const times = [];
    for (let i = 0; i < 24; i += h) {
      times.push(`${String(i).padStart(2, '0')}:00`);
    }
    return `Каждые ${h} ч → ${times.join(', ')}`;
  }
  return `Каждые ${h} часов`;
}