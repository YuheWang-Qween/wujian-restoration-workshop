'use client';

/**
 * 学生端 · 我的学情。数据来自 /api/progress（登录 Bearer，只能读到本人进度）。
 * 判定口径与教师端共用 learner-metrics：环节完成、细问答完、小简判定三态。
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/workshop/AuthProvider';
import { STAGES } from '@/lib/workshop/content';
import {
  type Learner,
  TOTAL_STAGES,
  TOTAL_QUESTIONS,
  ACT_NAMES,
  answeredCount,
  verdictOf,
  submittedOf,
  draftOf,
  answerTextOf,
  fmtTime,
  EXH_BOARDS,
  EXH_CASE_IDS,
  exhBoardCount,
  exhCaseCount,
  exhLatest,
} from '@/lib/workshop/learner-metrics';

interface ProgressData {
  completed?: number[];
  answers?: Record<string, string>;
  submitted?: Record<string, true>;
  verdicts?: Record<string, string>;
  images?: Record<string, string>;
  studentInfo?: { studentId: string; name: string } | null;
  actsRevealed?: Record<string, number>;
  exhibitsViewed?: Record<string, string>;
}

function verdictBadge(v: string): string {
  if (v === '成立') return 'is-ver-ok';
  if (v === '部分成立') return 'is-ver-part';
  if (v === '不成立') return 'is-ver-bad';
  return '';
}

export default function LearnerPage() {
  const router = useRouter();
  const { user, session, isLoading, signOut } = useAuth();
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [me, setMe] = useState<Learner | null>(null);
  const [fetchedAt, setFetchedAt] = useState('');

  const load = useCallback(async () => {
    if (isLoading) return;
    if (!session?.access_token) {
      router.push('/login');
      return;
    }
    setState('loading');
    try {
      const res = await fetch('/api/progress', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        setState('error');
        return;
      }
      const json = (await res.json()) as { data: ProgressData | null; updatedAt?: string | null };
      const d = json.data;
      if (!d) {
        setMe(null);
        setState('empty');
        setFetchedAt(new Date().toISOString());
        return;
      }
      const meta = (user?.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
      const cx = (
        user?.app_metadata as { chaoxing?: { name?: string; displayName?: string } } | undefined
      )?.chaoxing;
      setMe({
        userId: user?.id ?? '',
        name:
          meta.full_name ||
          d.studentInfo?.name ||
          cx?.displayName ||
          cx?.name ||
          (user?.email ? user.email.split('@')[0] : '同学'),
        staffNo: d.studentInfo?.studentId || cx?.name || '',
        className: '',
        avatarUrl: meta.avatar_url || '',
        updatedAt: json.updatedAt ?? null,
        completed: d.completed ?? [],
        actsRevealed: d.actsRevealed ?? {},
        answers: d.answers ?? {},
        submitted: d.submitted ?? {},
        verdicts: d.verdicts ?? {},
        imageKeys: Object.keys(d.images ?? {}),
        exhibitsViewed: d.exhibitsViewed ?? {},
      });
      setState('ready');
      setFetchedAt(new Date().toISOString());
    } catch {
      setState('error');
    }
  }, [isLoading, session, user, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'error') {
    return (
      <div className="wj-teacher-lock">
        <div className="wj-teacher-lockcard">
          <RefreshCw size={26} aria-hidden />
          <h1>加载失败</h1>
          <p>网络异常，请稍后再试。</p>
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
        <button type="button" className="wj-teacher-ghost" onClick={() => router.push('/')}>
          <ArrowLeft size={15} aria-hidden /> 返回工坊
        </button>
        <h1>
          <BookOpen size={17} aria-hidden /> 我的学情
        </h1>
        <span className="wj-teacher-meta">
          {fetchedAt ? fmtTime(fetchedAt) : ''}
          <button type="button" className="wj-teacher-ghost" onClick={() => void load()} disabled={state === 'loading'}>
            <RefreshCw size={14} aria-hidden /> 刷新
          </button>
          <button type="button" className="wj-teacher-ghost" onClick={() => void signOut()}>
            <LogOut size={14} aria-hidden /> 退出
          </button>
        </span>
      </header>

      {state === 'loading' && <p className="wj-teacher-hint">正在读取学习档案……</p>}

      {state === 'empty' && (
        <div className="wj-teacher-lock">
          <div className="wj-teacher-lockcard">
            <BookOpen size={26} aria-hidden />
            <h1>还没有学习记录</h1>
            <p>进入修复工坊完成第一道工序后，这里会呈现你的学习足迹。</p>
            <button type="button" className="wj-teacher-lockbtn" onClick={() => router.push('/')}>
              进入修复工坊
            </button>
          </div>
        </div>
      )}

      {state === 'ready' && me && (
        <>
          <div className="wj-tprofile">
            <span className="wj-teacher-avatar-fallback" style={{ width: 46, height: 46, fontSize: 19 }}>
              {me.name.slice(0, 1)}
            </span>
            <div>
              <strong>{me.name}</strong>
              <span className="wj-teacher-dim">
                {me.staffNo ? `${me.staffNo} · ` : ''}环节 {me.completed.length}/{TOTAL_STAGES} · 细问{' '}
                {answeredCount(me)}/{TOTAL_QUESTIONS} · 鉴赏 {exhBoardCount(me)}/{EXH_BOARDS.length} · 最近{' '}
                {fmtTime(me.updatedAt)}
              </span>
            </div>
          </div>
          {(() => {
            let ok = 0;
            let part = 0;
            let bad = 0;
            for (const s of STAGES) {
              for (const q of s.questions) {
                const v = verdictOf(me, s.id, q);
                if (v === '成立') ok++;
                else if (v === '部分成立') part++;
                else if (v === '不成立') bad++;
              }
            }
            const pending = STAGES.filter((s) => !me.completed.includes(s.id));
            return (
              <div className="wj-tchips">
                {ok + part + bad > 0 && (
                  <span className="wj-tchip">
                    判定：成立 {ok} · 部分成立 {part} · 不成立 {bad}
                  </span>
                )}
                {bad > 0 && <span className="wj-tchip is-warn">{bad} 题判定不成立，回看小简解析再巩固</span>}
                {part > 0 && bad === 0 && <span className="wj-tchip is-warn">{part} 题部分成立，还有提升空间</span>}
                {pending.length ? (
                  <span className="wj-tchip is-warn">未完成：{pending.map((s) => `${s.id} ${s.name}`).join('、')}</span>
                ) : (
                  <span className="wj-tchip is-ok">六道工序全部完成</span>
                )}
              </div>
            );
          })()}
          <section className="wj-tstage">
            <header>
              <span className="wj-tstage-no is-done">鉴</span>
              <h2>简牍鉴赏 · 阅读足迹</h2>
              <span className="wj-teacher-dim">
                板块 {exhBoardCount(me)}/{EXH_BOARDS.length} · 案例精读 {exhCaseCount(me)}/
                {EXH_CASE_IDS.length} · 最近 {fmtTime(exhLatest(me))}
              </span>
            </header>
            <div className="wj-texh">
              {EXH_BOARDS.map((b) => {
                const t = me.exhibitsViewed[b.id];
                return (
                  <span key={b.id} className={`wj-texh-item ${t ? 'is-seen' : ''}`}>
                    {b.label}
                    {t ? <i>{fmtTime(t)}</i> : <i>未读</i>}
                  </span>
                );
              })}
              {EXH_CASE_IDS.map((n) => {
                const t = me.exhibitsViewed[`case-${n}`];
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
            const done = me.completed.includes(s.id);
            const revealed = me.actsRevealed[String(s.id)] ?? 1;
            return (
              <section key={s.id} className="wj-tstage">
                <header>
                  <span className={`wj-tstage-no ${done ? 'is-done' : ''}`}>{s.id}</span>
                  <h2>{s.name}</h2>
                  <span className={`wj-tbadge ${done ? 'is-done' : 'is-doing'}`}>{done ? '已完成' : '进行中'}</span>
                  <span className="wj-teacher-dim">
                    读到「{ACT_NAMES[Math.min(revealed, 4) - 1]}」 · 细问{' '}
                    {s.questions.filter((q) => draftOf(me, s.id, q)).length}/{s.questions.length}
                  </span>
                </header>
                <ul>
                  {s.questions.map((q, qi) => {
                    const verdict = verdictOf(me, s.id, q);
                    const submitted = submittedOf(me, s.id, q);
                    const draft = draftOf(me, s.id, q);
                    const answer = answerTextOf(me, s.id, q);
                    return (
                      <li key={q.id} className={answer ? 'has-ans' : ''}>
                        <span className="wj-tq-no">
                          {s.id}-{qi + 1}
                        </span>
                        <span className="wj-tq-stem">{q.stem}</span>
                        <span
                          className={`wj-tbadge ${verdict ? verdictBadge(verdict) : submitted ? 'is-doing' : draft ? 'is-draft' : ''}`}
                        >
                          {verdict || (submitted ? '已提交' : draft ? '草稿' : '未答')}
                        </span>
                        {answer && <span className="wj-tq-ans">{answer}</span>}
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
