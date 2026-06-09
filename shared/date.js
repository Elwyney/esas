import { format, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';

const start = new Date(2024, 0, 1);
const today = new Date();
const months = eachMonthOfInterval({ start, end: today });

const formatDate = (date) => format(date, 'dd.MM.yyyy');
const getPeriodEnd = (month) => new Date(Math.min(endOfMonth(month), today));

const MONTHS = months.map(month => ({
    from: formatDate(startOfMonth(month)),
    to: formatDate(getPeriodEnd(month)),
    month: format(month, 'MMMM yyyy')
}));

const CURRENT_MONTH = {
    from: formatDate(startOfMonth(today)),
    to: formatDate(today),
    month: format(today, 'MMMM yyyy')
};

export { MONTHS, CURRENT_MONTH };
