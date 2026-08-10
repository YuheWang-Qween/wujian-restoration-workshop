'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STAGES } from '@/lib/workshop/content';
import { useWorkshopStore } from '@/store/useWorkshopStore';
import { useAuth } from '@/components/workshop/AuthProvider';
import { ArrowLeft, Award, BadgeCheck, Check } from 'lucide-react';

const TOTAL_STAGES = STAGES.length;

export default function AchievementPage() {
  const hydrated = useWorkshopStore((s) => s.hydrated);
  const completed = useWorkshopStore((s) => s.completed);
  const studentInfo = useWorkshopStore((s) => s.studentInfo);
  const achievementUnlocked = useWorkshopStore((s) => s.achievementUnlocked);
  const setStudentInfo = useWorkshopStore((s) => s.setStudentInfo);
  const answers = useWorkshopStore((s) => s.answers);
  const verdicts = useWorkshopStore((s) => s.verdicts);

  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const allDone = hydrated && completed.length >= TOTAL_STAGES;

  // 如果已经填过，回填
  useEffect(() => {
    if (studentInfo) {
      setStudentId(studentInfo.studentId);
      setName(studentInfo.name);
    }
  }, [studentInfo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sid = studentId.trim();
    const n = name.trim();
    if (!sid) {
      setError('请输入学号');
      return;
    }
    if (!n) {
      setError('请输入姓名');
      return;
    }
    setError('');
    setStudentInfo(sid, n);
  };

  // 统计答题数据
  const answeredCount = Object.entries(answers).filter(([, v]) => v.trim()).length;
  const verdictCounts = { 成立: 0, 部分成立: 0, 不成立: 0 };
  Object.values(verdicts).forEach((v) => {
    if (v === '成立') verdictCounts.成立++;
    else if (v === '部分成立') verdictCounts.部分成立++;
    else if (v === '不成立') verdictCounts.不成立++;
  });

  if (!hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="text-sm text-wj-muted">加载中…</div>
      </main>
    );
  }

  // 未完成全部环节
  if (!allDone) {
    return (
      <main className="relative min-h-dvh">
        <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <img src="/lobby-bg.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <div className="rounded-lg border border-wj-border bg-wj-surface p-8 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-wj-sunk">
              <Award className="size-8 text-wj-muted" />
            </div>
            <h1 className="font-serif text-xl font-semibold text-wj-ink">成就卡尚未解锁</h1>
            <p className="mt-3 text-sm leading-relaxed text-wj-muted">
              完成全部 {TOTAL_STAGES} 个环节后，可在此填写学号与姓名，解锁专属成就卡。
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <span className="text-sm text-wj-muted">
                已完成 {completed.length} / {TOTAL_STAGES}
              </span>
            </div>
            <div className="mt-6 flex items-center justify-center gap-1.5">
              {STAGES.map((s) => {
                const done = completed.includes(s.id);
                return (
                  <span
                    key={s.id}
                    className={`flex size-7 items-center justify-center rounded text-xs ${
                      done ? 'bg-wj-bamboo text-white' : 'bg-wj-sunk text-wj-dim'
                    }`}
                  >
                    {done ? <Check className="size-3.5" /> : s.id}
                  </span>
                );
              })}
            </div>
            <Link
              href="/"
              className="mt-8 inline-flex h-9 items-center gap-2 rounded border border-wj-border px-4 text-sm text-wj-ink transition-colors hover:border-wj-cinnabar/60"
            >
              <ArrowLeft className="h-4 w-4" />
              返回工坊
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 已完成全部环节但未填学号姓名
  if (!achievementUnlocked) {
    return (
      <main className="relative min-h-dvh">
        <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <img src="/lobby-bg.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <div className="rounded-lg border border-wj-border bg-wj-surface p-8">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-wj-cinnabar/10">
              <BadgeCheck className="size-8 text-wj-cinnabar" />
            </div>
            <h1 className="text-center font-serif text-xl font-semibold text-wj-ink">解锁成就卡</h1>
            <p className="mt-3 text-center text-sm leading-relaxed text-wj-muted">
              恭喜你完成了全部 {TOTAL_STAGES} 个环节！请填写学号与姓名，生成专属成就卡。
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-wj-ink">
                  学号
                </label>
                <input
                  id="studentId"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="请输入学号"
                  className="mt-1.5 w-full rounded border border-wj-border bg-wj-raised px-3 py-2 text-sm text-wj-ink outline-none transition-colors placeholder:text-wj-dim focus:border-wj-cinnabar"
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-wj-ink">
                  姓名
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
                  className="mt-1.5 w-full rounded border border-wj-border bg-wj-raised px-3 py-2 text-sm text-wj-ink outline-none transition-colors placeholder:text-wj-dim focus:border-wj-cinnabar"
                />
              </div>
              {error && <p className="text-sm text-wj-ochre">{error}</p>}
              <button
                type="submit"
                className="w-full rounded bg-wj-cinnabar px-4 py-2.5 text-sm font-medium text-wj-cinnabar-ink transition-colors hover:bg-wj-cinnabar/90"
              >
                解锁成就卡
              </button>
            </form>
            <div className="mt-6 text-center">
              <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-wj-muted hover:text-wj-cinnabar">
                <ArrowLeft className="h-4 w-4" />
                返回工坊
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 成就卡展示
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  return (
    <main className="relative min-h-dvh">
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <img src="/lobby-bg.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {/* 成就卡主体 */}
        <div className="relative overflow-hidden rounded-lg border-2 border-wj-cinnabar/40 bg-wj-surface shadow-[0_8px_40px_-12px_rgba(30,27,22,0.25)]">
          {/* 朱砂印章角标 */}
          <div className="absolute right-5 top-5 z-10">
            <div className="flex size-14 flex-col items-center justify-center rounded bg-wj-cinnabar text-wj-cinnabar-ink shadow-sm">
              <span className="font-serif text-[10px] leading-none">吴簡</span>
              <span className="font-serif text-[10px] leading-none mt-0.5">修坊</span>
            </div>
          </div>

          {/* 标题 */}
          <div className="border-b border-wj-line px-8 py-6">
            <div className="flex items-center gap-2 text-wj-cinnabar">
              <Award className="size-5" />
              <span className="text-xs font-semibold tracking-[0.2em]">ACHIEVEMENT</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-semibold tracking-wide text-wj-ink">
              走马楼吴简修复工坊 · 结业成就卡
            </h1>
          </div>

          {/* 学生信息 */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-wj-muted">学号</div>
                <div className="mt-1 font-mono text-sm font-medium text-wj-ink">{studentInfo?.studentId}</div>
              </div>
              <div>
                <div className="text-xs text-wj-muted">姓名</div>
                <div className="mt-1 font-serif text-sm font-medium text-wj-ink">{studentInfo?.name}</div>
              </div>
            </div>
          </div>

          {/* 环节完成情况 */}
          <div className="border-t border-wj-line px-8 py-6">
            <div className="text-xs font-medium tracking-wide text-wj-muted">环节完成</div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {STAGES.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col items-center gap-1.5 rounded border border-wj-line bg-wj-raised py-2.5"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-wj-bamboo text-white">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-[11px] text-wj-muted">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 答题统计 */}
          <div className="border-t border-wj-line px-8 py-6">
            <div className="text-xs font-medium tracking-wide text-wj-muted">答题统计</div>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded border border-wj-line bg-wj-raised px-4 py-3">
                <div className="font-mono text-lg font-semibold tabular-nums text-wj-water">{answeredCount}</div>
                <div className="mt-0.5 text-[11px] text-wj-muted">作答题数</div>
              </div>
              <div className="rounded border border-wj-line bg-wj-raised px-4 py-3">
                <div className="font-mono text-lg font-semibold tabular-nums text-wj-bamboo">{verdictCounts.成立}</div>
                <div className="mt-0.5 text-[11px] text-wj-muted">评阅成立</div>
              </div>
              <div className="rounded border border-wj-line bg-wj-raised px-4 py-3">
                <div className="font-mono text-lg font-semibold tabular-nums text-wj-ochre">{verdictCounts.部分成立}</div>
                <div className="mt-0.5 text-[11px] text-wj-muted">部分成立</div>
              </div>
              <div className="rounded border border-wj-line bg-wj-raised px-4 py-3">
                <div className="font-mono text-lg font-semibold tabular-nums text-wj-cinnabar">{verdictCounts.不成立}</div>
                <div className="mt-0.5 text-[11px] text-wj-muted">评阅不成立</div>
              </div>
            </div>
          </div>

          {/* 底部日期 */}
          <div className="border-t border-wj-line px-8 py-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-wj-muted">完成日期</span>
              <span className="font-mono text-sm text-wj-ink">{dateStr}</span>
            </div>
          </div>
        </div>

        {/* 操作 */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded border border-wj-border px-4 text-sm text-wj-ink transition-colors hover:border-wj-cinnabar/60"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工坊
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded border border-wj-border px-4 text-sm text-wj-ink transition-colors hover:border-wj-cinnabar/60"
          >
            打印 / 保存
          </button>
        </div>
      </div>
    </main>
  );
}
