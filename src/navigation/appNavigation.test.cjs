const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const { TabRouter, CommonActions } = require('@react-navigation/routers');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const { primaryDestinations, getPrimaryDestination, getBackDestination } = require('./appNavigation.ts');

function appRouter() {
  const router = TabRouter({ initialRouteName: 'Today', backBehavior: 'none' });
  const options = { routeNames: ['Today', 'Records', 'Calendar', 'Statistics'], routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options);
  return {
    route: () => state.routes[state.index].name,
    state: () => state,
    go: name => { state = router.getStateForAction(state, CommonActions.navigate(name), options); assert.ok(state); },
    systemBack: () => router.getStateForAction(state, CommonActions.goBack(), options),
  };
}

test('the two primary entries keep both history views in the Records section', () => {
  assert.deepEqual(primaryDestinations, ['Today', 'Records']);
  assert.equal(getPrimaryDestination('Today'), 'Today');
  for (const route of ['Records', 'Calendar', 'Statistics']) assert.equal(getPrimaryDestination(route), 'Records');
});

test('subpages return to Records, Records returns to Today, and Today can yield to the system', () => {
  assert.equal(getBackDestination('Calendar'), 'Records');
  assert.equal(getBackDestination('Statistics'), 'Records');
  assert.equal(getBackDestination('Records'), 'Today');
  assert.equal(getBackDestination('Today'), null);
});

test('a back press during a flight cancels leaving the current main page rather than exiting', () => {
  assert.equal(getBackDestination('Today', true), 'Today');
  assert.equal(getBackDestination('Records', true), 'Records');
  assert.equal(getBackDestination('Calendar', true), 'Records');
  assert.equal(getBackDestination('Statistics', true), 'Records');
});

test('calendar and statistics each follow the same parent return chain regardless of visit order', () => {
  const app = appRouter();
  for (const child of ['Calendar', 'Statistics', 'Calendar']) {
    app.go('Records');
    app.go(child);
    app.go(getBackDestination(app.route()));
    assert.equal(app.route(), 'Records');
    app.go(getBackDestination(app.route()));
    assert.equal(app.route(), 'Today');
  }
});

test('the Records tab always opens the constellation root while retaining existing route identities', () => {
  const app = appRouter();
  const calendarKey = app.state().routes.find(route => route.name === 'Calendar').key;
  app.go('Records'); app.go('Calendar');
  app.go('Records');
  assert.equal(app.route(), 'Records');
  app.go('Calendar');
  assert.equal(app.state().routes.find(route => route.name === 'Calendar').key, calendarKey);
  app.go('Today'); app.go('Records');
  assert.equal(app.route(), 'Records');
});

test('old tab history cannot resurrect a history subpage after returning to Today', () => {
  const app = appRouter();
  app.go('Records'); app.go('Calendar'); app.go('Records'); app.go('Statistics'); app.go('Today');
  assert.equal(getBackDestination(app.route()), null);
  assert.equal(app.systemBack(), null);
});
