'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toPng } from 'html-to-image';
import { STAGES } from '@/lib/workshop/content';
import { useWorkshopStore } from '@/store/useWorkshopStore';
import { useAuth } from '@/components/workshop/AuthProvider';
import { ArrowLeft, Award, BadgeCheck, Check, Download, RotateCcw } from 'lucide-react';

const TOTAL_STAGES = STAGES.length;

export default function AchievementPage() {
  const hydrated = useWorkshopStore((s) => s.hydrated);
  const completed = useWorkshopStore((s) => s.completed);
  const studentInfo = useWorkshopStore((s) => s.studentInfo);
  const achievementUnlocked = useWorkshopStore((s) => s.achievementUnlocked);
  const setStudentInfo = useWorkshopStore((s) => s.setStudentInfo);
  const answers = useWorkshopStore((s) => s.answers);
  const verdicts = useWorkshopStore((s) => s.verdicts);
  const resetAll = useWorkshopStore((s) => s.resetAll);
  const { signOut } = useAuth();

  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const allDone = hydrated ? completed.length >= TOTAL_STAGES : false;

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

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#f5f0e6',
      });
      const link = document.createElement('a');
      link.download = `成就卡-${studentInfo?.studentId}-${studentInfo?.name}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError('图片生成失败，请重试');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="relative min-h-dvh">
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <img src="/lobby-bg.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {/* 成就卡主体 — 纸色卷面，朱砂双栏边框 */}
        <div ref={cardRef} className="relative overflow-hidden bg-wj-surface shadow-[0_8px_40px_-12px_rgba(30,27,22,0.25)]">
          {/* 朱砂双线边框 */}
          <div className="pointer-events-none absolute inset-0 border border-wj-cinnabar/30" />
          <div className="pointer-events-none absolute inset-[5px] border border-wj-cinnabar/15" />

          {/* 朱砂印章 — 右上角，竖排篆体感 */}
          <div className="absolute right-7 top-7 z-10">
            <div className="flex size-20 flex-col items-center justify-center gap-1 bg-wj-cinnabar text-wj-cinnabar-ink shadow-md" style={{ borderRadius: '2px' }}>
              <span className="font-serif text-sm font-semibold leading-none">吴簡</span>
              <span className="font-serif text-sm font-semibold leading-none">修坊</span>
              <span className="mt-0.5 h-px w-7 bg-wj-cinnabar-ink/30" />
              <span className="font-serif text-[8px] leading-none">结业</span>
            </div>
          </div>

          {/* 标题区 — serif 大字 + 朱砂细线 */}
          <div className="px-10 pb-6 pt-10">
            <div className="font-serif text-xs tracking-[0.3em] text-wj-cinnabar">走马楼吴简修复工坊</div>
            <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-wide text-wj-ink">
              结业成就卡
            </h1>
            <div className="mt-4 h-px w-full bg-gradient-to-r from-wj-cinnabar/40 via-wj-line to-transparent" />
          </div>

          {/* 学生信息 — 竹青左缘细边，档案条目式 */}
          <div className="px-10 py-5">
            <div className="grid grid-cols-2 gap-6">
              <div className="border-l-2 border-wj-bamboo/50 pl-3">
                <div className="text-[11px] tracking-wide text-wj-dim">学号</div>
                <div className="mt-1 font-mono text-base font-medium tabular-nums text-wj-water">{studentInfo?.studentId}</div>
              </div>
              <div className="border-l-2 border-wj-bamboo/50 pl-3">
                <div className="text-[11px] tracking-wide text-wj-dim">姓名</div>
                <div className="mt-1 font-serif text-base font-medium text-wj-ink">{studentInfo?.name}</div>
              </div>
            </div>
          </div>

          {/* 环节完成 — 简册编联意象：六枚竹简横排，竹青色编绳线贯穿 */}
          <div className="px-10 py-5">
            <div className="text-xs font-medium tracking-wide text-wj-muted">六道工序 · 修习记录</div>
            <div className="relative mt-4">
              {/* 编绳线 */}
              <div className="pointer-events-none absolute left-0 right-0 top-[14px] h-px bg-wj-bamboo/30" />
              <div className="pointer-events-none absolute left-0 right-0 bottom-[14px] h-px bg-wj-bamboo/30" />
              <div className="relative grid grid-cols-6 gap-2">
                {STAGES.map((s) => (
                  <div key={s.id} className="flex flex-col items-center">
                    {/* 竹简片 */}
                    <div className="flex w-full flex-col items-center rounded-t-sm rounded-b-sm border-x border-wj-bamboo/25 bg-wj-raised py-3" style={{ borderTopWidth: '3px', borderTopColor: 'rgba(74,106,76,0.3)', borderBottomWidth: '3px', borderBottomColor: 'rgba(74,106,76,0.3)' }}>
                      <span className="flex size-7 items-center justify-center rounded-full bg-wj-bamboo text-white">
                        <Check className="size-3.5" />
                      </span>
                      <span className="mt-2 font-serif text-[11px] leading-tight text-wj-ink">{s.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 答题统计 — 实验记录式四格 */}
          <div className="px-10 py-5">
            <div className="text-xs font-medium tracking-wide text-wj-muted">评阅统计</div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <div className="border-l-2 border-wj-water/40 bg-wj-raised/50 px-3 py-2.5">
                <div className="font-mono text-2xl font-semibold tabular-nums text-wj-water">{answeredCount}</div>
                <div className="mt-0.5 text-[10px] text-wj-muted">作答</div>
              </div>
              <div className="border-l-2 border-wj-bamboo/40 bg-wj-raised/50 px-3 py-2.5">
                <div className="font-mono text-2xl font-semibold tabular-nums text-wj-bamboo">{verdictCounts.成立}</div>
                <div className="mt-0.5 text-[10px] text-wj-muted">成立</div>
              </div>
              <div className="border-l-2 border-wj-ochre/40 bg-wj-raised/50 px-3 py-2.5">
                <div className="font-mono text-2xl font-semibold tabular-nums text-wj-ochre">{verdictCounts.部分成立}</div>
                <div className="mt-0.5 text-[10px] text-wj-muted">部分成立</div>
              </div>
              <div className="border-l-2 border-wj-cinnabar/40 bg-wj-raised/50 px-3 py-2.5">
                <div className="font-mono text-2xl font-semibold tabular-nums text-wj-cinnabar">{verdictCounts.不成立}</div>
                <div className="mt-0.5 text-[10px] text-wj-muted">不成立</div>
              </div>
            </div>
          </div>

          {/* 底部 — 日期 + 签发语 */}
          <div className="border-t border-wj-line px-10 py-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] tracking-wide text-wj-dim">签发日期</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-wj-ink">{dateStr}</div>
              </div>
              <div className="text-right">
                <div className="font-serif text-xs text-wj-muted">竹简一千枚，皆经手过眼</div>
                <div className="mt-1 font-serif text-[11px] text-wj-dim">——吴簡修坊</div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作 */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded border border-wj-border px-4 text-sm text-wj-ink transition-colors hover:border-wj-cinnabar/60"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工坊
          </Link>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex h-9 items-center gap-2 rounded bg-wj-cinnabar px-4 text-sm font-medium text-wj-cinnabar-ink transition-colors hover:bg-wj-cinnabar/90 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? '生成中…' : '下载图片'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('确定要退出吗？所有作答记录将被清除，且无法恢复。')) {
                resetAll();
                signOut();
                window.location.href = '/';
              }
            }}
            className="inline-flex h-9 items-center gap-2 rounded border border-wj-border px-4 text-sm text-wj-muted transition-colors hover:border-wj-cinnabar/60 hover:text-wj-cinnabar"
          >
            <RotateCcw className="h-4 w-4" />
            退出并重置
          </button>
        </div>
      </div>
    </main>
  );
}
