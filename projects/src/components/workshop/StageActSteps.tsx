'use client';

import { Check } from 'lucide-react';

import { actSubProgress } from '@/lib/workshop/act-progress';
import type { WjQuestion } from '@/lib/workshop/content';
import { isQuestionAnswered, useWorkshopStore } from '@/store/useWorkshopStore';

/**
 * 环节页顶部的横向分节进度条：四节的名字全部写出来，当前停在哪一节、
 * 节内走到第几步，不用猜也不用悬停。
 *
 * 与右缘竖向轨道（StageProgressStrip）显示同一件事，但职责不同：
 * 这条是**读得到字的**，窄屏照常显示；那条是常驻余光里的位置感，窄屏隐藏。
 * 两边的子进度都走 lib/workshop/act-progress 的同一份口径。
 */
export function StageActSteps({
  stageId,
  actTitles,
  revealed,
  onGo,
  questions,
}: {
  stageId: number;
  actTitles: string[];
  revealed: number;
  onGo: (act: number) => void;
  questions: WjQuestion[];
}) {
  const answers = useWorkshopStore((s) => s.answers);
  const images = useWorkshopStore((s) => s.images);
  const completed = useWorkshopStore((s) => s.completed);
  const hydrated = useWorkshopStore((s) => s.hydrated);
  const simCursor = useWorkshopStore((s) => s.simCursor[stageId]);
  const simSettled = useWorkshopStore((s) => !!s.simRuns[stageId]?.settled);

  const answered = questions.filter((q) => isQuestionAnswered(answers, images, stageId, q)).length;
  const allDone = hydrated && completed.includes(stageId);

  return (
    <nav className="wj-steps" aria-label="环节分节进度">
      <ol className="wj-steps-list">
        {actTitles.map((title, i) => {
          const act = i + 1;
          const isPast = act < revealed;
          const isCurrent = act === revealed;
          const done = isPast || allDone;
          const sub = actSubProgress(title, {
            reached: isPast || isCurrent,
            isCurrent,
            stageId,
            questions,
            answered,
            simCursor,
            simSettled,
          });

          return (
            <li
              key={title}
              className={`wj-step${isCurrent ? ' is-current' : ''}${done ? ' is-done' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <button
                type="button"
                className="wj-step-btn"
                disabled={!isPast}
                onClick={() => isPast && onGo(act)}
                title={isPast ? `回到「${title}」` : title}
              >
                <span className="wj-step-no" aria-hidden>
                  {done && !isCurrent ? <Check className="h-3.5 w-3.5" /> : act}
                </span>
                <span className="wj-step-text">
                  <span className="wj-step-name">{title}</span>
                  {sub && (
                    <span className="wj-step-sub">
                      {sub.done}/{sub.total}
                      {isCurrent && sub.current ? ` · ${sub.current}` : ''}
                    </span>
                  )}
                </span>
              </button>
              {/* 节内步骤的细分格：走过的落墨，与右缘轨道同一套语汇 */}
              {sub && sub.total > 1 && sub.total <= 12 && (
                <span className="wj-step-ticks" aria-hidden>
                  {Array.from({ length: sub.total }).map((_, k) => (
                    <span key={k} className={`wj-step-tick${k < sub.done ? ' is-ink' : ''}`} />
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
