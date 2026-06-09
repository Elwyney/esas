import chalk from 'chalk';
import { getCronScheduleLabel } from './config.js';

const header = () => {
    console.log(`
███████╗███████╗ █████╗ ███████╗      ██████╗ ██╗
██╔════╝██╔════╝██╔══██╗██╔════╝      ╚════██╗██║
█████╗  ███████╗███████║███████╗█████╗ █████╔╝██║
██╔══╝  ╚════██║██╔══██║╚════██║╚════╝██╔═══╝ ██║
███████╗███████║██║  ██║███████║      ███████╗██║
╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝      ╚══════╝╚═╝
`);
    const title = chalk.hex('#e5e7eb');
    const text = chalk.hex('#9ca3af');
    const line = chalk.hex('#374151');

    console.log(title('\n FAQ\n'));
    console.log(line('─'.repeat(50)));

    const faq = [
        { q: 'Что такое esas-21?', a: 'Система автоматического подписания документов' },
        { q: 'Периодичность подписания документов', a: 'Каждые 24 часа' },
        { q: 'Расписание запусков', a: getCronScheduleLabel() },
        { q: 'Диапазон подписания документов', a: 'с 1 января 2026 года по настоящее время' },
        { q: 'Стек', a: 'Nodejs' },
        { q: 'Расписание ', a: 'Каждые 24 ч → 00:00' }
    ];
    faq.forEach((f, i) => {
        console.log(title(`\n ${i + 1}. ${f.q}`));
        console.log(text(`    ${f.a}`));
    });

    console.log('\n' + line('─'.repeat(50)));
}

export { header };