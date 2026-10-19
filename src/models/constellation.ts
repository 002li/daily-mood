import type { MoodRecord } from './mood';

const DAY = 86_400_000;
export const dateToDay = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / DAY);
export const dayToDate = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
export const clampDay = (day: number, first: number, last: number) => Math.max(first, Math.min(last, day));

export function getConstellationBounds(records: MoodRecord[], today: string) {
  const current = dateToDay(today);
  const first = records.reduce((earliest, record) => record.date <= today
    ? Math.min(earliest, dateToDay(record.date)) : earliest, current - 6);
  return {
    first: Math.max(dateToDay('0001-01-01'), first),
    last: Math.min(dateToDay('9999-12-31'), current + 7),
    current,
  };
}

export function buildConstellationDays(records: MoodRecord[], today: string, center: number) {
  const bounds = getConstellationBounds(records, today);
  const actual = new Map(records.filter((record) => record.date <= today).map((record) => [record.date, record]));
  const focus = Math.round(clampDay(center, bounds.first, bounds.last));
  const first = Math.max(bounds.first, focus - 6);
  const last = Math.min(bounds.last, focus + 6);
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const day = first + index;
    const date = dayToDate(day);
    return { day, date, record: actual.get(date), future: day > bounds.current, today: day === bounds.current };
  });
}

// 每个日期有固定的空间位置。镜头移动改变透视比例，纵深不代表心情分数。
export function projectStar(day: number, camera: number, width: number, height: number) {
  const distance = day - camera;
  const depth = 90 + 125 * (1 - Math.cos(distance * 0.48)) + Math.sin(day * 1.17) * 30;
  const scale = 520 / (520 + depth);
  const x = width / 2 + distance * 82 * scale;
  const y = height * 0.46 + (Math.sin(day * 0.93) * 0.19 + Math.cos(day * 0.37) * 0.06) * height * scale
    + Math.sin(distance * 0.42) * height * 0.1;
  const opacity = Math.max(0, Math.min(1, (width / 2 + 24 - Math.abs(x - width / 2)) / 60)) * (0.35 + 0.65 * scale);
  return { x, y, scale, opacity };
}

export function projectConnection(a: number, b: number, camera: number, width: number, height: number) {
  const start = projectStar(a, camera, width, height);
  const end = projectStar(b, camera, width, height);
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
    length: Math.hypot(end.x - start.x, end.y - start.y),
    angle: Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI,
    opacity: Math.min(start.opacity, end.opacity),
  };
}
