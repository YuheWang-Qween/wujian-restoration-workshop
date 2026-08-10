'use client';

import { useState } from 'react';
import { Scale, ChevronDown } from 'lucide-react';
import type { ExTerm } from '@/lib/workshop/exhibition';

export function TermsAccordion({ terms }: { terms: ExTerm[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {terms.map((t, i) => {
          const active = open === i;
          return (
            <button
              key={t.term}
              onClick={() => setOpen(active ? null : i)}
              className={`flex h-28 flex-col justify-between rounded-md border p-3 text-left transition-colors ${
                active
                  ? 'border-wj-cinnabar bg-wj-cinnabar/5'
                  : 'border-wj-border bg-wj-surface hover:border-wj-ochre/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-sm font-semibold text-wj-ink">{t.term}</span>
                {t.debated && (
                  <span className="inline-flex items-center gap-0.5 rounded-sm border border-wj-cinnabar/40 px-1 py-px text-[10px] text-wj-cinnabar">
                    <Scale className="h-2.5 w-2.5" />
                    争论
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="line-clamp-2 text-[11px] leading-5 text-wj-muted">
                  {t.text.slice(0, 40)}…
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-wj-muted transition-transform ${
                    active ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {open !== null && terms[open] && (
        <div className="mt-3 rounded-md border border-wj-cinnabar/30 bg-wj-surface p-5">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-semibold text-wj-ink">{terms[open].term}</h3>
            {terms[open].debated && (
              <span className="inline-flex items-center gap-0.5 rounded-sm border border-wj-cinnabar/40 px-1.5 py-px text-[10px] text-wj-cinnabar">
                <Scale className="h-2.5 w-2.5" />
                争论
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-8 text-wj-ink/85">{terms[open].text}</p>
        </div>
      )}
    </div>
  );
}
