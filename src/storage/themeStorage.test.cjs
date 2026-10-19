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

const { THEME_STORAGE_KEY, decodeTheme, loadTheme, saveTheme } = require('./themeStorage.ts');
const { selectableMoods, isLegacyMood } = require('../models/mood.ts');
const { decodeMoodRecords, encodeMoodRecords } = require('./moodStorage.ts');

function storageWith(data = new Map()) {
  return { data, getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } };
}

test('new installations default to liuli without writing a preference', async () => {
  const storage = storageWith();
  assert.equal(await loadTheme(storage), 'liuli');
  assert.equal(storage.data.size, 0);
});

test('both themes survive fresh reads and do not touch nickname or mood documents', async () => {
  const document = encodeMoodRecords([{ date: '2026-10-16', mood: 'angry', createdAt: '2026-10-16T01:00:00.000Z' }]);
  const storage = storageWith(new Map([['@app/nickname/v1', '{"version":1,"nickname":"小满"}'], ['@app/mood-records/v1', document]]));
  for (const theme of ['chamber', 'liuli', 'chamber']) {
    await saveTheme(storage, theme);
    assert.equal(await loadTheme({ getItem: storage.getItem }), theme);
    assert.equal(storage.data.get('@app/mood-records/v1'), document);
    assert.equal(storage.data.get('@app/nickname/v1'), '{"version":1,"nickname":"小满"}');
    assert.equal(storage.data.size, 3);
  }
});

test('failed theme writes leave the previous preference intact and can be retried', async () => {
  const storage = storageWith();
  await saveTheme(storage, 'chamber');
  await assert.rejects(saveTheme({ ...storage, setItem: async () => { throw Error('disk full'); } }, 'liuli'), /disk full/);
  assert.equal(await loadTheme(storage), 'chamber');
  await saveTheme(storage, 'liuli');
  assert.equal(await loadTheme(storage), 'liuli');
});

test('corrupt, unsupported and unreadable preferences are errors, not silent resets', async () => {
  for (const raw of ['no json', 'null', '{}', '{"version":2,"theme":"liuli"}', '{"version":1,"theme":"other"}']) assert.throws(() => decodeTheme(raw));
  await assert.rejects(loadTheme({ getItem: async () => { throw Error('read failed'); } }), /read failed/);
  const storage = storageWith();
  await assert.rejects(saveTheme(storage, 'unknown'));
  assert.equal(storage.data.has(THEME_STORAGE_KEY), false);
});

test('only four moods are selectable while all removed mood types round-trip unchanged', () => {
  assert.deepEqual(selectableMoods.map(mood => mood.type), ['happy', 'calm', 'sad', 'tired']);
  const records = ['ordinary', 'angry', 'motivated'].map((mood, index) => ({ date: `2026-10-${14 + index}`, mood, createdAt: `2026-10-${14 + index}T01:00:00.000Z` }));
  assert.equal(records.every(record => isLegacyMood(record.mood)), true);
  assert.deepEqual(decodeMoodRecords(encodeMoodRecords(records)), [...records].reverse());
});
