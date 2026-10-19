import { moods, selectableMoods, type MoodRecord } from './mood';

export type CalendarDay = { date: string; day: number };

export function moveMonth(year: number, month: number, direction: -1 | 1) {
  const index = year * 12 + month - 1 + direction;
  return { year: Math.floor(index / 12), month: index % 12 + 1 };
}

export function buildMonthDays(year: number, month: number): (CalendarDay | null)[] {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError('Invalid calendar month.');
  }
  const monthKey = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  const firstWeekday = new Date(`${monthKey}-01T12:00:00Z`).getUTCDay();
  const leading = (firstWeekday + 6) % 7;

  // 周一开头，只补齐最后一周；空白格不是日期，也不填模拟心情。
  const cellCount = Math.ceil((leading + days) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - leading + 1;
    return day >= 1 && day <= days
      ? { day, date: `${monthKey}-${String(day).padStart(2, '0')}` }
      : null;
  });
}

export function getThirtyDaySummary(records: MoodRecord[], today: string) {
  // 对本地日期标签做日历运算，UTC 中间值避免夏令时带来的小时差。
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 29);
  const startDate = start.toISOString().slice(0, 10);
  const included = records.filter((record) => record.date >= startDate && record.date <= today);
  const types = [...selectableMoods];
  const legacy = moods.filter((mood) => !selectableMoods.some((option) => option.type === mood.type));
  const counts = new Map<string, number>();
  included.forEach((record) => counts.set(record.mood, (counts.get(record.mood) ?? 0) + 1));

  return {
    startDate,
    endDate: today,
    recordedDays: included.length,
    // 已移除的心情只在范围内存在旧记录时显示，避免计数丢失。
    items: [
      ...types.map((mood) => ({ mood, count: counts.get(mood.type) ?? 0 })),
      ...legacy.filter((mood) => counts.has(mood.type)).map((mood) => ({ mood, count: counts.get(mood.type)! })),
    ],
  };
}

export function formatCompactDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}.${month}.${day}`;
}
