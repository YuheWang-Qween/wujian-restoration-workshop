import type { Metadata } from 'next';
import { EXH_NAV, FORMS } from '@/lib/workshop/exhibition';
import { FORM_PHOTO_GROUPS } from '@/lib/workshop/exhibition-photo-archive';
import { BoardHeader, ExhibitionShell } from '@/components/workshop/ExhibitionParts';
import { ExhibitionPhotoCollection } from '@/components/workshop/ExhibitionPhotoCollection';
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
      <ExhibitionPhotoCollection
        groups={FORM_PHOTO_GROUPS}
        title="形态与书写观察"
        description="继续比较简面宽窄、顶部轮廓、文字分栏与留白。点击图片查看细节。"
      />
    </ExhibitionShell>
  );
}
