'use client';

/**
 * 工作台画面：同一套指标在六个环节里各有各的看法。
 *
 * 这不是装饰——它是仿真反馈的主通道。力度调大了字就淡，托举方式选错了简就断，
 * 填充量不够干燥时宽度就塌下去：指标条上的数字在这里变成看得见的东西。
 *
 * 逼真度靠四件事，不靠贴图：
 *   1. 材质——竹片是弧面，横向渐变压边、纵向走纤维纹，叠老化斑与虫蛀点；
 *   2. 笔墨——每一笔是起收锋都收细的填充路径，底下垫一层洇墨；
 *      竹黄面组织不致密，字迹越散淡洇得越开，这正是报告讲的「墨迹散淡」；
 *   3. 光——饱水简有高光带，脱水后转成十六醇的哑光；器物一律带投影；
 *   4. 液体——液面起伏、水下折射错位、盘沿弯月面。
 *
 * 纪律：这是**示意画面**，不是文物照片，也不冒充报告图版。
 * 简面上的笔画是笔墨质感的模拟，**不是可释读的释文**——不放任何具体文字，
 * 免得被当成「这枚简上写着什么」。（展示篇的释文另有出处与声明，不搬到这里。）
 *
 * 颜色一律走 var(--wj-*) 令牌，不写十六进制字面量（见 DESIGN.md）。
 * 动效走 CSS 类，globals.css 里的 prefers-reduced-motion 总开关直接管到。
 */

import { useId, useMemo } from 'react';
import type { WjSimScene, WjSimState } from '@/lib/workshop/sim';

const INK = 'var(--wj-ink)';
const MUTED = 'var(--wj-muted)';
const DIM = 'var(--wj-dim)';
const LINE = 'var(--wj-line)';
const BORDER = 'var(--wj-border)';
const SURFACE = 'var(--wj-surface)';
const SUNK = 'var(--wj-sunk)';
const RAISED = 'var(--wj-raised)';
const CINNABAR = 'var(--wj-cinnabar)';
const BAMBOO = 'var(--wj-bamboo)';
const WATER = 'var(--wj-water)';
const OCHRE = 'var(--wj-ochre)';

/** 确定性伪随机：同一颗种子每次渲染出同一张图，仿真才可复盘 */
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * 一笔。起笔略重、中段最宽、收笔出锋，整条带一点弧势——
 * 用填充路径而不是描边，笔锋的粗细变化才出得来。
 */
function brushPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w0: number,
  w1: number,
  bow: number,
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  // 法线方向：笔画的「厚度」沿它展开
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (x0 + x1) / 2 + nx * bow;
  const my = (y0 + y1) / 2 + ny * bow;
  const wm = ((w0 + w1) / 2) * 1.35;
  return (
    `M ${x0 + (nx * w0) / 2} ${y0 + (ny * w0) / 2} ` +
    `Q ${mx + (nx * wm) / 2} ${my + (ny * wm) / 2} ${x1 + (nx * w1) / 2} ${y1 + (ny * w1) / 2} ` +
    `L ${x1 - (nx * w1) / 2} ${y1 - (ny * w1) / 2} ` +
    `Q ${mx - (nx * wm) / 2} ${my - (ny * wm) / 2} ${x0 - (nx * w0) / 2} ${y0 - (ny * w0) / 2} Z`
  );
}

/**
 * 一列字。每个字是三到七笔的组合（横、竖、撇、点），字形接近方，笔数与轻重都有起伏——
 * 只做笔墨质感，**不拼成任何可读的字**。ink 低时笔画变淡、同时洇得更开：
 * 竹黄面组织不致密、耐磨强度低，1700 年后的「墨迹散淡」就是这么来的。
 */
function InkColumn({
  x,
  y,
  w,
  h,
  count,
  ink,
  seed,
  bleedId,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  ink: number;
  seed: number;
  bleedId: string;
}) {
  const strokes = useMemo(() => {
    const out: { d: string; o: number }[] = [];
    const cell = h / count;
    for (let i = 0; i < count; i++) {
      const r = (n: number) => rand(seed + i * 37 + n * 7);
      // 字形近方，字距与字宽都有起伏；整列略有摆动，不是印出来的
      const gw = w * (0.68 + r(1) * 0.3);
      const gh = Math.min(cell * 0.92, gw * (0.82 + r(2) * 0.36));
      const gx = x + (w - gw) / 2 + (r(3) - 0.5) * w * 0.2;
      const gy = y + cell * i + (cell - gh) / 2 + (r(30) - 0.5) * cell * 0.14;
      const t = Math.max(0.3, gw * 0.052);
      // 1700 年后不是每个字都一样清楚：偶有几乎残尽的
      const faint = r(31) < 0.16 ? 0.24 + r(32) * 0.3 : 0.72 + r(33) * 0.28;

      // 横：一到三笔，起笔略顿、收笔出锋，带弧势
      const hn = 1 + Math.round(r(4) * 2);
      for (let k = 0; k < hn; k++) {
        const hy = gy + gh * ((k + 0.8) / (hn + 0.7));
        const x0 = gx + gw * (0.04 + r(5 + k) * 0.14);
        const x1 = gx + gw * (0.84 + r(6 + k) * 0.16);
        out.push({
          d: brushPath(x0, hy, x1, hy - gh * (0.02 + r(19 + k) * 0.07), t * 1.25, t * 0.45, -t * (0.5 + r(20 + k) * 0.6)),
          o: faint * (0.72 + r(7 + k) * 0.28),
        });
      }
      // 竖：一到两笔
      const vn = 1 + (r(8) > 0.6 ? 1 : 0);
      for (let k = 0; k < vn; k++) {
        const vx = gx + gw * (vn === 1 ? 0.4 + r(9) * 0.2 : 0.24 + k * 0.48);
        out.push({
          d: brushPath(
            vx,
            gy + gh * 0.03,
            vx + gw * (r(21 + k) - 0.4) * 0.12,
            gy + gh * (0.88 + r(10 + k) * 0.12),
            t * 1.1,
            t * 0.4,
            t * (0.4 + r(22 + k) * 0.7),
          ),
          o: faint * (0.78 + r(11 + k) * 0.22),
        });
      }
      // 撇、捺、点：一到三笔短的，位置散开
      const sn = 1 + Math.round(r(12) * 2);
      for (let k = 0; k < sn; k++) {
        const sx0 = gx + gw * (0.08 + r(13 + k) * 0.8);
        const sy0 = gy + gh * (0.1 + r(14 + k) * 0.68);
        const dir = r(15 + k) > 0.45 ? -1 : 1;
        const len = gw * (0.14 + r(16 + k) * 0.3);
        out.push({
          d: brushPath(
            sx0,
            sy0,
            sx0 + dir * len,
            sy0 + gh * (0.12 + r(17 + k) * 0.26),
            t * 1,
            t * 0.26,
            t * dir * (0.4 + r(23 + k) * 0.6),
          ),
          o: faint * (0.55 + r(18 + k) * 0.35),
        });
      }
    }
    return out;
  }, [x, y, w, h, count, seed]);

  if (ink <= 0.02) return null;
  // 墨越散淡，洇开的那一层占比越大
  const faded = 1 - clamp01(ink);
  return (
    <g>
      <g filter={`url(#${bleedId})`} opacity={0.2 + faded * 0.45}>
        {strokes.map((st, i) => (
          <path key={i} d={st.d} fill={INK} opacity={st.o * (0.3 + ink * 0.45)} />
        ))}
      </g>
      <g opacity={clamp01(ink) ** 1.25}>
        {strokes.map((st, i) => (
          <path key={i} d={st.d} fill={INK} opacity={st.o * 0.9} />
        ))}
      </g>
    </g>
  );
}

/** 断茬：糟朽纤维崩开的口子，带深色边，不是一条直线 */
function Cracks({
  x,
  y,
  w,
  h,
  severity,
  seed,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  severity: number;
  seed: number;
}) {
  const n = Math.round(severity * 7);
  if (n <= 0) return null;
  const out = [];
  for (let i = 0; i < n; i++) {
    const cy = y + h * (0.1 + rand(seed + i) * 0.8);
    // 沿宽度走的锯齿，越糟朽开口越大
    const pts: string[] = [];
    const seg = 6;
    for (let k = 0; k <= seg; k++) {
      const px = x - 1 + ((w + 2) * k) / seg;
      const py = cy + (rand(seed + i * 17 + k) - 0.5) * h * 0.055;
      pts.push(`${k === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    const d = pts.join(' ');
    const open = 0.8 + severity * 2.6;
    out.push(
      <g key={i}>
        <path d={d} stroke={SURFACE} strokeWidth={open} fill="none" strokeLinecap="round" />
        <path d={d} stroke={INK} strokeWidth={open + 1.1} fill="none" opacity={0.16} strokeLinecap="round" />
        <path d={d} stroke={INK} strokeWidth={0.45} fill="none" opacity={0.4} strokeLinecap="round" />
      </g>,
    );
  }
  return <g>{out}</g>;
}

export interface SlipProps {
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** 简色的赭石占比：越大越深（脱色前深、脱色后浅） */
  tone?: number;
  /** 字迹可辨度 0–1 */
  ink?: number;
  /** 断裂程度 0–1 */
  damage?: number;
  /** 湿润程度 0–1：饱水简有高光带，脱水后转哑光 */
  wet?: number;
  /** 收缩后的形变 */
  sx?: number;
  sy?: number;
  /** 列几个字。缺省按几何算，保证字形近方；脱水时按未收缩前算，字才会被压扁 */
  glyphs?: number;
  seed?: number;
  /** 轻微倾斜，真简不会摆得笔直 */
  tilt?: number;
  /** 泥污覆盖 0–1（从下往上退） */
  mud?: number;
  /** 十六醇结晶的哑光颗粒 0–1 */
  crystal?: number;
  /** 编绳磨痕：报告据此复制新竹片、反推卷圈顺序 */
  cordMarks?: boolean;
  children?: React.ReactNode;
}

/**
 * 一枚简。走马楼竹简长约 23 厘米、宽约 1 厘米出头，**长宽比接近 1:19**——
 * 画面上做了压缩，但必须保持「细长」这个第一印象，画成宽条就不是简了。
 *
 * 层序：投影 → 弧面底色 → 纤维纹 → 竹节 → 老化斑 → 墨 → 结晶 → 湿面高光 →
 * 泥污 → 编绳磨痕 → 断茬 → 边线。
 */
function Slip({
  cx,
  cy,
  w,
  h,
  tone = 22,
  ink = 1,
  damage = 0,
  wet = 1,
  sx = 1,
  sy = 1,
  glyphs,
  seed = 5,
  tilt = 0,
  mud = 0,
  crystal = 0,
  cordMarks = true,
  children,
}: SlipProps) {
  const uid = useId().replace(/:/g, '');
  const ww = w * sx;
  const hh = h * sy;
  const x = cx - ww / 2;
  const y = cy - hh / 2;
  const rx = Math.min(ww * 0.2, 3);
  // 字数按**未收缩**的尺寸算：干燥时简变窄、字数不变，字就被压扁了
  const count = glyphs ?? Math.max(3, Math.round((h * 0.92) / (w * 0.68)));

  const grain = useMemo(() => {
    const out: { gx: number; o: number; wdt: number }[] = [];
    const n = Math.max(3, Math.round(w / 7));
    for (let i = 0; i < n; i++) {
      out.push({
        gx: (i + 0.4 + rand(seed * 7 + i) * 0.3) / n,
        o: 0.022 + rand(seed * 19 + i) * 0.04,
        wdt: 0.3 + rand(seed * 13 + i) * 0.35,
      });
    }
    return out;
  }, [w, seed]);

  const stains = useMemo(() => {
    const out: { sx: number; sy: number; r: number; o: number }[] = [];
    for (let i = 0; i < 6; i++) {
      out.push({
        sx: 0.16 + rand(seed * 3 + i) * 0.68,
        sy: 0.06 + rand(seed * 5 + i) * 0.88,
        r: 0.1 + rand(seed * 11 + i) * 0.22,
        o: 0.05 + rand(seed * 17 + i) * 0.09,
      });
    }
    return out;
  }, [seed]);

  const hasMud = mud > 0.02;

  return (
    <g transform={tilt ? `rotate(${tilt} ${cx} ${cy})` : undefined}>
      <defs>
        {/* 竹片是弧的：两边压暗、中间受光 */}
        <linearGradient id={`bam${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={`color-mix(in oklab, ${OCHRE} ${tone + 30}%, ${SURFACE})`} />
          <stop offset="20%" stopColor={`color-mix(in oklab, ${OCHRE} ${tone + 7}%, ${SURFACE})`} />
          <stop offset="48%" stopColor={`color-mix(in oklab, ${OCHRE} ${Math.max(4, tone - 7)}%, ${SURFACE})`} />
          <stop offset="84%" stopColor={`color-mix(in oklab, ${OCHRE} ${tone + 12}%, ${SURFACE})`} />
          <stop offset="100%" stopColor={`color-mix(in oklab, ${OCHRE} ${tone + 34}%, ${SURFACE})`} />
        </linearGradient>
        {/* 洇墨：墨渗进不致密的竹黄组织 */}
        <filter id={`bleed${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={Math.max(0.35, w * 0.02)} />
        </filter>
        {/* 湿面高光：一条沿简身的窄亮带 */}
        <linearGradient id={`sheen${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SURFACE} stopOpacity="0" />
          <stop offset="26%" stopColor={SURFACE} stopOpacity="0.62" />
          <stop offset="42%" stopColor={SURFACE} stopOpacity="0.12" />
          <stop offset="100%" stopColor={SURFACE} stopOpacity="0" />
        </linearGradient>
        {/* 泥：有机边界，只在真有泥时才生成这个较贵的滤镜 */}
        {hasMud && (
          <filter id={`mud${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed={seed} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={Math.max(3, w * 0.3)} />
          </filter>
        )}
        <clipPath id={`clip${uid}`}>
          <rect x={x} y={y} width={ww} height={hh} rx={rx} />
        </clipPath>
      </defs>

      {/* 投影：压在盘底上 */}
      <rect x={x + 1} y={y + 2} width={ww} height={hh} rx={rx} fill={INK} opacity={0.14} filter={`url(#bleed${uid})`} />

      <rect x={x} y={y} width={ww} height={hh} rx={rx} fill={`url(#bam${uid})`} />

      <g clipPath={`url(#clip${uid})`}>
        {/* 纵向纤维纹：稀、细、不匀 */}
        {grain.map((g, i) => (
          <line
            key={i}
            x1={x + ww * g.gx}
            y1={y}
            x2={x + ww * g.gx}
            y2={y + hh}
            stroke={INK}
            strokeOpacity={g.o}
            strokeWidth={g.wdt}
          />
        ))}
        {/* 竹节：横过简身的一道浅环 */}
        <line x1={x} y1={y + hh * 0.38} x2={x + ww} y2={y + hh * 0.38} stroke={INK} strokeOpacity={0.05} strokeWidth={1.2} />
        <line x1={x} y1={y + hh * 0.386} x2={x + ww} y2={y + hh * 0.386} stroke={SURFACE} strokeOpacity={0.16} strokeWidth={0.7} />

        {/* 老化斑与虫蛀点 */}
        {stains.map((st, i) => (
          <ellipse
            key={i}
            cx={x + ww * st.sx}
            cy={y + hh * st.sy}
            rx={ww * st.r}
            ry={hh * st.r * 0.14}
            fill={INK}
            opacity={st.o}
            filter={`url(#bleed${uid})`}
          />
        ))}

        <InkColumn
          x={x + ww * 0.12}
          y={y + hh * 0.04}
          w={ww * 0.76}
          h={hh * 0.92}
          count={count}
          ink={ink}
          seed={seed * 23}
          bleedId={`bleed${uid}`}
        />

        {/* 十六醇结晶：脱水后的哑光颗粒 */}
        {crystal > 0.02 &&
          Array.from({ length: Math.round(crystal * 30) }).map((_, i) => (
            <circle
              key={i}
              cx={x + ww * (0.06 + rand(seed * 29 + i) * 0.88)}
              cy={y + hh * (0.04 + rand(seed * 31 + i) * 0.92)}
              r={0.45 + rand(seed * 37 + i) * 0.9}
              fill={SURFACE}
              opacity={0.3 + rand(seed * 41 + i) * 0.35}
            />
          ))}

        {/* 湿面高光：饱水时最亮，脱水后消失 */}
        {wet > 0.05 && <rect x={x} y={y} width={ww} height={hh} fill={`url(#sheen${uid})`} opacity={wet * 0.9} />}

        {/* 泥污：从下往上退，边界不规则 */}
        {hasMud && (
          <g filter={`url(#mud${uid})`}>
            <rect
              x={x - ww * 0.3}
              y={y + hh * (1 - mud)}
              width={ww * 1.6}
              height={hh * mud + 3}
              fill={`color-mix(in oklab, ${OCHRE} 58%, ${INK})`}
              opacity={0.84}
            />
          </g>
        )}
      </g>

      {/* 编绳磨痕：上下两道，报告据此复制新竹片、反推原始卷圈顺序 */}
      {cordMarks && hh > 40 &&
        [0.24, 0.78].map((f) => (
          <g key={f} opacity={0.5}>
            <path d={`M ${x - 0.4} ${y + hh * f} l 1.6 0`} stroke={INK} strokeOpacity={0.4} strokeWidth={1.6} />
            <path d={`M ${x + ww - 1.2} ${y + hh * f} l 1.6 0`} stroke={INK} strokeOpacity={0.4} strokeWidth={1.6} />
          </g>
        ))}

      <Cracks x={x} y={y} w={ww} h={hh} severity={damage} seed={seed + 2} />

      {/* 边线：受光的一侧亮、背光的一侧压深 */}
      <rect x={x} y={y} width={ww} height={hh} rx={rx} fill="none" stroke={INK} strokeOpacity={0.28} strokeWidth={0.7} />
      <line x1={x + 0.7} y1={y + 2} x2={x + 0.7} y2={y + hh - 2} stroke={SURFACE} strokeOpacity={0.42} strokeWidth={0.7} />
      {children}
    </g>
  );
}

/**
 * 简坨里的一枚简——横截面上看到的是简端，不是简面。
 * 刻意不走 Slip：一坨十几枚、五坨就是几十个实例，每个都带滤镜会把画面拖垮。
 */
function SlipEnd({
  x,
  y,
  w,
  h,
  tone,
  seed,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: number;
  seed: number;
}) {
  const tilt = (rand(seed) - 0.5) * 3.5;
  return (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x + 0.5} y={y + 0.8} width={w} height={h} rx={1.2} fill={INK} opacity={0.16} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={1.2}
        fill={`color-mix(in oklab, ${OCHRE} ${tone + rand(seed + 3) * 8}%, ${SURFACE})`}
        stroke={INK}
        strokeOpacity={0.2}
        strokeWidth={0.5}
      />
      {/* 简端的弧面：受光的一条窄边 */}
      <line x1={x + 0.6} y1={y + 1} x2={x + 0.6} y2={y + h - 1} stroke={SURFACE} strokeOpacity={0.45} strokeWidth={0.6} />
    </g>
  );
}

/** 揭剥号纸签：工序里每一枚简的身份都挂在这上面 */
function Tag({ x, y, text }: { x: number; y: number; text: string }) {
  const w = Math.max(38, text.length * 5.6 + 12);
  return (
    <g>
      <rect x={x} y={y} width={w} height={13} rx={1.5} fill={SURFACE} stroke={BORDER} strokeWidth={0.7} />
      <circle cx={x + 5} cy={y + 6.5} r={1.6} fill={CINNABAR} opacity={0.75} />
      <text x={x + 10} y={y + 9.5} fill={MUTED} fontSize={7.6} fontFamily="var(--font-mono, monospace)">
        {text}
      </text>
    </g>
  );
}

function Caption({ x, y, text, tone = MUTED, size = 9.5 }: { x: number; y: number; text: string; tone?: string; size?: number }) {
  return (
    <text x={x} y={y} fill={tone} fontSize={size} fontFamily="var(--font-mono, monospace)">
      {text}
    </text>
  );
}

/** 搪瓷盘 / 浅盘：釉面反光 + 盘沿厚度 + 内投影 */
function Tray({
  x,
  y,
  w,
  h,
  liquid,
  liquidOpacity = 1,
  uid,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  liquid?: string;
  liquidOpacity?: number;
  uid: string;
}) {
  return (
    <g>
      <defs>
        <linearGradient id={`tray${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SUNK} />
          <stop offset="100%" stopColor={`color-mix(in oklab, ${INK} 12%, ${SUNK})`} />
        </linearGradient>
        <filter id={`inner${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {/* 盘体投影 */}
      <rect x={x + 2} y={y + 4} width={w} height={h} rx={12} fill={INK} opacity={0.1} filter={`url(#inner${uid})`} />
      {/* 盘沿 */}
      <rect x={x} y={y} width={w} height={h} rx={12} fill={`url(#tray${uid})`} stroke={BORDER} strokeWidth={1.3} />
      {/* 盘内 */}
      <rect x={x + 7} y={y + 7} width={w - 14} height={h - 14} rx={8} fill={liquid ?? RAISED} opacity={liquidOpacity} />
      {/* 内壁投影 */}
      <rect
        x={x + 7}
        y={y + 7}
        width={w - 14}
        height={h - 14}
        rx={8}
        fill="none"
        stroke={INK}
        strokeOpacity={0.12}
        strokeWidth={3}
        filter={`url(#inner${uid})`}
      />
      {/* 釉面反光：盘沿上的一道窄高光 */}
      <path
        d={`M ${x + 14} ${y + 4} L ${x + w - 20} ${y + 4}`}
        stroke={SURFACE}
        strokeOpacity={0.55}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </g>
  );
}

/** 液面：起伏 + 弯月面 + 水下折射带 */
function Surface({ x, y, w, tint = WATER, animate = true }: { x: number; y: number; w: number; tint?: string; animate?: boolean }) {
  const d = `M ${x} ${y} q ${w / 8} -3.5 ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0`;
  return (
    <g className={animate ? 'wj-sim-ripple' : undefined}>
      <path d={d} stroke={tint} strokeOpacity={0.42} strokeWidth={1.1} fill="none" />
      <path d={`${d}`} transform="translate(0 3)" stroke={SURFACE} strokeOpacity={0.5} strokeWidth={0.8} fill="none" />
    </g>
  );
}

export interface SimViewProps {
  scene: WjSimScene;
  state: WjSimState;
  /** 当前「逐段推进」的进度 0–1；未进入推进步时为 0 */
  progress: number;
  /** 已做出的选择（step id → choice key），画面据此改形 */
  picks: Record<string, string>;
  /** 已设定的参数（step id → 数值） */
  dials: Record<string, number>;
  /** 已排定的次序（step id → key 顺序） */
  orders: Record<string, string[]>;
}

const VB_W = 640;
const VB_H = 290;

// ───────────────────── 环节一　揭取：井内叠压 ─────────────────────
function StackScene({ state, progress, picks }: SimViewProps) {
  const uid = useId().replace(/:/g, '');
  // 建档方式决定这枚简身上挂的是什么：三样齐了才有揭剥号
  const record = picks['s1-record'];
  const tagText = record === 'full' ? '30-27-38' : record === 'photo' ? '有照 · 未登号' : record === 'none' ? '未建档' : '待建档';
  const damage = clamp01((100 - state.integrity) / 100);
  const tuo = ['a', 'b', 'c', 'd', 'e'];
  const top = 62;
  const lh = 31;

  return (
    <g>
      <defs>
        <linearGradient id={`well${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`color-mix(in oklab, ${INK} 8%, ${SUNK})`} />
          <stop offset="100%" stopColor={`color-mix(in oklab, ${INK} 26%, ${SUNK})`} />
        </linearGradient>
        <filter id={`soft${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* 井壁：砖砌 + 内壁背光 */}
      <path
        d={`M 40 30 L 40 236 Q 40 250 54 250 L 404 250 Q 418 250 418 236 L 418 30`}
        fill={`url(#well${uid})`}
        stroke={BORDER}
        strokeWidth={1.4}
      />
      {Array.from({ length: 7 }).map((_, i) => (
        <g key={i} opacity={0.5}>
          <line x1={40} y1={44 + i * 29} x2={62} y2={44 + i * 29} stroke={INK} strokeOpacity={0.14} />
          <line x1={396} y1={44 + i * 29} x2={418} y2={44 + i * 29} stroke={INK} strokeOpacity={0.14} />
        </g>
      ))}
      <Caption x={44} y={22} text="J22 · I 区简牍层（横截面示意）" />

      {tuo.map((k, i) => {
        // a 坨在这一枚剥离完成后即视为已揭
        const taken = k === 'a' && progress >= 1;
        const y = top + i * lh;
        // 受井壁坍塌挤压，下面几坨略倾斜——报告记的就是一个已受扰动的堆积
        const skew = i >= 3 ? (i - 2) * 1.1 : 0;
        return (
          <g key={k} opacity={taken ? 0.26 : 1} transform={`rotate(${skew} 230 ${y + lh / 2})`}>
            {/* 坨体：一层简 + 层间淤泥 */}
            <rect
              x={62}
              y={y}
              width={330}
              height={lh - 6}
              rx={3}
              fill={taken ? SUNK : `color-mix(in oklab, ${OCHRE} ${16 + i * 4}%, ${SUNK})`}
              stroke={taken ? LINE : BORDER}
              strokeWidth={0.9}
            />
            {!taken &&
              Array.from({ length: 26 }).map((_, j) => (
                <SlipEnd
                  key={j}
                  x={66 + j * 12.4}
                  y={y + 3}
                  w={9.6}
                  h={lh - 13}
                  tone={19 + i * 3}
                  seed={100 + i * 20 + j}
                />
              ))}
            {/* 层间淤泥 */}
            {!taken && (
              <rect
                x={62}
                y={y + lh - 8}
                width={330}
                height={2.5}
                fill={`color-mix(in oklab, ${OCHRE} 52%, ${INK})`}
                opacity={0.35}
              />
            )}
            <text
              x={50}
              y={y + lh / 2 + 1}
              fill={taken ? DIM : CINNABAR}
              fontSize={12}
              fontFamily="var(--font-serif, serif)"
            >
              {k}
            </text>
            {taken && <Caption x={398} y={y + lh / 2 + 1} text="已揭" tone={BAMBOO} size={8.5} />}
          </g>
        );
      })}

      {/* 刀口：竹刀尖沿界面推进，带一点金属反光 */}
      {progress > 0 && (
        <g>
          <line x1={62} y1={top - 9} x2={62 + 330 * progress} y2={top - 9} stroke={CINNABAR} strokeWidth={2.2} strokeLinecap="round" />
          <path
            d={`M ${62 + 330 * progress} ${top - 9} l 13 -4.5 l 0 9 z`}
            fill={`color-mix(in oklab, ${INK} 55%, ${SURFACE})`}
          />
          <path d={`M ${62 + 330 * progress} ${top - 9} l 9 -2.4`} stroke={SURFACE} strokeOpacity={0.7} strokeWidth={0.9} />
          <Caption x={62} y={top - 16} text={`刀口推进 ${(progress * 23).toFixed(1)} cm / 23 cm`} tone={CINNABAR} />
        </g>
      )}

      {/* 剥出的那一枚：托片上 */}
      <rect x={452} y={58} width={150} height={176} rx={5} fill={RAISED} stroke={BORDER} strokeWidth={1} />
      <rect x={452} y={58} width={150} height={176} rx={5} fill={SURFACE} opacity={0.25} />
      <Slip
        cx={512}
        cy={146}
        w={19}
        h={178}
        tone={26}
        ink={state.legibility / 100}
        damage={damage}
        wet={0.95}
        seed={11}
        tilt={-1.1}
      />
      <Tag x={548} y={78} text={tagText} />
      <Caption x={452} y={248} text="水润托片 · 剥出的简" />
    </g>
  );
}

// ───────────────────── 环节二　清洗：泥污褪去 ─────────────────────
function CleanScene({ state, progress, picks, dials }: SimViewProps) {
  const uid = useId().replace(/:/g, '');
  const damage = clamp01((100 - state.integrity) / 100);
  const force = dials['s2-force'] ?? 0;
  const face = picks['s2-face'];
  const tool = picks['s2-tool'];
  const mud = 1 - progress;

  return (
    <g>
      <Tray x={54} y={34} w={420} h={220} liquid={`color-mix(in oklab, ${WATER} 9%, ${SURFACE})`} uid={uid} />
      <Surface x={61} y={50} w={406} />
      <Caption
        x={56}
        y={26}
        text={
          face === 'green'
            ? '浅盘 · 清水 · 起手面：竹青面（背面）'
            : face === 'yellow'
              ? '浅盘 · 清水 · 起手面：竹黄面（正面）'
              : '浅盘 · 清水'
        }
      />

      {/* 主简：竹青面色浅而致密，竹黄面偏黄 */}
      <Slip
        cx={236}
        cy={146}
        w={24}
        h={200}
        tone={face === 'green' ? 15 : 28}
        ink={state.legibility / 100}
        damage={damage}
        wet={1}
        mud={clamp01(mud)}
        seed={21}
        tilt={0.7}
      />
      <Tag x={210} y={256} text={face === 'green' ? '竹青面' : '竹黄面'} />

      {/* 尼龙勾线笔 / 毛笔：笔杆 + 金属箍 + 笔锋，力度越大压得越低、笔锋越弯 */}
      {force > 0 && (
        <g transform={`translate(300, ${112 + force * 3.2}) rotate(${30 + force * 1.8})`}>
          {/* 笔杆投影 */}
          <rect x={6} y={-2} width={122} height={7} rx={3.5} fill={INK} opacity={0.12} />
          {/* 笔杆 */}
          <rect
            x={4}
            y={-3.4}
            width={120}
            height={6.8}
            rx={3.4}
            fill={tool === 'nylon' ? `color-mix(in oklab, ${INK} 62%, ${SURFACE})` : `color-mix(in oklab, ${OCHRE} 46%, ${SURFACE})`}
          />
          <rect x={4} y={-3.4} width={120} height={2} rx={1} fill={SURFACE} opacity={0.28} />
          {/* 金属箍 */}
          <rect x={2} y={-4} width={11} height={8} rx={1.6} fill={`color-mix(in oklab, ${INK} 34%, ${SURFACE})`} />
          <rect x={2} y={-4} width={11} height={2.6} rx={1} fill={SURFACE} opacity={0.45} />
          {/* 笔锋：力度大时明显外撇 */}
          <path
            d={`M 2 0 q -11 ${(force - 4) * 1.15} -19 ${(force - 4) * 0.5} q 8 ${-(force - 4) * 1.6} 19 ${-(force - 4) * 0.5} z`}
            fill={force > 5 ? CINNABAR : `color-mix(in oklab, ${INK} 70%, ${SURFACE})`}
            opacity={0.9}
          />
        </g>
      )}

      {/* 已洗下来的泥：在盘底散开 */}
      {progress > 0.1 &&
        Array.from({ length: Math.round(progress * 14) }).map((_, i) => (
          <ellipse
            key={i}
            cx={90 + rand(i + 3) * 350}
            cy={216 + rand(i + 40) * 26}
            rx={2 + rand(i + 80) * 5}
            ry={1.2 + rand(i + 120) * 2.4}
            fill={`color-mix(in oklab, ${OCHRE} 55%, ${INK})`}
            opacity={0.2 + rand(i + 160) * 0.16}
          />
        ))}

      {/* 读数 */}
      <g transform="translate(494, 62)">
        <Caption x={0} y={0} text="清洗工序" />
        {Array.from({ length: 6 }).map((_, i) => {
          const passed = progress * 6 > i;
          return (
            <g key={i}>
              <rect
                x={0}
                y={12 + i * 22}
                width={104}
                height={15}
                rx={2}
                fill={passed ? `color-mix(in oklab, ${BAMBOO} 14%, ${SURFACE})` : RAISED}
                stroke={passed ? BAMBOO : LINE}
                strokeOpacity={passed ? 0.5 : 1}
                strokeWidth={0.8}
              />
              <text
                x={7}
                y={23 + i * 22}
                fill={passed ? BAMBOO : DIM}
                fontSize={8.6}
                fontFamily="var(--font-mono, monospace)"
              >
                {passed ? '✓' : '·'} 第 {i + 1} 道
              </text>
            </g>
          );
        })}
      </g>
      {force > 5 && <Caption x={56} y={272} text={`运笔力度 ${force} 档 · 超出可控区间`} tone={CINNABAR} />}
    </g>
  );
}

// ───────────────────── 环节三　绑夹：约束与漂移 ─────────────────────
function BindScene({ state, picks }: SimViewProps) {
  const uid = useId().replace(/:/g, '');
  const method = picks['s3-method'];
  const boiled = picks['s3-boil'];
  const damage = clamp01((100 - state.integrity) / 100);
  const drift = method === 'none';

  return (
    <g>
      <Tray
        x={48}
        y={38}
        w={438}
        h={214}
        liquid={drift ? `color-mix(in oklab, ${WATER} 13%, ${SURFACE})` : RAISED}
        uid={uid}
      />
      {drift && <Surface x={55} y={54} w={424} />}
      <Caption
        x={50}
        y={30}
        text={drift ? '特制脱色槽 · 简未绑夹（2003 年 7 月第三批次）' : method === 'double' ? '绑夹台 · 双面无机玻璃条' : '绑夹台 · 单面「之」字形缠绕'}
        tone={drift ? CINNABAR : MUTED}
      />

      {[0, 1, 2].map((i) => {
        const baseX = 136 + i * 108;
        // 漂移：薄小的那枚随水流串到别的槽里去
        const dx = drift ? (i === 1 ? 54 : (i - 1) * 26) : 0;
        const dy = drift && i === 1 ? 26 : 0;
        const tilt = drift && i === 1 ? 13 : (rand(i + 7) - 0.5) * 2.2;
        return (
          <g key={i} transform={`translate(${dx}, ${dy})`}>
            {/* 槽格：未绑夹时格子还在，简却不在格里 */}
            {drift && (
              <rect
                x={baseX - dx - 21}
                y={56}
                width={42}
                height={170}
                rx={3}
                fill="none"
                stroke={LINE}
                strokeDasharray="3 3"
                strokeWidth={0.9}
              />
            )}
            <Slip
              cx={baseX}
              cy={140}
              w={19}
              h={172}
              tone={20}
              ink={state.legibility / 100}
              damage={damage}
              wet={drift ? 1 : 0.55}
              seed={31 + i * 5}
              tilt={tilt}
            />
            {/* 双面无机玻璃条：夹住两面，药剂进不去 */}
            {method === 'double' && (
              <g transform={`rotate(${tilt} ${baseX} 140)`}>
                <rect x={baseX - 22} y={54} width={44} height={174} rx={2} fill={WATER} opacity={0.13} />
                <rect x={baseX - 22} y={54} width={44} height={174} rx={2} fill="none" stroke={WATER} strokeOpacity={0.45} strokeWidth={0.9} />
                <line x1={baseX - 18} y1={58} x2={baseX + 18} y2={72} stroke={SURFACE} strokeOpacity={0.5} strokeWidth={1.2} />
                {[66, 214].map((yy) => (
                  <g key={yy}>
                    <rect x={baseX - 23} y={yy} width={46} height={4} rx={2} fill={`color-mix(in oklab, ${INK} 30%, ${SURFACE})`} />
                    <circle cx={baseX + 17} cy={yy + 2} r={3.2} fill="none" stroke={`color-mix(in oklab, ${INK} 30%, ${SURFACE})`} strokeWidth={1.4} />
                  </g>
                ))}
              </g>
            )}
            {/* 单面「之」字形棉线：字迹一面朝外，药剂能进 */}
            {method === 'single' && (
              <g transform={`rotate(${tilt} ${baseX} 140)`}>
                <path
                  d={Array.from({ length: 8 })
                    .map((_, k) => {
                      const yy = 62 + k * 22;
                      const xx = baseX + (k % 2 === 0 ? -17 : 17);
                      return `${k === 0 ? 'M' : 'L'} ${xx} ${yy}`;
                    })
                    .join(' ')}
                  stroke={boiled === 'raw' ? CINNABAR : `color-mix(in oklab, ${INK} 30%, ${SURFACE})`}
                  strokeWidth={boiled === 'raw' ? 3 : 1.8}
                  fill="none"
                  strokeLinejoin="round"
                />
                {/* 未蒸煮的棉线收缩勒进简面：留下压痕 */}
                {boiled === 'raw' &&
                  Array.from({ length: 8 }).map((_, k) => (
                    <line
                      key={k}
                      x1={baseX - 14}
                      y1={62 + k * 22}
                      x2={baseX + 14}
                      y2={62 + k * 22}
                      stroke={INK}
                      strokeOpacity={0.22}
                      strokeWidth={2.4}
                    />
                  ))}
              </g>
            )}
            {drift && i === 1 && <Caption x={baseX - 18} y={246} text="串槽" tone={CINNABAR} />}
            <Tag x={baseX - 26} y={drift && i === 1 ? 232 : 226} text={`脱色号 ${41878 + i}`} />
          </g>
        );
      })}

      {boiled === 'raw' && <Caption x={50} y={274} text="棉线未蒸煮 · 遇水收缩，在 471% 含水率的简体上勒出压痕" tone={CINNABAR} />}
      <g transform="translate(506, 66)">
        <Caption x={0} y={0} text="编号身份" />
        <text
          x={0}
          y={22}
          fill={state.provenance < 80 ? CINNABAR : BAMBOO}
          fontSize={22}
          fontFamily="var(--font-mono, monospace)"
        >
          {Math.round(state.provenance)}%
        </text>
        <Caption x={0} y={42} text="药剂可及度" />
        <text
          x={0}
          y={64}
          fill={state.legibility < 80 ? CINNABAR : BAMBOO}
          fontSize={22}
          fontFamily="var(--font-mono, monospace)"
        >
          {Math.round(state.legibility)}%
        </text>
      </g>
    </g>
  );
}

// ───────────────────── 环节四　饱水保存：菌斑生长 ─────────────────────
function TankScene({ state, progress, picks, dials }: SimViewProps) {
  const uid = useId().replace(/:/g, '');
  const damage = clamp01((100 - state.integrity) / 100);
  const conc = dials['s4-conc'];
  const agent = picks['s4-agent'];
  const spots = Math.round(clamp01(state.risk / 100) * 22 * (0.3 + progress));
  const liquid =
    agent === 'cuso4'
      ? `color-mix(in oklab, ${WATER} 26%, ${SURFACE})`
      : agent === 'mold'
        ? `color-mix(in oklab, ${SURFACE} 92%, ${OCHRE})`
        : `color-mix(in oklab, ${WATER} 11%, ${SURFACE})`;

  return (
    <g>
      <Tray x={48} y={44} w={452} h={196} liquid={liquid} uid={uid} />
      <Surface x={55} y={60} w={438} />
      {/* 弯月面：贴着盘壁爬起来的一圈 */}
      <path d="M 57 58 q 4 8 0 16" stroke={WATER} strokeOpacity={0.3} strokeWidth={1.2} fill="none" />
      <path d="M 491 58 q -4 8 0 16" stroke={WATER} strokeOpacity={0.3} strokeWidth={1.2} fill="none" />
      <Caption
        x={50}
        y={36}
        text={`存放室 · ${agent ? '药液' : '清水'}${conc ? ` ${conc.toFixed(2)}%` : ''} · 第 ${Math.round(progress * 24)} 月`}
      />

      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Slip
            cx={122 + i * 92}
            cy={148}
            w={17}
            h={168}
            tone={agent === 'cuso4' ? 30 : 22}
            ink={state.legibility / 100}
            damage={damage}
            wet={1}
            seed={41 + i * 7}
            tilt={(rand(i + 11) - 0.5) * 2.6}
          />
          {/* 水下折射：液面之下的部分横向错开一点 */}
          <rect x={112 + i * 92} y={68} width={19} height={5} fill={SURFACE} opacity={0.14} />
        </g>
      ))}

      {/* 蚀斑病：白斑（半透明膜状）、黏液（发亮的涂层）、软腐（海绵孔） */}
      {Array.from({ length: spots }).map((_, i) => {
        const cx = 78 + rand(i + 60) * 400;
        const cy = 76 + rand(i + 130) * 148;
        const r = 2.4 + rand(i + 200) * 6;
        const kind = i % 3;
        if (kind === 0)
          // 白斑：膜状，一碰就碎
          return (
            <g key={i}>
              <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.78} fill={SURFACE} opacity={0.72} />
              <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.78} fill="none" stroke={BORDER} strokeWidth={0.6} />
            </g>
          );
        if (kind === 1)
          // 黏液：不破坏简体，但反光、且是真菌的碳源
          return (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={r * 1.3}
              ry={r * 0.55}
              fill={`color-mix(in oklab, ${OCHRE} 26%, ${SURFACE})`}
              opacity={0.5}
            />
          );
        // 软腐：简体如海绵
        return (
          <g key={i} opacity={0.6}>
            {Array.from({ length: 4 }).map((_, k) => (
              <circle
                key={k}
                cx={cx + (rand(i * 9 + k) - 0.5) * r * 2}
                cy={cy + (rand(i * 13 + k) - 0.5) * r * 2}
                r={0.9 + rand(i * 17 + k) * 1.5}
                fill={INK}
                opacity={0.2}
              />
            ))}
          </g>
        );
      })}
      {spots > 6 && <Caption x={366} y={36} text="蚀斑病 · 白斑 / 黏液 / 软腐" tone={CINNABAR} />}

      {/* 菌落监测：培养皿读数 */}
      <g transform="translate(518, 70)">
        <Caption x={0} y={0} text="菌落监测" />
        <circle cx={44} cy={54} r={40} fill={RAISED} stroke={BORDER} strokeWidth={1.2} />
        <circle cx={44} cy={54} r={40} fill={SURFACE} opacity={0.3} />
        <path d="M 18 26 q 18 -8 36 2" stroke={SURFACE} strokeOpacity={0.6} strokeWidth={1.4} fill="none" />
        {Array.from({ length: Math.round(clamp01(state.risk / 100) * 26) }).map((_, i) => {
          const a = rand(i + 300) * Math.PI * 2;
          const rr = Math.sqrt(rand(i + 400)) * 34;
          return (
            <circle
              key={i}
              cx={44 + Math.cos(a) * rr}
              cy={54 + Math.sin(a) * rr}
              r={1 + rand(i + 500) * 2.4}
              fill={state.risk > 45 ? CINNABAR : BAMBOO}
              opacity={0.5}
            />
          );
        })}
        <text
          x={44}
          y={116}
          textAnchor="middle"
          fill={state.risk > 45 ? CINNABAR : BAMBOO}
          fontSize={15}
          fontFamily="var(--font-mono, monospace)"
        >
          {Math.round(state.risk)} / 100
        </text>
      </g>
    </g>
  );
}

// ───────────────────── 环节五　脱色：恒温槽与蓝色值 ─────────────────────
function BleachScene({ state, progress, picks, dials }: SimViewProps) {
  const uid = useId().replace(/:/g, '');
  const damage = clamp01((100 - state.integrity) / 100);
  const temp = dials['s5-temp'] ?? 25;
  const agent = picks['s5-agent'];
  // 罗维朋蓝色值：报告实测 连二亚硫酸钠 →3.1，草酸 →4.3，双氧水 →4.3
  const blueStart = 5.5;
  const blueEnd = agent === 'dithionite' ? 3.1 : agent === 'oxalic' ? 4.3 : agent === 'h2o2' ? 4.3 : 5.2;
  const inBand = temp >= 45 && temp <= 50;
  const eff = agent ? (inBand ? 1 : 0.45) : 0;
  const blue = blueStart - (blueStart - blueEnd) * progress * eff;
  const tone = Math.max(6, 12 + (blue - 3) * 10);
  const collapsed = agent === 'nabh4' && progress > 0.1;

  // 温度计几何
  const TT = 58;
  const TB = 226;
  const tY = (t: number) => TB - ((t - 20) / 60) * (TB - TT);

  return (
    <g>
      <Tray x={44} y={46} w={372} h={194} liquid={`color-mix(in oklab, ${WATER} 12%, ${SURFACE})`} uid={uid} />
      <Surface x={51} y={62} w={358} />
      <Caption
        x={46}
        y={38}
        text={`恒温槽 · ${agent ? '第二步 还原（保温）' : '待配液'} · ${temp}℃`}
        tone={inBand ? BAMBOO : CINNABAR}
      />
      {/* 加热：保温时槽底起气泡 */}
      {inBand &&
        progress > 0 &&
        Array.from({ length: 9 }).map((_, i) => (
          <circle
            key={i}
            cx={70 + rand(i + 9) * 320}
            cy={214 - rand(i + 19) * (60 * progress)}
            r={1.1 + rand(i + 29) * 1.7}
            fill={SURFACE}
            opacity={0.5}
          />
        ))}

      {[0, 1, 2].map((i) => (
        <g key={i} transform={collapsed ? `translate(0, ${-56 + i * 4}) rotate(${(i - 1) * 8} ${112 + i * 100} 150)` : undefined}>
          <Slip
            cx={112 + i * 100}
            cy={150}
            w={18}
            h={172}
            tone={tone}
            ink={state.legibility / 100}
            damage={collapsed ? 0.85 : damage}
            wet={1}
            seed={51 + i * 6}
            tilt={(rand(i + 5) - 0.5) * 2.8}
          />
        </g>
      ))}
      {collapsed && <Caption x={52} y={230} text="竹简变腐松软、漂浮于液面" tone={CINNABAR} />}

      {/* 温度计：球部 + 刻度 + 安全带 */}
      <g>
        <rect x={434} y={TT - 12} width={18} height={TB - TT + 18} rx={9} fill={SURFACE} stroke={BORDER} strokeWidth={1.1} />
        {/* 报告给的保温区间 45～50℃ */}
        <rect x={431} y={tY(50)} width={24} height={tY(45) - tY(50)} fill={BAMBOO} opacity={0.2} />
        <line x1={431} y1={tY(50)} x2={455} y2={tY(50)} stroke={BAMBOO} strokeOpacity={0.6} strokeWidth={0.9} />
        <line x1={431} y1={tY(45)} x2={455} y2={tY(45)} stroke={BAMBOO} strokeOpacity={0.6} strokeWidth={0.9} />
        {/* 汞柱 */}
        <rect x={439} y={tY(temp)} width={8} height={TB - tY(temp)} fill={inBand ? BAMBOO : CINNABAR} />
        <circle cx={443} cy={TB + 8} r={10} fill={inBand ? BAMBOO : CINNABAR} />
        <circle cx={440} cy={TB + 5} r={3} fill={SURFACE} opacity={0.35} />
        <rect x={440.5} y={TT - 10} width={2} height={TB - TT + 8} fill={SURFACE} opacity={0.35} />
        {/* 刻度 */}
        {[20, 30, 40, 50, 60, 70, 80].map((t) => (
          <g key={t}>
            <line x1={452} y1={tY(t)} x2={458} y2={tY(t)} stroke={DIM} strokeWidth={0.8} />
            <Caption x={461} y={tY(t) + 3} text={String(t)} tone={DIM} size={8} />
          </g>
        ))}
      </g>

      {/* 罗维朋比色：色片对照 + 读数 */}
      <g transform="translate(500, 60)">
        <Caption x={0} y={0} text="罗维朋蓝色值" />
        {[5.5, 5.0, 4.5, 4.0, 3.5, 3.1].map((v, i) => {
          const hit = Math.abs(blue - v) < 0.26;
          return (
            <g key={v}>
              <rect
                x={0}
                y={10 + i * 21}
                width={34}
                height={16}
                rx={2}
                fill={`color-mix(in oklab, ${OCHRE} ${Math.max(6, 12 + (v - 3) * 10)}%, ${SURFACE})`}
                stroke={hit ? CINNABAR : LINE}
                strokeWidth={hit ? 1.6 : 0.7}
              />
              <Caption x={40} y={22 + i * 21} text={v.toFixed(1)} tone={hit ? CINNABAR : DIM} size={8.6} />
            </g>
          );
        })}
        <text
          x={0}
          y={158}
          fill={blue <= 3.4 ? BAMBOO : CINNABAR}
          fontSize={22}
          fontFamily="var(--font-mono, monospace)"
        >
          {blue.toFixed(2)}
        </text>
        <Caption x={0} y={174} text="越低越好" tone={DIM} size={8.6} />
        <Caption x={0} y={186} text="实测可达 3.1" tone={DIM} size={8.6} />
      </g>
    </g>
  );
}

// ───────────────────── 环节六　脱水：收缩与字形压扁 ─────────────────────
function DryScene({ state, progress, picks, dials }: SimViewProps) {
  const filler = picks['s6-material'];
  const route = picks['s6-triage'];
  const load = dials['s6-load'] ?? 0;
  // 收缩率：填充到位 → 长 3% / 宽 5%；完全不填充 → 长 20.4% / 宽 50.6%
  const quality = clamp01(state.integrity / 100);
  const shrinkW = (0.506 - (0.506 - 0.05) * quality) * progress;
  const shrinkL = (0.204 - (0.204 - 0.03) * quality) * progress;
  const damage = clamp01((100 - state.integrity) / 100) * 0.6;
  const darkens = filler === 'peg' || filler === 'sucrose';

  return (
    <g>
      {/* 工作台面 */}
      <rect x={44} y={40} width={452} height={214} rx={8} fill={SUNK} stroke={BORDER} strokeWidth={1.2} />
      <rect x={51} y={47} width={438} height={200} rx={5} fill={RAISED} />
      <Caption
        x={46}
        y={32}
        text={`脱水台 · ${route === 'natural' ? '自然干燥（无填充）' : filler ? '填充脱水' : '待选材料'}${load ? ` · 填充量 ${load}%` : ''} · 干燥 ${Math.round(progress * 100)}%`}
      />

      {/* 对照：饱水原状 */}
      <Slip cx={140} cy={148} w={26} h={192} tone={17} ink={0.88} damage={0} wet={1} seed={61} />
      <Caption x={114} y={264} text="饱水原状" tone={DIM} />
      <Tag x={104} y={48} text="含水率 471%" />

      {/* 卡尺：把两枚的宽度差直接量出来 */}
      <g opacity={0.75}>
        <line x1={127} y1={252} x2={153} y2={252} stroke={WATER} strokeWidth={0.9} />
        <line x1={127} y1={248} x2={127} y2={256} stroke={WATER} strokeWidth={0.9} />
        <line x1={153} y1={248} x2={153} y2={256} stroke={WATER} strokeWidth={0.9} />
      </g>

      <path d="M 212 148 l 26 0 m -8 -5.5 l 8 5.5 l -8 5.5" stroke={DIM} strokeWidth={1.3} fill="none" strokeLinecap="round" />

      {/* 干燥中：宽度缩得比长度快，字跟着被压扁 */}
      <Slip
        cx={330}
        cy={148}
        w={26}
        h={192}
        sx={1 - shrinkW}
        sy={1 - shrinkL}
        tone={17 + (darkens ? 46 : 0)}
        ink={state.legibility / 100}
        damage={damage}
        wet={1 - progress}
        crystal={filler === 'hexadecanol' ? progress * 0.9 : 0}
        seed={61}
      />
      <Caption x={306} y={264} text="脱水后" tone={shrinkW > 0.05 ? CINNABAR : BAMBOO} />
      {(() => {
        const half = (26 * (1 - shrinkW)) / 2;
        return (
          <g opacity={0.75}>
            <line x1={330 - half} y1={252} x2={330 + half} y2={252} stroke={shrinkW > 0.05 ? CINNABAR : BAMBOO} strokeWidth={0.9} />
            <line x1={330 - half} y1={248} x2={330 - half} y2={256} stroke={shrinkW > 0.05 ? CINNABAR : BAMBOO} strokeWidth={0.9} />
            <line x1={330 + half} y1={248} x2={330 + half} y2={256} stroke={shrinkW > 0.05 ? CINNABAR : BAMBOO} strokeWidth={0.9} />
          </g>
        );
      })()}

      {/* 收缩率读数：5% 是指标线 */}
      <g transform="translate(516, 72)">
        <Caption x={0} y={0} text="宽度收缩" />
        <text x={0} y={22} fill={shrinkW > 0.05 ? CINNABAR : BAMBOO} fontSize={22} fontFamily="var(--font-mono, monospace)">
          {(shrinkW * 100).toFixed(1)}%
        </text>
        {/* 指标线标尺 */}
        <rect x={0} y={30} width={92} height={5} rx={2.5} fill={SUNK} />
        <rect x={0} y={30} width={Math.min(92, (shrinkW / 0.55) * 92)} height={5} rx={2.5} fill={shrinkW > 0.05 ? CINNABAR : BAMBOO} />
        <line x1={(0.05 / 0.55) * 92} y1={27} x2={(0.05 / 0.55) * 92} y2={38} stroke={OCHRE} strokeWidth={1.2} />

        <Caption x={0} y={58} text="长度收缩" />
        <text x={0} y={80} fill={shrinkL > 0.05 ? CINNABAR : BAMBOO} fontSize={22} fontFamily="var(--font-mono, monospace)">
          {(shrinkL * 100).toFixed(1)}%
        </text>
        <rect x={0} y={88} width={92} height={5} rx={2.5} fill={SUNK} />
        <rect x={0} y={88} width={Math.min(92, (shrinkL / 0.55) * 92)} height={5} rx={2.5} fill={shrinkL > 0.05 ? CINNABAR : BAMBOO} />
        <line x1={(0.05 / 0.55) * 92} y1={85} x2={(0.05 / 0.55) * 92} y2={96} stroke={OCHRE} strokeWidth={1.2} />

        <Caption x={0} y={118} text="指标 ≤5%（橙线）" tone={DIM} size={8.6} />
        <Caption x={0} y={130} text="最好 ≤3%" tone={DIM} size={8.6} />
      </g>
    </g>
  );
}

const SCENES: Record<WjSimScene, (p: SimViewProps) => React.ReactElement> = {
  stack: StackScene,
  clean: CleanScene,
  bind: BindScene,
  tank: TankScene,
  bleach: BleachScene,
  dry: DryScene,
};

export function SimStageView(props: SimViewProps) {
  const Scene = SCENES[props.scene];
  const uid = useId().replace(/:/g, '');
  // 画面只随指标与进度重画，不随每次 hover 动
  const body = useMemo(() => <Scene {...props} />, [Scene, props]);
  return (
    <figure className="overflow-hidden rounded-lg border border-wj-border bg-wj-surface">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="block h-auto w-full"
        role="img"
        aria-label="仿真工作台画面：简牍当前状态"
      >
        <defs>
          {/* 台面的纸纹：极淡的噪底，压住大块纯色 */}
          <filter id={`paper${uid}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="7" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect x={0} y={0} width={VB_W} height={VB_H} fill={SURFACE} />
        <rect x={0} y={0} width={VB_W} height={VB_H} filter={`url(#paper${uid})`} opacity={0.05} />
        {body}
      </svg>
      <figcaption className="border-t border-wj-line px-3 py-1.5 text-[11px] text-wj-dim">
        示意 · 仿真画面随操作实时改变；简面笔画是笔墨质感的模拟，不是可释读的释文
      </figcaption>
    </figure>
  );
}
