import { moods, type MoodRecord } from '../models/mood';

export const MOOD_STORAGE_KEY = '@app/mood-records/v1';

export type MoodStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

function isRecord(value: unknown): value is MoodRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    return false;
  }

  const [year, month, day] = record.date.split('-').map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > monthDays[month - 1]) {
    return false;
  }
  if (!moods.some((mood) => mood.type === record.mood)) return false;
  if (typeof record.createdAt !== 'string') return false;
  const createdAt = new Date(record.createdAt);
  return Number.isFinite(createdAt.getTime()) && createdAt.toISOString() === record.createdAt;
}

export function decodeMoodRecords(raw: string | null): MoodRecord[] {
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object') throw new Error('Invalid mood storage.');
  const document = data as Record<string, unknown>;
  if (document.version !== 1 || !Array.isArray(document.records)) {
    throw new Error('Unsupported mood storage version or structure.');
  }
  if (!document.records.every(isRecord)) throw new Error('Invalid mood record.');
  const records = document.records as MoodRecord[];
  if (new Set(records.map((record) => record.date)).size !== records.length) {
    throw new Error('Duplicate mood dates.');
  }
  return [...records].sort((a, b) => b.date.localeCompare(a.date));
}

export function encodeMoodRecords(records: MoodRecord[]): string {
  return JSON.stringify({ version: 1, records });
}
