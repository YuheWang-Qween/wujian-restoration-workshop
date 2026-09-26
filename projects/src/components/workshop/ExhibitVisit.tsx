'use client';

import { useEffect } from 'react';
import { useWorkshopStore } from '@/store/useWorkshopStore';

/**
 * 鉴赏篇浏览足迹上报：无 UI，页面挂载即记录一次。
 * 板块页传板块 id（discovery/forms/…），案例页传 `case-N`。
 */
export function ExhibitVisit({ id }: { id: string }) {
  const visitExhibit = useWorkshopStore((s) => s.visitExhibit);
  useEffect(() => {
    visitExhibit(id);
  }, [id, visitExhibit]);
  return null;
}
