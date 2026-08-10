'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, ChevronUp, Loader2, Lock, LogOut, MessagesSquare, PenLine, ScrollText, Stamp, X } from 'lucide-react';
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

  // 完成的判定：最后一道细问「答完」——有小问的题要求每个小问都写了内容，
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
            六道工序按顺序进行。先答完{lockedPrev ? `「${lockedPrev.name}」` : '上一环节'}的最后一道细问，
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

  const next = STAGES.find((s) => s.id === stage.id + 1);

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

            {/* 三 · 细问（最后一节，此时底部出现环节间导航） */}
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
                  在最后一道细问的答题框写下你的作答，本环节即自动标记为完成
                </p>
              ) : (
                <p className="mt-5 flex items-center gap-1.5 text-xs text-wj-bamboo">
                  <Check className="h-3.5 w-3.5" />
                  {next ? '本环节已完成，下一环节已解锁' : '本环节已完成——六道工序全部读完'}
                </p>
              )}
            </section>
            )}

            {/* 一节一屏：第二节起底部左侧可回「上一节」 */}
            {nextAct && (
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

/** 节标题：环节资料按「节」推进——工序说明 → 关键数据 → 细问；首节无小标，后两节只留标题不编序号 */
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
 * 细问步进器：一题一答、题内一小问一答。同屏只渲染当前一道题，
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
  const label = `细问 ${current + 1}`;

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
              aria-label={`细问 ${i + 1}${answered[i] ? '（已作答）' : enterable ? '' : '（作答上一题后解锁）'}`}
              title={enterable ? `细问 ${i + 1}` : '作答上一题后解锁'}
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
                    <span className="mt-0.5 shrink-0 text-[15px] leading-8 text-wj-cinnabar">
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

/** 判定章配色：成立竹青、部分成立赭石、不成立朱砂——沿用工坊色谱 */
/* ---------- 结构化作答（排序 / 单选）----------
 * 非文本题的答案序列化为纯文本协议存入 answers，与文本题共用存储和判对错通道；
 * 协议格式已在 prompt.ts / grade-prompt.ts 的「格式约定」里同步给模型。
 *   排序题：「排序：a → b → c①、c②」（「→」分隔层、左为先/上，「、」为同层并列）+ 可选一行「补充：…」
 *   单选题：「选择：B」+ 可选一行「补充：…」；多选题：「多选：A、C」+ 可选一行「补充：…」
 *   判断题：「判断：①正、②误、③正」（逐条正误）+ 一行「说明：…」
 *   匹配题：「匹配：A→②；B→①」（左项 key → 右项 key） */

function parseNoteLine(raw: string, prefix: string): string {
  const line = raw.split('\n').find((l) => l.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : '';
}

function parseOrdering(raw: string): { layers: string[][]; note: string } {
  let layers: string[][] = [];
  let note = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('排序：')) {
      layers = line
        .slice(3)
        .split('→')
        .map((layer) =>
          layer
            .split('、')
            .map((s) => s.trim())
            .filter(Boolean),
        )
        .filter((layer) => layer.length > 0);
    } else if (line.startsWith('补充：')) {
      note = line.slice(3);
    }
  }
  return { layers, note };
}

function parseChoice(raw: string): { selected: string; note: string } {
  return { selected: parseNoteLine(raw, '选择：'), note: parseNoteLine(raw, '补充：') };
}

function parseMulti(raw: string): { selected: string[]; note: string } {
  const line = parseNoteLine(raw, '多选：');
  return {
    selected: line ? line.split('、').map((s) => s.trim()).filter(Boolean) : [],
    note: parseNoteLine(raw, '补充：'),
  };
}

function parseMatching(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  const line = parseNoteLine(raw, '匹配：');
  if (line) {
    for (const seg of line.split('；')) {
      const [left, right] = seg.split('→').map((s) => s.trim());
      if (left && right) map[left] = right;
    }
  }
  return map;
}

function OrderingInput({
  items,
  value,
  onChange,
  disabled,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { layers, note } = parseOrdering(value);
  const [activeLayer, setActiveLayer] = useState(0);
  const active = Math.min(activeLayer, layers.length);
  const used = new Set(layers.flat());
  const remaining = items.filter((i) => !used.has(i));

  const commit = (nextLayers: string[][], nextNote: string) => {
    const filled = nextLayers.filter((l) => l.length > 0);
    const lines = [`排序：${filled.map((l) => l.join('、')).join(' → ')}`];
    if (nextNote.trim()) lines.push(`补充：${nextNote.trim()}`);
    onChange(lines.join('\n'));
  };
  const addItem = (item: string) => {
    const next = layers.map((l) => [...l]);
    if (active >= next.length) next.push([item]);
    else next[active].push(item);
    commit(next, note);
  };
  const removeItem = (li: number, item: string) =>
    commit(
      layers.map((l, i) => (i === li ? l.filter((x) => x !== item) : l)),
      note,
    );
  const moveLayer = (li: number) => {
    const next = layers.map((l) => [...l]);
    [next[li - 1], next[li]] = [next[li], next[li - 1]];
    commit(next, note);
  };
  const removeLayer = (li: number) => commit(layers.filter((_, i) => i !== li), note);

  return (
    <div>
      <p className="text-xs leading-5 text-wj-dim">
        上层先于下层揭取；先后无法确定的单位放进同一层。点层选中（朱砂描边为当前层），再点下方单位入层；点末尾虚线层开新层。
      </p>
      <ol className="mt-2 space-y-1">
        {layers.map((layer, li) => (
          <li
            key={li}
            role="button"
            tabIndex={0}
            onClick={() => setActiveLayer(li)}
            onKeyDown={(e) => e.key === 'Enter' && setActiveLayer(li)}
            className={`flex items-start gap-2 rounded border px-3 py-1.5 transition-colors ${
              active === li ? 'border-wj-cinnabar/60 bg-wj-raised' : 'border-wj-line bg-wj-raised'
            }`}
          >
            <span className="mt-0.5 w-5 shrink-0 font-mono text-xs text-wj-ochre">{li + 1}.</span>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {layer.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded border border-wj-line bg-wj-paper px-2 py-0.5 font-mono text-sm text-wj-ink"
                >
                  {item}
                  <button
                    type="button"
                    title="移回待排"
                    aria-label={`把 ${item} 移回待排`}
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(li, item);
                    }}
                    className="text-wj-dim transition-colors hover:text-wj-cinnabar disabled:opacity-30"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              title="整层上移"
              aria-label="整层上移"
              disabled={disabled || li === 0}
              onClick={(e) => {
                e.stopPropagation();
                moveLayer(li);
              }}
              className="mt-0.5 shrink-0 text-wj-dim transition-colors hover:text-wj-ink disabled:opacity-30"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="解散此层"
              aria-label="解散此层"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                removeLayer(li);
              }}
              className="mt-0.5 shrink-0 text-wj-dim transition-colors hover:text-wj-cinnabar disabled:opacity-30"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {remaining.length > 0 && (
          <li
            role="button"
            tabIndex={0}
            onClick={() => setActiveLayer(layers.length)}
            onKeyDown={(e) => e.key === 'Enter' && setActiveLayer(layers.length)}
            className={`flex items-center gap-2 rounded border border-dashed px-3 py-2 text-xs transition-colors ${
              active === layers.length
                ? 'border-wj-cinnabar/60 text-wj-ink2'
                : 'border-wj-line text-wj-dim'
            }`}
          >
            <span className="w-5 shrink-0 font-mono text-wj-ochre">{layers.length + 1}.</span>
            {layers.length ? '新层——点下方单位在此开一层' : '点下方单位，开始排第一层'}
          </li>
        )}
      </ol>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-wj-dim">待排：</span>
          {remaining.map((item) => (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => addItem(item)}
              className="rounded border border-wj-line bg-wj-paper px-2.5 py-1 font-mono text-sm text-wj-ink2 transition-colors hover:border-wj-bamboo hover:text-wj-bamboo disabled:opacity-40"
            >
              {item}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={note}
        disabled={disabled}
        rows={2}
        onChange={(e) => commit(layers, e.target.value)}
        placeholder="哪些单位对无法确定先后、为什么——写在这里（没有可留空）"
        className="wj-scrollbar mt-2 w-full resize-y rounded border border-wj-border bg-wj-raised px-3 py-2 text-sm leading-6 text-wj-ink placeholder:text-wj-dim focus:border-wj-cinnabar/60 focus:outline-none disabled:opacity-60"
      />
    </div>
  );
}

function ChoiceInput({
  options,
  withNote,
  value,
  onChange,
  disabled,
}: {
  options: { key: string; text: string }[];
  withNote?: boolean;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { selected, note } = parseChoice(value);
  const commit = (nextSelected: string, nextNote: string) => {
    const lines = nextSelected ? [`选择：${nextSelected}`] : [];
    if (nextNote.trim()) lines.push(`补充：${nextNote.trim()}`);
    onChange(lines.join('\n'));
  };
  return (
    <div>
      <div className="space-y-1.5" role="radiogroup">
        {options.map((o) => {
          const active = selected === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => commit(o.key, note)}
              className={`flex w-full items-start gap-2.5 rounded border px-3 py-2 text-left text-[15px] leading-7 transition-colors disabled:opacity-60 ${
                active
                  ? 'border-wj-cinnabar/60 bg-wj-cinnabar/5 text-wj-ink'
                  : 'border-wj-line bg-wj-raised text-wj-ink2 hover:border-wj-dim'
              }`}
            >
              <span
                className={`mt-1.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                  active ? 'border-wj-cinnabar' : 'border-wj-line'
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-wj-cinnabar" />}
              </span>
              <span>
                <span className={active ? 'text-wj-cinnabar' : undefined}>{o.key}</span>
                <span className="text-wj-dim"> · </span>
                {o.text}
              </span>
            </button>
          );
        })}
      </div>
      {withNote && (
        <textarea
          value={note}
          disabled={disabled}
          rows={2}
          onChange={(e) => commit(selected, e.target.value)}
          placeholder="理由 / 依据写在这里"
          className="wj-scrollbar mt-2 w-full resize-y rounded border border-wj-border bg-wj-raised px-3 py-2 text-sm leading-6 text-wj-ink placeholder:text-wj-dim focus:border-wj-cinnabar/60 focus:outline-none disabled:opacity-60"
        />
      )}
    </div>
  );
}

function MultiInput({
  options,
  withNote,
  value,
  onChange,
  disabled,
}: {
  options: { key: string; text: string }[];
  withNote?: boolean;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { selected, note } = parseMulti(value);
  const commit = (nextSelected: string[], nextNote: string) => {
    // 按选项定义顺序序列化，与点选先后无关
    const ordered = options.map((o) => o.key).filter((k) => nextSelected.includes(k));
    const lines = ordered.length ? [`多选：${ordered.join('、')}`] : [];
    if (nextNote.trim()) lines.push(`补充：${nextNote.trim()}`);
    onChange(lines.join('\n'));
  };
  const toggle = (key: string) =>
    commit(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key], note);
  return (
    <div>
      <div className="space-y-1.5">
        {options.map((o) => {
          const active = selected.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              role="checkbox"
              aria-checked={active}
              disabled={disabled}
              onClick={() => toggle(o.key)}
              className={`flex w-full items-start gap-2.5 rounded border px-3 py-2 text-left text-[15px] leading-7 transition-colors disabled:opacity-60 ${
                active
                  ? 'border-wj-cinnabar/60 bg-wj-cinnabar/5 text-wj-ink'
                  : 'border-wj-line bg-wj-raised text-wj-ink2 hover:border-wj-dim'
              }`}
            >
              <span
                className={`mt-1.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${
                  active ? 'border-wj-cinnabar' : 'border-wj-line'
                }`}
              >
                {active && <Check className="h-2.5 w-2.5 text-wj-cinnabar" />}
              </span>
              <span>
                <span className={active ? 'text-wj-cinnabar' : undefined}>{o.key}</span>
                <span className="text-wj-dim"> · </span>
                {o.text}
              </span>
            </button>
          );
        })}
      </div>
      {withNote && (
        <textarea
          value={note}
          disabled={disabled}
          rows={2}
          onChange={(e) => commit(selected, e.target.value)}
          placeholder="逐项的可行性 / 理由写在这里"
          className="wj-scrollbar mt-2 w-full resize-y rounded border border-wj-border bg-wj-raised px-3 py-2 text-sm leading-6 text-wj-ink placeholder:text-wj-dim focus:border-wj-cinnabar/60 focus:outline-none disabled:opacity-60"
        />
      )}
    </div>
  );
}

function MatchingInput({
  left,
  right,
  value,
  onChange,
  disabled,
}: {
  left: { key: string; text: string }[];
  right: { key: string; text: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const map = parseMatching(value);
  const commit = (next: Record<string, string>) => {
    const pairs = left.filter((l) => next[l.key]).map((l) => `${l.key}→${next[l.key]}`);
    onChange(pairs.length ? `匹配：${pairs.join('；')}` : '');
  };
  return (
    <ul className="space-y-1.5">
      {left.map((l) => (
        <li
          key={l.key}
          className="flex flex-wrap items-center gap-2 rounded border border-wj-line bg-wj-raised px-3 py-2"
        >
          <span className="min-w-40 flex-1 text-[15px] leading-7 text-wj-ink">
            <span className="text-wj-cinnabar">{l.key}</span>
            <span className="text-wj-dim"> · </span>
            {l.text}
          </span>
          <span className="flex shrink-0 gap-1.5">
            {right.map((r) => {
              const active = map[l.key] === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => commit({ ...map, [l.key]: r.key })}
                  className={`rounded border px-2 py-1 text-sm leading-6 transition-colors disabled:opacity-60 ${
                    active
                      ? 'border-wj-cinnabar/60 bg-wj-cinnabar/10 text-wj-cinnabar'
                      : 'border-wj-line text-wj-dim hover:border-wj-dim hover:text-wj-ink2'
                  }`}
                >
                  {r.key} {r.text}
                </button>
              );
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

const VERDICT_STYLE: Record<string, string> = {
  成立: 'border-wj-bamboo/60 bg-wj-bamboo/10 text-wj-bamboo',
  部分成立: 'border-wj-ochre/60 bg-wj-ochre/10 text-wj-ochre',
  不成立: 'border-wj-cinnabar/60 bg-wj-cinnabar/10 text-wj-cinnabar',
};

/** /api/grade 与 /api/reference-answer 共用的 SSE 帧形状 */
interface SsePayload {
  verdict?: string | null;
  content?: string;
  error?: string;
  done?: boolean;
}

/** 逐行读 SSE 正文并分发 data 帧；心跳注释行与非 data 行自动忽略 */
async function readSse(body: ReadableStream<Uint8Array>, onPayload: (p: SsePayload) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value: chunk } = await reader.read();
    if (done) break;
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        onPayload(JSON.parse(line.slice(6)) as SsePayload);
      } catch {
        // 不完整 JSON 说明数据段跨块，下一次 buffer 拼接后自然恢复
      }
    }
  }
}

function AnswerBox({ stageId, question, label, part }: AnswerBoxProps) {
  const hydrated = useWorkshopStore((s) => s.hydrated);
  const key = answerKey(stageId, question.id, part?.label);
  const stored = useWorkshopStore((s) => s.answers[key]);
  const setAnswer = useWorkshopStore((s) => s.setAnswer);
  const submittedFlag = useWorkshopStore((s) => s.submitted[key]);
  const markSubmitted = useWorkshopStore((s) => s.markSubmitted);
  const cachedReference = useWorkshopStore((s) => s.referenceAnswers[key]);
  const setReferenceAnswer = useWorkshopStore((s) => s.setReferenceAnswer);
  const { session } = useAuth();

  // persist 落定之前一律按空串渲染，与服务端输出保持一致，避免 hydration 不匹配
  const value = hydrated ? (stored ?? '') : '';
  const isSubmitted = hydrated && !!submittedFlag;
  const fieldId = `answer-${stageId}-${question.id}${part ? `-${part.label}` : ''}`;

  // AI 判对错：把本框答案交给 /api/grade 按评阅要点判定，SSE 回流判定章 + 流式解析
  const [grading, setGrading] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [gradeError, setGradeError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  // 确认提交：两段式（先提示"不可再改"，再确认）；提交后输入锁定、出参考答案
  const [confirming, setConfirming] = useState(false);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);
  const [refDraft, setRefDraft] = useState('');
  const refAbortRef = useRef<AbortController | null>(null);
  const refRequestedRef = useRef(false);
  useEffect(() => () => refAbortRef.current?.abort(), []);

  const clearGrade = () => {
    setVerdict(null);
    setAnalysis('');
    setGradeError(null);
  };

  // 结构化作答（排序 / 单选 / 多选 / 匹配）也序列化为文本协议走同一存储
  const input = part?.input;
  const canGrade = (() => {
    if (input?.type === 'ordering') {
      const { layers, note } = parseOrdering(value);
      return layers.length > 0 || note.trim().length > 0;
    }
    if (input?.type === 'choice') {
      const { selected, note } = parseChoice(value);
      return !!selected && (!input.withNote || note.trim().length > 0);
    }
    if (input?.type === 'multi') {
      const { selected, note } = parseMulti(value);
      return selected.length > 0 && (!input.withNote || note.trim().length > 0);
    }
    if (input?.type === 'matching') {
      const map = parseMatching(value);
      return input.left.every((l) => map[l.key]);
    }
    return value.trim().length > 0;
  })();

  const commitAnswer = (v: string) => {
    if (isSubmitted) return;
    setAnswer(stageId, question.id, v, part?.label);
    setConfirming(false);
    // 答案一改旧判定即作废，避免"判的是旧稿"的错觉
    if (verdict || analysis || gradeError) clearGrade();
  };

  const handleGrade = async () => {
    if (grading || !canGrade || isSubmitted) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGrading(true);
    clearGrade();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          stage: stageId,
          questionId: question.id,
          partLabel: part?.label ?? null,
          answer: value.trim(),
        }),
      });
      if (!res.ok || !res.body) {
        // 服务端 400/401/429 都带用户可读的 error 字段，能读到就原样展示
        let msg = '判定失败了，稍后再试。';
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) msg = data.error;
        } catch {
          // 响应体不是 JSON（如网关错误页），用通用文案
        }
        throw new Error(msg);
      }

      await readSse(res.body, (payload) => {
        if (payload.verdict !== undefined) setVerdict(payload.verdict);
        if (payload.content) setAnalysis((prev) => prev + payload.content);
        if (payload.error) setGradeError(payload.error);
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setGradeError(e instanceof Error ? e.message : '判定失败了，稍后再试。');
    } finally {
      setGrading(false);
    }
  };

  // 参考答案：确认提交后自动生成（每小问只生成一次，done 后写入 store 缓存，
  // 刷新/重进直接读缓存不再请求）；中途失败可手动重试
  const fetchReference = async () => {
    refAbortRef.current?.abort();
    const controller = new AbortController();
    refAbortRef.current = controller;
    setRefLoading(true);
    setRefError(null);
    setRefDraft('');
    let acc = '';
    let finished = false;
    let errored = false;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch('/api/reference-answer', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          stage: stageId,
          questionId: question.id,
          partLabel: part?.label ?? null,
        }),
      });
      if (!res.ok || !res.body) {
        let msg = '参考答案生成失败了，稍后再试。';
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) msg = data.error;
        } catch {
          // 响应体不是 JSON（如网关错误页），用通用文案
        }
        throw new Error(msg);
      }

      await readSse(res.body, (payload) => {
        if (payload.content) {
          acc += payload.content;
          setRefDraft(acc);
        }
        if (payload.error) {
          errored = true;
          setRefError(payload.error);
        }
        if (payload.done) finished = true;
      });
      // 只有完整走完 done 帧的成稿才进缓存；中途断开/出错留着重试，不缓存半成品
      if (finished && !errored && acc.trim()) {
        setReferenceAnswer(stageId, question.id, part?.label, acc.trim());
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setRefError(e instanceof Error ? e.message : '参考答案生成失败了，稍后再试。');
    } finally {
      setRefLoading(false);
    }
  };

  const fetchReferenceRef = useRef(fetchReference);
  fetchReferenceRef.current = fetchReference;

  // 提交落定（含刷新后 persist 恢复出已提交态）且尚无缓存时自动拉取一次
  useEffect(() => {
    if (!isSubmitted || cachedReference || refRequestedRef.current) return;
    refRequestedRef.current = true;
    void fetchReferenceRef.current();
  }, [isSubmitted, cachedReference]);

  const handleSubmit = () => {
    if (!canGrade || isSubmitted) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    // 进行中的判定随提交一并收尾：定稿之后旧稿的判定结果没有继续等待的意义
    abortRef.current?.abort();
    setGrading(false);
    markSubmitted(stageId, question.id, part?.label);
  };

  const retryReference = () => {
    refRequestedRef.current = true;
    void fetchReferenceRef.current();
  };

  const referenceText = cachedReference ?? refDraft;

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

      {input?.type === 'ordering' ? (
        <div className="mt-2">
          <OrderingInput items={input.items} value={value} onChange={commitAnswer} disabled={grading || isSubmitted} />
        </div>
      ) : input?.type === 'choice' ? (
        <div className="mt-2">
          <ChoiceInput options={input.options} withNote={input.withNote} value={value} onChange={commitAnswer} disabled={grading || isSubmitted} />
        </div>
      ) : input?.type === 'multi' ? (
        <div className="mt-2">
          <MultiInput options={input.options} withNote={input.withNote} value={value} onChange={commitAnswer} disabled={grading || isSubmitted} />
        </div>
      ) : input?.type === 'matching' ? (
        <div className="mt-2">
          <MatchingInput left={input.left} right={input.right} value={value} onChange={commitAnswer} disabled={grading || isSubmitted} />
        </div>
      ) : (
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => commitAnswer(e.target.value)}
          disabled={grading || isSubmitted}
          rows={part ? 3 : 4}
          placeholder={part ? `写下（${part.label}）小问的作答……` : `写下你对${label}的作答……`}
          className="wj-scrollbar mt-2 w-full resize-y rounded border border-wj-border bg-wj-raised px-3 py-2 text-base leading-7 sm:text-sm text-wj-ink placeholder:text-wj-dim focus:border-wj-cinnabar/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      )}

      <div className="mt-2 flex items-center justify-end gap-3">
        {verdict && (
          <span
            className={`rounded border px-2 py-0.5 text-[11px] font-medium ${VERDICT_STYLE[verdict] ?? 'border-wj-line text-wj-muted'}`}
          >
            {verdict}
          </span>
        )}
        {isSubmitted ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-wj-dim">
            <Lock className="h-3 w-3" />
            已提交定稿
          </span>
        ) : confirming ? (
          <>
            <span className="text-[11px] text-wj-ochre">提交后即定稿，不可再修改</span>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded border border-wj-line bg-wj-raised px-2.5 py-1 text-[11px] text-wj-ink2 transition-colors hover:border-wj-dim"
            >
              再想想
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded border border-wj-cinnabar bg-wj-cinnabar px-2.5 py-1 text-[11px] font-medium text-wj-paper transition-colors hover:bg-wj-cinnabar/90"
            >
              <Check className="h-3 w-3" />
              确认提交
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleGrade}
              disabled={grading || !canGrade}
              className="inline-flex items-center gap-1.5 rounded border border-wj-line bg-wj-raised px-2.5 py-1 text-[11px] text-wj-ink2 transition-colors hover:border-wj-cinnabar/60 hover:text-wj-cinnabar disabled:cursor-not-allowed disabled:opacity-50"
            >
              {grading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Stamp className="h-3 w-3" />}
              {grading ? '判定中…' : 'AI 判对错'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={grading || !canGrade}
              className="inline-flex items-center gap-1.5 rounded border border-wj-line bg-wj-raised px-2.5 py-1 text-[11px] text-wj-ink2 transition-colors hover:border-wj-cinnabar/60 hover:text-wj-cinnabar disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              确认提交
            </button>
          </>
        )}
      </div>

      {(gradeError || analysis) && (
        <div
          className={`mt-2 rounded border px-3 py-2 text-[12.5px] leading-6 ${
            gradeError
              ? 'border-wj-cinnabar/40 bg-wj-cinnabar/5 text-wj-cinnabar'
              : 'border-wj-line bg-wj-raised/70 text-wj-ink2'
          }`}
        >
          {gradeError ?? analysis}
        </div>
      )}

      {isSubmitted && (
        <div className="mt-2 rounded border border-wj-bamboo/40 bg-wj-bamboo/5 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-wj-bamboo">
            <ScrollText className="h-3 w-3" />
            参考答案
          </div>
          {refError ? (
            <p className="mt-1.5 text-[12.5px] leading-6 text-wj-cinnabar">
              {refError}
              <button
                type="button"
                onClick={retryReference}
                className="ml-2 underline underline-offset-2 hover:text-wj-cinnabar/80"
              >
                重试
              </button>
            </p>
          ) : referenceText ? (
            <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-6 text-wj-ink2">
              {referenceText}
              {refLoading && <Loader2 className="ml-1 inline h-3 w-3 animate-spin text-wj-dim" />}
            </p>
          ) : (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-wj-dim">
              <Loader2 className="h-3 w-3 animate-spin" />
              参考答案生成中…
            </p>
          )}
        </div>
      )}

      {!part && (
        <div className="mt-2 flex items-center justify-end">
          <span className="text-[11px] text-wj-dim">草稿自动存在本机，刷新不丢</span>
        </div>
      )}
    </div>
  );
}
