'use client';

import { useEffect, useRef } from 'react';
import { useWorkshopStore } from '@/store/useWorkshopStore';
import { useAuth } from '@/components/workshop/AuthProvider';

const SYNC_DEBOUNCE_MS = 2000;

interface ProgressPayload {
  completed: number[];
  answers: Record<string, string>;
  submitted: Record<string, true>;
  referenceAnswers: Record<string, string>;
  verdicts: Record<string, string>;
  analyses: Record<string, string>;
  images: Record<string, string>;
  studentInfo: { studentId: string; name: string } | null;
  achievementUnlocked: boolean;
  actsRevealed: Record<string, number>;
  sessionId: string;
}

function buildPayload(s: ReturnType<typeof useWorkshopStore.getState>): ProgressPayload {
  return {
    completed: s.completed,
    answers: s.answers,
    submitted: s.submitted,
    referenceAnswers: s.referenceAnswers,
    verdicts: s.verdicts,
    analyses: s.analyses,
    images: s.images,
    studentInfo: s.studentInfo,
    achievementUnlocked: s.achievementUnlocked,
    actsRevealed: s.actsRevealed,
    sessionId: s.sessionId,
  };
}

export function useProgressSync() {
  const { user } = useAuth();
  const hydrated = useWorkshopStore((s) => s.hydrated);
  const loadedFromDb = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSync = useRef<string>('');

  // 登录后从数据库拉取进度
  useEffect(() => {
    if (!user || !hydrated || loadedFromDb.current) return;
    loadedFromDb.current = true;

    (async () => {
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase-browser');
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;

        const res = await fetch('/api/progress', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const { data } = await res.json();
        if (!data) return;

        const s = useWorkshopStore.getState();
        const dbUpdated = Object.keys(data.answers ?? {}).length;

        // 数据库有记录且比本地新（按答题数判断），用数据库覆盖本地
        const localAnswered = Object.keys(s.answers).length;
        if (dbUpdated > 0 && dbUpdated > localAnswered) {
          useWorkshopStore.setState({
            completed: data.completed ?? s.completed,
            answers: { ...s.answers, ...data.answers },
            submitted: { ...s.submitted, ...data.submitted },
            referenceAnswers: { ...s.referenceAnswers, ...data.referenceAnswers },
            verdicts: { ...s.verdicts, ...data.verdicts },
            analyses: { ...s.analyses, ...data.analyses },
            images: { ...s.images, ...data.images },
            studentInfo: data.studentInfo ?? s.studentInfo,
            achievementUnlocked: data.achievementUnlocked ?? s.achievementUnlocked,
            actsRevealed: { ...s.actsRevealed, ...data.actsRevealed },
          });
        }

        lastSync.current = JSON.stringify(buildPayload(useWorkshopStore.getState()));
      } catch {
        // 拉取失败不影响本地使用
      }
    })();
  }, [user, hydrated]);

  // 本地变化时 debounce 推送到数据库
  useEffect(() => {
    if (!user || !hydrated) return;

    const unsub = useWorkshopStore.subscribe((s) => {
      if (syncTimer.current) clearTimeout(syncTimer.current);

      syncTimer.current = setTimeout(async () => {
        const payload = buildPayload(useWorkshopStore.getState());
        const payloadStr = JSON.stringify(payload);
        if (payloadStr === lastSync.current) return;
        lastSync.current = payloadStr;

        try {
          const { getSupabaseBrowserClient } = await import('@/lib/supabase-browser');
          const supabase = getSupabaseBrowserClient();
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (!token) return;

          await fetch('/api/progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
        } catch {
          // 推送失败不影响本地使用，下次变化会重试
        }
      }, SYNC_DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [user, hydrated]);
}
