'use client';

/**
 * 教师端 · 学情分析。三层视图：班级 → 班级学生 → 学生学情详情。
 * 数据来自 /api/teacher/overview（登录 Bearer + 教师口令双校验）。
 * 班级按学工号前缀推导（位数可调，默认 6 位），细问答完口径与
 * 学生端进度条、完成判定共用 store 的 isQuestionAnswered。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, KeyRound, RefreshCw, Users, GraduationCap } from 'lucide-react';
import { useAuth } from '@/components/workshop/AuthProvider';
import { STAGES, ACT_WHY, ACT_DATA, ACT_SIM, ACT_QUESTIONS } from '@/lib/workshop/content';
import { answerKey, isQuestionAnswered } from '@/store/useWorkshopStore';

interface Learner {
  userId: string;
  name: string;
  staffNo: string;
  avatarUrl: string;
  updatedAt: string | null;
  completed: number[];
  actsRevealed: Record<string, number>;
  answers: Record<string, string>;
  submitted: Record<string, unknown>;
  verdicts: Record<string, string>;
  imageKeys: string[];
}

const TOTAL_STAGES = STAGES.length;
const TOTAL_QUESTIONS = STAGES.reduce((n, s) => n + s.questions.length, 0);
const ACT_NAMES = [ACT_WHY, ACT_DATA, ACT_SIM, ACT_QUESTIONS];
const DIGIT_STORE = 'wj-teacher-digits';

const DEFAULT_DIGITS = 6;
const DIGIT_OPTIONS = [4, 6, 8, 0] as const;

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

function classOf(staffNo: string, digits: number): string {
  if (digits === 0) return '全部学生';
  if (!staffNo) return '未编班';
  return staffNo.slice(0, digits) || '未编班';
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
  const [digits, setDigits] = useState(DEFAULT_DIGITS);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(DIGIT_STORE));
    if (DIGIT_OPTIONS.includes(saved as 0)) setDigits(saved);
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
      const c = classOf(l.staffNo, digits);
      const arr = map.get(c);
      if (arr) arr.push(l);
      else map.set(c, [l]);
    }
    const entries = [...map.entries()].sort((a, b) => {
      if (a[0] === '未编班') return 1;
      if (b[0] === '未编班') return -1;
      return a[0].localeCompare(b[0]);
    });
    if (digits === 0 && entries.length === 1 && entries[0][0] === '全部学生') return entries;
    return entries.filter(([c]) => (digits === 0 ? true : c !== '全部学生'));
  }, [learners, digits]);

  const current = view.mode === 'student' ? learners.find((l) => l.userId === view.userId) : undefined;

  const changeDigits = (d: number) => {
    setDigits(d);
    window.localStorage.setItem(DIGIT_STORE, String(d));
    setView({ mode: 'classes' });
  };

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
          onClick={() => {
            sessionStorage.setItem('wj-view-as', 'student');
            router.push('/');
          }}
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

      {state === 'ready' && view.mode === 'classes' && (
        <>
          <div className="wj-teacher-toolbar">
            <span>班级划分：学工号前</span>
            {DIGIT_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`wj-teacher-chip ${digits === d ? 'is-on' : ''}`}
                onClick={() => changeDigits(d)}
              >
                {d === 0 ? '不分组' : `${d} 位`}
              </button>
            ))}
            <span className="wj-teacher-dim">（无学工号的学习者归入「未编班」）</span>
          </div>
          {groups.length === 0 ? (
            <p className="wj-teacher-hint">还没有学习者的进度记录。学生登录并开始学习后，这里会出现班级。</p>
          ) : (
            <div className="wj-teacher-grid">
              {groups.map(([cls, list]) => {
                const avgStages = list.reduce((n, l) => n + l.completed.length, 0) / list.length;
                const avgQ = list.reduce((n, l) => n + answeredCount(l), 0) / list.length;
                const latest = list.reduce<string | null>(
                  (m, l) => (l.updatedAt && (!m || l.updatedAt > m) ? l.updatedAt : m),
                  null,
                );
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
                          {avgStages.toFixed(1)}
                          <i>/{TOTAL_STAGES}</i>
                        </dd>
                      </div>
                      <div>
                        <dt>平均细问</dt>
                        <dd>
                          {avgQ.toFixed(1)}
                          <i>/{TOTAL_QUESTIONS}</i>
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

      {state === 'ready' && view.mode === 'class' && (
        <>
          <div className="wj-teacher-toolbar">
            <button type="button" className="wj-teacher-ghost" onClick={() => setView({ mode: 'classes' })}>
              <ArrowLeft size={14} aria-hidden /> 全部班级
            </button>
            <strong>{view.cls}</strong>
            <span className="wj-teacher-dim">{groups.find(([c]) => c === view.cls)?.[1].length ?? 0} 名学生</span>
          </div>
          <div className="wj-trow wj-trow-head">
            <span>学生</span>
            <span>学工号</span>
            <span>环节</span>
            <span>细问</span>
            <span>最近活跃</span>
          </div>
          {(groups.find(([c]) => c === view.cls)?.[1] ?? [])
            .slice()
            .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
            .map((l) => (
              <button key={l.userId} type="button" className="wj-trow" onClick={() => setView({ mode: 'student', userId: l.userId })}>
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
                <span className="wj-teacher-dim">{fmtTime(l.updatedAt)}</span>
              </button>
            ))}
        </>
      )}

      {state === 'ready' && view.mode === 'student' && current && (
        <>
          <div className="wj-teacher-toolbar">
            <button
              type="button"
              className="wj-teacher-ghost"
              onClick={() => setView({ mode: 'class', cls: classOf(current.staffNo, digits) })}
            >
              <ArrowLeft size={14} aria-hidden /> {classOf(current.staffNo, digits)}
            </button>
          </div>
          <div className="wj-tprofile">
            <Avatar l={current} size={46} />
            <div>
              <strong>{current.name}</strong>
              <span className="wj-teacher-dim">
                {current.staffNo || '无学工号'} · 环节 {current.completed.length}/{TOTAL_STAGES} · 细问{' '}
                {answeredCount(current)}/{TOTAL_QUESTIONS} · 最近 {fmtTime(current.updatedAt)}
              </span>
            </div>
          </div>
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
