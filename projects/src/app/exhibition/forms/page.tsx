import type { Metadata } from 'next';
import { EXH_NAV, FORMS } from '@/lib/workshop/exhibition';
import { BoardHeader, ExhibitionShell } from '@/components/workshop/ExhibitionParts';
import { ExhibitVisit } from '@/components/workshop/ExhibitVisit';
import FormsAccordion from './FormsAccordion';

export const metadata: Metadata = { title: '形制六类 · 简牍鉴赏' };

export default function FormsPage() {
  const board = EXH_NAV[1];

  return (
    <ExhibitionShell crumb={board.label}>
      <ExhibitVisit id="forms" />
      <BoardHeader order={board.order} title="按形制分：六类简牍" desc={board.desc} />
      <FormsAccordion forms={FORMS} />
    </ExhibitionShell>
  );
}
