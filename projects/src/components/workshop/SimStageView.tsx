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
 *
 * 动效分两层，都是 CSS（globals.css 的 prefers-reduced-motion 总开关直接管到）：
 *   - **动作**：每个工步落手，StageSim 发一个 cue（步 id + 选项 + nonce），场景据此
 *     放一段一次性的动作——拍照闪光、下刀、点水、热浪、缠线、倒药、起简……
 *     用 key=nonce 重挂，同一步再落手动效重放；
 *   - **过渡**：状态量（刀口位置、泥污退线、汞柱、液色、简的收缩与漂移）挂 .wj-sim-anim，
 *     用 transform / fill 过渡而不是直接改几何，画面不再「跳」到新状态。
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

        {/* 泥污：从下往上退，边界不规则；退线走 transform 过渡，一道一道往上滑 */}
        {hasMud && (
          <g filter={`url(#mud${uid})`}>
            <rect
              className="wj-sim-anim"
              x={x - ww * 0.3}
              y={y}
              width={ww * 1.6}
              height={hh + 3}
              fill={`color-mix(in oklab, ${OCHRE} 58%, ${INK})`}
              opacity={0.84}
              style={{ transform: `translateY(${hh * (1 - mud)}px)` }}
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

/** 最近一次落手：场景据此放一段对应的动作 */
export interface SimCue {
  step: string;
  kind: 'pick' | 'dial' | 'order' | 'tick' | 'event';
  choice?: string;
  value?: number;
  verdict?: 'good' | 'fair' | 'bad';
  /** 变一次动效重放一次 */
  nonce: number;
}

/** 只在 cue 命中时渲染，并以 nonce 为 key——重挂即重放 */
function Fx({
  cue,
  step,
  kind,
  choice,
  children,
}: {
  cue?: SimCue | null;
  step: string;
  kind?: SimCue['kind'];
  choice?: string | string[];
  children: React.ReactNode;
}) {
  if (!cue || cue.step !== step) return null;
  if (kind && cue.kind !== kind) return null;
  if (choice !== undefined) {
    const ok = Array.isArray(choice) ? choice.includes(cue.choice ?? '') : cue.choice === choice;
    if (!ok) return null;
  }
  return <g key={cue.nonce}>{children}</g>;
}

/** 闪光：拍照 */
function Flash({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect className="wj-fx-flash" x={x} y={y} width={w} height={h} rx={4} fill={SURFACE} />;
}

/** 水滴：点蘸、淋水、换液 */
function Droplets({ x, y, w, n = 6, tint = WATER, seed = 1 }: { x: number; y: number; w: number; n?: number; tint?: string; seed?: number }) {
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => (
        <ellipse
          key={i}
          className="wj-fx-drop"
          style={{ animationDelay: `${rand(seed + i) * 0.35}s` }}
          cx={x + (i + 0.5) * (w / n) + (rand(seed * 3 + i) - 0.5) * 4}
          cy={y}
          rx={1.3}
          ry={2}
          fill={tint}
          opacity={0.8}
        />
      ))}
    </g>
  );
}

/** 热气 / 蒸汽：升温、蒸煮 */
function Steam({ x, y, n = 4, seed = 2 }: { x: number; y: number; n?: number; seed?: number }) {
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => (
        <path
          key={i}
          className="wj-fx-steam"
          style={{ animationDelay: `${i * 0.18}s` }}
          d={`M ${x + i * 9} ${y} q 4 -8 0 -16 q -4 -8 0 -16`}
          stroke={DIM}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
          opacity={0.4 + rand(seed + i) * 0.2}
        />
      ))}
    </g>
  );
}

/** 一道倒下来的液流：下药、配液 */
function Pour({ x0, y0, x1, y1, tint = WATER }: { x0: number; y0: number; x1: number; y1: number; tint?: string }) {
  return (
    <path
      className="wj-fx-pour"
      pathLength={1}
      strokeDasharray="1"
      d={`M ${x0} ${y0} Q ${(x0 + x1) / 2} ${y0 + 10} ${x1} ${y1}`}
      stroke={tint}
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
      opacity={0.75}
    />
  );
}

/** 崩飞的碎屑：断裂、崩口 */
function Debris({ x, y, n = 7, seed = 3 }: { x: number; y: number; n?: number; seed?: number }) {
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => (
        <rect
          key={i}
          className="wj-fx-debris"
          style={{
            ['--dx' as string]: `${(rand(seed + i) - 0.5) * 36}px`,
            ['--dy' as string]: `${-6 - rand(seed * 5 + i) * 22}px`,
            animationDelay: `${rand(seed * 7 + i) * 0.12}s`,
          }}
          x={x}
          y={y}
          width={1.6 + rand(seed * 11 + i) * 1.6}
          height={1 + rand(seed * 13 + i) * 1.2}
          fill={`color-mix(in oklab, ${OCHRE} 45%, ${INK})`}
        />
      ))}
    </g>
  );
}

/** 扩散的圈：一记轻震 */
function Ring({ cx, cy, r = 10, tint = CINNABAR }: { cx: number; cy: number; r?: number; tint?: string }) {
  return <circle className="wj-fx-ring wj-fx-tb" cx={cx} cy={cy} r={r} fill="none" stroke={tint} strokeWidth={1.4} />;
}

/** 持续的热浪线：保温 / 熔融槽 */
function Heat({ x, y, w, n = 5 }: { x: number; y: number; w: number; n?: number }) {
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => (
        <path
          key={i}
          className="wj-fx-heat"
          style={{ animationDelay: `${i * 0.25}s` }}
          d={`M ${x + (i + 0.5) * (w / n)} ${y} q 3 -6 0 -12 q -3 -6 0 -12`}
          stroke={CINNABAR}
          strokeOpacity={0.35}
          strokeWidth={1}
          fill="none"
          strokeLinecap="round"
        />
      ))}
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
  /** 最近一次落手 */
  cue?: SimCue | null;
}

const VB_W = 640;
const VB_H = 290;

// ───────────────────── 环节一　揭取：井内叠压 ─────────────────────
function StackScene({ state, progress, picks, dials, cue }: SimViewProps) {
  const uid = useId().replace(/:/g, '');
  const damage = clamp01((100 - state.integrity) / 100);
  const tuo = ['a', 'b', 'c', 'd', 'e'];
  const top = 62;
  const lh = 31;
  // 建档方式决定这枚简身上挂的是什么：三样齐了才有揭剥号
  const record = picks['s1-record'];
  const tagText = record === 'full' ? '30-27-38' : record === 'photo' ? '有照 · 未登号' : record === 'none' ? '未建档' : '待建档';
  const tool = picks['s1-tool'];
  const pitch = dials['s1-pitch'];
  const seamY = top - 9;
  const knifeX = 62 + 330 * progress;
  const liftCue = cue?.step === 's1-lift' ? cue : null;
  const shakeA = cue?.step === 's1-oil' && cue.choice === 'force';

  return (
    <g>
      <defs>
        <linearGradient id={`well${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`color-mix(in oklab, ${INK} 8%, ${SUNK})`} />
          <stop offset="100%" stopColor={`color-mix(in oklab, ${INK} 26%, ${SUNK})`} />
        </linearGradient>
        <clipPath id={`half-top${uid}`}>
          <rect x={470} y={50} width={90} height={96} />
        </clipPath>
        <clipPath id={`half-bot${uid}`}>
          <rect x={470} y={146} width={90} height={100} />
        </clipPath>
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
        const skew = i >= 3 ? (i - 2) * 1.1 : 0;
        return (
          <g
            key={k}
            className={`wj-sim-anim${k === 'a' && shakeA ? ' wj-fx-shake' : ''}`}
            style={{ opacity: taken ? 0.26 : 1 }}
            transform={`rotate(${skew} 230 ${y + lh / 2})`}
          >
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
                <SlipEnd key={j} x={66 + j * 12.4} y={y + 3} w={9.6} h={lh - 13} tone={19 + i * 3} seed={100 + i * 20 + j} />
              ))}
            {!taken && (
              <rect x={62} y={y + lh - 8} width={330} height={2.5} fill={`color-mix(in oklab, ${OCHRE} 52%, ${INK})`} opacity={0.35} />
            )}
            {/* a 坨端面的淤泥：清理过就没了 */}
            {k === 'a' && !taken && picks['s1-face'] !== 'clean' && (
              <rect x={62} y={y} width={40} height={lh - 6} rx={3} fill={`color-mix(in oklab, ${OCHRE} 58%, ${INK})`} opacity={0.55} />
            )}
            <text x={50} y={y + lh / 2 + 1} fill={taken ? DIM : CINNABAR} fontSize={12} fontFamily="var(--font-serif, serif)">
              {k}
            </text>
            {taken && <Caption x={398} y={y + lh / 2 + 1} text="已揭" tone={BAMBOO} size={8.5} />}
          </g>
        );
      })}

      {/* ── 动作：建档 ── */}
      <Fx cue={cue} step="s1-record" choice={['full', 'photo']}>
        <Flash x={40} y={30} w={378} h={220} />
        <g className="wj-fx-fade">
          {[[66, 58], [388, 58], [66, 86], [388, 86]].map(([cx, cy], i) => (
            <path key={i} d={`M ${cx + (i % 2 ? -8 : 0)} ${cy + (i > 1 ? 0 : 0)} h 8 v ${i > 1 ? -8 : 8}`} stroke={CINNABAR} strokeWidth={1.4} fill="none" />
          ))}
        </g>
      </Fx>
      <Fx cue={cue} step="s1-record" choice="none">
        <Ring cx={230} cy={top + 12} r={14} />
      </Fx>

      {/* ── 动作：找缝隙 ── */}
      <Fx cue={cue} step="s1-face" choice="clean">
        <rect className="wj-fx-fade" x={62} y={top} width={40} height={lh - 6} rx={3} fill={`color-mix(in oklab, ${OCHRE} 58%, ${INK})`} opacity={0.6} />
        <Droplets x={62} y={top + 2} w={40} n={4} tint={`color-mix(in oklab, ${OCHRE} 55%, ${INK})`} />
      </Fx>
      <Fx cue={cue} step="s1-face" choice="guess">
        <g className="wj-fx-plunge">
          <path d={`M 150 ${top - 4} l 5 -12 l 5 12 z`} fill={`color-mix(in oklab, ${INK} 55%, ${SURFACE})`} />
        </g>
        <Debris x={155} y={top + 4} seed={5} />
      </Fx>
      <Fx cue={cue} step="s1-face" choice="wash">
        <Droplets x={70} y={top - 14} w={320} n={16} seed={9} />
      </Fx>

      {/* ── 动作：工具进缝 ── */}
      <Fx cue={cue} step="s1-tool">
        <g className="wj-fx-slidein">
          {tool === 'bamboo' && <path d={`M 70 ${seamY} l 52 -1.5 l 12 1.5 l -12 1.5 z`} fill={`color-mix(in oklab, ${OCHRE} 40%, ${SURFACE})`} stroke={INK} strokeOpacity={0.3} strokeWidth={0.6} />}
          {tool === 'palette' && <path d={`M 70 ${seamY - 3} l 40 0 q 16 0 22 3 q -6 3 -22 3 l -40 0 z`} fill={`color-mix(in oklab, ${INK} 35%, ${SURFACE})`} />}
          {tool === 'tweezer' && (
            <g stroke={`color-mix(in oklab, ${INK} 45%, ${SURFACE})`} strokeWidth={2} fill="none">
              <path d={`M 70 ${seamY - 5} l 50 3.5`} />
              <path d={`M 70 ${seamY + 5} l 50 -3.5`} />
            </g>
          )}
          {tool === 'hand' && <ellipse cx={104} cy={seamY} rx={22} ry={9} fill={`color-mix(in oklab, ${OCHRE} 22%, ${SURFACE})`} stroke={INK} strokeOpacity={0.25} />}
        </g>
        {(tool === 'tweezer' || tool === 'hand') && <Debris x={118} y={seamY} n={5} seed={7} />}
      </Fx>

      {/* ── 动作：润滑 ── */}
      <Fx cue={cue} step="s1-lube" choice="brush">
        <Droplets x={90} y={seamY - 8} w={120} n={7} seed={11} />
      </Fx>
      <Fx cue={cue} step="s1-lube" choice="pour">
        <Droplets x={490} y={54} w={44} n={12} seed={13} />
        <rect className="wj-fx-fade" x={496} y={90} width={32} height={80} rx={6} fill={INK} opacity={0.3} />
      </Fx>
      <Fx cue={cue} step="s1-lube" choice="dry">
        <Debris x={110} y={seamY} n={5} seed={15} />
      </Fx>

      {/* ── 动作：油粘连处置 ── */}
      <Fx cue={cue} step="s1-oil" choice="warm">
        <Steam x={150} y={top - 12} n={6} />
        <Heat x={62} y={top + 22} w={330} n={8} />
      </Fx>
      <Fx cue={cue} step="s1-oil" choice="force">
        <Debris x={200} y={top + 6} n={9} seed={17} />
      </Fx>
      <Fx cue={cue} step="s1-oil" choice="solvent">
        <Droplets x={490} y={54} w={44} n={6} tint={DIM} seed={19} />
        <rect className="wj-fx-fade" x={498} y={70} width={28} height={140} rx={6} fill={INK} opacity={0.22} />
      </Fx>

      {/* ── 步距刻度：设定后沿界面画出停看点 ── */}
      {pitch && (
        <Fx cue={cue} step="s1-pitch">
          <g>
            {Array.from({ length: Math.floor(23 / pitch) }).map((_, i) => {
              const x = 62 + ((i + 1) * pitch * 330) / 23;
              return (
                <line key={i} className="wj-fx-draw" pathLength={1} strokeDasharray="1" x1={x} y1={seamY - 6} x2={x} y2={seamY + 4} stroke={pitch > 3 ? CINNABAR : BAMBOO} strokeWidth={1} />
              );
            })}
          </g>
        </Fx>
      )}

      {/* 刀口：位置走过渡，不跳 */}
      {progress > 0 && (
        <g>
          <line className="wj-sim-anim" x1={62} y1={seamY} x2={392} y2={seamY} style={{ transform: `scaleX(${Math.max(0.01, progress)})`, transformOrigin: `62px ${seamY}px` }} stroke={CINNABAR} strokeWidth={2.2} strokeLinecap="round" />
          <g className="wj-sim-anim" style={{ transform: `translateX(${knifeX - 62}px)` }}>
            <path d={`M 62 ${seamY} l 13 -4.5 l 0 9 z`} fill={`color-mix(in oklab, ${INK} 55%, ${SURFACE})`} />
            <path d={`M 62 ${seamY} l 9 -2.4`} stroke={SURFACE} strokeOpacity={0.7} strokeWidth={0.9} />
          </g>
          <Caption x={62} y={seamY - 7} text={`刀口推进 ${(progress * 23).toFixed(1)} cm / 23 cm`} tone={CINNABAR} />
        </g>
      )}
      <Fx cue={cue} step="s1-advance" kind="tick">
        {state.risk > 25 ? <Debris x={knifeX} y={seamY + 6} n={Math.round(3 + state.risk / 15)} seed={cue?.nonce ?? 1} /> : <Droplets x={knifeX - 14} y={seamY - 4} w={14} n={2} seed={cue?.nonce ?? 1} />}
      </Fx>
      <Fx cue={cue} step="s1-advance" kind="event" choice="slow">
        <Droplets x={knifeX - 20} y={seamY - 8} w={24} n={6} seed={21} />
      </Fx>
      <Fx cue={cue} step="s1-advance" kind="event" choice="push">
        <Debris x={knifeX} y={seamY + 8} n={10} seed={23} />
        <Ring cx={knifeX} cy={seamY + 6} r={8} />
      </Fx>

      {/* 剥出的那一枚：托片上 */}
      <rect x={452} y={58} width={150} height={176} rx={5} fill={RAISED} stroke={BORDER} strokeWidth={1} />
      <rect x={452} y={58} width={150} height={176} rx={5} fill={SURFACE} opacity={0.25} />
      {/* 木板：托举时从下面滑进来 */}
      <Fx cue={cue} step="s1-lift" choice="board">
        <rect className="wj-fx-slidein" x={478} y={232} width={70} height={7} rx={2} fill={`color-mix(in oklab, ${OCHRE} 40%, ${SURFACE})`} stroke={INK} strokeOpacity={0.3} />
      </Fx>
      {liftCue?.choice === 'pinch' ? (
        <g key={liftCue.nonce}>
          <g className="wj-fx-snap-a wj-fx-tb" clipPath={`url(#half-top${uid})`}>
            <Slip cx={512} cy={146} w={19} h={178} tone={26} ink={state.legibility / 100} damage={damage} wet={0.95} seed={11} tilt={-1.1} />
          </g>
          <g className="wj-fx-snap-b wj-fx-tb" clipPath={`url(#half-bot${uid})`}>
            <Slip cx={512} cy={146} w={19} h={178} tone={26} ink={state.legibility / 100} damage={damage} wet={0.95} seed={11} tilt={-1.1} />
          </g>
          <Debris x={512} y={146} n={8} seed={29} />
        </g>
      ) : (
        <g key={liftCue?.nonce ?? 'slip'} className={liftCue?.choice === 'board' ? 'wj-fx-lift' : liftCue?.choice === 'slide' ? 'wj-fx-scrub' : undefined}>
          <Slip cx={512} cy={146} w={19} h={178} tone={26} ink={state.legibility / 100} damage={damage} wet={0.95} seed={11} tilt={-1.1} />
        </g>
      )}
      <Tag x={548} y={78} text={tagText} />
      <Caption x={452} y={248} text="水润托片 · 剥出的简" />
    </g>
  );
}

// ───────────────────── 环节二　清洗：泥污褪去 ─────────────────────
function CleanScene({ state, progress, picks, dials, cue }: SimViewProps) {
  const uid = useId().replace(/:/g, '');
  const damage = clamp01((100 - state.integrity) / 100);
  const force = dials['s2-force'] ?? 0;
  const face = picks['s2-face'];
  const tool = picks['s2-tool'];
  const mud = 1 - progress;
  const brushOn = force > 0 || !!tool;
  const flipCue = cue?.step === 's2-face' ? cue : null;
  const scrub = cue && (cue.step === 's2-force' || (cue.step === 's2-advance' && cue.kind === 'tick') || cue.step === 's2-tool');

  return (
    <g>
      <Tray x={54} y={34} w={420} h={220} liquid={`color-mix(in oklab, ${WATER} 9%, ${SURFACE})`} uid={uid} />
      <Surface x={61} y={50} w={406} />
      <Caption
        x={56}
        y={26}
        text={face === 'green' ? '浅盘 · 清水 · 起手面：竹青面（背面）' : face === 'yellow' ? '浅盘 · 清水 · 起手面：竹黄面（正面）' : '浅盘 · 清水'}
      />

      {/* 主简：换起手面时翻一下 */}
      <g key={flipCue?.nonce ?? 'slip'} className={flipCue ? 'wj-fx-flip wj-fx-tb' : undefined}>
        <Slip cx={236} cy={146} w={24} h={200} tone={face === 'green' ? 15 : 28} ink={state.legibility / 100} damage={damage} wet={1} mud={clamp01(mud)} seed={21} tilt={0.7} />
      </g>
      <Tag x={210} y={256} text={face === 'green' ? '竹青面' : face === 'yellow' ? '竹黄面' : '待定面'} />

      {/* 笔：选笔时滑入，运笔时来回擦 */}
      {brushOn && (
        <g key={scrub ? cue?.nonce : 'brush'} className={cue?.step === 's2-tool' ? 'wj-fx-slidein' : scrub ? 'wj-fx-scrub' : undefined}>
          <g className="wj-sim-anim" style={{ transform: `translate(300px, ${112 + force * 3.2}px) rotate(${30 + force * 1.8}deg)` }}>
            <rect x={6} y={-2} width={122} height={7} rx={3.5} fill={INK} opacity={0.12} />
            <rect
              x={4}
              y={-3.4}
              width={120}
              height={6.8}
              rx={3.4}
              fill={tool === 'nylon' ? `color-mix(in oklab, ${INK} 62%, ${SURFACE})` : `color-mix(in oklab, ${OCHRE} 46%, ${SURFACE})`}
            />
            <rect x={4} y={-3.4} width={120} height={2} rx={1} fill={SURFACE} opacity={0.28} />
            <rect x={2} y={-4} width={11} height={8} rx={1.6} fill={`color-mix(in oklab, ${INK} 34%, ${SURFACE})`} />
            <rect x={2} y={-4} width={11} height={2.6} rx={1} fill={SURFACE} opacity={0.45} />
            <path
              d={`M 2 0 q -11 ${(force - 4) * 1.15} -19 ${(force - 4) * 0.5} q 8 ${-(force - 4) * 1.6} 19 ${-(force - 4) * 0.5} z`}
              fill={force > 5 ? CINNABAR : `color-mix(in oklab, ${INK} 70%, ${SURFACE})`}
              opacity={0.9}
            />
          </g>
        </g>
      )}

      {/* ── 动作 ── */}
      <Fx cue={cue} step="s2-force" kind="dial">
        <Ring cx={262} cy={118 + force * 3} r={7} tint={force > 5 ? CINNABAR : BAMBOO} />
      </Fx>
      <Fx cue={cue} step="s2-advance" kind="tick">
        <Droplets x={224} y={60 + 190 * (1 - mud) - 8} w={26} n={5} tint={`color-mix(in oklab, ${OCHRE} 55%, ${INK})`} seed={cue?.nonce ?? 1} />
        {force > 5 && <rect className="wj-fx-fade" x={226} y={60 + 190 * (1 - mud)} width={20} height={16} rx={3} fill={INK} opacity={0.18} />}
      </Fx>
      <Fx cue={cue} step="s2-advance" kind="event" choice="slow">
        <Ring cx={236} cy={146} r={16} tint={BAMBOO} />
      </Fx>
      <Fx cue={cue} step="s2-advance" kind="event" choice="same">
        <rect className="wj-fx-fade" x={225} y={120} width={22} height={70} rx={4} fill={INK} opacity={0.3} />
      </Fx>

      {/* 已洗下来的泥：在盘底散开 */}
      {progress > 0.1 &&
        Array.from({ length: Math.round(progress * 14) }).map((_, i) => (
          <ellipse
            key={i}
            className="wj-fx-grow wj-fx-tb"
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
                className="wj-sim-anim"
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
              <text x={7} y={23 + i * 22} fill={passed ? BAMBOO : DIM} fontSize={8.6} fontFamily="var(--font-mono, monospace)">
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
function BindScene({ state, picks, cue }: SimViewProps) {
  const uid = useId().replace(/:/g, '');
  const method = picks['s3-method'];
  const boiled = picks['s3-boil'];
  const damage = clamp01((100 - state.integrity) / 100);
  const drift = method === 'none';
  const methodCue = cue?.step === 's3-method' ? cue : null;
  const checkCue = cue?.step === 's3-check' ? cue : null;

  return (
    <g>
      <Tray x={48} y={38} w={438} h={214} liquid={drift ? `color-mix(in oklab, ${WATER} 13%, ${SURFACE})` : RAISED} uid={uid} />
      {drift && <Surface x={55} y={54} w={424} />}
      <Caption
        x={50}
        y={30}
        text={drift ? '特制脱色槽 · 简未绑夹（2003 年 7 月第三批次）' : method === 'double' ? '绑夹台 · 双面无机玻璃条' : method === 'single' ? '绑夹台 · 单面「之」字形缠绕' : '绑夹台'}
        tone={drift ? CINNABAR : MUTED}
      />

      {/* 棉线：线轴与蒸煮的小锅 */}
      <g transform="translate(500, 176)">
        <rect x={0} y={0} width={30} height={22} rx={3} fill={`color-mix(in oklab, ${INK} 30%, ${SURFACE})`} />
        <rect x={-3} y={-3} width={36} height={4} rx={1} fill={`color-mix(in oklab, ${INK} 45%, ${SURFACE})`} />
        <Caption x={-2} y={36} text={boiled === 'boil' ? '棉线 · 已蒸煮' : boiled === 'raw' ? '棉线 · 未蒸煮' : '棉线'} tone={boiled === 'raw' ? CINNABAR : DIM} size={8.4} />
        <Fx cue={cue} step="s3-boil" choice="boil">
          <Steam x={4} y={-6} n={4} />
        </Fx>
      </g>

      {[0, 1, 2].map((i) => {
        const baseX = 136 + i * 108;
        // 漂移：薄小的那枚随水流串到别的槽里去——位置走过渡
        const dx = drift ? (i === 1 ? 54 : (i - 1) * 26) : 0;
        const dy = drift && i === 1 ? 26 : 0;
        const tilt = drift && i === 1 ? 13 : (rand(i + 7) - 0.5) * 2.2;
        const cordD = Array.from({ length: 8 })
          .map((_, k) => {
            const yy = 62 + k * 22;
            const xx = baseX + (k % 2 === 0 ? -17 : 17);
            return `${k === 0 ? 'M' : 'L'} ${xx} ${yy}`;
          })
          .join(' ');
        return (
          <g key={i} className="wj-sim-anim" style={{ transform: `translate(${dx}px, ${dy}px)` }}>
            {drift && (
              <rect x={baseX - dx - 21} y={56} width={42} height={170} rx={3} fill="none" stroke={LINE} strokeDasharray="3 3" strokeWidth={0.9} />
            )}
            <Slip cx={baseX} cy={140} w={19} h={172} tone={20} ink={state.legibility / 100} damage={damage} wet={drift ? 1 : 0.55} seed={31 + i * 5} tilt={tilt} />
            {/* 双面无机玻璃条：滑入夹住 */}
            {method === 'double' && (
              <g key={methodCue?.nonce ?? 'glass'} className={methodCue ? 'wj-fx-slidein' : undefined} transform={`rotate(${tilt} ${baseX} 140)`}>
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
            {/* 单面「之」字形棉线：一笔缠上去 */}
            {method === 'single' && (
              <g transform={`rotate(${tilt} ${baseX} 140)`}>
                <path
                  key={methodCue?.nonce ?? 'cord'}
                  className={methodCue ? 'wj-fx-draw' : undefined}
                  style={methodCue ? { animationDelay: `${i * 0.25}s` } : undefined}
                  pathLength={1}
                  strokeDasharray="1"
                  d={cordD}
                  stroke={boiled === 'raw' ? CINNABAR : `color-mix(in oklab, ${INK} 30%, ${SURFACE})`}
                  strokeWidth={boiled === 'raw' ? 3 : 1.8}
                  fill="none"
                  strokeLinejoin="round"
                />
                {boiled === 'raw' &&
                  Array.from({ length: 8 }).map((_, k) => (
                    <line key={k} x1={baseX - 14} y1={62 + k * 22} x2={baseX + 14} y2={62 + k * 22} stroke={INK} strokeOpacity={0.22} strokeWidth={2.4} />
                  ))}
              </g>
            )}
            {drift && i === 1 && <Caption x={baseX - 18} y={246} text="串槽" tone={CINNABAR} />}
            <Tag x={baseX - 26} y={drift && i === 1 ? 232 : 226} text={`脱色号 ${41878 + i}`} />

            {/* 核对：逐枚拍照 / 只点数 / 抽查 */}
            {checkCue && (checkCue.choice === 'each' || (checkCue.choice === 'sample' && i === 0)) && (
              <g key={checkCue.nonce}>
                <rect className="wj-fx-flash" style={{ animationDelay: `${i * 0.3}s` }} x={baseX - 28} y={52} width={56} height={180} rx={4} fill={SURFACE} />
              </g>
            )}
          </g>
        );
      })}
      {drift && (
        <Fx cue={cue} step="s3-method" choice="none">
          <Droplets x={200} y={70} w={120} n={6} seed={31} />
        </Fx>
      )}
      <Fx cue={cue} step="s3-check" choice="count">
        <text className="wj-fx-pulse" x={267} y={150} textAnchor="middle" fill={CINNABAR} fontSize={26} fontFamily="var(--font-mono, monospace)" opacity={0.9}>
          40
        </text>
      </Fx>

      {boiled === 'raw' && <Caption x={50} y={274} text="棉线未蒸煮 · 遇水收缩，在简体上勒出压痕" tone={CINNABAR} />}
      <g transform="translate(506, 66)">
        <Caption x={0} y={0} text="编号身份" />
        <text x={0} y={22} fill={state.provenance < 80 ? CINNABAR : BAMBOO} fontSize={22} fontFamily="var(--font-mono, monospace)">
          {Math.round(state.provenance)}%
        </text>
        <Caption x={0} y={42} text="药剂可及度" />
        <text x={0} y={64} fill={state.legibility < 80 ? CINNABAR : BAMBOO} fontSize={22} fontFamily="var(--font-mono, monospace)">
          {Math.round(state.legibility)}%
        </text>
      </g>
    </g>
  );
}

// ───────────────────── 环节四　饱水保存：菌斑生长 ─────────────────────
function TankScene({ state, progress, picks, dials, cue }: SimViewProps) {
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
        : agent
          ? `color-mix(in oklab, ${WATER} 14%, ${SURFACE})`
          : `color-mix(in oklab, ${WATER} 9%, ${SURFACE})`;
  const pourTint = agent === 'cuso4' ? WATER : agent === 'peracetic' ? CINNABAR : DIM;

  return (
    <g>
      <Tray x={48} y={44} w={452} h={196} liquid={liquid} uid={uid} />
      {/* 液色过渡层：换药时颜色慢慢变 */}
      <rect className="wj-sim-anim" x={55} y={51} width={438} height={182} rx={8} fill={liquid} />
      <Surface x={55} y={60} w={438} />
      <path d="M 57 58 q 4 8 0 16" stroke={WATER} strokeOpacity={0.3} strokeWidth={1.2} fill="none" />
      <path d="M 491 58 q -4 8 0 16" stroke={WATER} strokeOpacity={0.3} strokeWidth={1.2} fill="none" />
      <Caption x={50} y={36} text={`存放室 · ${agent ? '药液' : '清水'}${conc ? ` ${conc.toFixed(2)}%` : ''} · 第 ${Math.round(progress * 24)} 月`} />

      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Slip cx={122 + i * 92} cy={148} w={17} h={168} tone={agent === 'cuso4' ? 30 : 22} ink={state.legibility / 100} damage={damage} wet={1} seed={41 + i * 7} tilt={(rand(i + 11) - 0.5) * 2.6} />
          <rect x={112 + i * 92} y={68} width={19} height={5} fill={SURFACE} opacity={0.14} />
        </g>
      ))}

      {/* 蚀斑病：新长出来的斑从零放大出现 */}
      {Array.from({ length: spots }).map((_, i) => {
        const cx = 78 + rand(i + 60) * 400;
        const cy = 76 + rand(i + 130) * 148;
        const r = 2.4 + rand(i + 200) * 6;
        const kind = i % 3;
        return (
          <g key={i} className="wj-fx-grow wj-fx-tb">
            {kind === 0 && (
              <>
                <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.78} fill={SURFACE} opacity={0.72} />
                <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.78} fill="none" stroke={BORDER} strokeWidth={0.6} />
              </>
            )}
            {kind === 1 && <ellipse cx={cx} cy={cy} rx={r * 1.3} ry={r * 0.55} fill={`color-mix(in oklab, ${OCHRE} 26%, ${SURFACE})`} opacity={0.5} />}
            {kind === 2 &&
              Array.from({ length: 4 }).map((_, k) => (
                <circle key={k} cx={cx + (rand(i * 9 + k) - 0.5) * r * 2} cy={cy + (rand(i * 13 + k) - 0.5) * r * 2} r={0.9 + rand(i * 17 + k) * 1.5} fill={INK} opacity={0.2} />
              ))}
          </g>
        );
      })}
      {spots > 6 && <Caption x={366} y={36} text="蚀斑病 · 白斑 / 黏液 / 软腐" tone={CINNABAR} />}

      {/* ── 动作 ── */}
      <Fx cue={cue} step="s4-agent">
        <Pour x0={470} y0={20} x1={420} y1={64} tint={pourTint} />
        <Droplets x={380} y={62} w={90} n={6} tint={pourTint} seed={41} />
      </Fx>
      <Fx cue={cue} step="s4-conc">
        <Droplets x={80} y={58} w={400} n={12} tint={conc && conc > 0.6 ? CINNABAR : WATER} seed={43} />
      </Fx>
      <Fx cue={cue} step="s4-cycle">
        <Pour x0={30} y0={30} x1={80} y1={64} />
        <Droplets x={60} y={62} w={380} n={10} seed={47} />
      </Fx>
      <Fx cue={cue} step="s4-advance" kind="tick">
        <text className="wj-fx-pulse" x={250} y={36} fill={DIM} fontSize={10} fontFamily="var(--font-mono, monospace)">
          +2 月
        </text>
      </Fx>
      <Fx cue={cue} step="s4-advance" kind="event" choice="raise">
        <Pour x0={470} y0={20} x1={420} y1={64} tint={DIM} />
        <Droplets x={80} y={58} w={400} n={10} seed={53} />
      </Fx>
      <Fx cue={cue} step="s4-advance" kind="event" choice="wash">
        <g className="wj-fx-scrub">
          <rect x={196} y={90} width={60} height={5} rx={2.5} fill={`color-mix(in oklab, ${INK} 60%, ${SURFACE})`} />
        </g>
        <Debris x={214} y={110} n={6} seed={59} />
      </Fx>
      <Fx cue={cue} step="s4-advance" kind="event" choice="wait">
        <Ring cx={274} cy={148} r={30} />
      </Fx>

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
            <circle key={i} className="wj-fx-grow wj-fx-tb" cx={44 + Math.cos(a) * rr} cy={54 + Math.sin(a) * rr} r={1 + rand(i + 500) * 2.4} fill={state.risk > 45 ? CINNABAR : BAMBOO} opacity={0.5} />
          );
        })}
        <text x={44} y={116} textAnchor="middle" fill={state.risk > 45 ? CINNABAR : BAMBOO} fontSize={15} fontFamily="var(--font-mono, monospace)">
          {Math.round(state.risk)} / 100
        </text>
      </g>
    </g>
  );
}

// ───────────────────── 环节五　脱色：恒温槽与蓝色值 ─────────────────────
function BleachScene({ state, progress, picks, dials, cue }: SimViewProps) {
  const uid = useId().replace(/:/g, '');
  const damage = clamp01((100 - state.integrity) / 100);
  const temp = dials['s5-temp'] ?? 25;
  const agent = picks['s5-agent'];
  const edtaConc = dials['s5-edta-conc'];
  // 罗维朋蓝色值：报告实测 连二亚硫酸钠 →3.1，草酸 →4.3，双氧水 →4.3
  const blueStart = 5.5;
  const blueEnd = agent === 'dithionite' ? 3.1 : agent === 'oxalic' ? 4.3 : agent === 'h2o2' ? 4.3 : 5.2;
  const inBand = temp >= 45 && temp <= 50;
  const eff = agent ? (inBand ? 1 : 0.45) : 0;
  const blue = blueStart - (blueStart - blueEnd) * progress * eff;
  const collapsed = agent === 'nabh4' && progress > 0.1;
  const heating = inBand && progress > 0;
  const stopCue = cue?.step === 's5-advance' && cue.kind === 'event' && cue.choice === 'stop' ? cue : null;

  const TT = 58;
  const TB = 226;
  const tY = (t: number) => TB - ((t - 20) / 60) * (TB - TT);
  const mercuryFrac = (temp - 20) / 60;

  return (
    <g>
      <Tray x={44} y={46} w={372} h={194} liquid={`color-mix(in oklab, ${WATER} 12%, ${SURFACE})`} uid={uid} />
      {/* EDTA 配好之后液色略深一层 */}
      <rect className="wj-sim-anim" x={51} y={53} width={358} height={180} rx={8} fill={OCHRE} style={{ opacity: edtaConc ? 0.03 + edtaConc * 0.025 : 0 }} />
      <Surface x={51} y={62} w={358} />
      <Caption x={46} y={38} text={`恒温槽 · ${agent ? '第二步 还原（保温）' : edtaConc ? '第一步 EDTA 螯合' : '待配液'} · ${temp}℃`} tone={inBand ? BAMBOO : CINNABAR} />

      {/* 加热：保温时槽底连续起泡 */}
      {heating &&
        Array.from({ length: 10 }).map((_, i) => (
          <circle
            key={i}
            className="wj-fx-bubble"
            style={{ animationDelay: `${rand(i + 9) * 2.2}s` }}
            cx={70 + rand(i + 19) * 320}
            cy={220}
            r={1.1 + rand(i + 29) * 1.7}
            fill={SURFACE}
            opacity={0.5}
          />
        ))}
      {heating && <Heat x={60} y={244} w={340} n={9} />}

      {[0, 1, 2].map((i) => (
        <g
          key={`${i}-${stopCue?.nonce ?? 's'}`}
          className={`wj-sim-anim${stopCue ? ' wj-fx-lift' : ''}`}
          style={{ transform: collapsed ? `translateY(${-56 + i * 4}px) rotate(${(i - 1) * 8}deg)` : 'none', transformOrigin: `${112 + i * 100}px 150px` }}
        >
          <Slip cx={112 + i * 100} cy={150} w={18} h={172} tone={10} ink={state.legibility / 100} damage={collapsed ? 0.85 : damage} wet={1} seed={51 + i * 6} tilt={(rand(i + 5) - 0.5) * 2.8} />
          {/* 颜色层：随蓝色值下降慢慢变浅 */}
          <rect className="wj-sim-anim" x={112 + i * 100 - 9} y={64} width={18} height={172} rx={3} fill={OCHRE} style={{ opacity: Math.max(0, (blue - 3.1) / 2.4) * 0.42 }} />
        </g>
      ))}
      {collapsed && <Caption x={52} y={230} text="竹简变腐松软、漂浮于液面" tone={CINNABAR} />}

      {/* ── 动作 ── */}
      <Fx cue={cue} step="s5-edta-conc">
        <Pour x0={380} y0={22} x1={330} y1={66} tint={DIM} />
      </Fx>
      <Fx cue={cue} step="s5-edta-time">
        <text className="wj-fx-pulse" x={230} y={36} fill={DIM} fontSize={10} fontFamily="var(--font-mono, monospace)">
          浸泡 {dials['s5-edta-time'] ?? 0} h
        </text>
      </Fx>
      <Fx cue={cue} step="s5-agent">
        <Pour x0={380} y0={22} x1={330} y1={66} tint={agent === 'oxalic' || agent === 'nabh4' ? CINNABAR : WATER} />
        <Droplets x={80} y={62} w={300} n={8} seed={61} />
      </Fx>
      <Fx cue={cue} step="s5-temp">
        <Ring cx={443} cy={tY(temp)} r={9} tint={inBand ? BAMBOO : CINNABAR} />
      </Fx>
      <Fx cue={cue} step="s5-advance" kind="tick">
        <text className="wj-fx-pulse" x={230} y={36} fill={DIM} fontSize={10} fontFamily="var(--font-mono, monospace)">
          +5 min
        </text>
      </Fx>
      <Fx cue={cue} step="s5-advance" kind="event" choice="extend">
        <Heat x={60} y={244} w={340} n={12} />
      </Fx>

      {/* 温度计：汞柱走过渡 */}
      <g>
        <rect x={434} y={TT - 12} width={18} height={TB - TT + 18} rx={9} fill={SURFACE} stroke={BORDER} strokeWidth={1.1} />
        <rect x={431} y={tY(50)} width={24} height={tY(45) - tY(50)} fill={BAMBOO} opacity={0.2} />
        <line x1={431} y1={tY(50)} x2={455} y2={tY(50)} stroke={BAMBOO} strokeOpacity={0.6} strokeWidth={0.9} />
        <line x1={431} y1={tY(45)} x2={455} y2={tY(45)} stroke={BAMBOO} strokeOpacity={0.6} strokeWidth={0.9} />
        <rect
          className="wj-sim-anim"
          x={439}
          y={TT}
          width={8}
          height={TB - TT}
          fill={inBand ? BAMBOO : CINNABAR}
          style={{ transform: `scaleY(${Math.max(0.01, mercuryFrac)})`, transformOrigin: `443px ${TB}px` }}
        />
        <circle className="wj-sim-anim" cx={443} cy={TB + 8} r={10} fill={inBand ? BAMBOO : CINNABAR} />
        <circle cx={440} cy={TB + 5} r={3} fill={SURFACE} opacity={0.35} />
        <rect x={440.5} y={TT - 10} width={2} height={TB - TT + 8} fill={SURFACE} opacity={0.35} />
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
                className="wj-sim-anim"
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
        <text x={0} y={158} fill={blue <= 3.4 ? BAMBOO : CINNABAR} fontSize={22} fontFamily="var(--font-mono, monospace)">
          {blue.toFixed(2)}
        </text>
        <Caption x={0} y={174} text="越低越好" tone={DIM} size={8.6} />
        <Caption x={0} y={186} text="实测可达 3.1" tone={DIM} size={8.6} />
      </g>
    </g>
  );
}

// ───────────────────── 环节六　脱水：收缩与字形压扁 ─────────────────────
function DryScene({ state, progress, picks, dials, cue }: SimViewProps) {
  const filler = picks['s6-material'];
  const route = picks['s6-triage'];
  const load = dials['s6-load'] ?? 0;
  const temp = dials['s6-temp'];
  // 收缩率：填充到位 → 长 3% / 宽 5%；完全不填充 → 长 20.4% / 宽 50.6%
  const quality = clamp01(state.integrity / 100);
  const shrinkW = (0.506 - (0.506 - 0.05) * quality) * progress;
  const shrinkL = (0.204 - (0.204 - 0.03) * quality) * progress;
  const damage = clamp01((100 - state.integrity) / 100) * 0.6;
  const darkens = filler === 'peg' || filler === 'sucrose';
  const molten = temp !== undefined && temp >= 49;
  const fillFrac = filler && route !== 'natural' ? clamp01(load / 280) : 0;
  const rushCue = cue?.step === 's6-advance' && cue.kind === 'event' && cue.choice === 'rush' ? cue : null;

  return (
    <g>
      <rect x={44} y={40} width={452} height={214} rx={8} fill={SUNK} stroke={BORDER} strokeWidth={1.2} />
      <rect x={51} y={47} width={438} height={200} rx={5} fill={RAISED} />
      <Caption
        x={46}
        y={32}
        text={`脱水台 · ${route === 'natural' ? '自然干燥（无填充）' : filler ? '填充脱水' : '待选材料'}${load ? ` · 填充量 ${load}%` : ''} · 干燥 ${Math.round(progress * 100)}%`}
      />

      {/* 熔融槽：温度到了才是清亮的液态 */}
      {filler && route !== 'natural' && (
        <g transform="translate(212, 190)">
          <rect x={0} y={0} width={56} height={30} rx={3} fill={SUNK} stroke={BORDER} strokeWidth={0.9} />
          <rect className="wj-sim-anim" x={4} y={6} width={48} height={20} rx={2} fill={molten ? `color-mix(in oklab, ${OCHRE} 14%, ${SURFACE})` : SURFACE} style={{ opacity: temp ? 1 : 0.4 }} />
          {temp !== undefined && !molten &&
            Array.from({ length: 5 }).map((_, i) => (
              <circle key={i} className="wj-fx-grow wj-fx-tb" cx={10 + i * 9} cy={16 + (rand(i + 70) - 0.5) * 8} r={2.4 + rand(i + 80) * 2} fill={SURFACE} stroke={BORDER} strokeWidth={0.5} />
            ))}
          {molten && <Heat x={4} y={40} w={48} n={4} />}
          <Caption x={0} y={42} text={temp ? `熔融槽 ${temp}℃` : '熔融槽'} tone={temp ? (molten && temp <= 60 ? BAMBOO : CINNABAR) : DIM} size={8.4} />
        </g>
      )}

      {/* 对照：饱水原状 */}
      <Slip cx={140} cy={148} w={26} h={192} tone={17} ink={0.88} damage={0} wet={1} seed={61} />
      <Caption x={114} y={264} text="饱水原状" tone={DIM} />
      <Tag x={104} y={48} text="含水率 471%" />
      <g opacity={0.75}>
        <line x1={127} y1={252} x2={153} y2={252} stroke={WATER} strokeWidth={0.9} />
        <line x1={127} y1={248} x2={127} y2={256} stroke={WATER} strokeWidth={0.9} />
        <line x1={153} y1={248} x2={153} y2={256} stroke={WATER} strokeWidth={0.9} />
      </g>

      <path d="M 212 148 l 26 0 m -8 -5.5 l 8 5.5 l -8 5.5" stroke={DIM} strokeWidth={1.3} fill="none" strokeLinecap="round" />

      {/* 干燥中：收缩走过渡，字跟着被压扁 */}
      <g key={rushCue?.nonce ?? 'dry'} className={rushCue ? 'wj-fx-shake' : undefined}>
        <g className="wj-sim-anim" style={{ transform: `scale(${1 - shrinkW}, ${1 - shrinkL})`, transformOrigin: '330px 148px' }}>
          <Slip cx={330} cy={148} w={26} h={192} tone={17 + (darkens ? 46 : 0)} ink={state.legibility / 100} damage={damage} wet={1 - progress} crystal={filler === 'hexadecanol' ? progress * 0.9 : 0} seed={61} />
          {/* 填充液位：十六醇从下往上渗进去 */}
          {fillFrac > 0 && progress < 1 && (
            <rect className="wj-sim-anim" x={317} y={52} width={26} height={192} rx={3} fill={`color-mix(in oklab, ${OCHRE} 10%, ${SURFACE})`} opacity={0.5} style={{ transform: `scaleY(${fillFrac})`, transformOrigin: '330px 244px' }} />
          )}
        </g>
      </g>
      <Caption x={306} y={264} text="脱水后" tone={shrinkW > 0.05 ? CINNABAR : BAMBOO} />
      {(() => {
        const half = (26 * (1 - shrinkW)) / 2;
        const tone = shrinkW > 0.05 ? CINNABAR : BAMBOO;
        return (
          <g className="wj-sim-anim" opacity={0.75}>
            <line className="wj-sim-anim" x1={330 - half} y1={252} x2={330 + half} y2={252} stroke={tone} strokeWidth={0.9} />
            <line className="wj-sim-anim" x1={330 - half} y1={248} x2={330 - half} y2={256} stroke={tone} strokeWidth={0.9} />
            <line className="wj-sim-anim" x1={330 + half} y1={248} x2={330 + half} y2={256} stroke={tone} strokeWidth={0.9} />
          </g>
        );
      })()}

      {/* ── 动作 ── */}
      <Fx cue={cue} step="s6-triage" choice="natural">
        <Steam x={318} y={60} n={5} />
      </Fx>
      <Fx cue={cue} step="s6-material">
        <Pour x0={300} y0={170} x1={240} y1={196} tint={`color-mix(in oklab, ${OCHRE} 30%, ${SURFACE})`} />
      </Fx>
      <Fx cue={cue} step="s6-temp">
        {molten ? <Steam x={222} y={186} n={4} /> : <Ring cx={240} cy={205} r={10} />}
      </Fx>
      <Fx cue={cue} step="s6-load">
        <Droplets x={318} y={48} w={24} n={5} tint={`color-mix(in oklab, ${OCHRE} 30%, ${SURFACE})`} seed={71} />
      </Fx>
      <Fx cue={cue} step="s6-advance" kind="tick">
        <Steam x={316} y={56 + shrinkL * 60} n={4} seed={cue?.nonce ?? 1} />
      </Fx>
      <Fx cue={cue} step="s6-advance" kind="event" choice="hold">
        <Steam x={316} y={70} n={3} />
      </Fx>
      <Fx cue={cue} step="s6-advance" kind="event" choice="rush">
        <Heat x={300} y={250} w={60} n={5} />
        <Debris x={330} y={148} n={8} seed={73} />
      </Fx>

      {/* 收缩率读数：5% 是指标线 */}
      <g transform="translate(516, 72)">
        <Caption x={0} y={0} text="宽度收缩" />
        <text x={0} y={22} fill={shrinkW > 0.05 ? CINNABAR : BAMBOO} fontSize={22} fontFamily="var(--font-mono, monospace)">
          {(shrinkW * 100).toFixed(1)}%
        </text>
        <rect x={0} y={30} width={92} height={5} rx={2.5} fill={SUNK} />
        <rect className="wj-sim-anim" x={0} y={30} width={92} height={5} rx={2.5} fill={shrinkW > 0.05 ? CINNABAR : BAMBOO} style={{ transform: `scaleX(${Math.min(1, shrinkW / 0.55)})`, transformOrigin: '0 0' }} />
        <line x1={(0.05 / 0.55) * 92} y1={27} x2={(0.05 / 0.55) * 92} y2={38} stroke={OCHRE} strokeWidth={1.2} />

        <Caption x={0} y={58} text="长度收缩" />
        <text x={0} y={80} fill={shrinkL > 0.05 ? CINNABAR : BAMBOO} fontSize={22} fontFamily="var(--font-mono, monospace)">
          {(shrinkL * 100).toFixed(1)}%
        </text>
        <rect x={0} y={88} width={92} height={5} rx={2.5} fill={SUNK} />
        <rect className="wj-sim-anim" x={0} y={88} width={92} height={5} rx={2.5} fill={shrinkL > 0.05 ? CINNABAR : BAMBOO} style={{ transform: `scaleX(${Math.min(1, shrinkL / 0.55)})`, transformOrigin: '0 0' }} />
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
