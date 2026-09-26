'use client';

/**
 * 教师端 · 学情分析。三层视图：班级 → 班级学生 → 学生学情详情。
 * 数据来自 /api/teacher/overview（登录 Bearer + 教师角色校验）。
 * 班级由教师手动划分（class_assignments 表存归属，学生行右侧下拉
 * 可移动/新建班级），细问答完口径与学生端共用 store 的 isQuestionAnswered。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ChevronDown, Cloud, Eye, FlaskConical, KeyRound, Plus, RefreshCw, Trash2, Users, GraduationCap } from 'lucide-react';
import { useAuth } from '@/components/workshop/AuthProvider';
import { STAGES } from '@/lib/workshop/content';
import { isQuestionAnswered } from '@/store/useWorkshopStore';
import {
  type Learner,
  TOTAL_STAGES,
  TOTAL_QUESTIONS,
  ACT_NAMES,
  imagesOf,
  answeredCount,
  verdictOf,
  submittedOf,
  draftOf,
  answerTextOf,
  verdictStats,
  fmtTime,
  EXH_BOARDS,
  EXH_CASE_IDS,
  exhBoardCount,
  exhCaseCount,
  exhLatest,
} from '@/lib/workshop/learner-metrics';

const UNASSIGNED = '未编班';
const EXTRA_CLASS_STORE = 'wj-teacher-classes';

interface QuestionError {
  key: string;
  stageName: string;
  label: string;
  stem: string;
  ok: number;
  part: number;
  bad: number;
  graded: number;
  errors: { learner: Learner; verdict: string; answer: string }[];
}

/** 高频错误排行：按判「部分成立/不成立」的人数降序，展示错答原文供讲评 */
function errorRanking(list: Learner[]): QuestionError[] {
  const out: QuestionError[] = [];
  for (const s of STAGES) {
    s.questions.forEach((q, qi) => {
      let ok = 0;
      let part = 0;
      let bad = 0;
      const errors: QuestionError['errors'] = [];
      for (const l of list) {
        const v = verdictOf(l, s.id, q);
        if (v === '成立') ok++;
        else if (v === '部分成立') part++;
        else if (v === '不成立') bad++;
        if (v === '部分成立' || v === '不成立') {
          errors.push({ learner: l, verdict: v, answer: answerTextOf(l, s.id, q) });
        }
      }
      if (part + bad > 0) {
        out.push({
          key: `${s.id}-${q.id}`,
          stageName: s.name,
          label: `${s.id}-${qi + 1}`,
          stem: q.stem,
          ok,
          part,
          bad,
          graded: ok + part + bad,
          errors,
        });
      }
    });
  }
  return out.sort(
    (a, b) =>
      b.bad + b.part - (a.bad + a.part) ||
      (b.bad + b.part) / b.graded - (a.bad + a.part) / a.graded,
  );
}

function ErrorHotspots({
  ranking,
  title,
  hint,
  showClass = false,
}: {
  ranking: QuestionError[];
  title: string;
  hint?: string;
  showClass?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (ranking.length === 0) return null;
  return (
    <section className="wj-an-card wj-err">
      <h3>{title}</h3>
      {hint && <p className="wj-err-hint">{hint}</p>}
      <ul>
        {ranking.map((e, i) => {
          const errN = e.bad + e.part;
          const rate = e.graded ? Math.round((errN / e.graded) * 100) : 0;
          const isOpen = open === e.key;
          return (
            <li key={e.key} className={`wj-err-item${rate >= 50 ? ' is-hot' : ''}`}>
              <button
                type="button"
                className="wj-err-head"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : e.key)}
              >
                <span className="wj-err-rank">{i + 1}</span>
                <span className="wj-err-stem" title={e.stem}>
                  <i>{e.stageName}</i>
                  {e.label} {e.stem}
                </span>
                <span className="wj-err-bar">
                  <i style={{ width: `${rate}%` }} />
                </span>
                <span className="wj-err-val">
                  <b>{errN}</b>/{e.graded} 错 · {rate}%
                </span>
                <ChevronDown size={14} aria-hidden className={`wj-err-chev${isOpen ? ' is-open' : ''}`} />
              </button>
              {isOpen && (
                <div className="wj-err-body">
                  <p className="wj-err-split">
                    不成立 <b>{e.bad}</b> · 部分成立 <b>{e.part}</b> · 成立 <b>{e.ok}</b>
                  </p>
                  <ul className="wj-err-answers">
                    {e.errors.map((x, xi) => (
                      <li key={xi}>
                        <span className="wj-err-who">{x.learner.name}</span>
                        {showClass && <span className="wj-err-cls">{x.learner.className || UNASSIGNED}</span>}
                        <span
                          className={`wj-err-verdict ${x.verdict === '不成立' ? 'is-bad' : 'is-part'}`}
                        >
                          {x.verdict}
                        </span>
                        <span className="wj-err-answer">{x.answer || '（未留文字）'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function activeWithin7d(list: Learner[]): number {
  const weekMs = 7 * 24 * 3600e3;
  return list.filter((l) => l.updatedAt && Date.now() - new Date(l.updatedAt).getTime() < weekMs).length;
}

/** 词云停用词：虚词与泛化分析用语，过滤后留下领域术语 */
const CLOUD_STOP = new Set(
  ('的 了 和 是 在 有 与 不 人 都 为 上 也 个 到 说 要 地 去 着 没 会 及 或 等 之 其 这 那 就 被 把 让 从 向 而 但 并 ' +
    '我们 你们 他们 自己 什么 可以 这样 那样 因为 所以 如果 虽然 然后 已经 可能 应该 需要 进行 通过 对于 由于 并且 以及 ' +
    '不是 没有 就是 还是 只是 一些 一点 非常 比较 更加 其中 之后 之前 同时 使用 采用 出现 得到 认为 知道 时候 问题 ' +
    '情况 方式 方法 作用 影响 结果 过程 方面 之间 相同 不同 一般 各种 一定 程度 无法 不能 主要 直接 予以 从而 ' +
    '还有 另外 例如 比如 根据 按照 目前 后来 当时 以下 以上 这是 那个 一个 两个 学生 老师 而且 不过 只是 只有 ' +
    '哪些 什么 怎样 如何 关于 除了 基本上 大概 也许 略较 稍微 特别 十分 更加 极为 过于 还是 越来 ' +
    '的是 说明 选择 答案 理由 选项 填写 放在 任何 之上 先后 同样 全部 相容 可行 顺序 一致 ' +
    '必须 应当 采用 下列 以上 内外 大小 左右 之前 之后 期间 过程 结果 情况 方式 方法 问题 时候 ' +
    '针对 都是 自然 所有 解决 规定 最大 明显 至少 一是 对应 整个 保持 不受 失去 反而 分钟 只能 才能 ' +
    '代替 组织 完成 实际 不可 多选 作业 足够 力量 机制 独立 上限 差异 线性 永久 并非 造成 整体 有限 ' +
    '维系 配有 其余 追回 只剩 太紧 加上 之一 互相 一旦 依赖 厘米 毫米 三分之一 合法')
    .split(/\s+/)
    .filter(Boolean),
);

function validCloudWord(w: string): boolean {
  if (w.length < 2 || w.length > 8) return false;
  if (CLOUD_STOP.has(w)) return false;
  // 尾字是虚词的（处的、它的）几乎都是分词残片；罗马数字（III/IV）来自阶段编号
  if (/[的了是在和与或者呢吧]$/.test(w)) return false;
  if (/^[ivxlc]+$/i.test(w)) return false;
  return /[\u4e00-\u9fff]/.test(w) || /^[a-zA-Z]{2,}$/.test(w);
}

function tokenizeAnswer(text: string): string[] {
  try {
    const seg = new Intl.Segmenter('zh-CN', { granularity: 'word' });
    return [...seg.segment(text)].filter((s) => s.isWordLike && validCloudWord(s.segment)).map((s) => s.segment);
  } catch {
    // 环境不支持 Intl.Segmenter 时退化为中文串二元组
    const out: string[] = [];
    for (const run of text.match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
      for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
    }
    return out.filter(validCloudWord);
  }
}

/** 每位学生对每词只计一次；score = 提到人数 × √出现的题目数，跨题复现的术语才排前面 */
function buildWordCloud(list: Learner[]): { word: string; n: number; q: number; score: number }[] {
  const students = new Map<string, number>();
  const questions = new Map<string, Set<string>>();
  for (const l of list) {
    const seen = new Map<string, Set<string>>();
    for (const [key, text] of Object.entries(l.answers ?? {})) {
      if (!text || text.startsWith('data:')) continue;
      for (const w of tokenizeAnswer(text)) {
        if (!seen.has(w)) seen.set(w, new Set());
        seen.get(w)!.add(key);
      }
    }
    for (const [w, keys] of seen) {
      students.set(w, (students.get(w) ?? 0) + 1);
      if (!questions.has(w)) questions.set(w, new Set());
      for (const k of keys) questions.get(w)!.add(k);
    }
  }
  // 学生多时过滤只被 1 人提到的孤立词，班级小则保留
  const floor = list.length >= 8 ? 2 : 1;
  return [...students.entries()]
    .filter(([, n]) => n >= floor)
    .map(([word, n]) => {
      const q = questions.get(word)?.size ?? 1;
      return { word, n, q, score: n * Math.sqrt(q) };
    })
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
}

const CLOUD_PALETTE = ['#9a3d1d', '#4a3f33', '#9a7b4f', '#6d5a43'];

function CloudPage({
  pool,
  className,
  onClass,
  groups,
}: {
  pool: Learner[];
  className: string;
  onClass: (c: string) => void;
  groups: [string, Learner[]][];
}) {
  const words = buildWordCloud(pool);
  const shown = words.slice(0, 60);
  const max = shown[0]?.score ?? 1;
  const min = shown[shown.length - 1]?.score ?? 1;
  const answerN = pool.reduce(
    (n, l) => n + Object.values(l.answers ?? {}).filter((t) => t && !t.startsWith('data:')).length,
    0,
  );
  const sizeOf = (s: number) => {
    if (max <= min) return 22;
    const t = (Math.log(s) - Math.log(min)) / (Math.log(max) - Math.log(min));
    return Math.round(14 + t * 24);
  };
  const colorOf = (s: number) => {
    if (max <= min) return CLOUD_PALETTE[0];
    const t = (Math.log(s) - Math.log(min)) / (Math.log(max) - Math.log(min));
    return t > 0.62 ? CLOUD_PALETTE[0] : t > 0.28 ? CLOUD_PALETTE[1] : CLOUD_PALETTE[2];
  };
  return (
    <>
      <div className="wj-teacher-toolbar">
        <div className="wj-err-filter">
          {['全部班级', ...groups.map(([c]) => c)].map((c) => (
            <button key={c} type="button" className={className === c ? 'is-on' : ''} onClick={() => onClass(c)}>
              {c}
            </button>
          ))}
        </div>
        <span className="wj-teacher-dim">
          {pool.length} 名学生 · {answerN} 条作答
        </span>
      </div>
      {shown.length === 0 ? (
        <p className="wj-teacher-hint">该范围内还没有文字作答。学生在工序细问中写下分析文字后，这里会自动聚出热点词。</p>
      ) : (
        <section className="wj-an-card wj-cloud">
          <h3>{className === '全部班级' ? '全体学生 · 回复热点词云' : `${className} · 回复热点词云`}</h3>
          <p className="wj-err-hint">字号与颜色随热度加深（热度 = 提到人数 × √出现的题目数，跨题复现的术语更靠前）；悬停可看详情。</p>
          <div className="wj-cloud-body">
            {shown.map((w) => (
              <span
                key={w.word}
                className="wj-w"
                style={{ fontSize: sizeOf(w.score), color: colorOf(w.score) }}
                title={`${w.word} · ${w.n} 人提到 · ${w.q} 道题出现`}
              >
                {w.word}
              </span>
            ))}
          </div>
          <ol className="wj-cloud-rank">
            {words.slice(0, 20).map((w, i) => (
              <li key={w.word}>
                <span className="wj-err-rank">{i + 1}</span>
                <span className="wj-cloud-term">{w.word}</span>
                <span className="wj-err-bar">
                  <i style={{ width: `${Math.max(4, (w.score / max) * 100)}%` }} />
                </span>
                <span className="wj-cloud-n">
                  <b>{w.n}</b> 人 · {w.q} 题
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

function Avatar({ l, size = 30 }: { l: Learner; size?: number }) {
  const [broken, setBroken] = useState(false);
  const s = { width: size, height: size };
  if (l.avatarUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={l.avatarUrl}
        alt={l.name}
        style={s}
        className="wj-teacher-avatar"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span style={{ ...s, fontSize: Math.round(size * 0.42) }} className="wj-teacher-avatar-fallback">
      {l.name.slice(0, 1)}
    </span>
  );
}

type View = { mode: 'classes' } | { mode: 'class'; cls: string } | { mode: 'student'; userId: string };

export default function TeacherPage() {
  const router = useRouter();
  const { user, session, isLoading } = useAuth();
  const [state, setState] = useState<'loading' | 'forbidden' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [learners, setLearners] = useState<Learner[]>([]);
  const [fetchedAt, setFetchedAt] = useState('');
  const [view, setView] = useState<View>({ mode: 'classes' });
  const [page, setPage] = useState<'classes' | 'errors' | 'cloud'>('classes');
  const [errClass, setErrClass] = useState('全部班级');
  const [cloudClass, setCloudClass] = useState('全部班级');
  const [extraClasses, setExtraClasses] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  // 拦截墙上的当场解锁：输教师口令 → 服务端自愈补写账号标记 → 直接进学情
  const [unlockPass, setUnlockPass] = useState('');
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockErr, setUnlockErr] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(EXTRA_CLASS_STORE) ?? '[]');
      if (Array.isArray(saved)) setExtraClasses(saved.filter((c) => typeof c === 'string'));
    } catch {
      // 忽略本地记录异常
    }
  }, []);

  const load = useCallback(
    async () => {
      if (!session?.access_token) return;
      setState('loading');
      try {
        // 本机存过口令就带上：账号缺教师标记时由服务端校验并自愈补写
        const key = window.localStorage.getItem('wj-teacher-passcode');
        const res = await fetch('/api/teacher/overview', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            ...(key ? { 'x-teacher-passcode': key } : {}),
          },
        });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (res.status === 403) {
          setState('forbidden');
          return;
        }
        const json = (await res.json()) as { learners?: Learner[]; fetchedAt?: string; error?: string };
        if (!res.ok) throw new Error(json.error || '加载失败');
        setLearners(json.learners ?? []);
        setFetchedAt(json.fetchedAt ?? '');
        setState('ready');
      } catch {
        setErrorMsg('加载失败，稍后再试');
        setState('error');
      }
    },
    [router, session?.access_token],
  );

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    void load();
  }, [isLoading, user, router, load]);

  const unlock = async () => {
    if (!session?.access_token || !unlockPass.trim() || unlockBusy) return;
    setUnlockBusy(true);
    setUnlockErr('');
    try {
      const res = await fetch('/api/teacher/overview', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'x-teacher-passcode': unlockPass.trim(),
        },
      });
      if (res.status === 403) {
        setUnlockErr('口令不对，请核对后重试');
        return;
      }
      const json = (await res.json()) as { learners?: Learner[]; fetchedAt?: string; error?: string };
      if (!res.ok) throw new Error(json.error || '解锁失败');
      // 服务端已把教师标记补写进账号，本机存一份口令供后续会话自愈
      window.localStorage.setItem('wj-teacher-passcode', unlockPass.trim());
      setLearners(json.learners ?? []);
      setFetchedAt(json.fetchedAt ?? '');
      setState('ready');
    } catch {
      setUnlockErr('解锁失败，稍后再试');
    } finally {
      setUnlockBusy(false);
    }
  };

  // 演示数据注入/清除：沙箱预览与线上是两套独立数据库，在哪个环境点
  // 就写进哪个环境。演示账号 email 固定 @demo.invalid，清除不影响真实学生。
  const [demoBusy, setDemoBusy] = useState(false);
  const runDemo = async (action: 'seed' | 'clear') => {
    if (!session?.access_token || demoBusy) return;
    const msg =
      action === 'seed'
        ? '将注入 50 名演示学生（5 个班）的学情数据，真实学生不受影响。约需半分钟，继续？'
        : '将删除全部演示学生及其学情数据（真实学生不受影响）。继续？';
    if (!window.confirm(msg)) return;
    setDemoBusy(true);
    setNotice(action === 'seed' ? '正在注入演示数据……' : '正在清除演示数据……');
    try {
      const key = window.localStorage.getItem('wj-teacher-passcode');
      const res = await fetch('/api/teacher/seed-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          ...(key ? { 'x-teacher-passcode': key } : {}),
        },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        seeded?: number;
        removed?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error || '操作失败');
      flash(
        action === 'seed'
          ? `已注入 ${json.seeded ?? 0} 名演示学生`
          : `已清除 ${json.removed ?? 0} 名演示学生`,
      );
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '操作失败');
    } finally {
      setDemoBusy(false);
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, Learner[]>();
    for (const l of learners) {
      const c = l.className || UNASSIGNED;
      const arr = map.get(c);
      if (arr) arr.push(l);
      else map.set(c, [l]);
    }
    // 教师自建但还没移入学生的空班级，保持卡片可见
    for (const c of extraClasses) if (!map.has(c)) map.set(c, []);
    return [...map.entries()].sort((a, b) => {
      if (a[0] === UNASSIGNED) return 1;
      if (b[0] === UNASSIGNED) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [learners, extraClasses]);

  const current = view.mode === 'student' ? learners.find((l) => l.userId === view.userId) : undefined;
  const currentStats = current ? verdictStats([current]) : null;

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const rememberClass = (name: string) => {
    if (extraClasses.includes(name)) return;
    const next = [...extraClasses, name];
    setExtraClasses(next);
    window.localStorage.setItem(EXTRA_CLASS_STORE, JSON.stringify(next));
  };

  const createClass = () => {
    const name = window.prompt('新班级名称')?.trim();
    if (!name) return;
    rememberClass(name);
    setView({ mode: 'class', cls: name });
  };

  const removeClass = (name: string) => {
    const next = extraClasses.filter((c) => c !== name);
    setExtraClasses(next);
    window.localStorage.setItem(EXTRA_CLASS_STORE, JSON.stringify(next));
    setView({ mode: 'classes' });
  };

  const moveLearner = useCallback(
    async (l: Learner, className: string | null) => {
      if (!session?.access_token) return;
      const key = window.localStorage.getItem('wj-teacher-passcode');
      try {
        const res = await fetch('/api/teacher/class-assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            ...(key ? { 'x-teacher-passcode': key } : {}),
          },
          body: JSON.stringify({ userId: l.userId, className }),
        });
        if (!res.ok) throw new Error();
        if (className) rememberClass(className);
        setLearners((prev) =>
          prev.map((x) => (x.userId === l.userId ? { ...x, className: className ?? '' } : x)),
        );
        // 当前班级被移空则退回班级列表
        if (view.mode === 'class') {
          const remaining = learners.filter(
            (x) => x.userId !== l.userId && (x.className || UNASSIGNED) === view.cls,
          );
          if (!remaining.length) setView({ mode: 'classes' });
        }
      } catch {
        flash('调整班级失败，请重试');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.access_token, learners, view, extraClasses],
  );

  if (state === 'forbidden') {
    return (
      <div className="wj-teacher-lock">
        <div className="wj-teacher-lockcard">
          <KeyRound size={26} aria-hidden />
          <h1>仅教师可查看</h1>
          <p>该账号还不是教师账号。输入教师口令可当场解锁本账号（无需重新登录）：</p>
          <div className="wj-teacher-unlock">
            <input
              type="password"
              value={unlockPass}
              onChange={(e) => setUnlockPass(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void unlock();
              }}
              placeholder="教师口令"
              aria-label="教师口令"
              autoFocus
            />
            <button type="button" onClick={() => void unlock()} disabled={unlockBusy || !unlockPass.trim()}>
              {unlockBusy ? '验证中…' : '解锁'}
            </button>
          </div>
          {unlockErr && <p className="wj-teacher-unlock-err" role="alert">{unlockErr}</p>}
          <button type="button" className="wj-teacher-lockbtn is-ghost" onClick={() => router.replace('/login')}>
            或返回登录页换账号
          </button>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="wj-teacher-lock">
        <div className="wj-teacher-lockcard">
          <KeyRound size={26} aria-hidden />
          <h1>加载失败</h1>
          <p>{errorMsg || '网络异常，请稍后再试。'}</p>
          <button type="button" className="wj-teacher-lockbtn" onClick={() => void load()}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wj-teacher-wrap">
      <header className="wj-teacher-top">
        <button
          type="button"
          className="wj-teacher-ghost"
          onClick={() => router.push('/?view=student')}
        >
          <Eye size={15} aria-hidden /> 学生视角
        </button>
        <h1>
          <GraduationCap size={17} aria-hidden /> 学情分析
        </h1>
        <span className="wj-teacher-meta">
          {learners.length} 名学习者 · {fetchedAt ? fmtTime(fetchedAt) : ''}
          <button type="button" className="wj-teacher-ghost" onClick={() => void runDemo('seed')} disabled={demoBusy}>
            <FlaskConical size={14} aria-hidden /> 注入演示数据
          </button>
          {learners.some((l) => /^20250[1-5]\d{4}$/.test(l.staffNo)) && (
            <button type="button" className="wj-teacher-ghost" onClick={() => void runDemo('clear')} disabled={demoBusy}>
              <Trash2 size={14} aria-hidden /> 清除演示
            </button>
          )}
          <button type="button" className="wj-teacher-ghost" onClick={() => void load()} disabled={state === 'loading' || demoBusy}>
            <RefreshCw size={14} aria-hidden /> 刷新
          </button>
        </span>
      </header>

      {state !== 'ready' && <p className="wj-teacher-hint">正在读取学习档案……</p>}
      {notice && <p className="wj-teacher-notice">{notice}</p>}

      <nav className="wj-teacher-tabs" aria-label="学情视图">
        <button
          type="button"
          className={page === 'classes' ? 'is-on' : ''}
          onClick={() => {
            setPage('classes');
            setView({ mode: 'classes' });
          }}
        >
          <Users size={14} aria-hidden /> 班级
        </button>
        <button
          type="button"
          className={page === 'errors' ? 'is-on' : ''}
          onClick={() => {
            setPage('errors');
            setView({ mode: 'classes' });
          }}
        >
          <AlertTriangle size={14} aria-hidden /> 高频错误
        </button>
        <button
          type="button"
          className={page === 'cloud' ? 'is-on' : ''}
          onClick={() => {
            setPage('cloud');
            setView({ mode: 'classes' });
          }}
        >
          <Cloud size={14} aria-hidden /> 热点词云
        </button>
      </nav>

      {state === 'ready' && page === 'classes' && view.mode === 'classes' && (
        <>
          <div className="wj-teacher-toolbar">
            <span className="wj-teacher-dim">班级由教师手动划分：进入班级后，用学生行右侧的班级下拉调整归属。</span>
            <button type="button" className="wj-teacher-ghost" onClick={createClass}>
              <Plus size={14} aria-hidden /> 新建班级
            </button>
          </div>
          {groups.length === 0 ? (
            <p className="wj-teacher-hint">还没有学习者的进度记录。学生登录并开始学习后，这里会出现班级。</p>
          ) : (
            <div className="wj-teacher-grid">
              {groups.map(([cls, list]) => {
                const empty = list.length === 0;
                const avgStages = empty ? 0 : list.reduce((n, l) => n + l.completed.length, 0) / list.length;
                const avgQ = empty ? 0 : list.reduce((n, l) => n + answeredCount(l), 0) / list.length;
                const latest = list.reduce<string | null>(
                  (m, l) => (l.updatedAt && (!m || l.updatedAt > m) ? l.updatedAt : m),
                  null,
                );
                const vs = verdictStats(list);
                const graded = vs.ok + vs.part + vs.bad;
                const avgExh = empty
                  ? 0
                  : list.reduce((n, l) => n + exhBoardCount(l) + exhCaseCount(l), 0) / (list.length * 10);
                return (
                  <button key={cls} type="button" className="wj-tcard" onClick={() => setView({ mode: 'class', cls })}>
                    <div className="wj-tcard-head">
                      <Users size={15} aria-hidden />
                      <strong>{cls}</strong>
                    </div>
                    <dl>
                      <div>
                        <dt>人数</dt>
                        <dd>{list.length}</dd>
                      </div>
                      <div>
                        <dt>平均环节</dt>
                        <dd>
                          {empty ? '—' : avgStages.toFixed(1)}
                          <i>{empty ? '' : `/${TOTAL_STAGES}`}</i>
                        </dd>
                      </div>
                      <div>
                        <dt>平均细问</dt>
                        <dd>
                          {empty ? '—' : avgQ.toFixed(1)}
                          <i>{empty ? '' : `/${TOTAL_QUESTIONS}`}</i>
                        </dd>
                      </div>
                      <div>
                        <dt>判定优良率</dt>
                        <dd>
                          {graded ? Math.round((vs.ok / graded) * 100) : '—'}
                          <i>{graded ? '%' : ''}</i>
                        </dd>
                      </div>
                      <div>
                        <dt>鉴赏阅读</dt>
                        <dd>
                          {empty ? '—' : Math.round(avgExh * 100)}
                          <i>{empty ? '' : '%'}</i>
                        </dd>
                      </div>
                      <div>
                        <dt>最近活跃</dt>
                        <dd>{fmtTime(latest)}</dd>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {state === 'ready' && page === 'errors' && (
        <>
          {(() => {
            const pool = errClass === '全部班级' ? learners : groups.find(([c]) => c === errClass)?.[1] ?? [];
            const vs = verdictStats(pool);
            const errN = vs.bad + vs.part;
            return (
              <div className="wj-teacher-toolbar">
                <div className="wj-err-filter">
                  {['全部班级', ...groups.map(([c]) => c)].map((c) => (
                    <button key={c} type="button" className={errClass === c ? 'is-on' : ''} onClick={() => setErrClass(c)}>
                      {c}
                    </button>
                  ))}
                </div>
                <span className="wj-teacher-dim">
                  {pool.length} 名学生 · {vs.ok + errN} 条判定 · {errN} 条错误
                </span>
              </div>
            );
          })()}
          {(() => {
            const pool = errClass === '全部班级' ? learners : groups.find(([c]) => c === errClass)?.[1] ?? [];
            const ranking = errorRanking(pool);
            if (!ranking.length) {
              return <p className="wj-teacher-hint">该范围内还没有判定记录。学生完成工序中的判定练习后，这里会自动汇总错误。</p>;
            }
            return (
              <ErrorHotspots
                ranking={ranking}
                title={errClass === '全部班级' ? '全体学生 · 高频错误排行' : `${errClass} · 高频错误`}
                hint="按出错人数降序；点击题目可展开每位出错学生的原始作答。"
                showClass={errClass === '全部班级'}
              />
            );
          })()}
        </>
      )}

      {state === 'ready' && page === 'cloud' && (
        <CloudPage
          pool={cloudClass === '全部班级' ? learners : groups.find(([c]) => c === cloudClass)?.[1] ?? []}
          className={cloudClass}
          onClass={setCloudClass}
          groups={groups}
        />
      )}

      {state === 'ready' && page === 'classes' && view.mode === 'class' && (
        <>
          <div className="wj-teacher-toolbar">
            <button type="button" className="wj-teacher-ghost" onClick={() => setView({ mode: 'classes' })}>
              <ArrowLeft size={14} aria-hidden /> 全部班级
            </button>
            <strong>{view.cls}</strong>
            <span className="wj-teacher-dim">{groups.find(([c]) => c === view.cls)?.[1].length ?? 0} 名学生</span>
          </div>
          {(() => {
            const list = groups.find(([c]) => c === view.cls)?.[1] ?? [];
            if (list.length) return null;
            return (
              <p className="wj-teacher-hint">
                该班级还没有学生。到「{UNASSIGNED}」或其他班级，用学生行右侧的班级下拉把学生移入。
                {extraClasses.includes(view.cls) && (
                  <>
                    {' '}
                    <button type="button" className="wj-teacher-ghost" onClick={() => removeClass(view.cls)}>
                      删除该班级
                    </button>
                  </>
                )}
              </p>
            );
          })()}
          {(() => {
            const list = groups.find(([c]) => c === view.cls)?.[1] ?? [];
            if (!list.length) return null;
            const vs = verdictStats(list);
            const graded = vs.ok + vs.part + vs.bad;
            const answeredTotal = list.reduce((n, l) => n + answeredCount(l), 0);
            const ungraded = Math.max(0, answeredTotal - graded);
            const totalSeg = graded + ungraded;
            const avgExhB = list.reduce((n, l) => n + exhBoardCount(l), 0) / list.length;
            const avgExhC = list.reduce((n, l) => n + exhCaseCount(l), 0) / list.length;
            const active = activeWithin7d(list);
            const seg = (n: number) => (totalSeg ? `${(n / totalSeg) * 100}%` : '0%');
            const latest = list.reduce<string | null>((m, l) => (l.updatedAt && (!m || l.updatedAt > m) ? l.updatedAt : m), null);
            return (
              <section className="wj-an-grid">
                <div className="wj-an-card">
                  <h3>六道工序 · 完成度</h3>
                  <ul className="wj-an-bars">
                    {STAGES.map((s) => {
                      const n = list.filter((l) => l.completed.includes(s.id)).length;
                      const pct = list.length ? (n / list.length) * 100 : 0;
                      const hot = pct < 40 ? ' is-low' : '';
                      return (
                        <li key={s.id} className={`wj-an-bar${hot}`}>
                          <span className="wj-an-blabel">
                            {s.id} {s.name}
                          </span>
                          <span className="wj-an-btrack">
                            <i style={{ width: `${pct}%` }} />
                          </span>
                          <span className="wj-an-bval">
                            <b>{n}</b>/{list.length}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="wj-an-card">
                  <h3>细问答卷 · 判定质量</h3>
                  <div className="wj-an-donut-wrap">
                    <div
                      className="wj-an-donut"
                      style={{
                        background: `conic-gradient(
                          var(--wj-cinnabar) 0 ${seg(vs.ok)},
                          #c98a2e ${seg(vs.ok)} ${seg(vs.ok + vs.part)},
                          #9a7a63 ${seg(vs.ok + vs.part)} ${seg(graded)},
                          #e4ddd0 ${seg(graded)} 100%)`,
                      }}
                    >
                      <b>{graded ? Math.round((vs.ok / graded) * 100) : '—'}</b>
                      <i>成立率</i>
                    </div>
                    <ul className="wj-an-legend">
                      <li className="is-ok">
                        <i />成立 <b>{vs.ok}</b>
                      </li>
                      <li className="is-part">
                        <i />部分成立 <b>{vs.part}</b>
                      </li>
                      <li className="is-bad">
                        <i />不成立 <b>{vs.bad}</b>
                      </li>
                      <li className="is-none">
                        <i />已答未评 <b>{ungraded}</b>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="wj-an-card">
                  <h3>鉴赏阅读 · 人均</h3>
                  <ul className="wj-an-rings">
                    <li>
                      <div
                        className="wj-an-ring"
                        style={{
                          background: `conic-gradient(var(--wj-cinnabar) 0 ${(avgExhB / EXH_BOARDS.length) * 100}%, #e4ddd0 0)`,
                        }}
                      >
                        <b>{avgExhB.toFixed(1)}</b>
                        <i>/{EXH_BOARDS.length}</i>
                      </div>
                      <span>板块</span>
                    </li>
                    <li>
                      <div
                        className="wj-an-ring"
                        style={{
                          background: `conic-gradient(var(--wj-cinnabar) 0 ${(avgExhC / EXH_CASE_IDS.length) * 100}%, #e4ddd0 0)`,
                        }}
                      >
                        <b>{avgExhC.toFixed(1)}</b>
                        <i>/{EXH_CASE_IDS.length}</i>
                      </div>
                      <span>案例精读</span>
                    </li>
                  </ul>
                </div>
                <div className="wj-an-card">
                  <h3>活跃度</h3>
                  <p className="wj-an-big">
                    <b>{active}</b>
                    <i>/{list.length} 人近 7 天有学习记录</i>
                  </p>
                  <p className="wj-an-sub">最近更新 {fmtTime(latest)}</p>
                </div>
              </section>
            );
          })()}
          <ErrorHotspots
            ranking={errorRanking(groups.find(([c]) => c === view.cls)?.[1] ?? [])}
            title="高频错误 · 优先讲评"
            hint="按判「不成立 / 部分成立」的人数排序，点开看学生的原始作答。"
          />
          <div className="wj-trow wj-trow-head">
            <span>学生</span>
            <span>学工号</span>
            <span>环节</span>
            <span>细问</span>
            <span>鉴赏</span>
            <span>班级</span>
            <span>最近活跃</span>
          </div>
          {(groups.find(([c]) => c === view.cls)?.[1] ?? [])
            .slice()
            .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
            .map((l) => (
              <div
                key={l.userId}
                role="button"
                tabIndex={0}
                className="wj-trow wj-trow-click"
                onClick={() => setView({ mode: 'student', userId: l.userId })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setView({ mode: 'student', userId: l.userId });
                }}
              >
                <span className="wj-trow-name">
                  <Avatar l={l} />
                  {l.name}
                </span>
                <span className="wj-teacher-dim">{l.staffNo || '—'}</span>
                <span>
                  {l.completed.length}/{TOTAL_STAGES}
                </span>
                <span>
                  {answeredCount(l)}/{TOTAL_QUESTIONS}
                </span>
                <span>
                  {exhBoardCount(l)}/{EXH_BOARDS.length}
                  {exhCaseCount(l) > 0 ? ` · 例${exhCaseCount(l)}` : ''}
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <select
                    className="wj-trow-sel"
                    value={l.className || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '__new__') {
                        const name = window.prompt('新班级名称')?.trim();
                        if (name) {
                          rememberClass(name);
                          void moveLearner(l, name);
                        }
                        return;
                      }
                      void moveLearner(l, v || null);
                    }}
                  >
                    {groups
                      .filter(([c]) => c !== UNASSIGNED)
                      .map(([c]) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    <option value="">{UNASSIGNED}</option>
                    <option value="__new__">＋ 新建班级…</option>
                  </select>
                </span>
                <span className="wj-teacher-dim">{fmtTime(l.updatedAt)}</span>
              </div>
            ))}
        </>
      )}

      {state === 'ready' && page === 'classes' && view.mode === 'student' && current && (
        <>
          <div className="wj-teacher-toolbar">
            <button
              type="button"
              className="wj-teacher-ghost"
              onClick={() => setView({ mode: 'class', cls: current.className || UNASSIGNED })}
            >
              <ArrowLeft size={14} aria-hidden /> {current.className || UNASSIGNED}
            </button>
          </div>
          <div className="wj-tprofile">
            <Avatar l={current} size={46} />
            <div>
              <strong>{current.name}</strong>
              <span className="wj-teacher-dim">
                {current.staffNo || '无学工号'} · 环节 {current.completed.length}/{TOTAL_STAGES} · 细问{' '}
                {answeredCount(current)}/{TOTAL_QUESTIONS} · 鉴赏 {exhBoardCount(current)}/{EXH_BOARDS.length} · 最近{' '}
                {fmtTime(current.updatedAt)}
              </span>
            </div>
          </div>
          {currentStats && (
            <div className="wj-tchips">
              <span className="wj-tchip">
                判定：成立 {currentStats.ok} · 部分成立 {currentStats.part} · 不成立 {currentStats.bad}
              </span>
              {currentStats.bad > 0 && (
                <span className="wj-tchip is-warn">{currentStats.bad} 题判定不成立，待巩固</span>
              )}
              {(() => {
                const pending = STAGES.filter((s) => !current.completed.includes(s.id));
                if (!pending.length)
                  return <span className="wj-tchip is-ok">六道工序全部完成</span>;
                return (
                  <span className="wj-tchip is-warn">
                    未完成：{pending.map((s) => `${s.id} ${s.name}`).join('、')}
                  </span>
                );
              })()}
            </div>
          )}
          <section className="wj-tstage">
            <header>
              <span className="wj-tstage-no is-done">鉴</span>
              <h2>简牍鉴赏 · 阅读足迹</h2>
              <span className="wj-teacher-dim">
                板块 {exhBoardCount(current)}/{EXH_BOARDS.length} · 案例精读 {exhCaseCount(current)}/
                {EXH_CASE_IDS.length} · 最近 {fmtTime(exhLatest(current))}
              </span>
            </header>
            <div className="wj-texh">
              {EXH_BOARDS.map((b) => {
                const t = current.exhibitsViewed[b.id];
                return (
                  <span key={b.id} className={`wj-texh-item ${t ? 'is-seen' : ''}`}>
                    {b.label}
                    {t ? <i>{fmtTime(t)}</i> : <i>未读</i>}
                  </span>
                );
              })}
              {EXH_CASE_IDS.map((n) => {
                const t = current.exhibitsViewed[`case-${n}`];
                return (
                  <span key={`case-${n}`} className={`wj-texh-item ${t ? 'is-seen' : ''}`}>
                    案例 {n}
                    {t ? <i>{fmtTime(t)}</i> : <i>未读</i>}
                  </span>
                );
              })}
            </div>
          </section>
          {STAGES.map((s) => {
            const done = current.completed.includes(s.id);
            const revealed = current.actsRevealed[String(s.id)] ?? 1;
            const imgs = imagesOf(current);
            return (
              <section key={s.id} className="wj-tstage">
                <header>
                  <span className={`wj-tstage-no ${done ? 'is-done' : ''}`}>{s.id}</span>
                  <h2>{s.name}</h2>
                  <span className={`wj-tbadge ${done ? 'is-done' : 'is-doing'}`}>{done ? '已完成' : '进行中'}</span>
                  <span className="wj-teacher-dim">
                    读到「{ACT_NAMES[Math.min(revealed, 4) - 1]}」 · 细问{' '}
                    {s.questions.filter((q) => isQuestionAnswered(current.answers, imgs, s.id, q)).length}/
                    {s.questions.length}
                  </span>
                </header>
                <ul>
                  {s.questions.map((q, qi) => {
                    const verdict = verdictOf(current, s.id, q);
                    const submitted = submittedOf(current, s.id, q);
                    const draft = draftOf(current, s.id, q);
                    return (
                      <li key={q.id}>
                        <span className="wj-tq-no">
                          {s.id}-{qi + 1}
                        </span>
                        <span className="wj-tq-stem">{q.stem}</span>
                        <span className={`wj-tbadge ${verdict ? 'is-done' : submitted ? 'is-doing' : draft ? 'is-draft' : ''}`}>
                          {verdict || (submitted ? '已提交' : draft ? '草稿' : '未答')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
