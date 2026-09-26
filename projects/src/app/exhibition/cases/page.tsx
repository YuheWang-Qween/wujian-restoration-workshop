import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CASES, EXH_NAV } from '@/lib/workshop/exhibition';
import { BoardHeader, ExhibitionShell } from '@/components/workshop/ExhibitionParts';
import { ExhibitVisit } from '@/components/workshop/ExhibitVisit';

export const metadata: Metadata = { title: '案例精读 · 简牍鉴赏' };

export default function CasesPage() {
  const board = EXH_NAV[3];

  return (
    <ExhibitionShell crumb={board.label}>
      <ExhibitVisit id="cases" />
      <BoardHeader order={board.order} title="代表性简牍精读" desc={board.desc} />

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {CASES.map((c) => (
          <Link
            key={c.id}
            href={`/exhibition/case/${c.id}`}
            className="group flex items-start gap-3 rounded-lg border border-wj-border bg-wj-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-wj-cinnabar/45 hover:shadow-[0_4px_8px_-2px_rgba(30,27,22,0.08),0_16px_40px_-16px_rgba(30,27,22,0.22)]"
          >
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm border border-wj-cinnabar/45 font-serif text-[13px] leading-none font-semibold text-wj-cinnabar">
              {['一', '二', '三', '四', '五'][c.id - 1]}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-base font-semibold text-wj-ink">{c.title}</h2>
              <p className="mt-1.5 text-xs leading-6 text-wj-muted">{c.summary}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs text-wj-cinnabar/80 transition-all duration-200 group-hover:gap-2 group-hover:text-wj-cinnabar">
                精读
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </ExhibitionShell>
  );
}
