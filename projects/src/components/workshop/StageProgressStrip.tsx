'use client';

import { Fragment } from 'react';
import { useWorkshopStore, isQuestionAnswered } from '@/store/useWorkshopStore';
import type { WjQuestion } from '@/lib/workshop/content';
import { actSubProgress } from '@/lib/workshop/act-progress';

/**
 * 「编绳串简」竖向节进度轨道（右缘常驻）：竖排简片更贴近吴简编联原貌。
 * 已读节墨色可回跳，当前节朱砂呼吸、节名常显，未到节虚线；
 * 全部读完末节盖朱印「阅」。窄屏隐藏。
 *
 * 节内还有**具体步骤**的，简片上再显子进度：
 *   - 上机操作 → 仿真工作台的工步（store.simCursor 镜像 StageSim 的游标）；
 *   - 细问 → 题目（已答完的题数）。
 * 子进度用两样东西表达，都落在同一片简上：编绳刻度（每步一道横线）+ 自上而下的落墨。
 * 签上同步写「上机操作 3/8 · 定推进步距」，当前在哪一步一眼可见。
 * 子进度的口径走 lib/workshop/act-progress，与顶部横向分节条共用一份，不各算各的。
 */

export function StageProgressStrip({
  stageId,
  actTitles,
  revealed,
  current,
  onGo,
  questions,
}: {
  stageId: number;
  actTitles: string[];
  revealed: number;
  current: number;
  onGo: (act: number) => void;
  questions: WjQuestion[];
}) {
  const answers = useWorkshopStore((s) => s.answers);
  const images = useWorkshopStore((s) => s.images);
  const completed = useWorkshopStore((s) => s.completed);
  const hydrated = useWorkshopStore((s) => s.hydrated);
  const simCursor = useWorkshopStore((s) => s.simCursor[stageId]);
  const simSettled = useWorkshopStore((s) => !!s.simRuns[stageId]?.settled);

  const lastAct = actTitles.length;
  const answered = questions.filter((q) => isQuestionAnswered(answers, images, stageId, q)).length;
  const allDone = hydrated && completed.includes(stageId);

  return (
    <nav className="wj-rail" aria-label="环节进度">
      {actTitles.map((t, i) => {
        const act = i + 1;
        const isPast = act < revealed;
        const isCurrent = act === current;
        const done = isPast || allDone;
        const reached = act <= revealed;
        const canGo = reached && !isCurrent;
        const sub = actSubProgress(t, {
          reached,
          isCurrent,
          stageId,
          questions,
          answered,
          simCursor,
          simSettled,
        });
        // 签上的字：有子进度就带上步数，当前节再缀一句步骤名
        const label = sub ? `${t} ${sub.done}/${sub.total}` : t;
        const detail = isCurrent && sub?.current ? ` · ${sub.current}` : '';
        const frac = sub && sub.total > 0 ? sub.done / sub.total : 0;

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
              disabled={!canGo}
              onClick={() => canGo && onGo(act)}
              title={canGo ? `回到「${label}${detail}」` : label + detail}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={sub ? `${label}${detail}` : label}
            >
              <span className="wj-rail-slip" aria-hidden>
                {/* 子进度：由下而上的落墨。只画当前这一节——
                    已走过的节整片落墨，子进度已并入其中，再叠一层反而看不清 */}
                {sub && isCurrent && frac > 0 && (
                  <span className="wj-rail-fill" style={{ transform: `scaleY(${frac})` }} />
                )}
                {/* 编绳刻度：每一步一道横线，步数一眼可数（超过 12 步不画，免得糊成一片） */}
                {sub && sub.total > 1 && sub.total <= 12 && (
                  <span className="wj-rail-ticks">
                    {Array.from({ length: sub.total - 1 }).map((_, k) => (
                      <span
                        key={k}
                        className="wj-rail-tick"
                        style={{ top: `${((k + 1) / sub.total) * 100}%` }}
                      />
                    ))}
                  </span>
                )}
                {done && act === lastAct && <span className="wj-rail-seal">阅</span>}
              </span>
              <span className="wj-rail-label">
                {label}
                {detail}
              </span>
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
