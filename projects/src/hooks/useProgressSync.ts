'use client';

import { useEffect, useRef } from 'react';
import { getReachedAct, mergeReachedActs, useWorkshopStore } from '@/store/useWorkshopStore';
import { useAuth } from '@/components/workshop/AuthProvider';
import { STAGES } from '@/lib/workshop/content';

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

function buildPayload(s: Partial<ProgressPayload>): ProgressPayload {
  return {
    completed: s.completed ?? [],
    answers: s.answers ?? {},
    submitted: s.submitted ?? {},
    referenceAnswers: s.referenceAnswers ?? {},
    verdicts: s.verdicts ?? {},
    analyses: s.analyses ?? {},
    images: s.images ?? {},
    studentInfo: s.studentInfo ?? null,
    achievementUnlocked: s.achievementUnlocked ?? false,
    actsRevealed: s.actsRevealed ?? {},
    exhibitsViewed: s.exhibitsViewed ?? {},
    sessionId: s.sessionId ?? '',
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
        const actsRevealed = mergeReachedActs(s.actsRevealed, data.actsRevealed ?? {});
        const completed = [...new Set<number>([...s.completed, ...(data.completed ?? [])])].sort((a, b) => a - b);
        const readingState = {
          ...s,
          completed,
          actsRevealed,
          answers: { ...data.answers, ...s.answers },
          submitted: { ...data.submitted, ...s.submitted },
          images: { ...data.images, ...s.images },
        };
        for (const { id: stageId } of STAGES) {
          const reached = getReachedAct(readingState, stageId);
          if (reached > (actsRevealed[stageId] ?? 1)) actsRevealed[stageId] = reached;
        }

        // 数据库有记录就合并到本地（数据库优先，但保留本地已有的）
        if (dbAnswerCount > 0) {
          useWorkshopStore.setState({
            completed,
            answers: { ...data.answers, ...s.answers },
            submitted: { ...data.submitted, ...s.submitted },
            referenceAnswers: { ...data.referenceAnswers, ...s.referenceAnswers },
            verdicts: { ...data.verdicts, ...s.verdicts },
            analyses: { ...data.analyses, ...s.analyses },
            images: { ...data.images, ...s.images },
            studentInfo: data.studentInfo ?? s.studentInfo,
            achievementUnlocked: data.achievementUnlocked ?? s.achievementUnlocked,
            actsRevealed,
            exhibitsViewed: { ...data.exhibitsViewed, ...s.exhibitsViewed },
          });
        } else {
          // 只阅读、尚未作答的记录也有进度；回看位置 activeActs 始终留在本机。
          useWorkshopStore.setState({ completed, actsRevealed });
        }

        // 这里只确认服务端已有的记录。合并后本地若更靠前，让订阅的定时推送补齐云端，
        // 不能把尚未上传的合并结果当作已同步，否则只回看时学情会一直停留在旧进度。
        lastSync.current = JSON.stringify(buildPayload(data));
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
