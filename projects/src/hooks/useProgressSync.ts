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
  exhibitsViewed: Record<string, string>;
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
    exhibitsViewed: s.exhibitsViewed,
    sessionId: s.sessionId,
  };
}

export function useProgressSync() {
  const { user } = useAuth();
  const hydrated = useWorkshopStore((s) => s.hydrated);
  const userId = user?.id ?? null;
  const loadedForUser = useRef<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSync = useRef<string>('');

  // 登录后从数据库拉取进度（user 变化时重新拉取）
  useEffect(() => {
    if (!userId || !hydrated) return;
    if (loadedForUser.current === userId) return;
    loadedForUser.current = userId;

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
        const dbAnswerCount = Object.keys(data.answers ?? {}).length;
        const localAnswerCount = Object.keys(s.answers).length;

        // 数据库有记录就合并到本地（数据库优先，但保留本地已有的）
        if (dbAnswerCount > 0) {
          useWorkshopStore.setState({
            completed: data.completed ?? s.completed,
            answers: { ...data.answers, ...s.answers },
            submitted: { ...data.submitted, ...s.submitted },
            referenceAnswers: { ...data.referenceAnswers, ...s.referenceAnswers },
            verdicts: { ...data.verdicts, ...s.verdicts },
            analyses: { ...data.analyses, ...s.analyses },
            images: { ...data.images, ...s.images },
            studentInfo: data.studentInfo ?? s.studentInfo,
            achievementUnlocked: data.achievementUnlocked ?? s.achievementUnlocked,
            actsRevealed: { ...data.actsRevealed, ...s.actsRevealed },
            exhibitsViewed: { ...data.exhibitsViewed, ...s.exhibitsViewed },
          });
        }

        lastSync.current = JSON.stringify(buildPayload(useWorkshopStore.getState()));
      } catch {
        // 拉取失败不影响本地使用
      }
    })();
  }, [userId, hydrated]);

  // 本地变化时 debounce 推送到数据库
  useEffect(() => {
    if (!userId || !hydrated) return;

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
  }, [userId, hydrated]);

  // 退出登录时立即推送一次当前状态（在 token 失效前）
  useEffect(() => {
    if (userId) return;
    // user 变为 null（退出登录），尝试最后一次推送
    const pushOnce = async () => {
      try {
        const payload = buildPayload(useWorkshopStore.getState());
        const payloadStr = JSON.stringify(payload);
        if (payloadStr === lastSync.current) return;

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
        lastSync.current = payloadStr;
      } catch {
        // 退出时推送失败可忽略，数据已在 localStorage
      }
    };
    pushOnce();
    loadedForUser.current = null;
  }, [userId]);
}
