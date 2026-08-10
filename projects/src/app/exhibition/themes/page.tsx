import type { Metadata } from 'next';
import { ADMIN_NOTE, EXH_NAV, THEMES } from '@/lib/workshop/exhibition';
import { BoardHeader, ExhibitionShell, FigureCard, SlipText } from '@/components/workshop/ExhibitionParts';

export const metadata: Metadata = { title: '主题八类 · 简牍展示' };

export default function ThemesPage() {
  const board = EXH_NAV[2];

  return (
    <ExhibitionShell crumb={board.label}>
      <BoardHeader order={board.order} title="按主题分：八类内容" desc={board.desc} />

      <div className="mt-8 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((theme, i) => (
          <article key={theme.id} className="rounded-lg border border-wj-border bg-wj-surface p-4">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs tabular-nums text-wj-cinnabar">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="font-serif text-base font-semibold text-wj-ink">{theme.name}</h2>
            </div>
            <p className="mt-2.5 text-xs leading-7 text-wj-ink/85">{theme.text}</p>
            {theme.quote && (
              <div className="mt-3">
                <SlipText slip={theme.quote} />
              </div>
            )}
            {theme.figure && (
              <div className="mt-3">
                <FigureCard figure={theme.figure} />
              </div>
            )}
          </article>
        ))}
      </div>

      <aside className="mt-8 rounded-md border border-wj-border bg-wj-sunk/50 p-4">
        <h2 className="font-serif text-sm font-semibold text-wj-ink">{ADMIN_NOTE.title}</h2>
        <p className="mt-2 text-xs leading-7 text-wj-ink/85">{ADMIN_NOTE.text}</p>
      </aside>
    </ExhibitionShell>
  );
}
