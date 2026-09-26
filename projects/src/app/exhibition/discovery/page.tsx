import type { Metadata } from 'next';
import { DISCOVERY, EXH_NAV } from '@/lib/workshop/exhibition';
import { BoardHeader, ExhibitionShell, FigureCard } from '@/components/workshop/ExhibitionParts';
import { ExhibitVisit } from '@/components/workshop/ExhibitVisit';

export const metadata: Metadata = { title: '发现与归属 · 简牍鉴赏' };

export default function DiscoveryPage() {
  const board = EXH_NAV[0];

  return (
    <ExhibitionShell crumb={board.label}>
      <ExhibitVisit id="discovery" />
      <BoardHeader order={board.order} title="发现概况与档案性质" desc={board.desc} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {DISCOVERY.facts.map((fact) => (
            <p key={fact.label} className="text-sm leading-8 text-wj-ink/85">
              <span className="font-medium text-wj-ink">{fact.label}：</span>
              {fact.text}
            </p>
          ))}
        </div>
        <FigureCard figure={DISCOVERY.figure} />
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-base font-semibold text-wj-ink">
          这批档案属于谁？——基本性质四说
        </h2>
        <p className="mt-1.5 text-xs leading-6 text-wj-muted">{DISCOVERY.theoriesNote}</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {DISCOVERY.theories.map((theory, i) => (
            <li key={theory.name} className="rounded-md border border-wj-border bg-wj-surface p-4">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs tabular-nums text-wj-cinnabar">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-serif text-sm font-semibold text-wj-ink">{theory.name}</h3>
              </div>
              <p className="mt-1 text-[11px] text-wj-muted">{theory.holders}</p>
              <p className="mt-2 text-xs leading-6 text-wj-ink/85">{theory.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </ExhibitionShell>
  );
}
