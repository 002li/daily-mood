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
const { buildSpaceCameraTrack } = require('./SpaceCamera.ts');
const frame = { width: 360, height: 800 };
const box = { x: 20, y: 154, width: 320, height: 320 };
const axes = ['x', 'y', 'scale', 'rotation', 'opacity', 'orbitTurn', 'orbitDepth', 'clouds'];
const number = value => typeof value === 'string' ? parseFloat(value) : value;
const near = (a, b) => assert.ok(Math.abs(number(a) - number(b)) < 1e-8, `${a} != ${b}`);
const travelValues = (track, axis, from, to) => from <= to ? track[axis] : [...track[axis]].reverse();

test('all twelve journeys start and finish at the same poses as their resting pages', () => {
  for (let from = 0; from < 4; from++) for (let to = 0; to < 4; to++) {
    const track = buildSpaceCameraTrack(from, to, frame, box);
    const origin = buildSpaceCameraTrack(from, from, frame, box);
    const destination = buildSpaceCameraTrack(to, to, frame, box);
    for (const axis of axes) {
      const values = travelValues(track, axis, from, to);
      near(values[0], origin[axis][0]);
      near(values.at(-1), destination[axis][0]);
      assert.ok(values.every(value => Number.isFinite(number(value))));
    }
    assert.ok(track.inputRange.every((value, index, list) => !index || value > list[index - 1]));
  }
});

test('returning traverses exactly the same camera arc in reverse', () => {
  for (let from = 0; from < 4; from++) for (let to = from + 1; to < 4; to++) {
    const forward = buildSpaceCameraTrack(from, to, frame, box);
    const reverse = buildSpaceCameraTrack(to, from, frame, box);
    for (const axis of axes) forward[axis].forEach((value, index) => near(value, reverse[axis][index]));
  }
});

test('long tab jumps do not detour through unselected page poses', () => {
  const track = buildSpaceCameraTrack(0, 3, frame, box);
  const calendar = buildSpaceCameraTrack(2, 2, frame, box);
  assert.ok(Math.min(...track.x) > calendar.x[0] + 80);
  assert.ok(track.rotation.every(value => number(value) <= 0));
  assert.ok(track.clouds.every((value, index, values) => !index || value >= values[index - 1]));
});

test('each journey approaches only once rather than repeatedly expanding and shrinking', () => {
  for (let from = 0; from < 4; from++) for (let to = 0; to < 4; to++) {
    if (from === to) continue;
    const track = buildSpaceCameraTrack(from, to, frame, box);
    const values = travelValues(track, 'scale', from, to);
    let receding = false;
    for (let index = 1; index < values.length; index++) {
      const delta = values[index] - values[index - 1];
      if (delta < -1e-8) receding = true;
      if (receding) assert.ok(delta <= 1e-8, `${from} -> ${to} expanded again`);
    }
    assert.ok(track.opacity.every(value => value >= 0 && value <= 1));
    assert.ok(track.orbitDepth.every(value => value > 0 && value <= 1));
  }
});

test('finishing one flight and starting a queued flight preserves every camera channel', () => {
  for (let from = 0; from < 4; from++) for (let via = 0; via < 4; via++) for (let to = 0; to < 4; to++) {
    const first = buildSpaceCameraTrack(from, via, frame, box);
    const next = buildSpaceCameraTrack(via, to, frame, box);
    for (const axis of axes) near(travelValues(first, axis, from, via).at(-1), travelValues(next, axis, via, to)[0]);
  }
});

test('resting camera tracks stay constant at different sizes and supported positions', () => {
  for (const size of [{ width: 320, height: 640 }, frame, { width: 430, height: 680 }]) {
    for (let position = 0; position < 4; position++) {
      const track = buildSpaceCameraTrack(position, position, size, box);
      for (const axis of axes) near(track[axis][0], track[axis][1]);
    }
  }
});
