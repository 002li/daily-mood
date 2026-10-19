const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};

const { buildMonthDays, moveMonth, getThirtyDaySummary } = require('./moodInsights.ts');
const { upsertMoodRecord } = require('./mood.ts');
const record = (date, mood) => ({ date, mood, createdAt: `${date}T08:00:00.000Z` });

test('calendar starts on Monday and contains only the viewed month', () => {
  const grid = buildMonthDays(2026, 10);
  assert.equal(grid.length, 35);
  assert.deepEqual(grid.slice(0, 3), [null, null, null]);
  assert.deepEqual(grid[3], { date: '2026-10-01', day: 1 });
  assert.deepEqual(grid[16], { date: '2026-10-14', day: 14 });
  assert.equal(grid.filter(Boolean).length, 31);
  assert.equal(grid.filter(Boolean).at(-1).date, '2026-10-31');
  assert.equal(new Set(grid.filter(Boolean).map(day => day.date)).size, 31);
});

test('calendar handles leap years, century rules and short months', () => {
  assert.equal(buildMonthDays(2024, 2).filter(Boolean).length, 29);
  assert.equal(buildMonthDays(2026, 2).filter(Boolean).length, 28);
  assert.equal(buildMonthDays(1900, 2).filter(Boolean).length, 28);
  assert.equal(buildMonthDays(2000, 2).filter(Boolean).length, 29);
  assert.equal(buildMonthDays(2026, 4).filter(Boolean).length, 30);
  assert.equal(buildMonthDays(2026, 3).length, 42);
  assert.equal(buildMonthDays(2021, 2).length, 28);
  assert.equal(buildMonthDays(1, 1).find(Boolean).date, '0001-01-01');
  assert.throws(() => buildMonthDays(2026, 13), RangeError);
});

test('month navigation crosses December and January correctly', () => {
  assert.deepEqual(moveMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(moveMonth(2026, 1, -1), { year: 2025, month: 12 });
});

test('30-day window includes both boundaries and excludes older and future dates', () => {
  const summary = getThirtyDaySummary([
    record('2026-09-14', 'angry'), record('2026-09-15', 'happy'),
    record('2026-10-01', 'calm'), record('2026-10-14', 'tired'),
    record('2026-10-15', 'motivated'),
  ], '2026-10-14');
  assert.equal(summary.startDate, '2026-09-15');
  assert.equal(summary.endDate, '2026-10-14');
  assert.equal(summary.recordedDays, 3);
  assert.deepEqual(summary.items.filter(item => item.count).map(item => [item.mood.type, item.count]), [
    ['happy', 1], ['calm', 1], ['tired', 1],
  ]);
});

test('30-day window crosses years, leap February and daylight-saving dates', () => {
  assert.equal(getThirtyDaySummary([], '2026-01-01').startDate, '2025-12-03');
  assert.equal(getThirtyDaySummary([], '2024-03-01').startDate, '2024-02-01');
  assert.equal(getThirtyDaySummary([], '2026-03-01').startDate, '2026-01-31');
  assert.equal(getThirtyDaySummary([], '2026-03-15').startDate, '2026-02-14');
});

test('empty summaries and removed mood records keep truthful totals', () => {
  const empty = getThirtyDaySummary([], '2026-10-14');
  assert.equal(empty.recordedDays, 0);
  assert.equal(empty.items.length, 4);
  assert.equal(empty.items.every(item => item.count === 0), true);
  const legacy = getThirtyDaySummary([
    record('2026-10-01', 'ordinary'), record('2026-10-02', 'motivated'), record('2026-10-03', 'angry'),
  ], '2026-10-14');
  assert.equal(legacy.recordedDays, 3);
  assert.deepEqual(legacy.items.filter(item => item.count).map(item => [item.mood.type, item.count]), [
    ['ordinary', 1], ['angry', 1], ['motivated', 1],
  ]);
  assert.equal(legacy.items.reduce((total, item) => total + item.count, 0), 3);
});

test('same-day updates move a count instead of adding a second day', () => {
  const original = [record('2026-10-14', 'happy')];
  const changed = upsertMoodRecord(original, 'calm', new Date(2026, 9, 14, 20));
  const summary = getThirtyDaySummary(changed, '2026-10-14');
  assert.equal(summary.recordedDays, 1);
  assert.equal(summary.items.find(item => item.mood.type === 'happy').count, 0);
  assert.equal(summary.items.find(item => item.mood.type === 'calm').count, 1);
  assert.equal(original[0].mood, 'happy');
});
