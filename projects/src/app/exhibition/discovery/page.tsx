import type { Metadata } from 'next';
import { DISCOVERY, EXH_NAV } from '@/lib/workshop/exhibition';
import { DISCOVERY_SCENES, DISCOVERY_ARCHIVE } from '@/lib/workshop/exhibition-images';
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
        <div><FigureCard figure={DISCOVERY.figure} /></div>
      </div>

      <section className="mt-10 space-y-4" aria-labelledby="field-photos">
        <h2 id="field-photos" className="font-serif text-lg font-semibold text-wj-ink">出土现场</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {DISCOVERY_SCENES.filter((figure) => figure.src !== DISCOVERY.figure.src).map((figure) => (
            <FigureCard key={figure.src} figure={figure} />
          ))}
        </div>
        <details className="group rounded-md border border-wj-border bg-wj-surface p-4 sm:p-5">
          <summary className="cursor-pointer font-serif text-base text-wj-ink marker:text-wj-cinnabar">
            整理与收藏影像
          </summary>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {DISCOVERY_ARCHIVE.map((figure) => <FigureCard key={figure.src} figure={figure} />)}
          </div>
        </details>
      </section>

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
