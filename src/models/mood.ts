export const moods = [
  { type: 'happy', label: '开心', emoji: '😀' },
  { type: 'calm', label: '平静', emoji: '🙂' },
  { type: 'ordinary', label: '普通', emoji: '😐' },
  { type: 'sad', label: '低落', emoji: '😔' },
  { type: 'angry', label: '生气', emoji: '😡' },
  { type: 'tired', label: '疲惫', emoji: '😴' },
  { type: 'motivated', label: '充满动力', emoji: '🔥' },
] as const;

export type MoodType = (typeof moods)[number]['type'];
export type MoodOption = (typeof moods)[number];

// 移除的选项仅用于读取旧记录，避免已有数据变成无效记录。
export const selectableMoods = moods.filter((mood) => mood.type !== 'ordinary' && mood.type !== 'motivated' && mood.type !== 'angry');

export function isLegacyMood(mood: MoodType): boolean {
  return !selectableMoods.some(option => option.type === mood);
}

export type MoodRecord = {
  date: string;
  mood: MoodType;
  createdAt: string;
};

// 按设备的本地日期归档；直接截取 UTC 时间会把凌晨的记录归到前一天。
export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatRecordDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

export function formatCreatedTime(createdAt: string): string {
  const date = new Date(createdAt);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function upsertMoodRecord(
  records: MoodRecord[],
  mood: MoodType,
  now: Date,
): MoodRecord[] {
  const date = getLocalDateKey(now);
  const existing = records.find((record) => record.date === date);
  const record: MoodRecord = {
    date,
    mood,
    // 修改当天心情时，保留首次创建时间。
    createdAt: existing?.createdAt ?? now.toISOString(),
  };

  return [record, ...records.filter((item) => item.date !== date)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}
