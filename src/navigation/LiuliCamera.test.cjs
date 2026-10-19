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
const { buildLiuliCameraTrack, getLiuliReturnBox, canAnimateLiuliJourney, liuliPageTracks } = require('./LiuliCamera.ts');
const frame = { width: 430, height: 680 };
const box = { x: 54, y: 110, width: 322, height: 322 };
const at = (track, axis, value) => {
  const range = track.inputRange;
  const index = Math.max(0, range.findIndex((_, i) => i < range.length - 1 && value <= range[i + 1]));
  const t = Math.max(0, Math.min(1, (value - range[index]) / (range[index + 1] - range[index])));
  return track[axis][index] * (1 - t) + track[axis][index + 1] * t;
};

test('pulling back never enlarges or hides the planet and preserves the exact home pose', () => {
  for (const size of [{ width: 320, height: 640 }, frame, { width: 360, height: 800 }]) {
    const track = buildLiuliCameraTrack(size, box);
    for (const [axis, values] of Object.entries(track)) {
      if (axis === 'inputRange') continue;
      assert.equal(values.length, track.inputRange.length);
      assert.ok(values.every(value => Number.isFinite(parseFloat(value))));
    }
    assert.equal(track.x[0], 0); assert.equal(track.y[0], 0); assert.equal(track.scale[0], 1); assert.equal(track.opacity[0], 1);
    const forward = track.inputRange.map(p => at(track, 'scale', p));
    const returning = [...track.inputRange].reverse().map(p => at(track, 'scale', p));
    assert.deepEqual(returning, [...forward].reverse());
    for (let i = 1; i < forward.length; i++) {
      assert.ok(forward[i] <= forward[i - 1]);
      assert.ok(forward[i] > 0 && forward[i] <= 1);
    }
    assert.ok(track.opacity.every(value => value === 1));
  }
});

test('text swaps near the midpoint while the planet remains visible throughout', () => {
  assert.equal(at(liuliPageTracks.Today, 'opacity', 0), 1);
  assert.equal(at(liuliPageTracks.Records, 'opacity', 1), 1);
  for (let p = 0; p <= 1; p += 0.01) {
    const home = at(liuliPageTracks.Today, 'opacity', p);
    const records = at(liuliPageTracks.Records, 'opacity', p);
    assert.ok(!(home > 0 && records > 0), `text overlap at ${p}`);
  }
  assert.equal(at(liuliPageTracks.Today, 'opacity', 0.5), 0);
  assert.equal(at(liuliPageTracks.Records, 'opacity', 0.5), 0);
  assert.ok(at(liuliPageTracks.Today, 'opacity', 0.4) > 0);
  assert.ok(at(liuliPageTracks.Records, 'opacity', 0.6) > 0);
});

test('the scaled planet lands inside the return button slot including device safe-area insets', () => {
  for (const size of [{ width: 320, height: 640 }, frame, { width: 360, height: 800 }]) {
    for (const insets of [{ top: 0, right: 0 }, { top: 32, right: 16 }]) {
      const track = buildLiuliCameraTrack(size, box, insets);
      const slot = getLiuliReturnBox(size, insets);
      const width = box.width * track.scale.at(-1);
      const height = box.height * track.scale.at(-1);
      const left = box.x + box.width / 2 + track.x.at(-1) - width / 2;
      const top = box.y + box.height / 2 + track.y.at(-1) - height / 2;
      assert.ok(Math.abs(left - slot.x) < 1e-8);
      assert.ok(Math.abs(top - slot.y) < 1e-8);
      assert.ok(Math.abs(width - slot.width) < 1e-8);
      assert.ok(slot.x >= 0 && slot.x + slot.width <= size.width - insets.right);
    }
  }
});

test('home journeys require an anchor; subpages can animate without measuring the home', () => {
  for (const from of ['Today', 'Records']) for (const to of ['Today', 'Records']) assert.equal(canAnimateLiuliJourney(from, to, true), true);
  assert.equal(canAnimateLiuliJourney('Today', 'Records', false), false);
  for (const child of ['Calendar', 'Statistics']) {
    assert.equal(canAnimateLiuliJourney('Records', child, false), true);
    assert.equal(canAnimateLiuliJourney(child, 'Records', false), true);
    assert.equal(canAnimateLiuliJourney(child, 'Today', true), true);
    assert.equal(canAnimateLiuliJourney(child, 'Today', false), false);
  }
});
