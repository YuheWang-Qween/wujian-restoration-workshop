import type { Metadata } from 'next';
import { ChevronDown } from 'lucide-react';
import { EXH_NAV, FORMS } from '@/lib/workshop/exhibition';
import { BoardHeader, ExhibitionShell, FigureCard, SlipText } from '@/components/workshop/ExhibitionParts';

export const metadata: Metadata = { title: '形制六类 · 简牍展示' };

export default function FormsPage() {
  const board = EXH_NAV[1];

  return (
    <ExhibitionShell crumb={board.label}>
      <BoardHeader order={board.order} title="按形制分：六类简牍" desc={board.desc} />

      <div className="mt-8 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FORMS.map((form, i) => (
          <details key={form.id} className="group rounded-lg border border-wj-border bg-wj-surface">
            <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs tabular-nums text-wj-cinnabar">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-serif text-base font-semibold text-wj-ink">{form.name}</h2>
              </div>
              <p className="mt-2 font-mono text-[11px] tabular-nums text-wj-water">
                {form.spec.join(' ｜ ')}
              </p>
              <p className="mt-2 text-xs leading-6 text-wj-muted">{form.tagline}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-wj-cinnabar/80">
                展读
                <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="space-y-3 border-t border-wj-line p-4">
              {form.detail.map((para, pi) => (
                <p key={pi} className="text-xs leading-7 text-wj-ink/85">
                  {para}
                </p>
              ))}
              {form.quote && <SlipText slip={form.quote} />}
              {form.figures?.map((fig) => <FigureCard key={fig.src} figure={fig} />)}
            </div>
          </details>
        ))}
      </div>
    </ExhibitionShell>
  );
}
