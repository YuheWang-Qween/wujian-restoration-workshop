import type { Metadata } from 'next';
import { EXH_NAV, TERMS } from '@/lib/workshop/exhibition';
import { RECORD_FIGURES } from '@/lib/workshop/exhibition-images';
import { BoardHeader, ExhibitionShell, SectionHeading, FigureCard } from '@/components/workshop/ExhibitionParts';
import { ExhibitVisit } from '@/components/workshop/ExhibitVisit';
import { TermsAccordion } from './TermsAccordion';

export const metadata: Metadata = { title: '术语·出版·来源 · 简牍鉴赏' };

export default function ReferencePage() {
  const board = EXH_NAV[4];

  return (
    <ExhibitionShell crumb={board.label}>
      <ExhibitVisit id="reference" />
      <BoardHeader order={board.order} title="术语 · 出版 · 来源" desc={board.desc} />

      <div className="mt-8">
        {/* 〔伍〕关键术语与学术争论 */}
        <section className="space-y-5">
          <SectionHeading order="伍" title="关键术语与学术争论" note="标「争论」者，学界尚无定论" />
          <TermsAccordion terms={TERMS} />
        </section>
        <section className="mt-10 space-y-4" aria-labelledby="record-photos">
          <h2 id="record-photos" className="font-serif text-lg font-semibold text-wj-ink">整理与记录</h2>
          <div className="grid items-start gap-5 sm:grid-cols-2">
            {RECORD_FIGURES.map((figure) => <FigureCard key={figure.src} figure={figure} tall />)}
          </div>
        </section>
      </div>
    </ExhibitionShell>
  );
}
