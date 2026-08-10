import type { Metadata } from 'next';
import { COLOPHON, EXH_NAV, PUBLICATIONS, SIGNIFICANCE, SOURCES, TERMS } from '@/lib/workshop/exhibition';
import { BoardHeader, ExhibitionShell, SectionHeading } from '@/components/workshop/ExhibitionParts';
import { DataTable } from '@/components/workshop/DataTable';
import { TermsAccordion } from './TermsAccordion';

export const metadata: Metadata = { title: '术语·出版·来源 · 简牍展示' };

export default function ReferencePage() {
  const board = EXH_NAV[4];

  return (
    <ExhibitionShell crumb={board.label}>
      <BoardHeader order={board.order} title="术语 · 出版 · 来源" desc={board.desc} />

      <div className="mt-8 space-y-12">
        {/* 〔伍〕关键术语与学术争论 */}
        <section className="space-y-5">
          <SectionHeading order="伍" title="关键术语与学术争论" note="标「争论」者，学界尚无定论" />
          <TermsAccordion terms={TERMS} />
        </section>

        {/* 〔陆〕整理出版一览 */}
        <section className="space-y-5">
          <SectionHeading order="陆" title="整理出版一览" note="文物出版社" />
          <DataTable table={{ head: PUBLICATIONS.head, rows: PUBLICATIONS.rows }} />
        </section>

        {/* 〔柒〕学术意义与「吴简学」 */}
        <section className="space-y-5">
          <SectionHeading order="柒" title="学术意义与「吴简学」" />
          <div className="max-w-3xl space-y-4">
            {SIGNIFICANCE.map((s) => (
              <p key={s.label} className="text-sm leading-8 text-wj-ink/85">
                <span className="font-medium text-wj-ink">{s.label}：</span>
                {s.text}
              </p>
            ))}
          </div>
        </section>

        {/* 〔捌〕主要资料来源 */}
        <section className="space-y-5">
          <SectionHeading order="捌" title="主要资料来源" />
          <div className="grid items-start gap-4 md:grid-cols-2">
            {SOURCES.map((group) => (
              <div key={group.group} className="rounded-md border border-wj-border bg-wj-surface p-4">
                <h2 className="font-serif text-sm font-semibold text-wj-ink">{group.group}</h2>
                <ul className="mt-2 space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-xs leading-6 text-wj-muted">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="max-w-3xl border-t border-wj-line pt-4 text-[11px] leading-6 text-wj-muted">
            {COLOPHON}
          </p>
        </section>
      </div>
    </ExhibitionShell>
  );
}
