const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

// 使用项目已有的 TypeScript 编译器，让 Node 内置测试直接检验业务模块。
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};

const { MoodPersistence } = require('./MoodPersistence.ts');
const { decodeMoodRecords, encodeMoodRecords, MOOD_STORAGE_KEY } = require('./moodStorage.ts');
const { selectableMoods } = require('../models/mood.ts');

const firstMoment = new Date(2026, 9, 14, 8, 0);
const laterMoment = new Date(2026, 9, 14, 9, 0);
const nextDay = new Date(2026, 9, 15, 8, 0);
const record = {
  date: '2026-10-14',
  mood: 'happy',
  createdAt: firstMoment.toISOString(),
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function nextTurn() {
  return new Promise((resolve) => setImmediate(resolve));
}

function delayedWrites(raw = null) {
  const writes = [];
  const storage = {
    async getItem(key) {
      assert.equal(key, MOOD_STORAGE_KEY);
      return raw;
    },
    setItem(key, value) {
      assert.equal(key, MOOD_STORAGE_KEY);
      const completion = deferred();
      writes.push({ value, ...completion });
      return completion.promise;
    },
  };
  return { persistence: new MoodPersistence(storage), writes };
}

test('versioned data loads in date order and rejects corrupt or incompatible records', () => {
  assert.deepEqual(decodeMoodRecords(null), []);
  const newer = { ...record, date: '2026-10-15', mood: 'calm' };
  assert.deepEqual(decodeMoodRecords(encodeMoodRecords([record, newer])), [newer, record]);
  const invalid = [
    '{',
    JSON.stringify({ version: 2, records: [record] }),
    JSON.stringify({ version: 1, records: {} }),
    encodeMoodRecords([{ ...record, mood: 'unknown' }]),
    encodeMoodRecords([{ ...record, date: '2026-02-29' }]),
    encodeMoodRecords([{ ...record, date: '2026-13-01' }]),
    encodeMoodRecords([{ ...record, createdAt: 'yesterday' }]),
    encodeMoodRecords([record, record]),
  ];
  invalid.forEach((raw) => assert.throws(() => decodeMoodRecords(raw)));
  assert.equal(decodeMoodRecords(encodeMoodRecords([{ ...record, date: '2024-02-29' }])).length, 1);
});

test('pending initialization is shared and prevents early writes', async () => {
  const read = deferred();
  let reads = 0;
  let writes = 0;
  const persistence = new MoodPersistence({
    getItem() { reads += 1; return read.promise; },
    async setItem() { writes += 1; },
  });
  const firstLoad = persistence.load();
  assert.equal(persistence.load(), firstLoad);
  persistence.saveMood('happy', firstMoment);
  assert.equal(writes, 0);
  assert.equal(reads, 1);
  assert.equal(persistence.getSnapshot().status, 'loading');
  read.resolve(encodeMoodRecords([record]));
  await firstLoad;
  assert.equal(persistence.getSnapshot().status, 'ready');
  assert.deepEqual(persistence.getSnapshot().records, [record]);
  await persistence.load();
  assert.equal(reads, 1);
});

test('failed read preserves storage, blocks saving, and permits safe read retry', async () => {
  let raw = '{';
  let writes = 0;
  const persistence = new MoodPersistence({
    async getItem() { return raw; },
    async setItem() { writes += 1; },
  });
  await persistence.load();
  assert.equal(persistence.getSnapshot().errorKind, 'load');
  persistence.saveMood('angry', firstMoment);
  assert.equal(writes, 0);
  assert.deepEqual(persistence.getSnapshot().records, []);
  raw = encodeMoodRecords([record]);
  persistence.retry();
  await nextTurn();
  assert.equal(persistence.getSnapshot().status, 'ready');
  assert.deepEqual(persistence.getSnapshot().records, [record]);
  assert.equal(writes, 0);
});

test('storage read rejection remains a load error until a successful retry', async () => {
  let reads = 0;
  const persistence = new MoodPersistence({
    async getItem() {
      reads += 1;
      if (reads === 1) throw new Error('Storage unavailable');
      return encodeMoodRecords([record]);
    },
    async setItem() { assert.fail('A failed read must not cause any writes'); },
  });
  await persistence.load();
  assert.equal(persistence.getSnapshot().status, 'error');
  assert.equal(persistence.getSnapshot().errorKind, 'load');
  persistence.retry();
  await nextTurn();
  assert.equal(persistence.getSnapshot().status, 'ready');
  assert.equal(persistence.getSnapshot().errorKind, null);
  assert.deepEqual(persistence.getSnapshot().records, [record]);
});

test('rapid selections serialize writes and only the final write reports saved', async () => {
  const { persistence, writes } = delayedWrites();
  await persistence.load();
  const savedMoods = [];
  persistence.subscribe(() => {
    const state = persistence.getSnapshot();
    if (state.status === 'saved') savedMoods.push(state.records[0].mood);
  });
  persistence.saveMood('happy', firstMoment);
  persistence.saveMood('calm', laterMoment);
  persistence.saveMood('tired', laterMoment);
  assert.equal(writes.length, 1);
  assert.equal(persistence.getSnapshot().records.length, 1);
  assert.equal(persistence.getSnapshot().records[0].mood, 'tired');
  assert.equal(persistence.getSnapshot().records[0].createdAt, firstMoment.toISOString());
  writes[0].resolve();
  await nextTurn();
  assert.equal(writes.length, 2);
  assert.equal(persistence.getSnapshot().status, 'saving');
  assert.deepEqual(savedMoods, []);
  assert.equal(decodeMoodRecords(writes[1].value)[0].mood, 'tired');
  writes[1].resolve();
  await nextTurn();
  assert.equal(persistence.getSnapshot().status, 'saved');
  assert.deepEqual(savedMoods, ['tired']);
});

test('save failure keeps latest memory record and retry persists it', async () => {
  const { persistence, writes } = delayedWrites();
  await persistence.load();
  persistence.saveMood('motivated', firstMoment);
  writes[0].reject(new Error('Storage full'));
  await nextTurn();
  assert.equal(persistence.getSnapshot().status, 'error');
  assert.equal(persistence.getSnapshot().errorKind, 'save');
  assert.equal(persistence.getSnapshot().records[0].mood, 'motivated');
  persistence.retry();
  assert.equal(writes.length, 2);
  assert.equal(persistence.getSnapshot().status, 'saving');
  writes[1].resolve();
  await nextTurn();
  assert.equal(persistence.getSnapshot().status, 'saved');
  assert.equal(persistence.getSnapshot().errorKind, null);
});

test('a new selection after save failure replaces the pending choice and retries saving', async () => {
  const { persistence, writes } = delayedWrites();
  await persistence.load();
  persistence.saveMood('angry', firstMoment);
  writes[0].reject(new Error('Storage unavailable'));
  await nextTurn();
  persistence.saveMood('calm', laterMoment);
  assert.equal(writes.length, 2);
  assert.equal(persistence.getSnapshot().status, 'saving');
  assert.equal(persistence.getSnapshot().errorKind, null);
  assert.equal(decodeMoodRecords(writes[1].value)[0].mood, 'calm');
  writes[1].resolve();
  await nextTurn();
  assert.equal(persistence.getSnapshot().status, 'saved');
  assert.equal(persistence.getSnapshot().records[0].createdAt, firstMoment.toISOString());
});

test('failure of an older write cannot discard or block a newer selection', async () => {
  const { persistence, writes } = delayedWrites();
  await persistence.load();
  persistence.saveMood('happy', firstMoment);
  persistence.saveMood('sad', laterMoment);
  writes[0].reject(new Error('Transient failure'));
  await nextTurn();
  assert.equal(writes.length, 2);
  assert.equal(persistence.getSnapshot().status, 'saving');
  assert.equal(decodeMoodRecords(writes[1].value)[0].mood, 'sad');
  writes[1].resolve();
  await nextTurn();
  assert.equal(persistence.getSnapshot().status, 'saved');
});

test('records survive a new controller and local midnight adds a second date', async () => {
  let raw = null;
  const storage = {
    async getItem() { return raw; },
    async setItem(key, value) { raw = value; },
  };
  const first = new MoodPersistence(storage);
  await first.load();
  first.saveMood('happy', firstMoment);
  await nextTurn();
  first.saveMood('calm', laterMoment);
  await nextTurn();
  first.saveMood('motivated', nextDay);
  await nextTurn();
  const restored = new MoodPersistence(storage);
  await restored.load();
  assert.deepEqual(restored.getSnapshot().records.map((item) => [item.date, item.mood]), [
    ['2026-10-15', 'motivated'],
    ['2026-10-14', 'calm'],
  ]);
  assert.equal(restored.getSnapshot().records[1].createdAt, firstMoment.toISOString());
});

test('four selectable moods preserve records written by earlier versions', async () => {
  assert.deepEqual(selectableMoods.map((mood) => mood.type), ['happy', 'calm', 'sad', 'tired']);
  const legacyRecord = { ...record, mood: 'ordinary' };
  let raw = encodeMoodRecords([legacyRecord]);
  const storage = {
    async getItem() { return raw; },
    async setItem(key, value) { raw = value; },
  };
  const persistence = new MoodPersistence(storage);
  await persistence.load();
  assert.equal(persistence.getSnapshot().status, 'ready');
  assert.deepEqual(persistence.getSnapshot().records, [legacyRecord]);
  persistence.saveMood('calm', nextDay);
  await nextTurn();
  assert.deepEqual(decodeMoodRecords(raw), [
    { date: '2026-10-15', mood: 'calm', createdAt: nextDay.toISOString() },
    legacyRecord,
  ]);
});

test('unsubscribed components are not notified by delayed read or write completion', async () => {
  const read = deferred();
  const write = deferred();
  const persistence = new MoodPersistence({
    getItem() { return read.promise; },
    setItem() { return write.promise; },
  });
  let notifications = 0;
  const unsubscribe = persistence.subscribe(() => { notifications += 1; });
  const load = persistence.load();
  unsubscribe();
  const initialNotifications = notifications;
  read.resolve(null);
  await load;
  persistence.saveMood('happy', firstMoment);
  write.resolve();
  await nextTurn();
  assert.equal(notifications, initialNotifications);
});
