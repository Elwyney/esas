import { CRON_INTERVAL_HOURS } from './config.js';

function getNextRunTime() {
  const now = new Date();
  const next = new Date(now);
  const hours = now.getHours();
  const nextHour = (Math.floor(hours / CRON_INTERVAL_HOURS) + 1) * CRON_INTERVAL_HOURS;
  if (nextHour >= 24) {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  } else {
    next.setHours(nextHour, 0, 0, 0);
  }
  return next;
}

function updateTimer() {
  const now = new Date();
  const next = getNextRunTime();
  let diff = Math.max(0, Math.floor((next - now) / 1000));
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  process.stdout.write(`\r⏳ Следующий запуск через: ${h}:${m}:${s}`);
}

export { updateTimer, getNextRunTime };
