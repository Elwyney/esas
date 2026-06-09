import cron from 'node-cron';
import { main } from './app.js';
import { updateTimer } from '../shared/timer.js';
import { header } from '../shared/header.js';
import app from './server.js';

// задача каждую секунду
header()
console.log('✅ Запускаю сервер для сайта\n');
app.listen(3001);
setInterval(updateTimer, 1000);
updateTimer();
console.clear()
console.log('Автоподпись запущена по расписанию');
console.log('\n✅ Задача выполнена. Ожидание следующего запуска...');
updateTimer();
cron.schedule(`*/3 * * * *`, async () => {
  console.clear()
  console.log('Автоподпись запущена по расписанию');
  await main();
  console.log('\n✅ Задача выполнена. Ожидание следующего запуска...');
  updateTimer();
});
