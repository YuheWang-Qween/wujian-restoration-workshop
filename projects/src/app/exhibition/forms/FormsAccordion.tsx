'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ExForm } from '@/lib/workshop/exhibition';
import { FigureCard, SlipText } from '@/components/workshop/ExhibitionParts';

export default function FormsAccordion({ forms }: { forms: ExForm[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mt-8 space-y-4">
      {/* 卡片网格：固定高度，展开不影响同行 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {forms.map((form, i) => {
          const isOpen = openId === form.id;
          return (
            <button
              key={form.id}
              type="button"
              onClick={() => setOpenId(isOpen ? null : form.id)}
              className={`flex h-44 cursor-pointer flex-col rounded-lg border p-4 text-left transition-colors ${
                isOpen
                  ? 'border-wj-cinnabar/45 bg-wj-raised'
                  : 'border-wj-border bg-wj-surface hover:border-wj-cinnabar/30'
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs tabular-nums text-wj-cinnabar">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-serif text-base font-semibold text-wj-ink">{form.name}</h3>
              </div>
              <p className="mt-2 font-mono text-[11px] tabular-nums text-wj-water">
                {form.spec.join(' ｜ ')}
              </p>
              <p className="mt-2 flex-1 text-xs leading-6 text-wj-muted">{form.tagline}</p>
              <span className={`inline-flex items-center gap-1 text-[11px] ${isOpen ? 'text-wj-cinnabar' : 'text-wj-cinnabar/70'}`}>
                展读
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* 展开内容：独立通栏，不撑高网格 */}
      {openId && (
        <div className="rounded-lg border border-wj-cinnabar/30 bg-wj-surface p-5">
          {forms.filter((f) => f.id === openId).map((form) => (
            <div key={form.id} className="space-y-3">
              <h4 className="font-serif text-base font-semibold text-wj-ink">{form.name}</h4>
              <div className="space-y-3">
                {form.detail.map((para, pi) => (
                  <p key={pi} className="text-sm leading-7 text-wj-ink/85">
                    {para}
                  </p>
                ))}
              </div>
              {form.quote && <SlipText slip={form.quote} />}
              {form.figures && form.figures.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {form.figures.map((fig) => (
                    <FigureCard key={fig.src} figure={fig} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
