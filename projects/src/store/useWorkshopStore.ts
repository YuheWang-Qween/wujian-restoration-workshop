import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkshopState {
  sessionId: string;
  /** 已完成的环节编号（1–6）。完成是自动的：该环节最后一道子问题作答后标记，无手动入口 */
  completed: number[];
  /** 答题框里的内容，key 为 `环节编号-子问题 id`。随手保存，刷新不丢 */
  answers: Record<string, string>;
  /** 各环节当前读到第几节（从 1 起；一节一屏，同屏只出现当前一节），key 为环节编号 */
  actsRevealed: Record<number, number>;
  /**
   * persist 是异步落定的。页面在它翻转之前渲染的是模块默认值，
   * 直接据此判断「未完成 / 无记录」会闪一下错误状态，所以先等这个标记。
   */
  hydrated: boolean;

  setHydrated: (v: boolean) => void;
  /** 幂等：已完成过就原样返回。由环节页在「最后一道子问题已作答」时自动调用 */
  markCompleted: (stageId: number) => void;
  setAnswer: (stageId: number, questionId: string, text: string, part?: string) => void;
  revealNextAct: (stageId: number, totalActs: number) => void;
  revealPrevAct: (stageId: number) => void;
  resetAll: () => void;
}

/**
 * 答案的存储键。有小问的题按小问分别存（`环节-题id-小问label`），
 * 无小问的题整题一个键（`环节-题id`）。
 */
export function answerKey(stageId: number, questionId: string, part?: string) {
  return part ? `${stageId}-${questionId}-${part}` : `${stageId}-${questionId}`;
}

/**
 * 顺序解锁：环节 1 常开；环节 N 在 N−1 答完最后一道子问题（自动完成）后解锁。
 * completed 未注入时（hydration 前）传空数组即可——此时只有环节 1 解锁，
 * 与大厅「persist 落定前按无进度渲染」的口径一致。
 */
export function isStageUnlocked(stageId: number, completed: number[]): boolean {
  if (stageId <= 1) return true;
  return completed.includes(stageId - 1);
}

function newSessionId() {
  return `wj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set) => ({
      sessionId: newSessionId(),
      completed: [],
      answers: {},
      actsRevealed: {},
      hydrated: false,

      setHydrated: (v) => set({ hydrated: v }),

      markCompleted: (stageId) =>
        set((s) =>
          s.completed.includes(stageId)
            ? s
            : { completed: [...s.completed, stageId].sort((a, b) => a - b) },
        ),

      setAnswer: (stageId, questionId, text, part) =>
        set((s) => ({ answers: { ...s.answers, [answerKey(stageId, questionId, part)]: text } })),

      revealNextAct: (stageId, totalActs) =>
        set((s) => {
          const cur = s.actsRevealed[stageId] ?? 1;
          if (cur >= totalActs) return s;
          return { actsRevealed: { ...s.actsRevealed, [stageId]: cur + 1 } };
        }),

      revealPrevAct: (stageId) =>
        set((s) => {
          const cur = s.actsRevealed[stageId] ?? 1;
          if (cur <= 1) return s;
          return { actsRevealed: { ...s.actsRevealed, [stageId]: cur - 1 } };
        }),

      resetAll: () =>
        set({ completed: [], answers: {}, actsRevealed: {}, sessionId: newSessionId() }),
    }),
    {
      name: 'wujian-workshop-progress',
      // hydrated 是运行时状态，不入库
      partialize: (s) => ({
        sessionId: s.sessionId,
        completed: s.completed,
        answers: s.answers,
        actsRevealed: s.actsRevealed,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

// onRehydrateStorage 在两种情况下不足以翻转标记：localStorage 同步落定时写入可能被
// create() 的初始状态覆盖；storage 被禁用或 JSON 损坏时回调根本不执行。
// 模块求值结束时 rehydrate 必定已经settle，这里兜底，否则页面会永远停在骨架屏。
if (typeof window !== 'undefined' && !useWorkshopStore.getState().hydrated) {
  try {
    useWorkshopStore.setState({ hydrated: true });
  } catch {
    // persist 每次 set 都会写 localStorage，可能抛（隐私模式 / 配额满）。
    // 标记本身已经生效且不需要持久化，忽略即可。
  }
}
