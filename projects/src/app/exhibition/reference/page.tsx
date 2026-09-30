import type { Metadata } from 'next';
import { EXH_NAV, TERMS } from '@/lib/workshop/exhibition';
import { RECORD_PHOTO_GROUPS } from '@/lib/workshop/exhibition-photo-archive';
import { BoardHeader, ExhibitionShell, SectionHeading } from '@/components/workshop/ExhibitionParts';
import { ExhibitionPhotoCollection } from '@/components/workshop/ExhibitionPhotoCollection';
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
        <ExhibitionPhotoCollection
          groups={RECORD_PHOTO_GROUPS}
          title="图面与编号记录"
          description="对照剖面、揭剥图与编号照片，观察不同记录方式。点击可查看完整图面。"
        />
      </div>
    </ExhibitionShell>
  );
}
