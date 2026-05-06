const cron = require('node-cron');
const { createSpinner } = require('nanospinner');
const { main } = require('./app.js');
const chalkImport = require('chalk');
const chalk = chalkImport.default ?? chalkImport;

// задача каждую секунду

console.log(`
███████╗███████╗ █████╗ ███████╗      ██████╗ ██╗
██╔════╝██╔════╝██╔══██╗██╔════╝      ╚════██╗██║
█████╗  ███████╗███████║███████╗█████╗ █████╔╝██║
██╔══╝  ╚════██║██╔══██║╚════██║╚════╝██╔═══╝ ██║
███████╗███████║██║  ██║███████║      ███████╗██║
╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝      ╚══════╝╚═╝
`);
const title = chalk.hex('#e5e7eb');   // светло-серый
const text = chalk.hex('#9ca3af');   // приглушённый
const line = chalk.hex('#374151');   // тёмный разделитель

console.log(title('\n NODE.JS FAQ\n'));
console.log(line('─'.repeat(50)));

const faq = [
  { q: 'Что такое esas-21?', a: 'Система автоматического подписания документов' },
  { q: 'Периодичность подписания документов', a: 'Каждые 6 часов' },
  { q: 'Диапазон подписания документов', a: 'с 1 января 2026 года по настоящее время' },
  { q: 'Стек', a: 'Nodejs' }
];

faq.forEach((f, i) => {
  console.log(title(`\n ${i + 1}. ${f.q}`));
  console.log(text(`    ${f.a}`));
});

console.log('\n' + line('─'.repeat(50)));
const spinner = createSpinner('Ожидание планировщика задач...').start();

cron.schedule('0 */6 * * *', () => {
  spinner.success('Автоподпись запущена по расписанию (каждые 6 часов)');
  main();
});
