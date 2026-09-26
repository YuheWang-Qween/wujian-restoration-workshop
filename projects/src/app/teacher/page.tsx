'use client';

/**
 * 教师端 · 学情分析。三层视图：班级 → 班级学生 → 学生学情详情。
 * 数据来自 /api/teacher/overview（登录 Bearer + 教师角色校验）。
 * 班级由教师手动划分（class_assignments 表存归属，学生行右侧下拉
 * 可移动/新建班级），细问答完口径与学生端共用 store 的 isQuestionAnswered。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ChevronDown, Eye, KeyRound, Plus, RefreshCw, Users, GraduationCap } from 'lucide-react';
import { useAuth } from '@/components/workshop/AuthProvider';
import { STAGES, ACT_WHY, ACT_DATA, ACT_SIM, ACT_QUESTIONS } from '@/lib/workshop/content';
import { answerKey, isQuestionAnswered } from '@/store/useWorkshopStore';

interface Learner {
  userId: string;
  name: string;
  staffNo: string;
  className: string;
  avatarUrl: string;
  updatedAt: string | null;
  completed: number[];
  actsRevealed: Record<string, number>;
  answers: Record<string, string>;
  submitted: Record<string, unknown>;
  verdicts: Record<string, string>;
  imageKeys: string[];
  exhibitsViewed: Record<string, string>;
}

const TOTAL_STAGES = STAGES.length;
const TOTAL_QUESTIONS = STAGES.reduce((n, s) => n + s.questions.length, 0);
const ACT_NAMES = [ACT_WHY, ACT_DATA, ACT_SIM, ACT_QUESTIONS];
const UNASSIGNED = '未编班';
const EXTRA_CLASS_STORE = 'wj-teacher-classes';

function imagesOf(l: Learner): Record<string, string> {
  return Object.fromEntries(l.imageKeys.map((k) => [k, '1']));
}

function answeredCount(l: Learner): number {
  const imgs = imagesOf(l);
  return STAGES.reduce(
    (n, s) => n + s.questions.filter((q) => isQuestionAnswered(l.answers, imgs, s.id, q)).length,
    0,
  );
}

function verdictOf(l: Learner, stageId: number, q: { id: string; parts: { label: string }[] }): string {
  const keys = [answerKey(stageId, q.id), ...q.parts.map((p) => answerKey(stageId, q.id, p.label))];
  for (const k of keys) {
    const v = l.verdicts[k];
    if (v) return v;
  }
  return '';
}

function submittedOf(l: Learner, stageId: number, q: { id: string; parts: { label: string }[] }): boolean {
  const keys = [answerKey(stageId, q.id), ...q.parts.map((p) => answerKey(stageId, q.id, p.label))];
  return keys.some((k) => Boolean(l.submitted[k]));
}

/** 一组学习者的细问判定分布（口径与学生详情逐题徽章一致：每题取首个判据键的判定） */
function verdictStats(list: Learner[]): { ok: number; part: number; bad: number } {
  let ok = 0;
  let part = 0;
  let bad = 0;
  for (const l of list) {
    for (const s of STAGES) {
      for (const q of s.questions) {
        const v = verdictOf(l, s.id, q);
        if (v === '成立') ok++;
        else if (v === '部分成立') part++;
        else if (v === '不成立') bad++;
      }
    }
  }
  return { ok, part, bad };
}

/** 学生在一道细问上的作答文本（各小问拼接；画图题标注画图作答） */
function answerTextOf(
  l: Learner,
  stageId: number,
  q: { id: string; parts: { label: string }[] },
): string {
  const keys = [answerKey(stageId, q.id), ...q.parts.map((p) => answerKey(stageId, q.id, p.label))];
  const segs = keys
    .map((k) => {
      const t = (l.answers[k] ?? '').trim();
      if (t) return t;
      if (l.imageKeys.includes(k)) return '（画图作答）';
      return '';
    })
    .filter(Boolean);
  return segs.join(' / ');
}

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

function draftOf(l: Learner, stageId: number, q: { id: string; parts: { label: string }[] }): boolean {
  const imgs = imagesOf(l);
  return isQuestionAnswered(l.answers, imgs, stageId, q);
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `今天 ${hh}:${mm}`;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}-${day} ${hh}:${mm}`;
}

/** 鉴赏篇五个板块的 id 与展示名（与 exhibition.ts 的 EXH_NAV 对齐，教师端独立维护轻量副本） */
const EXH_BOARDS = [
  { id: 'discovery', label: '发现与归属' },
  { id: 'forms', label: '形制六类' },
  { id: 'themes', label: '主题八类' },
  { id: 'cases', label: '案例精读' },
  { id: 'reference', label: '术语·出版·来源' },
];
const EXH_CASE_IDS = [1, 2, 3, 4, 5];

function exhBoardCount(l: Learner): number {
  return EXH_BOARDS.filter((b) => l.exhibitsViewed[b.id]).length;
}

function exhCaseCount(l: Learner): number {
  return EXH_CASE_IDS.filter((n) => l.exhibitsViewed[`case-${n}`]).length;
}

function exhLatest(l: Learner): string | null {
  const times = Object.values(l.exhibitsViewed ?? {}).filter(Boolean).sort();
  return times[times.length - 1] ?? null;
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
  const [page, setPage] = useState<'classes' | 'errors'>('classes');
  const [errClass, setErrClass] = useState('全部班级');
  const [extraClasses, setExtraClasses] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

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
          <p>该账号不是教师账号。请在登录页选择「我是教师」并输入教师口令重新登录。</p>
          <button type="button" className="wj-teacher-lockbtn" onClick={() => router.replace('/login')}>
            返回登录页
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
          <button type="button" className="wj-teacher-ghost" onClick={() => void load()} disabled={state === 'loading'}>
            <RefreshCw size={14} aria-hidden /> 刷新
          </button>
        </span>
      </header>

      {state !== 'ready' && <p className="wj-teacher-hint">正在读取学习档案……</p>}
      {notice && <p className="wj-teacher-notice">{notice}</p>}

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
