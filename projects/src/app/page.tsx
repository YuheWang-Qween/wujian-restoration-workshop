'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { SECTIONS, STAGES } from '@/lib/workshop/content';
import { useWorkshopStore } from '@/store/useWorkshopStore';
import { useAuth } from '@/components/workshop/AuthProvider';
import { ExhibitionHall } from '@/components/workshop/ExhibitionHall';
import { ArrowRight, Award, BarChart3, Check, Compass, LogOut, RotateCcw } from 'lucide-react';
import { isGuestMode } from '@/lib/guest-mode';

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
  const achievementUnlocked = useWorkshopStore((s) => s.achievementUnlocked);
  const resetStage = useWorkshopStore((s) => s.resetStage);
  const submitted = useWorkshopStore((s) => s.submitted);
  const verdicts = useWorkshopStore((s) => s.verdicts);
  const done = hydrated ? completed : [];
  const allCompleted = done.length >= STAGES.length;
  const { user, signOut, isLoading } = useAuth();
  const [excavation, exhibition] = SECTIONS;
  const [isGuest, setIsGuest] = useState(false);
  // 案例精读页回展厅时带 ?tab=exhibition，初始落回「简牍鉴赏」页签
  const searchParams = useSearchParams();
  const router = useRouter();
  // 本组件包在 Suspense 里、纯客户端渲染，首帧即可读本地角色；
  // 服务端角色（app_metadata.teacher）才是权威：换设备/旧会话本地标记缺失的教师
  // 靠它兜住；反过来本地标记过期（当前会话是学生）也以会话为准，避免误拽去 /teacher。
  const [localTeacher] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('wj-role') === 'teacher',
  );
  const serverTeacher = user?.app_metadata?.teacher === true;
  // 只认挂载那一刻的 view 参数：Next 会把 history.replaceState 联动进路由，
  // 学生视角落地后清理 URL 的动作若反过来触发重定向，教师就永远进不了学生视角。
  const enteredAsStudent = useRef(searchParams.get('view') === 'student');
  const teacherLeaving =
    !enteredAsStudent.current &&
    (serverTeacher || (localTeacher && (isLoading || !user)));

  useEffect(() => {
    setIsGuest(isGuestMode());
    if (enteredAsStudent.current) {
      window.history.replaceState(null, '', '/');
      return;
    }
    // 会话未定先不跳：教师等确认（避免展馆闪现），学生也等确认（本地过期标记
    // 不能单独触发跳转，否则学生会被拽去 /teacher 撞权限墙）。
    if (isLoading) return;
    if (serverTeacher) {
      router.replace('/teacher');
      return;
    }
    if (user) {
      // 已登录但会话不是教师：本地教师标记是过期的，清掉
      if (localTeacher) localStorage.removeItem('wj-role');
      return;
    }
    // 未登录但本地有教师标记（会话过期）：照旧送去 /teacher，由它转登录页
    if (localTeacher) router.replace('/teacher');
  }, [localTeacher, serverTeacher, isLoading, user, router]);

  function stageProgress(stageId: number) {
    let total = 0;
    let answered = 0;
    let verified = 0;
    for (const q of STAGES.find((s) => s.id === stageId)?.questions ?? []) {
      if (q.parts) {
        for (const p of q.parts) {
          total++;
          const key = `${stageId}-${q.id}-${p.label}`;
          if (submitted[key]) answered++;
          if (verdicts[key]) verified++;
        }
      } else {
        total++;
        const key = `${stageId}-${q.id}`;
        if (submitted[key]) answered++;
        if (verdicts[key]) verified++;
      }
    }
    return { total, answered, verified };
  }

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

  // 教师被送去学情页前不渲染展馆内容：?tab=exhibition 复原的「简牍鉴赏」
  // 若照常首帧渲染，教师刷新/重开应用时会先闪现整页鉴赏再跳走。
  if (teacherLeaving) return null;

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
                    data-demo={`tab-${s.id}`}
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

            <div className="flex shrink-0 items-center gap-2 pb-1">
              {/* 登录用户可见的入口：教师进 /teacher（班级学情），学生进 /learner
                  （自己的学情）。教师换了浏览器或当前是学生会话时，自动跳转不会
                  触发，没有这个入口就再也进不去了；游客（未登录）无账号可鉴权，
                  不显示。 */}
              {user && (
                <button
                  type="button"
                  onClick={() => router.push(serverTeacher ? '/teacher' : '/learner')}
                  title={serverTeacher ? '查看班级与学生的学习数据' : '查看自己的学习足迹与判定'}
                  className="flex items-center gap-1.5 rounded border border-wj-border bg-wj-raised px-2.5 py-1.5 text-xs text-wj-ink transition-colors hover:border-wj-cinnabar hover:text-wj-cinnabar"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  学情分析
                </button>
              )}
              {user && <UserChip user={user} isTeacher={serverTeacher} />}
              {!user && isGuest && (
                <span
                  title="游客模式：浏览与作答不受限制，进度仅保存在本机浏览器，登录后可同步到账号"
                  className="flex items-center gap-1.5 rounded border border-wj-border bg-wj-raised px-2.5 py-1.5 text-xs text-wj-muted"
                >
                  <Compass className="h-3.5 w-3.5" />
                  游客
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  signOut();
                  setActive('excavation');
                }}
                className="flex items-center gap-1 rounded border border-wj-border px-2.5 py-1.5 text-xs text-wj-muted transition-colors hover:border-wj-cinnabar hover:text-wj-cinnabar"
              >
                <LogOut className="h-3.5 w-3.5" />
                {user ? '退出' : '退出游客'}
              </button>
            </div>
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

          return (
            <Link
              key={stage.id}
              href={`/stage/${stage.id}`}
              data-demo={`stage-${stage.id}`}
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
                <div>
                  <p className="text-sm leading-relaxed text-wj-muted">{stage.tagline}</p>
                  {(() => {
                    const p = stageProgress(stage.id);
                    if (p.total === 0) return null;
                    return (
                      <div className="mt-3 flex items-center gap-2 text-xs text-wj-dim">
                        <span>进度 {p.answered}/{p.total}</span>
                        {p.answered > 0 && (
                          <>
                            <span className="text-wj-line">·</span>
                            <span>评阅 {p.verified}/{p.total}</span>
                            <div className="ml-1 h-1 flex-1 max-w-[80px] overflow-hidden rounded-full bg-wj-line/40">
                              <div
                                className="h-full rounded-full bg-wj-cinnabar/60 transition-all duration-500"
                                style={{ width: `${(p.answered / p.total) * 100}%` }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {(() => {
                    const p = stageProgress(stage.id);
                    if (p.answered > 0) {
                      return (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm(`确定要重做「${stage.name}」吗？该环节的所有作答记录将被清除。`)) {
                              resetStage(stage.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs text-wj-dim transition-colors hover:text-wj-ochre"
                        >
                          <RotateCcw className="h-3 w-3" />
                          重做
                        </button>
                      );
                    }
                    return <span />;
                  })()}
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

        {/* 全环节完成后展示成就卡入口 */}
        {allCompleted && (
          <Link
            href="/achievement"
            className="group mt-8 flex items-center justify-between rounded-lg border-2 border-wj-cinnabar/30 bg-wj-surface p-5 transition-all duration-300 hover:border-wj-cinnabar/60 hover:shadow-[0_4px_8px_-2px_rgba(30,27,22,0.08),0_16px_40px_-16px_rgba(30,27,22,0.22)]"
          >
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-wj-cinnabar/10">
                <Award className="size-6 text-wj-cinnabar" />
              </div>
              <div>
                <div className="font-serif text-base font-semibold text-wj-ink">
                  {achievementUnlocked ? '查看成就卡' : '解锁成就卡'}
                </div>
                <div className="mt-0.5 text-sm text-wj-muted">
                  {achievementUnlocked
                    ? '已完成全部环节，查看你的结业成就卡'
                    : '已完成全部环节，填写学号姓名领取结业成就卡'}
                </div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-wj-cinnabar transition-all duration-200 group-hover:translate-x-1" />
          </Link>
        )}
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

type ChipUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

function UserChip({ user, isTeacher }: { user: ChipUser; isTeacher: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const meta = user.user_metadata ?? {};
  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url.trim() : '';
  const label = fullName || user.email?.split('@')[0] || '同学';
  const initial = (fullName || user.email?.[0] || '简').trim().charAt(0).toUpperCase();

  return (
    <span className="hidden items-center gap-2 sm:inline-flex">
      {avatarUrl && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="size-6 rounded-full object-cover ring-1 ring-wj-border"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="flex size-6 items-center justify-center rounded-full bg-wj-water/12 font-serif text-[11px] font-semibold text-wj-water ring-1 ring-wj-water/30">
          {initial}
        </span>
      )}
      <span className="text-xs text-wj-muted">
        {label}
        {isTeacher && (
          <span className="ml-1.5 rounded-sm border border-wj-water/40 bg-wj-water/10 px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-wj-water">
            教师
          </span>
        )}
      </span>
    </span>
  );
}
