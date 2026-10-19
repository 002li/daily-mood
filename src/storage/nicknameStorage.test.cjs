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

const { decodeNickname, getNicknameError, loadNickname, saveNickname, NICKNAME_STORAGE_KEY } = require('./nicknameStorage.ts');

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
  };
}

test('missing nickname requires first-time setup; a fresh read restores the saved trimmed name', async () => {
  const storage = memoryStorage();
  assert.equal(await loadNickname(storage), null);
  assert.equal(await saveNickname(storage, '  小满  '), '小满');
  const reopenedStorage = { getItem: storage.getItem, setItem: storage.setItem };
  assert.equal(await loadNickname(reopenedStorage), '小满');
});

test('saving nickname leaves the existing mood document unchanged', async () => {
  const storage = memoryStorage();
  const moodKey = '@app/mood-records/v1';
  const moodDocument = JSON.stringify({ version: 1, records: [{ date: '2026-10-14', mood: 'angry', createdAt: '2026-10-14T08:21:00.000Z' }] });
  storage.data.set(moodKey, moodDocument);
  await saveNickname(storage, '小满');
  assert.equal(storage.data.get(moodKey), moodDocument);
  assert.equal(storage.data.size, 2);
});

test('invalid names never write and Unicode emoji count as characters', async () => {
  const storage = memoryStorage();
  for (const name of ['', '   ', '一二三四五六七八九十一二三', '小\n满', '小\u0000满']) {
    await assert.rejects(saveNickname(storage, name));
  }
  assert.equal(storage.data.size, 0);
  assert.equal(getNicknameError('😀'.repeat(12)), null);
  assert.ok(getNicknameError('😀'.repeat(13)));
  await saveNickname(storage, '😀'.repeat(12));
  assert.equal(await loadNickname(storage), '😀'.repeat(12));
});

test('corrupt or unsupported stored nickname is rejected rather than treated as first launch', () => {
  for (const raw of ['not json', 'null', '{}', '{"version":2,"nickname":"小满"}', '{"version":1,"nickname":" "}', '{"version":1,"nickname":123}']) {
    assert.throws(() => decodeNickname(raw));
  }
});

test('write failure does not report success; the same input can be retried', async () => {
  const storage = memoryStorage();
  const failed = { getItem: storage.getItem, setItem: async () => { throw new Error('disk error'); } };
  await assert.rejects(saveNickname(failed, '小满'), /disk error/);
  assert.equal(storage.data.has(NICKNAME_STORAGE_KEY), false);
  assert.equal(await saveNickname(storage, '小满'), '小满');
  assert.equal(await loadNickname(storage), '小满');
});

test('read failure remains an error and does not create a replacement nickname', async () => {
  const storage = memoryStorage();
  const failed = { getItem: async () => { throw new Error('read error'); }, setItem: storage.setItem };
  await assert.rejects(loadNickname(failed), /read error/);
  assert.equal(storage.data.size, 0);
});

test('editing replaces only the nickname; failed or invalid edits preserve the previous name', async () => {
  const storage = memoryStorage();
  storage.data.set('@app/theme/v1', '{"version":1,"theme":"chamber"}');
  storage.data.set('@app/mood-records/v1', 'existing records');
  await saveNickname(storage, '原来的名字');
  const before = new Map(storage.data);
  await assert.rejects(saveNickname(storage, '  '));
  await assert.rejects(saveNickname({ ...storage, setItem: async () => { throw new Error('disk full'); } }, '新名字'));
  assert.deepEqual(storage.data, before);
  assert.equal(await loadNickname(storage), '原来的名字');
  assert.equal(await saveNickname(storage, '  新名字🌿  '), '新名字🌿');
  assert.equal(await loadNickname(storage), '新名字🌿');
  for (const [key, value] of before) if (key !== NICKNAME_STORAGE_KEY) assert.equal(storage.data.get(key), value);
  assert.equal(storage.data.size, before.size);
});
