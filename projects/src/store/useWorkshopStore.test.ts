import assert from 'node:assert/strict';
import { before, beforeEach, test } from 'node:test';
import { ACT_SIM, getStage, stageActTitles } from '../lib/workshop/content';
import type { WjSimRun } from '../lib/workshop/sim';

const STORAGE_KEY = 'wujian-workshop-progress';
const memory = new Map<string, string>();
let store: typeof import('./useWorkshopStore').useWorkshopStore;
let getReachedAct: typeof import('./useWorkshopStore').getReachedAct;
let mergeReachedActs: typeof import('./useWorkshopStore').mergeReachedActs;

before(async () => {
  // Exercise the real persist middleware without reading or changing a browser's data.
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: globalThis.localStorage },
  });
  const workshopModule = await import('./useWorkshopStore');
  store = workshopModule.useWorkshopStore;
  getReachedAct = workshopModule.getReachedAct;
  mergeReachedActs = workshopModule.mergeReachedActs;
});

beforeEach(() => store.getState().resetAll());

function active(stageId = 1) {
  const state = store.getState();
  return state.activeActs[stageId] ?? getReachedAct(state, stageId);
}

const run: WjSimRun = {
  picks: { 's1-record': 'full' },
  dials: {},
  orders: {},
  state: { integrity: 100, legibility: 100, provenance: 100, hours: 2, risk: 0 },
  settled: true,
  attempt: 1,
};

test('reviewing previous and unlocked later sections keeps learning records and furthest progress', () => {
  store.setState({
    actsRevealed: { 1: 4, 2: 2 },
    activeActs: { 1: 4, 2: 2 },
    completed: [1],
    answers: { '1-q1-a': '已有作答' },
    submitted: { '1-q1-a': true },
    verdicts: { '1-q1-a': '成立' },
    analyses: { '1-q1-a': '已有评阅' },
    referenceAnswers: { '1-q1-a': '已有参考答案' },
    images: { '1-q2-a': 'data:image/png;base64,example' },
    simRuns: { 1: run },
    simCursor: { 1: 8 },
  });
  const original = store.getState();
  original.revealPrevAct(1);
  assert.equal(active(), 3);
  store.getState().revealToAct(1, 1);
  assert.equal(active(), 1);
  store.getState().revealToAct(1, 4);
  assert.equal(active(), 4);
  const state = store.getState();
  for (const key of ['actsRevealed', 'completed', 'answers', 'submitted', 'verdicts', 'analyses', 'referenceAnswers', 'images', 'simRuns', 'simCursor'] as const) {
    assert.deepEqual(state[key], original[key], `${key} must survive review`);
  }
  assert.equal(active(2), 2);
});

test('next section advances from the viewing position and unlocks only one new section', () => {
  store.setState({ actsRevealed: { 1: 3 } });
  store.getState().revealToAct(1, 1);
  for (const [viewing, reached] of [[2, 3], [3, 3], [4, 4], [4, 4]]) {
    store.getState().revealNextAct(1, 4);
    assert.equal(active(), viewing);
    assert.equal(store.getState().actsRevealed[1], reached);
  }
});

test('direct navigation cannot unlock unvisited or invalid sections', () => {
  store.getState().revealNextAct(1, 4);
  for (const target of [4, 3, 0, -1, 1.5, Number.NaN]) {
    store.getState().revealToAct(1, target);
    assert.equal(active(), 2);
    assert.equal(store.getState().actsRevealed[1], 2);
  }
  store.getState().revealPrevAct(1);
  store.getState().revealPrevAct(1);
  assert.equal(active(), 1);
  assert.equal(store.getState().actsRevealed[1], 2);
});

test('reload retains the review position separately from progress and answer records', async () => {
  store.setState({ actsRevealed: { 1: 4 }, activeActs: { 1: 2 }, answers: { '1-q1-a': '草稿' } });
  const cached = memory.get(STORAGE_KEY)!;
  store.getState().resetAll();
  memory.set(STORAGE_KEY, cached);
  await store.persist.rehydrate();
  assert.equal(active(), 2);
  assert.equal(store.getState().actsRevealed[1], 4);
  assert.equal(store.getState().answers['1-q1-a'], '草稿');
});

test('legacy caches keep their viewing position while completed and recorded work restore furthest progress', async () => {
  memory.set(STORAGE_KEY, JSON.stringify({
    version: 0,
    state: {
      completed: [1],
      actsRevealed: { 1: 2, 2: 3, 3: 1, 4: 1 },
      answers: { '3-q1-a': '已有作答' },
      simRuns: { 4: run },
    },
  }));
  await store.persist.rehydrate();
  assert.equal(active(1), 2);
  assert.equal(store.getState().actsRevealed[1], stageActTitles(getStage(1)!).length);
  assert.equal(active(2), 3);
  assert.equal(store.getState().actsRevealed[2], 3);
  assert.equal(active(3), 1);
  assert.equal(store.getState().actsRevealed[3], stageActTitles(getStage(3)!).length);
  assert.equal(active(4), 1);
  assert.equal(store.getState().actsRevealed[4], stageActTitles(getStage(4)!).indexOf(ACT_SIM) + 1);
  store.getState().markCompleted(2);
  assert.equal(active(2), 3);
  assert.equal(getReachedAct(store.getState(), 2), stageActTitles(getStage(2)!).length);
});

test('stage reset clears its viewing position while retaining another stage; full reset clears both', () => {
  store.setState({
    actsRevealed: { 1: 4, 2: 4 },
    activeActs: { 1: 2, 2: 3 },
    completed: [1, 2],
    answers: { '1-q1-a': '第一环节', '2-q1-a': '第二环节' },
    simRuns: { 1: run, 2: run },
  });
  store.getState().resetStage(1);
  assert.equal(active(1), 1);
  assert.equal(store.getState().activeActs[1], undefined);
  assert.equal(getReachedAct(store.getState(), 1), 1);
  assert.equal(store.getState().answers['1-q1-a'], undefined);
  assert.equal(store.getState().simRuns[1], undefined);
  assert.equal(active(2), 3);
  assert.equal(getReachedAct(store.getState(), 2), 4);
  assert.equal(store.getState().answers['2-q1-a'], '第二环节');
  assert.deepEqual(store.getState().simRuns[2], run);
  store.getState().resetAll();
  assert.deepEqual(store.getState().activeActs, {});
  assert.deepEqual(store.getState().actsRevealed, {});
  assert.deepEqual(store.getState().completed, []);
  assert.deepEqual(store.getState().answers, {});
  assert.deepEqual(store.getState().simRuns, {});
});

test('merging cloud progress keeps the greater position for every stage', () => {
  const local = { 1: 2, 2: 4, 3: 2 };
  const remote = { 1: 4, 2: 1, 4: 3 };
  assert.deepEqual(mergeReachedActs(local, remote), { 1: 4, 2: 4, 3: 2, 4: 3 });
  assert.deepEqual(mergeReachedActs(remote, local), { 1: 4, 2: 4, 3: 2, 4: 3 });
  assert.deepEqual(local, { 1: 2, 2: 4, 3: 2 });
  assert.deepEqual(remote, { 1: 4, 2: 1, 4: 3 });
});

// The screen and navigation must use the same fallback before normalization is persisted.
test('navigation agrees with recovered progress even before raw legacy values are normalized', () => {
  store.setState({ completed: [1], actsRevealed: { 1: 2 }, activeActs: {} });
  assert.equal(active(), 4);
  store.getState().revealToAct(1, 2);
  assert.equal(active(), 2);
  assert.equal(getReachedAct(store.getState(), 1), 4);
  store.setState({ activeActs: {} });
  store.getState().revealPrevAct(1);
  assert.equal(active(), 3);
  store.setState({ activeActs: {} });
  store.getState().revealNextAct(1, 4);
  assert.equal(active(), 4);
});
