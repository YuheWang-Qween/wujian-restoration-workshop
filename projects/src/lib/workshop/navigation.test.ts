import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, beforeEach, test } from 'node:test';
import React, { type ComponentType, type EffectCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const requireModule = createRequire(__filename);
const memory = new Map<string, string>();
const replacedUrls: string[] = [];
const routedUrls: string[] = [];
const effects: EffectCallback[] = [];
const originalGlobals = new Map<string, PropertyDescriptor | undefined>();
const originalModules = new Map<string, NodeModule | undefined>();
let searchParams = new URLSearchParams();
let locationUrl = new URL('http://workshop.test/');
let stageId = '1';
let auth = { user: null as null | { app_metadata: { teacher: boolean }; user_metadata: object; email: string }, isLoading: false };
let WorkshopHall: ComponentType;
let StageContent: ComponentType;
let AchievementPage: ComponentType;
let ExhibitionShell: ComponentType<{ crumb: string; children?: React.ReactNode }>;
let CasePage: (props: { params: Promise<{ id: string }> }) => Promise<React.ReactNode>;
let store: typeof import('../../store/useWorkshopStore').useWorkshopStore;

function mockDependency(request: string, exports: unknown) {
  const id = requireModule.resolve(request);
  if (!originalModules.has(id)) originalModules.set(id, requireModule.cache[id]);
  requireModule.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule;
}

function setGlobal(name: string, value: unknown) {
  originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, value });
}

before(() => {
  // All storage, routing and identity are confined to this test process.
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  };
  setGlobal('localStorage', storage);
  setGlobal('window', {
    localStorage: storage,
    get location() { return locationUrl; },
    history: {
      replaceState: (_state: unknown, _title: string, url: string) => {
        replacedUrls.push(url);
        locationUrl = new URL(url, 'http://workshop.test');
        searchParams = locationUrl.searchParams;
      },
    },
  });

  mockDependency('next/navigation', {
    useSearchParams: () => searchParams,
    useParams: () => ({ id: stageId }),
    useRouter: () => ({ replace: (url: string) => routedUrls.push(url), push: (url: string) => routedUrls.push(url) }),
    notFound: () => { throw new Error('Unexpected missing case'); },
  });
  mockDependency('next/link', {
    __esModule: true,
    default: ({ children, ...props }: React.ComponentProps<'a'>) => React.createElement('a', props, children),
  });
  mockDependency('../../components/workshop/AuthProvider', {
    useAuth: () => ({ ...auth, signOut: async () => {} }),
  });
  // Unrelated visual children are not part of the navigation boundary under test.
  mockDependency('../../components/workshop/ExhibitionHall', {
    ExhibitionHall: () => React.createElement('div', { 'data-exhibition-hall': true }),
  });
  mockDependency('../../components/workshop/StageSim', { StageSim: () => null });
  mockDependency('../../components/workshop/ExhibitionImage', { ExhibitionImage: () => null });
  mockDependency('../../components/workshop/ExhibitVisit', { ExhibitVisit: () => null });

  const storeModule = requireModule('../../store/useWorkshopStore') as typeof import('../../store/useWorkshopStore');
  store = storeModule.useWorkshopStore;
  mockDependency('../../store/useWorkshopStore', {
    ...storeModule,
    useWorkshopStore: (selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()),
  });
  // SSR supplies real hook state; collect effects so the actual page redirect and
  // URL-cleanup code can be exercised after the render without mounting a browser.
  mockDependency('react', { ...React, useEffect: (effect: EffectCallback) => effects.push(effect) });

  WorkshopHall = requireModule('../../app/page').default;
  StageContent = requireModule('../../app/stage/[id]/StageContent').StageContent;
  AchievementPage = requireModule('../../app/achievement/page').default;
  ExhibitionShell = requireModule('../../components/workshop/ExhibitionParts').ExhibitionShell;
  CasePage = requireModule('../../app/exhibition/case/[id]/page').default;
});

beforeEach(() => {
  memory.clear();
  replacedUrls.length = 0;
  routedUrls.length = 0;
  effects.length = 0;
  searchParams = new URLSearchParams();
  locationUrl = new URL('http://workshop.test/');
  stageId = '1';
  auth = { user: null, isLoading: false };
  store.getState().resetAll();
  store.setState({ hydrated: true });
});

after(() => {
  for (const [name, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  for (const [id, module] of originalModules) {
    if (module) requireModule.cache[id] = module;
    else delete requireModule.cache[id];
  }
});

function identify(teacher: boolean) {
  auth.user = { app_metadata: { teacher }, user_metadata: {}, email: 'isolated-test@example.invalid' };
  memory.set('wj-role', teacher ? 'teacher' : 'student');
}

function render(component: ComponentType) {
  effects.length = 0;
  return renderToStaticMarkup(React.createElement(component));
}

function flushEffects() {
  const pending = effects.splice(0);
  for (const effect of pending) effect();
}

function returnLinks(html: string, label: string) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
    .filter(([, attributes, content]) => attributes.includes(`aria-label="${label}"`) || content.replace(/<[^>]*>/g, '').trim() === label)
    .map(([, attributes]) => {
      const match = attributes.match(/href="([^"]+)"/);
      assert.ok(match, `${label} must have an href`);
      return match[1].replaceAll('&amp;', '&');
    });
}

function visitHall(href: string) {
  locationUrl = new URL(href, 'http://workshop.test');
  searchParams = locationUrl.searchParams;
  return render(WorkshopHall);
}

function assertRepairHall(html: string) {
  assert.match(html, /id="panel-excavation"[^>]*>/);
  assert.doesNotMatch(html.match(/<section[^>]*id="panel-excavation"[^>]*>/)?.[0] ?? '', /hidden/);
  for (let id = 1; id <= 6; id++) assert.match(html, new RegExp(`href="/stage/${id}"`));
}

test('a teacher follows the real stage return link back to the repair hall', () => {
  identify(true);
  const links = returnLinks(render(StageContent), '返回工坊');
  assert.equal(links.length, 1);
  const hall = visitHall(links[0]);
  assertRepairHall(hall);
  flushEffects();
  assert.deepEqual(routedUrls, []);
  assert.deepEqual(replacedUrls, ['/']);
});

test('invalid stages and all achievement states return teachers to the repair hall', () => {
  identify(true);
  stageId = '999';
  const sources = [render(StageContent), render(AchievementPage)];
  store.setState({ completed: [1, 2, 3, 4, 5, 6] });
  sources.push(render(AchievementPage));
  store.setState({ achievementUnlocked: true, studentInfo: { studentId: 'test-only', name: '测试' } });
  sources.push(render(AchievementPage));
  for (const source of sources) {
    const links = returnLinks(source, '返回工坊');
    assert.equal(links.length, 1);
    assertRepairHall(visitHall(links[0]));
    flushEffects();
  }
  assert.deepEqual(routedUrls, []);
});

test('both exhibition shell and case footer preserve the exhibition tab for teachers', async () => {
  identify(true);
  const shell = renderToStaticMarkup(React.createElement(ExhibitionShell, { crumb: '发现与归属' }, null));
  const detail = renderToStaticMarkup(await CasePage({ params: Promise.resolve({ id: '5' }) }));
  const links = [...returnLinks(shell, '返回展厅'), ...returnLinks(detail, '返回展厅')];
  assert.equal(links.length, 3);
  for (const href of links) {
    const hall = visitHall(href);
    const panel = hall.match(/<section[^>]*id="panel-exhibition"[^>]*>/)?.[0];
    assert.ok(panel);
    assert.doesNotMatch(panel, /hidden/);
    flushEffects();
    assert.equal(replacedUrls.at(-1), '/?tab=exhibition');
  }
  assert.deepEqual(routedUrls, []);
});

test('a teacher opening the bare root still leaves for analytics without rendering the hall', () => {
  identify(true);
  const html = visitHall('/');
  assert.doesNotMatch(html, /panel-excavation|panel-exhibition|\/stage\/1/);
  flushEffects();
  assert.deepEqual(routedUrls, ['/teacher']);
});

test('ordinary students can use both the normal root and the same stage return link', () => {
  identify(false);
  const href = returnLinks(render(StageContent), '返回工坊')[0];
  assert.ok(href);
  for (const target of ['/', href]) {
    assertRepairHall(visitHall(target));
    flushEffects();
  }
  assert.deepEqual(routedUrls, []);
});

test('a stale local teacher hint does not redirect an authenticated student', () => {
  identify(false);
  memory.set('wj-role', 'teacher');
  assertRepairHall(visitHall('/'));
  flushEffects();
  assert.equal(memory.get('wj-role'), undefined);
  assert.deepEqual(routedUrls, []);
});
