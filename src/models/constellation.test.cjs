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
const { dateToDay, dayToDate, clampDay, getConstellationBounds, buildConstellationDays, projectStar, projectConnection } = require('./constellation.ts');
const record = (date, mood = 'calm') => ({ date, mood, createdAt: `${date}T08:00:00.000Z` });

test('date arithmetic crosses month, year, leap day and daylight-saving boundaries', () => {
  for (const [from, next] of [['2026-12-31', '2027-01-01'], ['2024-02-28', '2024-02-29'], ['2024-02-29', '2024-03-01'], ['2026-03-08', '2026-03-09']]) {
    assert.equal(dayToDate(dateToDay(from) + 1), next);
  }
});

test('all past records remain reachable and the future ends exactly seven days after today', () => {
  const bounds = getConstellationBounds([record('2025-01-01'), record('2026-10-15')], '2026-10-15');
  assert.equal(dayToDate(bounds.first), '2025-01-01');
  assert.equal(dayToDate(bounds.last), '2026-10-22');
  assert.equal(clampDay(bounds.first - 10, bounds.first, bounds.last), bounds.first);
  assert.equal(clampDay(bounds.last + 10, bounds.first, bounds.last), bounds.last);
});

test('empty history offers recent blank dates without fabricating moods', () => {
  const bounds = getConstellationBounds([], '2026-10-15');
  assert.equal(dayToDate(bounds.first), '2026-10-09');
  const days = buildConstellationDays([], '2026-10-15', bounds.current);
  assert.equal(days.filter(day => day.today).length, 1);
  assert.equal(days.every(day => day.record === undefined), true);
});

test('future slots stay empty even when storage contains a date ahead of the device date', () => {
  const records = [record('2026-10-14', 'ordinary'), record('2026-10-15', 'motivated'), record('2026-10-16', 'happy')];
  const original = JSON.stringify(records);
  const days = buildConstellationDays(records, '2026-10-15', dateToDay('2026-10-20'));
  assert.equal(days.find(day => day.date === '2026-10-14').record.mood, 'ordinary');
  assert.equal(days.find(day => day.date === '2026-10-15').record.mood, 'motivated');
  assert.equal(days.filter(day => day.future).length, 7);
  assert.equal(days.filter(day => day.future).every(day => !day.record), true);
  assert.equal(JSON.stringify(records), original);
});

test('date windows are bounded at supported calendar limits', () => {
  assert.equal(dayToDate(getConstellationBounds([], '0001-01-01').first), '0001-01-01');
  assert.equal(dayToDate(getConstellationBounds([], '9999-12-31').last), '9999-12-31');
  assert.equal(buildConstellationDays([], '2026-10-15', 1000000).at(-1).date, '2026-10-22');
});

test('space projection changes depth and keeps connected endpoints aligned', () => {
  const day = dateToDay('2026-10-15');
  const near = projectStar(day, day, 320, 240);
  const far = projectStar(day, day - 3, 320, 240);
  assert.equal(near.x, 160);
  assert.ok(near.scale > far.scale);
  assert.notEqual(near.y, far.y);
  for (let camera = day - 4; camera <= day + 4; camera += 0.125) {
    const a = projectStar(day, camera, 320, 240);
    const b = projectStar(day + 1, camera, 320, 240);
    const line = projectConnection(day, day + 1, camera, 320, 240);
    const dx = Math.cos(line.angle * Math.PI / 180) * line.length / 2;
    const dy = Math.sin(line.angle * Math.PI / 180) * line.length / 2;
    assert.ok(Math.abs(line.x - dx - a.x) < 0.00001);
    assert.ok(Math.abs(line.y + dy - b.y) < 0.00001);
    assert.ok(a.opacity >= 0 && a.opacity <= 1);
    assert.ok(Number.isFinite(line.length));
  }
});
