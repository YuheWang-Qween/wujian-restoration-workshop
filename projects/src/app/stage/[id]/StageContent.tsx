'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Loader2, Lock, LogOut, MessagesSquare, PenLine } from 'lucide-react';
import { ACT_DATA, ACT_QUESTIONS, ACT_WHY, STAGES, getStage, stageActTitles, type WjPart, type WjQuestion, type WjStage } from '@/lib/workshop/content';
import { DataTable } from '@/components/workshop/DataTable';
import { askGuide } from '@/lib/workshop/guide-bridge';
import { answerKey, isStageUnlocked, useWorkshopStore } from '@/store/useWorkshopStore';
import { useAuth } from '@/components/workshop/AuthProvider';

export function StageContent() {
  const params = useParams<{ id: string }>();
  const stageId = Number(params?.id);
  const stage = useMemo(() => getStage(stageId), [stageId]);

  const hydrated = useWorkshopStore((s) => s.hydrated);
  const { signOut } = useAuth();
  const completed = useWorkshopStore((s) => s.completed);
  const markCompleted = useWorkshopStore((s) => s.markCompleted);
  const actsRevealedRaw = useWorkshopStore((s) => s.actsRevealed[stageId] ?? 1);
  const revealNextAct = useWorkshopStore((s) => s.revealNextAct);
  const revealPrevAct = useWorkshopStore((s) => s.revealPrevAct);
  const isDone = hydrated && completed.includes(stageId);

  // 完成的判定：最后一道子问题「答完」——有小问的题要求每个小问都写了内容，
  // 无小问的题要求整题答题框非空。只订阅布尔值，不随每次按键重渲染
  const lastQuestion = stage?.questions[stage.questions.length - 1];
  const lastAnswered = useWorkshopStore((s) =>
    stage && lastQuestion ? isQuestionAnswered(s.answers, stage.id, lastQuestion) : false,
  );

  // 完成不需要手动点：最后一题答完即自动标记。
  // 放在守卫前是因为 hooks 不能落在提前 return 之后；
  // persist 恢复出的老答案也会在这里补登完成。
  useEffect(() => {
    if (!hydrated || !stage || !lastQuestion || isDone) return;
    if (lastAnswered) markCompleted(stage.id);
  }, [hydrated, stage, lastQuestion, lastAnswered, isDone, markCompleted]);

  if (!stage) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="text-center">
          <h1 className="font-serif text-xl font-semibold text-wj-ink">没有这道工序</h1>
          <p className="mt-2 text-sm text-wj-muted">工坊只有六个环节，编号 1 到 6。</p>
          <Link
            href="/"
            className="mt-5 inline-flex h-9 items-center gap-2 rounded border border-wj-border px-4 text-sm text-wj-ink transition-colors hover:border-wj-cinnabar/60"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工坊
          </Link>
        </div>
      </main>
    );
  }

  // persist 落定前不知道学习者的进度，渲染一副中性的等待壳，
  // 否则 SSR 按"有内容"输出、客户端水合后可能整页换成解锁提示，既闪也报 mismatch
  if (!hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-wj-cinnabar" />
      </main>
    );
  }

  // 顺序解锁：直接输 URL 闯进来也拦。拦的是内容，不是人——指回该去的环节
  if (!isStageUnlocked(stage.id, completed)) {
    const lockedPrev = getStage(stage.id - 1);
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-md bg-wj-sunk">
            <Lock className="h-6 w-6 text-wj-muted" />
          </span>
          <h1 className="mt-4 font-serif text-xl font-semibold text-wj-ink">
            「{stage.name}」尚未解锁
          </h1>
          <p className="mt-3 text-sm leading-7 text-wj-muted">
            六道工序按顺序进行。先答完{lockedPrev ? `「${lockedPrev.name}」` : '上一环节'}的最后一道子问题，
            这一环节才会打开。
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded border border-wj-border px-4 text-sm text-wj-ink transition-colors hover:border-wj-cinnabar/60"
            >
              <ArrowLeft className="h-4 w-4" />
              返回工坊
            </Link>
            {lockedPrev && (
              <Link
                href={`/stage/${lockedPrev.id}`}
                className="inline-flex h-9 items-center gap-2 rounded bg-wj-cinnabar px-4 text-sm font-medium text-wj-cinnabar-ink transition-colors hover:bg-wj-cinnabar/90"
              >
                前往「{lockedPrev.name}」
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  const prev = STAGES.find((s) => s.id === stage.id - 1);
  const next = STAGES.find((s) => s.id === stage.id + 1);
  const nextUnlocked = next ? isStageUnlocked(next.id, completed) : false;

  // 一节一屏：同屏只出现当前这一节，上一节随切换离场；当前节序号存本机，刷新回到已读位置。
  // 节数口径统一走 content.stageActTitles，与 GuideChat / guide-lines 一致
  const totalActs = stageActTitles(stage).length;
  const hasAct2 = totalActs === 3;
  const revealed = Math.min(actsRevealedRaw, totalActs);
  const nextAct =
    revealed >= totalActs
      ? null
      : revealed === 1 && hasAct2
        ? { key: 'data', title: ACT_DATA }
        : { key: 'questions', title: ACT_QUESTIONS };
  const prevAct =
    revealed <= 1
      ? null
      : revealed === 2
        ? { key: 'why', title: ACT_WHY }
        : { key: 'data', title: ACT_DATA };

  // rAF 排在本轮状态提交之后执行，此时新节已经渲染出来，可以直接滚
  const scrollToAct = (key: string) => {
    requestAnimationFrame(() => {
      document
        .getElementById(`stage-act-${key}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const handleRevealAct = () => {
    if (!nextAct) return;
    revealNextAct(stage.id, totalActs);
    scrollToAct(nextAct.key);
  };
  const handlePrevAct = () => {
    if (!prevAct) return;
    revealPrevAct(stage.id);
    scrollToAct(prevAct.key);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* 环境底景：当前环节的意象图极淡地垫在页面底层，渐变纱罩上下浓、中间淡，
          阅读区的纸色卡片压在其上——环境随环节更换，文字不受影响 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <img
          src={`/stage-${stage.id}.jpeg`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.22]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in oklab, var(--wj-bg) 84%, transparent), color-mix(in oklab, var(--wj-bg) 55%, transparent) 45%, color-mix(in oklab, var(--wj-bg) 90%, transparent))',
          }}
        />
      </div>

      <header className="relative z-10 shrink-0 border-b border-wj-border bg-wj-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="返回工坊"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded text-wj-muted transition-colors hover:bg-wj-raised hover:text-wj-ink"
          >
            <ArrowLeft className="size-[18px]" />
          </Link>

          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-serif text-base text-wj-cinnabar">{stage.ordinal}</span>
            <h1 className="truncate font-serif text-base font-semibold tracking-wide text-wj-ink">
              {stage.name}
            </h1>
            <span className="hidden truncate text-xs text-wj-muted xl:inline">
              {stage.tagline}
            </span>
          </div>

          <nav aria-label="六道工序" className="ml-auto hidden items-center gap-1 md:flex">
            {STAGES.map((s) => {
              if (s.id !== stage.id && !isStageUnlocked(s.id, completed)) {
                return (
                  <span
                    key={s.id}
                    aria-disabled="true"
                    title={`答完上一环节后解锁`}
                    className="inline-flex h-7 cursor-not-allowed items-center rounded px-2 text-xs text-wj-dim"
                  >
                    {s.name}
                    <Lock className="ml-1 h-3 w-3" />
                  </span>
                );
              }
              return (
                <Link
                  key={s.id}
                  href={`/stage/${s.id}`}
                  title={s.name}
                  className={`inline-flex h-7 items-center rounded px-2 text-xs transition-colors ${
                    s.id === stage.id
                      ? 'bg-wj-cinnabar text-wj-cinnabar-ink'
                      : 'text-wj-muted hover:bg-wj-raised hover:text-wj-ink'
                  }`}
                >
                  {s.name}
                  {completed.includes(s.id) && s.id !== stage.id && (
                    <Check className="ml-1 h-3 w-3 text-wj-bamboo" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-3">
            {/* 完成是自动的：读到最后一节即戴上这枚印记，不可点击 */}
            {isDone && (
              <span className="inline-flex h-9 items-center gap-1.5 rounded border border-wj-bamboo/50 bg-wj-bamboo/10 px-3 text-sm font-medium text-wj-bamboo">
                <Check className="h-4 w-4" />
                已完成
              </span>
            )}

            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded border border-wj-border px-2.5 text-xs text-wj-muted transition-colors hover:border-wj-cinnabar hover:text-wj-cinnabar"
              title="登出"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">登出</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col">
        {/* 环节资料（单栏，页面唯一的滚动区） */}
        <article className="wj-scrollbar-none wj-chat-dodge min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {/* 工序说明（一节一屏：只在当前节是第一节时出现）。首节不加节小标，导语直接开篇 */}
            {revealed === 1 && (
              <section
                id="stage-act-why"
                className="wj-slip scroll-mt-4 rounded-lg border border-wj-border bg-wj-surface p-5 pl-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 sm:p-6 sm:pl-7"
              >
                {stage.why.map((p, i) =>
                  i === 0 ? (
                    // 首段作导语：全墨色、首字下沉（旧书刊排法），与后面缩进段落拉开层级
                    <p key={i} className="text-base leading-8 text-wj-ink">
                      <span className="float-left mt-1 mr-2.5 font-serif text-[3.25rem] leading-[0.85] font-semibold text-wj-ink">
                        {p.slice(0, 1)}
                      </span>
                      {renderRich(p.slice(1))}
                    </p>
                  ) : (
                    <p key={i} className="mt-4 indent-[2em] text-[15px] leading-8 text-wj-ink/85">
                      {renderRich(p)}
                    </p>
                  ),
                )}
              </section>
            )}

            {/* 二 · 关键数据（一节一屏：只在当前节是第二节时出现） */}
            {hasAct2 && revealed === 2 && (
              <section
                id="stage-act-data"
                className="scroll-mt-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500"
              >
                <SectionHeading title={ACT_DATA} />
                {stage.figure && (
                  <figure className="mt-4 overflow-hidden rounded-lg border border-wj-border bg-wj-surface">
                    <img
                      src={stage.figure.src}
                      alt={stage.figure.caption}
                      loading="lazy"
                      className="aspect-video w-full object-cover"
                    />
                    <figcaption className="flex items-baseline gap-2 border-t border-wj-line px-3 py-2 text-xs text-wj-muted">
                      <span className="shrink-0 font-serif font-semibold text-wj-cinnabar">
                        图 {stage.ordinal}
                      </span>
                      <span>{stage.figure.caption}</span>
                    </figcaption>
                  </figure>
                )}
                {stage.facts.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {stage.facts.map((f) => (
                    <div
                      key={f.label}
                      className="rounded border border-wj-line bg-wj-surface px-3 py-2.5"
                    >
                      <dt className="text-xs text-wj-muted">{f.label}</dt>
                      <dd className="mt-1 font-mono text-[15px] leading-6 text-wj-water">
                        {f.value}
                      </dd>
                      {f.note && <p className="mt-0.5 text-[11px] text-wj-dim">{f.note}</p>}
                    </div>
                  ))}
                </dl>
                )}
                {stage.tables.map((t, i) => (
                  <DataTable key={i} table={t} />
                ))}
              </section>
            )}

            {/* 三 · 子问题（最后一节，此时底部出现环节间导航） */}
            {revealed === totalActs && (
            <section
              id="stage-act-questions"
              className="scroll-mt-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500"
            >
              <SectionHeading
                title={ACT_QUESTIONS}
                note={
                  stage.light
                    ? '轻量环节，只设两道，不与其余环节强求对称'
                    : '有数据处从数据反推结论，有决策处还原当时的选项与约束'
                }
              />

              {/* 一题一答：同屏只出现当前这道题，作答后解锁下一题（key 保证换环节时进度归零重算） */}
              <QuestionWizard key={stage.id} stage={stage} />

              {/* 完成机制的说明：没有手动按钮，要让学习者知道作答即完成 */}
              {!isDone ? (
                <p className="mt-5 flex items-center gap-1.5 text-xs text-wj-muted">
                  <PenLine className="h-3.5 w-3.5" />
                  在最后一道子问题的答题框写下你的作答，本环节即自动标记为完成
                </p>
              ) : (
                <p className="mt-5 flex items-center gap-1.5 text-xs text-wj-bamboo">
                  <Check className="h-3.5 w-3.5" />
                  {next ? '本环节已完成，下一环节已解锁' : '本环节已完成——六道工序全部读完'}
                </p>
              )}
            </section>
            )}

            {/* 一节一屏：第二节起底部左侧可回「上一节」；读到最后一节后这里换成环节间导航 */}
            {nextAct ? (
              <div className="mt-8 flex items-stretch gap-3">
                {prevAct && (
                  <button
                    type="button"
                    onClick={handlePrevAct}
                    title={`回到「${prevAct.title}」`}
                    className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-wj-border bg-wj-surface/50 px-3 text-sm text-wj-muted transition-colors hover:border-wj-cinnabar/50 hover:bg-wj-surface hover:text-wj-ink"
                  >
                    <ChevronUp className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                    上一节
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRevealAct}
                  className="group flex flex-1 items-center justify-center gap-3 rounded-lg border border-dashed border-wj-border bg-wj-surface/50 px-4 py-4 transition-colors hover:border-wj-cinnabar/50 hover:bg-wj-surface"
                >
                  <span className="font-serif text-sm font-semibold tracking-[0.25em] text-wj-cinnabar">
                    接着读
                  </span>
                  <span className="font-serif text-base font-semibold text-wj-ink">
                    {nextAct.title}
                  </span>
                  <ChevronDown className="h-4 w-4 text-wj-muted transition-transform duration-300 group-hover:translate-y-0.5 group-hover:text-wj-cinnabar" />
                </button>
              </div>
            ) : (
            <div className="mt-8 flex items-center gap-3 border-t border-wj-line pt-5">
              {prevAct && (
                <button
                  type="button"
                  onClick={handlePrevAct}
                  title={`回到「${prevAct.title}」`}
                  className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded border border-wj-border px-3 text-sm text-wj-muted transition-colors hover:border-wj-cinnabar/60 hover:text-wj-ink"
                >
                  <ChevronUp className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  上一节
                </button>
              )}
            <nav className="flex flex-1 items-center justify-between gap-3">
              {prev ? (
                <Link
                  href={`/stage/${prev.id}`}
                  className="inline-flex h-9 min-w-0 items-center gap-2 rounded border border-wj-border px-3 text-sm text-wj-ink transition-colors hover:border-wj-cinnabar/60"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {prev.ordinal}　{prev.name}
                  </span>
                </Link>
              ) : (
                <Link
                  href="/"
                  className="inline-flex h-9 items-center gap-2 rounded border border-wj-border px-3 text-sm text-wj-ink transition-colors hover:border-wj-cinnabar/60"
                >
                  <ArrowLeft className="h-4 w-4" />
                  返回工坊
                </Link>
              )}
              {next &&
                (nextUnlocked ? (
                  <Link
                    href={`/stage/${next.id}`}
                    className="inline-flex h-9 min-w-0 items-center gap-2 rounded bg-wj-cinnabar px-3 text-sm font-medium text-wj-cinnabar-ink transition-colors hover:bg-wj-cinnabar/90"
                  >
                    <span className="truncate">
                      {next.ordinal}　{next.name}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    title="答完本环节最后一道子问题后解锁"
                    className="inline-flex h-9 min-w-0 cursor-not-allowed items-center gap-2 rounded border border-wj-line px-3 text-sm text-wj-dim"
                  >
                    <Lock className="h-4 w-4 shrink-0" />
                    <span className="truncate">答完本环节后解锁</span>
                  </span>
                ))}
            </nav>
            </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

/** 正文里的数字与编号（228 枚、J22、76 厘米、c①→c②）统一用井水青等宽体显影，与数据卡同口径 */
const RICH_TOKEN_RE = /([A-Za-z0-9]+(?:[./-][A-Za-z0-9]+)*%?|[①-⑳])/g;

function renderRich(text: string) {
  // split 带捕获组时，命中的 token 落在奇数位，直接用下标判断，避免全局正则的 lastIndex 状态
  return text.split(RICH_TOKEN_RE).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-mono text-[0.9em] text-wj-water">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** 节标题：环节资料按「节」推进——工序说明 → 关键数据 → 子问题；首节无小标，后两节只留标题不编序号 */
function SectionHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-wj-line pb-2.5">
      <h2 className="font-serif text-lg font-semibold text-wj-ink">{title}</h2>
      {note && <span className="text-xs text-wj-muted">{note}</span>}
    </div>
  );
}

/**
 * 一道题是否「答完」：有小问的题要求每个小问都写了内容（非空白），
 * 无小问的题看整题答题框。完成判定与步进器共用这一口径。
 */
function isQuestionAnswered(
  answers: Record<string, string>,
  stageId: number,
  q: WjQuestion,
): boolean {
  if (q.parts.length === 0) return (answers[answerKey(stageId, q.id)] ?? '').trim().length > 0;
  return q.parts.every(
    (p) => (answers[answerKey(stageId, q.id, p.label)] ?? '').trim().length > 0,
  );
}

/**
 * 子问题步进器：一题一答、题内一小问一答。同屏只渲染当前一道题，
 * 题内的小问逐个展开（写完（a）才出（b）），顺序推进——
 * 第 i 题在前一题答完后解锁（与环节间的顺序解锁同一精神）；
 * 进度圆点可回看已答完的题；初始定位到第一道未答完的题。
 */
function QuestionWizard({ stage }: { stage: WjStage }) {
  // 各题是否已答完：拼成 '10…' 字符串的原始值选择器——
  // 只有某题「未答完 ↔ 答完」翻转时才重渲染，不随每次按键动
  const answeredBits = useWorkshopStore((s) =>
    stage.questions
      .map((q) => (isQuestionAnswered(s.answers, stage.id, q) ? '1' : '0'))
      .join(''),
  );
  const answered = stage.questions.map((_, i) => answeredBits[i] === '1');
  const total = stage.questions.length;

  const firstOpen = answered.indexOf(false);
  const [current, setCurrent] = useState(() => (firstOpen === -1 ? total - 1 : firstOpen));

  const q = stage.questions[current];
  const label = `子问题 ${current + 1}`;

  // 当前题各小问是否已作答：'10…' 原始值选择器，翻转才重渲染。
  // 小问逐个展开：已答的全部保留，再多露一个未答的
  const partBits = useWorkshopStore((s) =>
    q.parts
      .map((p) => ((s.answers[answerKey(stage.id, q.id, p.label)] ?? '').trim() ? '1' : '0'))
      .join(''),
  );
  const partAnswered = q.parts.map((_, i) => partBits[i] === '1');
  const firstOpenPart = partAnswered.indexOf(false);
  const visibleParts = firstOpenPart === -1 ? q.parts.length : firstOpenPart + 1;

  // 顺序推进：第 i 题在 i===0 或前一题已答完时可进入
  const canEnter = (i: number) => i === 0 || answered[i - 1];

  const goTo = (i: number) => {
    if (i < 0 || i >= total || !canEnter(i)) return;
    setCurrent(i);
    requestAnimationFrame(() => {
      document
        .getElementById('stage-act-questions')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="mt-4">
      {/* 进度：题号圆点（✓ 已答 / 朱砂当前 / 可进入 / 置灰待解锁） */}
      <div className="flex flex-wrap items-center gap-2">
        {stage.questions.map((question, i) => {
          const isCurrent = i === current;
          const enterable = canEnter(i);
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => goTo(i)}
              disabled={!enterable || isCurrent}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`子问题 ${i + 1}${answered[i] ? '（已作答）' : enterable ? '' : '（作答上一题后解锁）'}`}
              title={enterable ? `子问题 ${i + 1}` : '作答上一题后解锁'}
              className={`flex size-8 items-center justify-center rounded-full border font-mono text-sm transition-colors ${
                isCurrent
                  ? 'border-wj-cinnabar bg-wj-cinnabar text-wj-cinnabar-ink'
                  : answered[i]
                    ? 'border-wj-bamboo/50 bg-wj-bamboo/10 text-wj-bamboo hover:border-wj-bamboo'
                    : enterable
                      ? 'border-wj-border bg-wj-surface text-wj-muted hover:border-wj-cinnabar/50'
                      : 'cursor-not-allowed border-wj-line bg-wj-sunk/50 text-wj-dim'
              }`}
            >
              {answered[i] && !isCurrent ? <Check className="h-4 w-4" /> : i + 1}
            </button>
          );
        })}
        <span className="ml-1 text-xs text-wj-muted">
          第 {current + 1} / {total} 题
          {answered.filter(Boolean).length > 0 && ` · 已答 ${answered.filter(Boolean).length} 题`}
        </span>
      </div>

      {/* 当前题卡（key 触发切题进场动效） */}
      <div
        key={q.id}
        className="mt-4 rounded-lg border border-wj-border bg-wj-surface p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-sm font-semibold text-wj-ink">{label}</span>
          <span className="rounded-sm border border-wj-cinnabar/35 bg-wj-cinnabar/[0.07] px-1.5 py-0.5 text-[11px] whitespace-nowrap text-wj-cinnabar">
            {q.kind}
          </span>
          <button
            type="button"
            onClick={() =>
              askGuide(
                `我正在做「${label}」（${q.kind}）${
                  q.parts.length > 0 && firstOpenPart !== -1
                    ? `的（${q.parts[firstOpenPart].label}）小问`
                    : ''
                }，请引导我理清思路——先别直接给答案。`,
              )
            }
            className="ml-auto inline-flex items-center gap-1.5 rounded border border-wj-cinnabar/35 px-2.5 py-1.5 text-xs text-wj-cinnabar transition-colors hover:bg-wj-cinnabar/[0.07]"
          >
            <MessagesSquare className="h-3.5 w-3.5" />
            问小简这道题
          </button>
        </div>

        <p className="mt-3 text-[15px] leading-8 text-wj-ink/85">{renderRich(q.stem)}</p>

        {q.table && <DataTable table={q.table} dense />}

        {/* 小问逐个作答：一小问一个作答框，写完当前小问才展开下一问 */}
        {q.parts.length > 0 ? (
          <>
            <ul className="mt-3 space-y-4">
              {q.parts.slice(0, visibleParts).map((p) => (
                <li
                  key={p.label}
                  className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
                >
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 font-mono text-sm text-wj-cinnabar">
                      （{p.label}）
                    </span>
                    <p className="text-[15px] leading-8 text-wj-ink/85">
                      {p.tag && (
                        <span className="mr-1.5 rounded-sm bg-wj-sunk px-1.5 py-0.5 text-[11px] text-wj-muted">
                          {p.tag}
                        </span>
                      )}
                      {renderRich(p.text)}
                    </p>
                  </div>
                  <AnswerBox stageId={stage.id} question={q} label={label} part={p} />
                </li>
              ))}
            </ul>
            {visibleParts < q.parts.length && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-wj-dim">
                <PenLine className="h-3.5 w-3.5" />
                写下（{q.parts[visibleParts - 1].label}）的作答后，展开下一小问（本题共{' '}
                {q.parts.length} 问）
              </p>
            )}
            <p className="mt-3 text-right text-[11px] text-wj-dim">草稿自动存在本机，刷新不丢</p>
          </>
        ) : (
          <AnswerBox stageId={stage.id} question={q} label={label} />
        )}
      </div>

      {/* 题间导航：上一题回看，下一题作答后解锁 */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded border border-wj-border px-3 text-sm text-wj-muted transition-colors hover:border-wj-cinnabar/50 hover:text-wj-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          上一题
        </button>

        {current < total - 1 && (
          <div className="flex items-center gap-2.5">
            {!answered[current] && (
              <span className="text-[11px] text-wj-dim">写下作答后进入下一题</span>
            )}
            <button
              type="button"
              onClick={() => goTo(current + 1)}
              disabled={!answered[current]}
              className="inline-flex h-9 items-center gap-1.5 rounded bg-wj-cinnabar px-3 text-sm font-medium text-wj-cinnabar-ink transition-colors hover:bg-wj-cinnabar/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一题
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface AnswerBoxProps {
  stageId: number;
  question: WjQuestion;
  label: string;
  /** 传入则是某个小问的作答框（一小问一框），不传则是整题一框 */
  part?: WjPart;
}

function AnswerBox({ stageId, question, label, part }: AnswerBoxProps) {
  const hydrated = useWorkshopStore((s) => s.hydrated);
  const stored = useWorkshopStore((s) => s.answers[answerKey(stageId, question.id, part?.label)]);
  const setAnswer = useWorkshopStore((s) => s.setAnswer);

  // persist 落定之前一律按空串渲染，与服务端输出保持一致，避免 hydration 不匹配
  const value = hydrated ? (stored ?? '') : '';
  const fieldId = `answer-${stageId}-${question.id}${part ? `-${part.label}` : ''}`;

  return (
    <div className={part ? 'mt-2 pl-8' : 'mt-4 border-t border-dashed border-wj-line pt-4'}>
      {part ? (
        <label htmlFor={fieldId} className="sr-only">
          （{part.label}）的作答
        </label>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <label htmlFor={fieldId} className="text-xs font-medium text-wj-ink">
            我的答案
          </label>
          <span className="text-[11px] text-wj-muted">
            自答自核用，计算题请写出过程
          </span>
        </div>
      )}

      <textarea
        id={fieldId}
        value={value}
        onChange={(e) => setAnswer(stageId, question.id, e.target.value, part?.label)}
        rows={part ? 3 : 4}
        placeholder={part ? `写下（${part.label}）小问的作答……` : `写下你对${label}的作答……`}
        className="wj-scrollbar mt-2 w-full resize-y rounded border border-wj-border bg-wj-raised px-3 py-2 text-base leading-7 sm:text-sm text-wj-ink placeholder:text-wj-dim focus:border-wj-cinnabar/60 focus:outline-none"
      />

      {!part && (
        <div className="mt-2 flex items-center justify-end">
          <span className="text-[11px] text-wj-dim">草稿自动存在本机，刷新不丢</span>
        </div>
      )}
    </div>
  );
}
