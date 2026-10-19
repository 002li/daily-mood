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
const { SpaceFlight, spacePositions } = require('./SpaceFlight.ts');

test('production constructor works with its default deadline scheduler', () => {
  const controller = new SpaceFlight(() => () => {}, () => {});
  controller.travel('Records', () => {});
  assert.equal(controller.getSnapshot().running, true);
  controller.dispose();
  assert.equal(controller.getSnapshot().running, false);
});

function setup() {
  const legs = [];
  const positions = [];
  const deadlines = [];
  const controller = new SpaceFlight((to, easing, done) => {
    const leg = { to, easing, done, cancelled: false };
    legs.push(leg);
    return () => { leg.cancelled = true; done(false); };
  }, value => positions.push(value), (work, delay) => {
    const deadline = { work, delay, cancelled: false };
    deadlines.push(deadline);
    return () => { deadline.cancelled = true; };
  });
  return { controller, legs, positions, deadlines };
}

test('route changes once at the midpoint, with input locked until the second leg completes', () => {
  const { controller, legs } = setup();
  let landed = 0;
  controller.travel('Records', () => { landed += 1; });
  assert.equal(landed, 0);
  assert.equal(controller.getSnapshot().running, true);
  assert.equal(legs[0].to, 0.5);
  legs[0].done(true);
  assert.equal(landed, 1);
  assert.equal(legs[1].to, 1);
  assert.equal(controller.getSnapshot().running, true);
  legs[1].done(true);
  assert.deepEqual(controller.getSnapshot(), { running: false, target: 'Records' });
  assert.equal(landed, 1);
});

test('return journey reverses the same position range', () => {
  const { controller, legs, positions } = setup();
  controller.sync('Records');
  let landed = 0;
  controller.travel('Today', () => { landed += 1; });
  assert.deepEqual(positions, [1]);
  legs[0].done(true);
  assert.equal(legs[1].to, 0);
  legs[1].done(true);
  assert.equal(landed, 1);
  assert.equal(controller.getSnapshot().running, false);
});

test('return requested during a flight is queued and completed instead of dropped', () => {
  const { controller, legs } = setup();
  let returned = 0;
  assert.equal(controller.travel('Records', () => {}), true);
  assert.equal(controller.travel('Today', () => { returned += 1; }), true);
  assert.equal(legs.length, 1);
  legs[0].done(true);
  legs[1].done(true);
  assert.equal(controller.getSnapshot().running, true);
  legs[2].done(true);
  legs[3].done(true);
  assert.equal(returned, 1);
  assert.deepEqual(controller.getSnapshot(), { running: false, target: 'Today' });
});

test('background or resize interruption before midpoint lands once and ignores stale callbacks', () => {
  const { controller, legs, positions } = setup();
  let landed = 0;
  controller.travel('Records', () => { landed += 1; });
  controller.finish();
  controller.finish();
  legs[0].done(true);
  assert.equal(landed, 1);
  assert.equal(legs[0].cancelled, true);
  assert.deepEqual(positions, [1]);
  assert.equal(legs.length, 1);
  assert.equal(controller.getSnapshot().running, false);
});

test('interruption after midpoint does not navigate a second time', () => {
  const { controller, legs, positions } = setup();
  let landed = 0;
  controller.travel('Today', () => { landed += 1; });
  legs[0].done(true);
  controller.finish();
  legs[1].done(true);
  assert.equal(landed, 1);
  assert.deepEqual(positions, [0]);
  assert.equal(controller.getSnapshot().running, false);
});

test('reduced motion switches immediately without starting or locking an animation', () => {
  const { controller, legs, positions } = setup();
  let landed = 0;
  controller.travel('Records', () => { landed += 1; }, true);
  assert.equal(landed, 1);
  assert.equal(legs.length, 0);
  assert.deepEqual(positions, [1]);
  assert.equal(controller.getSnapshot().running, false);
});

test('route synchronization cannot snap the camera to its endpoint at the midpoint', () => {
  const { controller, legs, positions } = setup();
  controller.travel('Records', () => controller.sync('Records'));
  legs[0].done(true);
  assert.deepEqual(positions, []);
  legs[1].done(true);
  controller.sync('Today');
  assert.deepEqual(positions, [0]);
});

test('unmount cancels movement and prevents late navigation', () => {
  const { controller, legs } = setup();
  let landed = 0;
  controller.travel('Records', () => { landed += 1; });
  controller.dispose();
  legs[0].done(true);
  assert.equal(landed, 0);
  assert.equal(controller.travel('Today', () => {}), false);
});

test('development effect reconnect restores the current route without replaying stale navigation', () => {
  const { controller, legs, positions } = setup();
  let staleLanding = 0;
  controller.travel('Records', () => { staleLanding += 1; });
  controller.dispose();
  controller.connect('Today');
  legs[0].done(true);
  assert.equal(staleLanding, 0);
  assert.deepEqual(positions, [0]);
  assert.equal(controller.getSnapshot().running, false);
  assert.equal(controller.travel('Records', () => {}), true);
});

test('subscription remains live after effect reconnect so the touch lock can be released', () => {
  const { controller, legs } = setup();
  let notifications = 0;
  const unsubscribe = controller.subscribe(() => { notifications += 1; });
  controller.dispose();
  controller.connect('Today');
  notifications = 0;
  controller.travel('Records', () => {});
  assert.equal(notifications, 1);
  legs[0].done(true);
  legs[1].done(true);
  assert.equal(notifications, 2);
  unsubscribe();
});

test('all twelve directed routes land on their own camera positions', () => {
  for (const from of Object.keys(spacePositions)) {
    for (const to of Object.keys(spacePositions)) {
      if (from === to) continue;
      const { controller, legs } = setup();
      controller.sync(from);
      let landed = 0;
      controller.travel(to, () => { landed += 1; });
      assert.equal(legs[0].to, (spacePositions[from] + spacePositions[to]) / 2, `${from} -> ${to}`);
      legs[0].done(true);
      assert.equal(legs[1].to, spacePositions[to]);
      legs[1].done(true);
      assert.equal(landed, 1);
      assert.deepEqual(controller.getSnapshot(), { running: false, target: to });
    }
  }
});

test('rapid tab taps keep only the most recent queued destination', () => {
  const { controller, legs } = setup();
  const landed = [];
  controller.travel('Records', () => landed.push('Records'));
  controller.travel('Calendar', () => landed.push('Calendar'));
  controller.travel('Statistics', () => landed.push('Statistics'));
  legs[0].done(true);
  legs[1].done(true);
  assert.equal(legs[2].to, 2);
  legs[2].done(true);
  legs[3].done(true);
  assert.deepEqual(landed, ['Records', 'Statistics']);
  assert.equal(controller.getSnapshot().running, false);
});

test('requesting the current flight target clears an obsolete queued route', () => {
  const { controller, legs } = setup();
  let wrongLanding = 0;
  controller.travel('Records', () => {});
  controller.travel('Calendar', () => { wrongLanding += 1; });
  controller.travel('Records', () => {});
  legs[0].done(true);
  legs[1].done(true);
  assert.equal(wrongLanding, 0);
  assert.equal(legs.length, 2);
  assert.equal(controller.getSnapshot().running, false);
});

test('missing animation completion is recovered by deadline and unlocks the latest destination', () => {
  const { controller, legs, deadlines, positions } = setup();
  const landed = [];
  controller.travel('Records', () => landed.push('Records'));
  controller.travel('Calendar', () => landed.push('Calendar'));
  deadlines[0].work();
  assert.deepEqual(landed, ['Calendar']);
  assert.deepEqual(positions, [2]);
  assert.equal(legs[0].cancelled, true);
  assert.equal(controller.getSnapshot().running, false);
  legs[0].done(true);
  assert.deepEqual(landed, ['Calendar']);
});

test('finished deadlines cannot terminate the next journey', () => {
  const { controller, legs, deadlines } = setup();
  controller.travel('Records', () => {});
  legs[0].done(true);
  legs[1].done(true);
  assert.equal(deadlines[0].cancelled, true);
  controller.travel('Statistics', () => {});
  deadlines[0].work();
  assert.equal(controller.getSnapshot().running, true);
  legs[2].done(true);
  legs[3].done(true);
  assert.equal(controller.getSnapshot().running, false);
});

test('queued tab intent cannot redirect the active camera journey', () => {
  const { controller, legs } = setup();
  controller.travel('Records', () => {});
  assert.deepEqual(controller.getJourney(), { from: 0, to: 1 });
  controller.travel('Calendar', () => {});
  controller.travel('Statistics', () => {});
  assert.equal(controller.getSnapshot().target, 'Statistics');
  assert.deepEqual(controller.getJourney(), { from: 0, to: 1 });
  legs[0].done(true);
  assert.deepEqual(controller.getJourney(), { from: 0, to: 1 });
  legs[1].done(true);
  assert.deepEqual(controller.getJourney(), { from: 1, to: 3 });
  legs[2].done(true);
  legs[3].done(true);
  assert.deepEqual(controller.getJourney(), { from: 3, to: 3 });
});

test('interrupted travel settles the camera on the latest queued page', () => {
  const { controller } = setup();
  controller.sync('Statistics');
  controller.travel('Records', () => {});
  controller.travel('Today', () => {});
  controller.finish();
  assert.deepEqual(controller.getJourney(), { from: 0, to: 0 });
});

test('midpoint navigation synchronization leaves the full camera journey intact', () => {
  const { controller, legs } = setup();
  controller.travel('Statistics', () => controller.sync('Statistics'));
  legs[0].done(true);
  assert.deepEqual(controller.getJourney(), { from: 0, to: 3 });
  legs[1].done(true);
  assert.deepEqual(controller.getJourney(), { from: 3, to: 3 });
});
