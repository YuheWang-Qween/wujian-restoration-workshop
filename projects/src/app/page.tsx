'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SECTIONS, STAGES } from '@/lib/workshop/content';
import { isStageUnlocked, useWorkshopStore } from '@/store/useWorkshopStore';
import { useAuth } from '@/components/workshop/AuthProvider';
import { ExhibitionHall } from '@/components/workshop/ExhibitionHall';
import { ArrowRight, Check, Lock, LogOut } from 'lucide-react';

export default function WorkshopHall() {
  return (
    <Suspense>
      <WorkshopHallInner />
    </Suspense>
  );
}

function WorkshopHallInner() {
  const completed = useWorkshopStore((s) => s.completed);
  const hydrated = useWorkshopStore((s) => s.hydrated);
  const done = hydrated ? completed : [];
  const { user, signOut } = useAuth();
  const [excavation, exhibition] = SECTIONS;

  // 案例精读页回展厅时带 ?tab=exhibition，初始落回「简牍展示」页签
  const searchParams = useSearchParams();
  const [active, setActive] = useState(() =>
    searchParams.get('tab') === exhibition.id ? exhibition.id : excavation.id,
  );
  const switchTab = (id: string) => {
    setActive(id);
    window.history.replaceState(null, '', id === excavation.id ? '/' : `/?tab=${id}`);
  };
  const current = SECTIONS.find((s) => s.id === active) ?? excavation;
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // 左右方向键在两篇之间移动，这是 tablist 的标准键盘行为；
  // 只有两个页签，直接取另一个即可。
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = SECTIONS.findIndex((s) => s.id === active);
    const next = SECTIONS[(i + (e.key === 'ArrowRight' ? 1 : SECTIONS.length - 1)) % SECTIONS.length];
    switchTab(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <>
      {/* 动态背景 */}
      {/* 背景图 */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <img
          src="/lobby-bg.jpg"
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            opacity: 0.35,
          }}
        />
        {/* 微光呼吸 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(232,223,202,0.3) 0%, transparent 70%)',
          animation: 'wj-breathe 8s ease-in-out infinite',
        }} />
      </div>

      {/* 置顶栏：sticky 自动占位——标题在窄屏折行、头部变高时内容不会被压到底下 */}
      <header className="sticky top-0 z-50 border-b border-wj-line bg-wj-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="wj-seal hidden size-9 shrink-0 flex-col items-center justify-center rounded bg-wj-cinnabar text-wj-cinnabar-ink sm:flex"
            >
              <span className="text-xs leading-none">吴</span>
              <span className="text-xs leading-none">簡</span>
            </span>
            <div className="min-w-0">
              <h1 className="font-serif text-base leading-tight font-semibold tracking-wide text-wj-ink sm:text-lg">
                走马楼三国吴简 · 简牍修复工坊
              </h1>

            </div>
          </div>

          {/* 页签 + 登出 */}
          <div className="flex items-end gap-4">
            <div
              role="tablist"
              aria-label="工坊两篇"
              onKeyDown={onTabKeyDown}
              className="flex items-stretch gap-1"
            >
              {SECTIONS.map((s) => {
                const isActive = s.id === active;
                return (
                  <button
                    key={s.id}
                    ref={(el) => {
                      tabRefs.current[s.id] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`tab-${s.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${s.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => switchTab(s.id)}
                    className={`-mb-px flex items-baseline gap-1.5 rounded-t border-b-2 px-2 pt-1 pb-1.5 transition-colors sm:px-3 ${
                      isActive
                        ? 'border-wj-cinnabar'
                        : 'border-transparent hover:bg-wj-surface/45'
                    }`}
                  >
                    <span
                      className={`font-serif text-sm font-semibold tracking-wide whitespace-nowrap ${
                        isActive ? 'text-wj-ink' : 'text-wj-muted'
                      }`}
                    >
                      {s.name}
                    </span>
                    {s.status === 'planned' && (
                      <span className="shrink-0 text-[10px] whitespace-nowrap text-wj-muted">待补</span>
                    )}
                  </button>
                );
              })}
            </div>

            {user && (
              <div className="flex shrink-0 items-center gap-2 pb-1">
                <span className="hidden text-xs text-wj-muted sm:inline">{user.email}</span>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-1 rounded border border-wj-border px-2.5 py-1.5 text-xs text-wj-muted transition-colors hover:border-wj-cinnabar hover:text-wj-cinnabar"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  登出
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">

      <section
        role="tabpanel"
        id="panel-excavation"
        aria-labelledby="tab-excavation"
        hidden={active !== excavation.id}
      >
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {STAGES.map((stage) => {
          const isDone = done.includes(stage.id);
          const unlocked = isStageUnlocked(stage.id, done);
          const prevName = STAGES.find((s) => s.id === stage.id - 1)?.name;

          /* 未解锁：同一副骨架渲染成置灰的 div，不能点，一眼看出"还差一步" */
          if (!unlocked) {
            return (
              <div
                key={stage.id}
                aria-disabled="true"
                className="relative flex flex-col overflow-hidden rounded-lg border border-wj-border/70 bg-wj-surface motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3"
                style={{ animationDelay: `${stage.id * 80}ms`, animationFillMode: 'backwards' }}
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={`/stage-${stage.id}.jpeg`}
                    alt={stage.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover grayscale-[0.55] brightness-[0.82]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/15" />

                  <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-sm bg-black/45 px-2 py-0.5 text-xs text-white/85 backdrop-blur-sm">
                    <Lock className="h-3.5 w-3.5" />
                    未解锁
                  </span>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] tabular-nums tracking-[0.15em] text-white/55">
                        {String(stage.id).padStart(2, '0')}
                      </span>
                      {stage.light && (
                        <span className="text-[10px] text-white/40">轻量</span>
                      )}
                    </div>
                    <h2 className="mt-1 font-serif text-2xl font-semibold tracking-wide text-white/85">
                      {stage.name}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <p className="text-sm leading-relaxed text-wj-muted/75">{stage.tagline}</p>
                  <div className="mt-4 flex items-center justify-end">
                    <span className="inline-flex items-center gap-1.5 text-xs text-wj-muted">
                      <Lock className="h-3.5 w-3.5" />
                      答完「{prevName}」后解锁
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={stage.id}
              href={`/stage/${stage.id}`}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-wj-border/70 bg-wj-surface transition-all duration-300 hover:-translate-y-1 hover:border-wj-cinnabar/45 hover:shadow-[0_4px_8px_-2px_rgba(30,27,22,0.08),0_16px_40px_-16px_rgba(30,27,22,0.22)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3"
              style={{ animationDelay: `${stage.id * 80}ms`, animationFillMode: 'backwards' }}
            >
              {/* 封面图 + 标题叠加 */}
              <div className="relative h-52 overflow-hidden">
                <img
                  src={`/stage-${stage.id}.jpeg`}
                  alt={stage.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/5" />

                {/* 完成标记 */}
                {isDone && (
                  <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-sm bg-wj-bamboo/85 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                    <Check className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}

                {/* 底部信息：编号 + 标题 */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] tabular-nums tracking-[0.15em] text-white/70">
                      {String(stage.id).padStart(2, '0')}
                    </span>
                    {stage.light && (
                      <span className="text-[10px] text-white/50">轻量</span>
                    )}
                  </div>
                  <h2 className="mt-1 font-serif text-2xl font-semibold tracking-wide text-white">
                    {stage.name}
                  </h2>
                </div>
              </div>

              {/* 文字内容 */}
              <div className="flex flex-1 flex-col justify-between p-5">
                <p className="text-sm leading-relaxed text-wj-muted">{stage.tagline}</p>
                <div className="mt-4 flex items-center justify-end">
                  <span className="inline-flex items-center gap-1 text-sm text-wj-cinnabar/80 transition-all duration-200 group-hover:gap-2 group-hover:text-wj-cinnabar">
                    进入
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
        </div>
      </section>

      <section
        role="tabpanel"
        id="panel-exhibition"
        aria-labelledby="tab-exhibition"
        hidden={active !== exhibition.id}
      >
        <ExhibitionHall />
      </section>

      </main>
    </>
  );
}
