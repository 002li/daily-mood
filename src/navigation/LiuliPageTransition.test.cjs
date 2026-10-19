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
const { buildLiuliPageTrack, getLiuliJourneyDuration } = require('./LiuliPageTransition.ts');
const { SpaceFlight, spacePositions } = require('./SpaceFlight.ts');
function at(track, axis, value) {
  const range = track.inputRange;
  const index = Math.max(0, range.findIndex((_, i) => i < range.length - 1 && value <= range[i + 1]));
  const t = Math.max(0, Math.min(1, (value - range[index]) / (range[index + 1] - range[index])));
  return track[axis][index] * (1 - t) + track[axis][index + 1] * t;
}

test('all directed transitions have readable endpoints and never overlap outgoing/incoming text', () => {
  for (const from of Object.keys(spacePositions)) for (const to of Object.keys(spacePositions)) {
    if (from === to) continue;
    const journey = { from: spacePositions[from], to: spacePositions[to] };
    const a = buildLiuliPageTrack(from, journey), b = buildLiuliPageTrack(to, journey);
    assert.equal(at(a, 'opacity', journey.from), 1, `${from} outgoing`);
    assert.equal(at(b, 'opacity', journey.to), 1, `${to} incoming`);
    assert.equal(at(a, 'x', journey.from), 0);
    assert.equal(at(b, 'x', journey.to), 0);
    for (let i = 0; i <= 100; i++) {
      const p = journey.from + (journey.to - journey.from) * i / 100;
      assert.ok(!(at(a, 'opacity', p) > 0 && at(b, 'opacity', p) > 0), `${from}->${to} at ${i}%`);
      assert.ok(Math.abs(at(a, 'x', p)) <= 14 + 1e-9 && Math.abs(at(b, 'x', p)) <= 14 + 1e-9);
    }
  }
});

test('child return reverses spatial direction; resting pages do not move or fade', () => {
  const enter = buildLiuliPageTrack('Calendar', { from: 1, to: 2 });
  const leave = buildLiuliPageTrack('Calendar', { from: 2, to: 1 });
  assert.ok(at(enter, 'x', 1.5) > 0);
  assert.ok(at(leave, 'x', 1.5) > 0);
  for (const [route, position] of Object.entries(spacePositions)) {
    const rest = buildLiuliPageTrack(route, { from: position, to: position });
    assert.equal(at(rest, 'opacity', position), 1);
    assert.equal(at(rest, 'x', position), 0);
  }
});

test('queued child/home intent cannot change the current leg duration or its frozen endpoints', () => {
  const legs = [];
  const controller = new SpaceFlight((to, easing, done, journey) => {
    legs.push({ to, easing, done, journey, duration: getLiuliJourneyDuration(journey) });
    return () => {};
  }, () => {}, () => () => {});
  controller.sync('Records');
  controller.travel('Calendar', () => {});
  controller.travel('Today', () => {});
  legs[0].done(true);
  assert.deepEqual(legs.slice(0, 2).map(leg => [leg.journey, leg.duration]), [
    [{ from: 1, to: 2 }, 360], [{ from: 1, to: 2 }, 360],
  ]);
  legs[1].done(true);
  assert.deepEqual(legs[2].journey, { from: 2, to: 0 });
  assert.equal(legs[2].duration, 800);
  legs[2].done(true); legs[3].done(true);
  assert.deepEqual(controller.getSnapshot(), { running: false, target: 'Today' });
});
