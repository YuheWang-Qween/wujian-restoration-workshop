'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ExTheme } from '@/lib/workshop/exhibition';
import { FigureCard, SlipText } from '@/components/workshop/ExhibitionParts';

export function ThemesAccordion({ themes }: { themes: ExTheme[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const toggle = (i: number) => setOpenIdx((prev) => (prev === i ? null : i));

  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (openIdx === null) return;
    detailRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, [openIdx]);

  return (
    <div>
      {/* 固定高度卡片网格 */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme, i) => {
          const isOpen = openIdx === i;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              aria-controls={isOpen ? 'theme-detail' : undefined}
              className={`flex min-h-44 gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wj-cinnabar ${
                isOpen
                  ? 'border-wj-cinnabar/60 bg-wj-cinnabar/5'
                  : 'border-wj-border bg-wj-surface hover:border-wj-cinnabar/30'
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs tabular-nums text-wj-cinnabar">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-serif text-sm font-semibold text-wj-ink">{theme.name}</h3>
              </div>
              <p className="mt-2 line-clamp-4 flex-1 text-xs leading-6 text-wj-ink/70">
                {theme.text}
              </p>
              <span
                className={`mt-1 inline-flex items-center gap-1 text-xs text-wj-muted transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              >
                展读 <ChevronDown className="h-3 w-3" />
              </span>
              </div>
              {theme.figure && (
                <img
                  src={theme.figure.src}
                  alt={theme.figure.alt}
                  loading="lazy"
                  className="h-32 w-20 shrink-0 self-center bg-wj-raised object-contain"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 通栏展开区 */}
      {openIdx !== null && (
        <div ref={detailRef} id="theme-detail" className="scroll-mt-20 mt-4 rounded-lg border border-wj-cinnabar/30 bg-wj-surface p-5">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm tabular-nums text-wj-cinnabar">
              {String(openIdx + 1).padStart(2, '0')}
            </span>
            <h3 className="font-serif text-lg font-semibold text-wj-ink">
              {themes[openIdx].name}
            </h3>
          </div>
          <div className={themes[openIdx].figure ? 'mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]' : 'mt-3'}>
          {themes[openIdx].figure && <FigureCard figure={themes[openIdx].figure!} tall />}
          <div>
          <p className="text-sm leading-8 text-wj-ink/85">{themes[openIdx].text}</p>
          {themes[openIdx].quote && (
            <div className="mt-4">
              {themes[openIdx].figure && (
                <p className="mb-2 text-xs text-wj-muted">同类释文选例（与配图非逐字对应）</p>
              )}
              <SlipText slip={themes[openIdx].quote!} />
            </div>
          )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
