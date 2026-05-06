const { format, eachMonthOfInterval, startOfMonth, endOfMonth } = require('date-fns');
const start = new Date(2026, 0, 1); // 01.01.2026
const end = new Date(); // сегодня

const months = eachMonthOfInterval({ start, end });

const MONTHS = months.map(month => ({
    from: format(startOfMonth(month), 'dd.MM.yyyy'),  // ✅ использовать month
    to: format(endOfMonth(month), 'dd.MM.yyyy'),     // ✅ использовать month
    month: format(month, 'MMMM yyyy')
}));
module.exports = { MONTHS };