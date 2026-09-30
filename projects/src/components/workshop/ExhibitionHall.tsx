'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { COLOPHON, EXH_NAV } from '@/lib/workshop/exhibition';

/**
 * 简牍鉴赏篇 · 展厅首页（大厅「简牍鉴赏」页签内）
 *
 * 只做索引：五个板块入口卡。板块内容各自独立成页
 * （/exhibition/discovery|forms|themes|cases|reference，案例精读 /exhibition/case/N），
 * 不把全部内容堆在一个页签里。
 * 展示篇是陈列阅读：没有顺序解锁、没有细问、没有答题框，小简也不出场。
 */
export function ExhibitionHall() {
  return (
    <div className="mt-6 space-y-10">
      {/* ---------- 五个板块入口 ---------- */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {EXH_NAV.map((board, i) => (
          <Link
            key={board.id}
            href={board.href}
            className="group relative flex flex-col overflow-hidden rounded-lg border border-wj-border/70 bg-wj-surface transition-all duration-300 hover:-translate-y-1 hover:border-wj-cinnabar/45 hover:shadow-[0_4px_8px_-2px_rgba(30,27,22,0.08),0_16px_40px_-16px_rgba(30,27,22,0.22)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3"
            style={{ animationDelay: `${(i + 1) * 80}ms`, animationFillMode: 'backwards' }}
          >
            <div className="h-52 overflow-hidden border-b border-wj-line bg-wj-raised">
              <img
                src={board.figure}
                alt={board.label}
                loading="lazy"
                className={`h-full w-full ${board.figureFit === 'cover' ? 'object-cover' : 'object-contain p-3'}`}
              />
            </div>

            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex size-6 items-center justify-center rounded-sm border border-wj-cinnabar/45 font-serif text-[13px] font-semibold text-wj-cinnabar">
                    {board.order}
                  </span>
                  <h3 className="font-serif text-xl font-semibold tracking-wide text-wj-ink">
                    {board.label}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-wj-muted">{board.desc}</p>
                <p className="mt-2 font-mono text-[11px] tabular-nums text-wj-water">
                  {board.count}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-end">
                <span className="inline-flex items-center gap-1 text-sm text-wj-cinnabar/80 transition-all duration-200 group-hover:gap-2 group-hover:text-wj-cinnabar">
                  进入
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="max-w-3xl border-t border-wj-line pt-4 text-[11px] leading-6 text-wj-muted">
        {COLOPHON}
      </p>
    </div>
  );
}
