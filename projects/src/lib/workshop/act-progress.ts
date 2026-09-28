/**
 * 「一节走到哪儿了」的唯一口径。
 *
 * 页面顶部的横向分节条（StageActSteps）与右缘的竖向轨道（StageProgressStrip）
 * 显示的是同一件事，口径必须一致——所以抽在这里，两边都调它，不各算各的。
 */

import { ACT_QUESTIONS, ACT_SIM, type WjQuestion } from './content';
import { getSim } from './sim';

export interface WjActSub {
  /** 已完成的步数 */
  done: number;
  /** 总步数 */
  total: number;
  /** 当前停在哪一步，走完或未在本节时为空 */
  current?: string;
}

export interface WjActProgressInput {
  stageId: number;
  questions: WjQuestion[];
  /** 已答完的题数 */
  answered: number;
  /** 仿真工作台的当前工步游标（运行时状态，可能为空） */
  simCursor?: number;
  /** 仿真是否已收工 */
  simSettled: boolean;
}

/**
 * 节内有没有可数的具体步骤。**只在数字可信时才给**：
 *   - 细问的进度由持久化的答案算出，任何时候都准，到达即可显示；
 *   - 仿真的工步游标是运行时状态（刷新即归零），所以只在「正在这一节」或
 *     「有已收工的记录」时报数——否则刷新后回看会显示成 0/8，像是什么都没做过。
 */
export function actSubProgress(
  title: string,
  opts: { reached: boolean; isCurrent: boolean } & WjActProgressInput,
): WjActSub | null {
  const { reached, isCurrent, stageId, questions, answered, simCursor, simSettled } = opts;
  if (!reached) return null;

  if (title === ACT_SIM) {
    const sim = getSim(stageId);
    if (!sim) return null;
    if (simSettled) return { done: sim.steps.length, total: sim.steps.length };
    if (!isCurrent) return null;
    const at = Math.min(simCursor ?? 0, sim.steps.length);
    return { done: at, total: sim.steps.length, current: sim.steps[at]?.title };
  }

  if (title === ACT_QUESTIONS && questions.length > 0) {
    return {
      done: answered,
      total: questions.length,
      current: answered < questions.length ? `细问 ${answered + 1}` : undefined,
    };
  }

  return null;
}
