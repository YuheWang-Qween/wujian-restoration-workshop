'use client';

import { Fragment } from 'react';
import { useWorkshopStore, isQuestionAnswered } from '@/store/useWorkshopStore';
import type { WjQuestion } from '@/lib/workshop/content';

/**
 * 「编绳串简」竖向节进度轨道（右缘常驻）：竖排简片更贴近吴简编联原貌。
 * 已读节墨色可回跳，当前节朱砂呼吸、节名常显，未到节虚线；
 * 细问节到达后带题目子进度，全部读完末节盖朱印「阅」。窄屏隐藏。
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
    <nav className="wj-rail" aria-label="环节进度">
      {actTitles.map((t, i) => {
        const act = i + 1;
        const isPast = act < revealed;
        const isCurrent = act === revealed;
        const done = isPast || allDone;
        const reached = isPast || isCurrent;
        const label =
          t === '细问' && reached && questions.length > 0 ? `细问 ${answered}/${questions.length}` : t;
        return (
          <Fragment key={t}>
            {i > 0 && (
              <span
                aria-hidden
                className={`wj-rail-cord${i < revealed || allDone ? ' is-ink' : ''}`}
              />
            )}
            <button
              type="button"
              className={`wj-rail-step${isCurrent ? ' is-current' : ''}${done ? ' is-done' : ''}`}
              disabled={!isPast}
              onClick={() => isPast && onGo(act)}
              title={isPast ? `回到「${label}」` : label}
            >
              <span className="wj-rail-slip" aria-hidden>
                {done && act === lastAct && <span className="wj-rail-seal">阅</span>}
              </span>
              <span className="wj-rail-label">{label}</span>
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
