'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ExForm } from '@/lib/workshop/exhibition';
import { FigureCard, SlipText } from '@/components/workshop/ExhibitionParts';

export default function FormsAccordion({ forms }: { forms: ExForm[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {forms.map((form, i) => {
        const isOpen = openId === form.id;
        return (
          <div
            key={form.id}
            className="flex flex-col rounded-lg border border-wj-border bg-wj-surface"
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : form.id)}
              className="flex flex-1 cursor-pointer flex-col p-4 text-left"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs tabular-nums text-wj-cinnabar">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-serif text-base font-semibold text-wj-ink">{form.name}</h2>
              </div>
              <p className="mt-2 font-mono text-[11px] tabular-nums text-wj-water">
                {form.spec.join(' ｜ ')}
              </p>
              <p className="mt-2 flex-1 text-xs leading-6 text-wj-muted">{form.tagline}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-wj-cinnabar/80">
                展读
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-wj-line p-4">
                {form.detail.map((para, pi) => (
                  <p key={pi} className="text-xs leading-7 text-wj-ink/85">
                    {para}
                  </p>
                ))}
                {form.quote && <SlipText slip={form.quote} />}
                {form.figures?.map((fig) => (
                  <FigureCard key={fig.src} figure={fig} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
