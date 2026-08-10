import type { Metadata } from 'next';
import { getStage } from '@/lib/workshop/content';
import { StageContent } from './StageContent';

/**
 * 服务端外壳：只负责 per-page metadata（六个环节页各自的标签页标题），
 * 交互与守卫全部在客户端组件 StageContent 里（进度存 localStorage，服务端不可知）。
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stage = getStage(Number(id));
  if (!stage) return { title: '没有这道工序' };
  return {
    title: `环节${stage.ordinal} · ${stage.name}`,
    description: stage.tagline,
  };
}

export default function StagePage() {
  return <StageContent />;
}
