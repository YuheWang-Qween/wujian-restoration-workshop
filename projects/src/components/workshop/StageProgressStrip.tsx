'use client';

import type { CSSProperties } from 'react';
import { useWorkshopStore, isQuestionAnswered } from '@/store/useWorkshopStore';
import type { WjQuestion } from '@/lib/workshop/content';

/**
 * 「编绳串简」四节进度条：已读节墨色简片可回跳，当前节朱砂，未到节虚线；
 * 细问节带题目子进度，全部读完盖朱印「阅」。
 */
export function StageProgressStrip({
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

  const answered = questions.filter((q) => isQuestionAnswered(answers, images, stageId, q)).length;
  const allDone = hydrated && completed.includes(stageId);
  const cordDone = `${((revealed - 1) / Math.max(actTitles.length - 1, 1)) * 100}%`;

  return (
    <nav
      className="wj-strip"
      aria-label="环节进度"
      style={{ '--wj-cord-done': cordDone } as CSSProperties}
    >
      {actTitles.map((t, i) => {
        const act = i + 1;
        const isPast = act < revealed;
        const isCurrent = act === revealed;
        const done = isPast || allDone || (act === actTitles.length && answered === questions.length);
        return (
          <button
            key={t}
            type="button"
            className={`wj-strip-step${isCurrent ? ' is-current' : ''}${done ? ' is-done' : ''}`}
            disabled={!isPast}
            onClick={() => isPast && onGo(act)}
            title={isPast ? '回到这一节' : undefined}
          >
            <span className="wj-strip-slip" aria-hidden>
              {done && act === actTitles.length && <span className="wj-strip-seal">阅</span>}
            </span>
            <span className="wj-strip-label">
              {t}
              {t === '细问' && questions.length > 0 && (
                <span className="wj-strip-sub">
                  {answered}/{questions.length}
                </span>
              )}
            </span>
          </button>
        );
      })}
      <span className="wj-strip-cord" aria-hidden />
    </nav>
  );
}
