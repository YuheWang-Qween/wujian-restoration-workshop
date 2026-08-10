'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ExTheme } from '@/lib/workshop/exhibition';
import { FigureCard, SlipText } from '@/components/workshop/ExhibitionParts';

export function ThemesAccordion({ themes }: { themes: ExTheme[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const toggle = (i: number) => setOpenIdx((prev) => (prev === i ? null : i));

  return (
    <div>
      {/* 固定高度卡片网格 */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme, i) => {
          const isOpen = openIdx === i;
          return (
            <button
              key={theme.id}
              onClick={() => toggle(i)}
              className={`flex h-40 flex-col rounded-lg border p-4 text-left transition-colors ${
                isOpen
                  ? 'border-wj-cinnabar/60 bg-wj-cinnabar/5'
                  : 'border-wj-border bg-wj-surface hover:border-wj-cinnabar/30'
              }`}
            >
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
            </button>
          );
        })}
      </div>

      {/* 通栏展开区 */}
      {openIdx !== null && (
        <div className="mt-4 rounded-lg border border-wj-cinnabar/30 bg-wj-surface p-5">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm tabular-nums text-wj-cinnabar">
              {String(openIdx + 1).padStart(2, '0')}
            </span>
            <h3 className="font-serif text-lg font-semibold text-wj-ink">
              {themes[openIdx].name}
            </h3>
          </div>
          <p className="mt-3 text-sm leading-8 text-wj-ink/85">{themes[openIdx].text}</p>
          {themes[openIdx].quote && (
            <div className="mt-4">
              <SlipText slip={themes[openIdx].quote!} />
            </div>
          )}
          {themes[openIdx].figure && (
            <div className="mt-4 max-w-sm">
              <FigureCard figure={themes[openIdx].figure!} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
