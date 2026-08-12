'use client';

import { ReactNode } from 'react';
import { useProgressSync } from '@/hooks/useProgressSync';

export function ProgressSyncProvider({ children }: { children: ReactNode }) {
  useProgressSync();
  return <>{children}</>;
}
