'use client';

/**
 * 虚拟仿真工作台。
 *
 * 环节页的第三节：细问之前先动手。学习者按真实工序排次序、挑工具、调参数、逐段推进，
 * 每一步落手立刻给后果（出自报告的机理），四项指标随操作实时跳动，
 * 走完一遍出验收报告，可以重新开工。
 *
 * 这一节不判分、不进评阅链路——它的产出是一份操作记录，
 * 学习者可以把它带进右侧对话，导师据此追问「你这次为什么断了三枚」。
 */

import { useMemo, useState } from 'react';
import { ArrowRight, CircleAlert, RotateCcw, Check, MessagesSquare, Play } from 'lucide-react';

import { askGuide } from '@/lib/workshop/guide-bridge';
import {
  SIM_INIT,
  applyEffect,
  dialDeviation,
  isPassed,
  orderViolations,
  type WjSim,
  type WjSimAdvanceStep,
  type WjSimChoice,
  type WjSimDialStep,
  type WjSimEffect,
  type WjSimOrderStep,
  type WjSimPickStep,
  type WjSimState,
  type WjSimStep,
} from '@/lib/workshop/sim';
import { useWorkshopStore } from '@/store/useWorkshopStore';
import { SimStageView } from './SimStageView';

const VERDICT_RING: Record<string, string> = {
  good: 'border-wj-bamboo/60 bg-wj-bamboo/[0.08]',
  fair: 'border-wj-ochre/55 bg-wj-ochre/[0.08]',
  bad: 'border-wj-cinnabar/55 bg-wj-cinnabar/[0.07]',
};
const VERDICT_TEXT: Record<string, string> = {
  good: 'text-wj-bamboo',
  fair: 'text-wj-ochre',
  bad: 'text-wj-cinnabar',
};
const VERDICT_LABEL: Record<string, string> = {
  good: '可行',
  fair: '可行但有代价',
  bad: '后果已发生',
};

/** 指标条：完整度类越高越好，工时越低越好（工时不画条，只报数） */
function Readout({
  label,
  value,
  unit,
  lower,
  delta,
}: {
  label: string;
  value: number;
  unit?: string;
  lower?: boolean;
  delta?: number;
}) {
  const pct = lower ? null : Math.max(0, Math.min(100, value));
  const tone =
    pct === null
      ? 'text-wj-water'
      : pct >= 80
        ? 'text-wj-bamboo'
        : pct >= 60
          ? 'text-wj-ochre'
          : 'text-wj-cinnabar';
  const bar = pct === null ? '' : pct >= 80 ? 'bg-wj-bamboo' : pct >= 60 ? 'bg-wj-ochre' : 'bg-wj-cinnabar';
  return (
    <div className="rounded border border-wj-line bg-wj-surface px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-wj-muted">{label}</span>
        {delta !== undefined && Math.abs(delta) >= 0.05 && (
          <span
            className={`font-mono text-[10px] ${delta > 0 === !lower ? 'text-wj-bamboo' : 'text-wj-cinnabar'}`}
          >
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}
          </span>
        )}
      </div>
      <div className={`mt-1 font-mono text-[17px] leading-6 ${tone}`}>
        {lower ? value.toFixed(value < 10 ? 2 : 0) : Math.round(value)}
        <span className="ml-0.5 text-[11px] text-wj-dim">{unit ?? '%'}</span>
      </div>
      {pct !== null && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-wj-sunk">
          <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

/** 落手之后的后果说明 */
function Feedback({ verdict, text, irreversible }: { verdict: string; text: string; irreversible?: boolean }) {
  return (
    <div className={`mt-3 rounded border px-3.5 py-3 ${VERDICT_RING[verdict] ?? VERDICT_RING.fair}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`font-serif text-[13px] font-semibold ${VERDICT_TEXT[verdict] ?? ''}`}>
          {VERDICT_LABEL[verdict] ?? ''}
        </span>
        {irreversible && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-wj-cinnabar/40 bg-wj-cinnabar/[0.07] px-1.5 py-0.5 text-[10px] text-wj-cinnabar">
            <CircleAlert className="h-3 w-3" />
            此步不可逆
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[13.5px] leading-7 text-wj-ink/85">{text}</p>
    </div>
  );
}

function effectSummary(e: WjSimEffect): string {
  const names: Record<string, string> = {
    integrity: '完整度',
    legibility: '字迹',
    provenance: '信息',
    hours: '工时',
    risk: '风险',
  };
  const parts = (Object.keys(e) as (keyof WjSimEffect)[])
    .filter((k) => k !== 'risk' && Math.abs(e[k] ?? 0) >= 0.05)
    .map((k) => `${names[k]} ${(e[k] ?? 0) > 0 ? '+' : ''}${(e[k] ?? 0).toFixed(1)}`);
  return parts.join(' · ');
}

export function StageSim({ sim }: { sim: WjSim }) {
  const saved = useWorkshopStore((s) => s.simRuns[sim.stageId]);
  const saveRun = useWorkshopStore((s) => s.setSimRun);
  const clearRun = useWorkshopStore((s) => s.clearSimRun);

  const [started, setStarted] = useState(() => !!saved);
  const [cursor, setCursor] = useState(0);
  const [state, setState] = useState<WjSimState>(SIM_INIT);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [dials, setDials] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Record<string, string[]>>({});
  /** 当前步已落手、正在看后果 */
  const [resolved, setResolved] = useState<{ verdict: string; text: string; irreversible?: boolean; effect: WjSimEffect } | null>(null);
  /** 逐段推进的已走拍数 */
  const [ticks, setTicks] = useState(0);
  /** 推进中弹出的处置 */
  const [pending, setPending] = useState<{ text: string; choices: WjSimChoice[]; at: number } | null>(null);
  const [firedEvents, setFiredEvents] = useState<number[]>([]);
  const [lastDelta, setLastDelta] = useState<WjSimEffect>({});
  const [settled, setSettled] = useState(false);

  const step: WjSimStep | undefined = sim.steps[cursor];
  const isLast = cursor >= sim.steps.length - 1;

  // 逐段推进的实时进度（供画面用）
  const advanceProgress = useMemo(() => {
    if (!step || step.type !== 'advance') return settled ? 1 : 0;
    const per = step.perTickFrom ? (dials[step.perTickFrom] ?? 1) : (step.perTick ?? 1);
    return Math.min(1, (ticks * per) / step.total);
  }, [step, ticks, dials, settled]);

  const sceneProgress = settled ? 1 : advanceProgress;

  const apply = (e: WjSimEffect) => {
    setState((s) => applyEffect(s, e));
    setLastDelta(e);
  };

  const reset = () => {
    clearRun(sim.stageId);
    setState(SIM_INIT);
    setPicks({});
    setDials({});
    setOrders({});
    setCursor(0);
    setTicks(0);
    setResolved(null);
    setPending(null);
    setFiredEvents([]);
    setLastDelta({});
    setSettled(false);
    setStarted(true);
  };

  const finish = (finalState: WjSimState) => {
    setSettled(true);
    saveRun(sim.stageId, {
      picks,
      dials,
      orders,
      state: finalState,
      settled: true,
      attempt: (saved?.attempt ?? 0) + 1,
    });
  };

  const goNext = () => {
    setResolved(null);
    setLastDelta({});
    if (isLast) {
      finish(state);
      return;
    }
    setCursor((c) => c + 1);
    setTicks(0);
    setFiredEvents([]);
    requestAnimationFrame(() => {
      document.getElementById('stage-act-sim')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // ── 起始屏 ──
  if (!started && !saved) {
    return (
      <div className="mt-4 rounded-lg border border-wj-border bg-wj-surface p-5 sm:p-6">
        <h3 className="font-serif text-base font-semibold text-wj-ink">{sim.title}</h3>
        <p className="mt-3 text-[15px] leading-8 text-wj-ink/85">{sim.scene}</p>
        <ul className="mt-4 space-y-1.5">
          {sim.steps.map((s, i) => (
            <li key={s.id} className="flex gap-2.5 text-[13px] text-wj-muted">
              <span className="mt-0.5 font-mono text-[11px] text-wj-dim">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="text-wj-ink">{s.title}</span>
                <span className="text-wj-dim"> · {s.brief}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-6 text-wj-dim">
          工具、参数区间与失败机制均出自{'《长沙走马楼三国吴简的保护与整理》'}。
          指标的扣分幅度是本工坊为教学设定的权重，不是报告里的实测值；
          这一节不判分，走完之后可以重新开工。
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded border border-wj-cinnabar bg-wj-cinnabar px-5 text-sm text-wj-cinnabar-ink transition-opacity hover:opacity-90"
        >
          <Play className="h-4 w-4" />
          开工
        </button>
      </div>
    );
  }

  // ── 结算屏 ──
  const finalState = settled ? state : (saved?.state ?? state);

  if (settled || (saved?.settled && !started)) {
    const passed = isPassed(sim, finalState);
    return (
      <div className="mt-4">
        <SimStageView
          scene={sim.visual}
          state={finalState}
          progress={1}
          picks={settled ? picks : (saved?.picks ?? {})}
          dials={settled ? dials : (saved?.dials ?? {})}
          orders={settled ? orders : (saved?.orders ?? {})}
        />
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {sim.readouts.map((r) => (
            <Readout key={r.key} label={r.label} value={finalState[r.key]} unit={r.unit} lower={r.lower} />
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-wj-border bg-wj-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-base font-semibold text-wj-ink">验收</h3>
            <span
              className={`rounded-sm border px-2 py-0.5 text-[11px] ${
                passed
                  ? 'border-wj-bamboo/50 bg-wj-bamboo/[0.08] text-wj-bamboo'
                  : 'border-wj-cinnabar/45 bg-wj-cinnabar/[0.07] text-wj-cinnabar'
              }`}
            >
              {passed ? '这一枚保住了' : '这一枚没保住'}
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {sim.pass.map((p) => {
              const v = finalState[p.key];
              const ok = (p.min === undefined || v >= p.min) && (p.max === undefined || v <= p.max);
              return (
                <li key={String(p.key) + p.label} className="flex items-baseline gap-2.5 text-[13.5px]">
                  <span className={ok ? 'text-wj-bamboo' : 'text-wj-cinnabar'}>{ok ? '✓' : '✕'}</span>
                  <span className="text-wj-ink/85">{p.label}</span>
                  <span className={`ml-auto font-mono text-[13px] ${ok ? 'text-wj-bamboo' : 'text-wj-cinnabar'}`}>
                    {p.key === 'hours' ? v.toFixed(2) : Math.round(v)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-wj-line pt-4">
            <h4 className="font-serif text-sm font-semibold text-wj-ink">报告里实际是怎么做的</h4>
            {sim.benchmark.map((b, i) => (
              <p key={i} className="mt-2 text-[13.5px] leading-7 text-wj-ink/80">
                {b}
              </p>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-1.5 rounded border border-wj-border px-4 text-sm text-wj-ink transition-colors hover:border-wj-cinnabar/60"
            >
              <RotateCcw className="h-4 w-4" />
              重新开工
            </button>
            <button
              type="button"
              onClick={() =>
                askGuide(
                  `我刚在「${sim.title}」上走了一遍。结果：${sim.readouts
                    .map((r) => `${r.label} ${r.key === 'hours' ? finalState[r.key].toFixed(2) : Math.round(finalState[r.key])}${r.unit ?? '%'}`)
                    .join('，')}；验收${passed ? '通过' : '未通过'}。` +
                    `我的操作依次是：${sim.steps
                      .map((s) => {
                        const src = settled ? { picks, dials, orders } : { picks: saved?.picks ?? {}, dials: saved?.dials ?? {}, orders: saved?.orders ?? {} };
                        if (s.type === 'pick') {
                          const k = src.picks[s.id];
                          const c = s.choices.find((x) => x.key === k);
                          return `${s.title}—${c?.label ?? '未选'}`;
                        }
                        if (s.type === 'dial') return `${s.title}—${src.dials[s.id] ?? '未设'}${s.unit}`;
                        if (s.type === 'order') return `${s.title}—${(src.orders[s.id] ?? []).join('→') || '未排'}`;
                        return `${s.title}—已走完`;
                      })
                      .join('；')}。请针对我这次操作里代价最大的那一步追问我，先别直接给正确做法。`,
                )
              }
              className="inline-flex h-9 items-center gap-1.5 rounded border border-wj-cinnabar/40 px-4 text-sm text-wj-cinnabar transition-colors hover:bg-wj-cinnabar/[0.07]"
            >
              <MessagesSquare className="h-4 w-4" />
              把这次操作记录带给小简
            </button>
          </div>
          <p className="mt-3 text-xs leading-6 text-wj-dim">
            下面的细问会追问你刚才做的这些判断。走一遍不够就再走一遍——这一节不计入进度，
            环节的完成仍以细问为准。
          </p>
        </div>
      </div>
    );
  }

  if (!step) return null;

  // ── 操作屏 ──
  return (
    <div id="stage-act-sim-body" className="mt-4">
      <SimStageView scene={sim.visual} state={state} progress={sceneProgress} picks={picks} dials={dials} orders={orders} />

      {/* 指标面板 */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {sim.readouts.map((r) => (
          <Readout
            key={r.key}
            label={r.label}
            value={state[r.key]}
            unit={r.unit}
            lower={r.lower}
            delta={lastDelta[r.key]}
          />
        ))}
      </div>

      {/* 工步 */}
      <div className="mt-3 rounded-lg border border-wj-border bg-wj-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-wj-dim">
            工步 {cursor + 1} / {sim.steps.length}
          </span>
          <span className="font-serif text-[15px] font-semibold text-wj-ink">{step.title}</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-6 text-wj-muted">{step.brief}</p>
        <p className="mt-3 text-[15px] leading-8 text-wj-ink/85">
          {'prompt' in step ? step.prompt : ''}
        </p>

        {step.type === 'pick' && (
          <PickControl
            step={step}
            chosen={picks[step.id]}
            onPick={(c) => {
              setPicks((p) => ({ ...p, [step.id]: c.key }));
              apply(c.effect);
              setResolved({ verdict: c.verdict, text: c.feedback, irreversible: c.irreversible, effect: c.effect });
            }}
            locked={!!resolved}
          />
        )}

        {step.type === 'dial' && (
          <DialControl
            step={step}
            value={dials[step.id] ?? step.init}
            locked={!!resolved}
            onChange={(v) => setDials((d) => ({ ...d, [step.id]: v }))}
            onCommit={(v) => {
              const dev = dialDeviation(step, v);
              const e: WjSimEffect = { ...(step.base ?? {}) };
              if (dev > 0) {
                for (const k of Object.keys(step.perUnit) as (keyof WjSimEffect)[]) {
                  e[k] = (e[k] ?? 0) + (step.perUnit[k] ?? 0) * dev;
                }
              }
              setDials((d) => ({ ...d, [step.id]: v }));
              apply(e);
              setResolved({
                verdict: dev === 0 ? 'good' : dev > (step.max - step.min) * 0.25 ? 'bad' : 'fair',
                text: dev === 0 ? step.okFeedback : step.offFeedback,
                effect: e,
              });
            }}
          />
        )}

        {step.type === 'order' && (
          <OrderControl
            step={step}
            order={orders[step.id] ?? []}
            locked={!!resolved}
            onChange={(o) => setOrders((s) => ({ ...s, [step.id]: o }))}
            onCommit={(o) => {
              const bad = orderViolations(step, o);
              const e: WjSimEffect = {};
              for (const k of Object.keys(step.perViolation) as (keyof WjSimEffect)[]) {
                e[k] = (step.perViolation[k] ?? 0) * bad.length;
              }
              setOrders((s) => ({ ...s, [step.id]: o }));
              apply(e);
              setResolved({
                verdict: bad.length === 0 ? 'good' : 'bad',
                text:
                  (bad.length === 0 ? step.okFeedback : step.badFeedback) +
                  (bad.length > 0
                    ? `　违反的关系：${bad.map(([a, b]) => `${a}→${b}`).join('、')}。`
                    : '') +
                  (step.undecidable ? `　${step.undecidable}` : ''),
                irreversible: bad.length > 0,
                effect: e,
              });
            }}
          />
        )}

        {step.type === 'advance' && (
          <AdvanceControl
            step={step}
            ticks={ticks}
            perTick={step.perTickFrom ? (dials[step.perTickFrom] ?? 1) : (step.perTick ?? 1)}
            pending={pending}
            locked={!!resolved}
            risk={state.risk}
            onTick={() => {
              const per = step.perTickFrom ? (dials[step.perTickFrom] ?? 1) : (step.perTick ?? 1);
              const nextTicks = ticks + 1;
              const prog = Math.min(1, (nextTicks * per) / step.total);

              // 本拍的代价：固定代价 + 按风险比例兑现的损伤
              const e: WjSimEffect = { ...step.tickEffect };
              if (step.riskEffect) {
                const f = state.risk / 100;
                for (const k of Object.keys(step.riskEffect) as (keyof WjSimEffect)[]) {
                  e[k] = (e[k] ?? 0) + (step.riskEffect[k] ?? 0) * f;
                }
              }
              apply(e);
              setTicks(nextTicks);

              // 触发处置
              const ev = (step.events ?? []).find(
                (x, i) => prog >= x.at && !firedEvents.includes(i),
              );
              if (ev) {
                const i = (step.events ?? []).indexOf(ev);
                setFiredEvents((f) => [...f, i]);
                if (ev.choices?.length) setPending({ text: ev.text, choices: ev.choices, at: ev.at });
              }

              if (prog >= 1) {
                setResolved({ verdict: 'good', text: step.doneFeedback, effect: e });
              }
            }}
            onResolveEvent={(c) => {
              apply(c.effect);
              setPending(null);
              setResolved({ verdict: c.verdict, text: c.feedback, irreversible: c.irreversible, effect: c.effect });
            }}
          />
        )}

        {resolved && (
          <>
            <Feedback verdict={resolved.verdict} text={resolved.text} irreversible={resolved.irreversible} />
            {effectSummary(resolved.effect) && (
              <p className="mt-2 font-mono text-[11px] text-wj-dim">{effectSummary(resolved.effect)}</p>
            )}
            {/* 推进步里中途触发的处置：处置完还要接着走 */}
            {step.type === 'advance' && advanceProgress < 1 ? (
              <button
                type="button"
                onClick={() => {
                  setResolved(null);
                  setLastDelta({});
                }}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded border border-wj-cinnabar bg-wj-cinnabar px-4 text-sm text-wj-cinnabar-ink transition-opacity hover:opacity-90"
              >
                接着推进
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded border border-wj-cinnabar bg-wj-cinnabar px-4 text-sm text-wj-cinnabar-ink transition-opacity hover:opacity-90"
              >
                {isLast ? '收工验收' : `下一工步 · ${sim.steps[cursor + 1].title}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}

        {!resolved && cursor > 0 && (
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-wj-dim transition-colors hover:text-wj-cinnabar"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重新开工
          </button>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── 各类控件 ─────────────────────────

function PickControl({
  step,
  chosen,
  onPick,
  locked,
}: {
  step: WjSimPickStep;
  chosen?: string;
  onPick: (c: WjSimChoice) => void;
  locked: boolean;
}) {
  return (
    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
      {step.choices.map((c) => {
        const active = chosen === c.key;
        return (
          <button
            key={c.key}
            type="button"
            disabled={locked}
            onClick={() => onPick(c)}
            className={`rounded border px-3.5 py-3 text-left transition-colors ${
              active
                ? VERDICT_RING[c.verdict]
                : locked
                  ? 'cursor-not-allowed border-wj-line bg-wj-sunk/40 opacity-55'
                  : 'border-wj-border bg-wj-raised hover:border-wj-cinnabar/50'
            }`}
          >
            <span className={`block text-[14px] leading-6 ${active ? VERDICT_TEXT[c.verdict] : 'text-wj-ink'}`}>
              {c.label}
            </span>
            {c.hint && <span className="mt-0.5 block text-[11.5px] leading-5 text-wj-dim">{c.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

function DialControl({
  step,
  value,
  onChange,
  onCommit,
  locked,
}: {
  step: WjSimDialStep;
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  locked: boolean;
}) {
  const span = step.max - step.min;
  const pos = (v: number) => ((v - step.min) / span) * 100;
  const inBand = value >= step.safe[0] && value <= step.safe[1];
  const decimals = step.step < 1 ? (step.step < 0.1 ? 2 : 1) : 0;
  return (
    <div className="mt-4">
      <div className="flex items-baseline gap-2">
        <span
          className={`font-mono text-[26px] leading-none ${inBand ? 'text-wj-bamboo' : 'text-wj-cinnabar'}`}
        >
          {value.toFixed(decimals)}
        </span>
        <span className="text-sm text-wj-muted">{step.unit}</span>
        {!inBand && !locked && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-wj-cinnabar">
            <CircleAlert className="h-3.5 w-3.5" />
            超出操作区间
          </span>
        )}
      </div>

      {/* 安全带 */}
      <div className="relative mt-3 h-8">
        <div className="absolute top-3 h-2 w-full rounded-full bg-wj-sunk" />
        <div
          className="absolute top-3 h-2 rounded-full bg-wj-bamboo/35"
          style={{ left: `${pos(step.safe[0])}%`, width: `${pos(step.safe[1]) - pos(step.safe[0])}%` }}
        />
        <input
          type="range"
          min={step.min}
          max={step.max}
          step={step.step}
          value={value}
          disabled={locked}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${step.title}（${step.unit}）`}
          className="wj-sim-range absolute top-0 h-8 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed"
        />
      </div>
      <div className="relative h-4">
        {(step.marks ?? []).map((m) => (
          <span
            key={m.at}
            className="absolute -translate-x-1/2 font-mono text-[10px] text-wj-dim"
            style={{ left: `${pos(m.at)}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <p className="mt-1 text-[11.5px] text-wj-dim">
        绿带为报告给出的操作区间：{step.safe[0]}～{step.safe[1]} {step.unit}
      </p>
      {!locked && (
        <button
          type="button"
          onClick={() => onCommit(value)}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded border border-wj-cinnabar bg-wj-cinnabar px-4 text-sm text-wj-cinnabar-ink transition-opacity hover:opacity-90"
        >
          <Check className="h-4 w-4" />
          按此设定
        </button>
      )}
    </div>
  );
}

function OrderControl({
  step,
  order,
  onChange,
  onCommit,
  locked,
}: {
  step: WjSimOrderStep;
  order: string[];
  onChange: (o: string[]) => void;
  onCommit: (o: string[]) => void;
  locked: boolean;
}) {
  const remaining = step.items.filter((i) => !order.includes(i.key));
  return (
    <div className="mt-4">
      {/* 已排定的次序 */}
      <div className="rounded border border-wj-line bg-wj-raised p-3">
        <p className="text-[11px] text-wj-muted">动手次序（先→后）</p>
        {order.length === 0 ? (
          <p className="mt-2 text-[13px] text-wj-dim">还没排。点下面的牌，点一张排一位。</p>
        ) : (
          <ol className="mt-2 flex flex-wrap items-center gap-1.5">
            {order.map((k, i) => {
              const item = step.items.find((x) => x.key === k);
              return (
                <li key={k} className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded border border-wj-cinnabar/40 bg-wj-surface px-2.5 py-1.5 text-[13px] text-wj-ink">
                    <span className="font-mono text-[10px] text-wj-dim">{i + 1}</span>
                    {item?.label ?? k}
                  </span>
                  {i < order.length - 1 && <span className="text-wj-dim">→</span>}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* 待排的牌 */}
      {!locked && remaining.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {remaining.map((i) => (
            <button
              key={i.key}
              type="button"
              onClick={() => onChange([...order, i.key])}
              className="rounded border border-wj-border bg-wj-raised px-3.5 py-2.5 text-left transition-colors hover:border-wj-cinnabar/50"
            >
              <span className="block text-[14px] text-wj-ink">{i.label}</span>
              {i.hint && <span className="mt-0.5 block text-[11.5px] text-wj-dim">{i.hint}</span>}
            </button>
          ))}
        </div>
      )}

      {!locked && (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {order.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="inline-flex h-9 items-center gap-1.5 rounded border border-wj-border px-4 text-sm text-wj-muted transition-colors hover:border-wj-cinnabar/50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重排
            </button>
          )}
          <button
            type="button"
            disabled={remaining.length > 0}
            onClick={() => onCommit(order)}
            className="inline-flex h-9 items-center gap-1.5 rounded border border-wj-cinnabar bg-wj-cinnabar px-4 text-sm text-wj-cinnabar-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            照这个次序动手
          </button>
        </div>
      )}
    </div>
  );
}

function AdvanceControl({
  step,
  ticks,
  perTick,
  pending,
  onTick,
  onResolveEvent,
  locked,
  risk,
}: {
  step: WjSimAdvanceStep;
  ticks: number;
  perTick: number;
  pending: { text: string; choices: WjSimChoice[]; at: number } | null;
  onTick: () => void;
  onResolveEvent: (c: WjSimChoice) => void;
  locked: boolean;
  risk: number;
}) {
  const walked = Math.min(step.total, ticks * perTick);
  const pct = (walked / step.total) * 100;
  const done = walked >= step.total;
  const decimals = perTick < 1 ? 1 : 0;

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-wj-muted">{step.gaugeLabel}</span>
        <span className="font-mono text-[13px] text-wj-water">
          {walked.toFixed(decimals)} / {step.total} {step.unit}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-wj-sunk">
        <div
          className={`h-full rounded-full transition-all duration-300 ${risk > 50 ? 'bg-wj-cinnabar' : risk > 25 ? 'bg-wj-ochre' : 'bg-wj-bamboo'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11.5px] text-wj-dim">
        每拍推进 {perTick}
        {step.unit}
        {risk > 25 && `　·　当前操作风险 ${Math.round(risk)}%，每推进一拍都在兑现成实际损伤`}
      </p>

      {/* 中途处置 */}
      {pending && (
        <div className="mt-4 rounded border border-wj-ochre/50 bg-wj-ochre/[0.07] p-4">
          <p className="text-[14px] leading-7 text-wj-ink">{pending.text}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pending.choices.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => onResolveEvent(c)}
                className="rounded border border-wj-border bg-wj-surface px-3.5 py-2.5 text-left text-[14px] text-wj-ink transition-colors hover:border-wj-cinnabar/50"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!pending && !done && !locked && (
        <button
          type="button"
          onClick={onTick}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded border border-wj-cinnabar bg-wj-cinnabar px-4 text-sm text-wj-cinnabar-ink transition-opacity hover:opacity-90"
        >
          <ArrowRight className="h-4 w-4" />
          推进一拍
        </button>
      )}
    </div>
  );
}
