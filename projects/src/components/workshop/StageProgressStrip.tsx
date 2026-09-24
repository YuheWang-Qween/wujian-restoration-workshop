'use client';

import { Fragment } from 'react';
import { useWorkshopStore, isQuestionAnswered } from '@/store/useWorkshopStore';
import type { WjQuestion } from '@/lib/workshop/content';

/**
 * 「编绳串简」四节进度条：已读节墨色简片可回跳，当前节朱砂，未到节虚线；
 * 细问节带题目子进度（到达后显示），全部读完盖朱印「阅」。
 * 编绳是相邻简片之间的伸缩绳段，天然对齐简片中心，不随间距变化断裂。
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

  const lastAct = actTitles.length;
  const answered = questions.filter((q) => isQuestionAnswered(answers, images, stageId, q)).length;
  const allDone = hydrated && completed.includes(stageId);

  return (
    <nav className="wj-strip" aria-label="环节进度">
      {actTitles.map((t, i) => {
        const act = i + 1;
        const isPast = act < revealed;
        const isCurrent = act === revealed;
        const done = isPast || allDone;
        const reached = isPast || isCurrent;
        return (
          <Fragment key={t}>
            {i > 0 && (
              <span
                aria-hidden
                className={`wj-strip-cord${i < revealed || allDone ? ' is-ink' : ''}`}
              />
            )}
            <button
              type="button"
              className={`wj-strip-step${isCurrent ? ' is-current' : ''}${done ? ' is-done' : ''}`}
              disabled={!isPast}
              onClick={() => isPast && onGo(act)}
              title={isPast ? '回到这一节' : undefined}
            >
              <span className="wj-strip-slip" aria-hidden>
                {done && act === lastAct && <span className="wj-strip-seal">阅</span>}
              </span>
              <span className="wj-strip-label">
                {t}
                {t === '细问' && reached && questions.length > 0 && (
                  <span className="wj-strip-sub">
                    {' '}
                    {answered}/{questions.length}
                  </span>
                )}
              </span>
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
