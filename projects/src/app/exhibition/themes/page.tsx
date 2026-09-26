import type { Metadata } from 'next';
import { ADMIN_NOTE, EXH_NAV, THEMES } from '@/lib/workshop/exhibition';
import { BoardHeader, ExhibitionShell } from '@/components/workshop/ExhibitionParts';
import { ExhibitVisit } from '@/components/workshop/ExhibitVisit';
import { ThemesAccordion } from './ThemesAccordion';

export const metadata: Metadata = { title: '主题八类 · 简牍鉴赏' };

export default function ThemesPage() {
  const board = EXH_NAV[2];

  return (
    <ExhibitionShell crumb={board.label}>
      <ExhibitVisit id="themes" />
      <BoardHeader order={board.order} title="按主题分：八类内容" desc={board.desc} />

      <div className="mt-8">
        <ThemesAccordion themes={THEMES} />
      </div>

      <aside className="mt-8 rounded-md border border-wj-border bg-wj-sunk/50 p-4">
        <h2 className="font-serif text-sm font-semibold text-wj-ink">{ADMIN_NOTE.title}</h2>
        <p className="mt-2 text-xs leading-7 text-wj-ink/85">{ADMIN_NOTE.text}</p>
      </aside>
    </ExhibitionShell>
  );
}
