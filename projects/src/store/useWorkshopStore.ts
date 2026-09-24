import { create } from 'zustand';
import type { WjSimRun } from '@/lib/workshop/sim';
import { persist } from 'zustand/middleware';

interface WorkshopState {
  sessionId: string;
  /** 已完成的环节编号（1–6）。完成是自动的：该环节最后一道细问作答后标记，无手动入口 */
  completed: number[];
  /** 答题框里的内容，key 为 `环节编号-细问 id`。随手保存，刷新不丢 */
  answers: Record<string, string>;
  /** 已确认提交（终版锁定）的小问，key 同 answers。提交后不可再改、出现参考答案 */
  submitted: Record<string, true>;
  /** 参考答案缓存，key 同 answers。提交后生成一次，刷新后复用不重复生成 */
  referenceAnswers: Record<string, string>;
  /** 评阅判定（成立/部分成立/不成立），key 同 answers。刷新后保留 */
  verdicts: Record<string, string>;
  /** 评阅解析正文，key 同 answers。刷新后保留 */
  analyses: Record<string, string>;
  /** 画板题的 base64 PNG，key 同 answers。刷新后保留 */
  images: Record<string, string>;
  /** 仿真工作台的操作记录，key 为环节编号。只存已收工的那一次，刷新后回到验收页 */
  simRuns: Record<number, WjSimRun>;
  /** 学生信息（学号 + 姓名），完成全部环节后填写 */
  studentInfo: { studentId: string; name: string } | null;
  /** 成就卡是否已解锁（填写学号姓名后标记） */
  achievementUnlocked: boolean;
  /** 各环节当前读到第几节（从 1 起；一节一屏，同屏只出现当前一节），key 为环节编号 */
  actsRevealed: Record<number, number>;
  /**
   * persist 是异步落定的。页面在它翻转之前渲染的是模块默认值，
   * 直接据此判断「未完成 / 无记录」会闪一下错误状态，所以先等这个标记。
   */
  hydrated: boolean;

  setHydrated: (v: boolean) => void;
  /** 幂等：已完成过就原样返回。由环节页在「最后一道细问已作答」时自动调用 */
  markCompleted: (stageId: number) => void;
  setAnswer: (stageId: number, questionId: string, text: string, part?: string) => void;
  markSubmitted: (stageId: number, questionId: string, part?: string) => void;
  setReferenceAnswer: (stageId: number, questionId: string, part: string | undefined, text: string) => void;
  setVerdict: (stageId: number, questionId: string, part: string | undefined, verdict: string, analysis: string) => void;
  setImage: (stageId: number, questionId: string, part: string | undefined, data: string) => void;
  setSimRun: (stageId: number, run: WjSimRun) => void;
  clearSimRun: (stageId: number) => void;
  setStudentInfo: (studentId: string, name: string) => void;
  revealNextAct: (stageId: number, totalActs: number) => void;
  revealPrevAct: (stageId: number) => void;
  /** 跳到第 n 节（1 基）：进度条回看已解锁的节用，只允许往回或原地 */
  revealToAct: (stageId: number, n: number) => void;
  resetAll: () => void;
  resetStage: (stageId: number) => void;
}

/**
 * 答案的存储键。有小问的题按小问分别存（`环节-题id-小问label`），
 * 无小问的题整题一个键（`环节-题id`）。
 */
export function answerKey(stageId: number, questionId: string, part?: string) {
  return part ? `${stageId}-${questionId}-${part}` : `${stageId}-${questionId}`;
}

/**
 * 一道细问是否答完：有小问的题要求每个小问都有内容（画图题认图不认字），
 * 无小问的题整题答题框非空。进度条子进度与完成判定共用这一个口径。
 */
export function isQuestionAnswered(
  answers: Record<string, string>,
  images: Record<string, string>,
  stageId: number,
  q: { id: string; parts: { label: string; input?: { type?: string } }[] },
): boolean {
  if (q.parts.length === 0) return (answers[answerKey(stageId, q.id)] ?? '').trim().length > 0;
  return q.parts.every((p) => {
    const k = answerKey(stageId, q.id, p.label);
    const hasText = (answers[k] ?? '').trim().length > 0;
    const hasImage = p.input?.type === 'drawing' && (images[k] ?? '').trim().length > 0;
    return hasText || hasImage;
  });
}

/**
 * 顺序解锁：环节 1 常开；环节 N 在 N−1 答完最后一道细问（自动完成）后解锁。
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
      submitted: {},
      referenceAnswers: {},
      verdicts: {},
      analyses: {},
      images: {},
      simRuns: {},
      studentInfo: null,
      achievementUnlocked: false,
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

      markSubmitted: (stageId, questionId, part) =>
        set((s) => ({ submitted: { ...s.submitted, [answerKey(stageId, questionId, part)]: true } })),

      setReferenceAnswer: (stageId, questionId, part, text) =>
        set((s) => ({
          referenceAnswers: { ...s.referenceAnswers, [answerKey(stageId, questionId, part)]: text },
        })),

      setVerdict: (stageId, questionId, part, verdict, analysis) =>
        set((s) => {
          const key = answerKey(stageId, questionId, part);
          return {
            verdicts: { ...s.verdicts, [key]: verdict },
            analyses: { ...s.analyses, [key]: analysis },
          };
        }),

      setImage: (stageId, questionId, part, data) =>
        set((s) => ({
          images: { ...s.images, [answerKey(stageId, questionId, part)]: data },
        })),

      setSimRun: (stageId, run) =>
        set((s) => ({ simRuns: { ...s.simRuns, [stageId]: run } })),

      clearSimRun: (stageId) =>
        set((s) => {
          const next = { ...s.simRuns };
          delete next[stageId];
          return { simRuns: next };
        }),

      setStudentInfo: (studentId, name) =>
        set({ studentInfo: { studentId, name }, achievementUnlocked: true }),

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

      revealToAct: (stageId, n) =>
        set((s) => ({ actsRevealed: { ...s.actsRevealed, [stageId]: Math.max(1, n) } })),

      resetAll: () =>
        set({
          completed: [],
          answers: {},
          submitted: {},
          referenceAnswers: {},
          verdicts: {},
          analyses: {},
          images: {},
          simRuns: {},
          studentInfo: null,
          achievementUnlocked: false,
          actsRevealed: {},
          sessionId: newSessionId(),
        }),

      resetStage: (stageId) =>
        set((s) => {
          const prefix = `${stageId}-`;
          const filterStr = <T,>(obj: Record<string, T>) =>
            Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith(prefix))) as Record<string, T>;
          return {
            completed: s.completed.filter((id) => id !== stageId),
            answers: filterStr(s.answers),
            submitted: filterStr(s.submitted),
            referenceAnswers: filterStr(s.referenceAnswers),
            verdicts: filterStr(s.verdicts),
            analyses: filterStr(s.analyses),
            images: filterStr(s.images),
            simRuns: Object.fromEntries(
              Object.entries(s.simRuns).filter(([k]) => Number(k) !== stageId),
            ) as Record<number, WjSimRun>,
            actsRevealed: { ...s.actsRevealed, [stageId]: 1 },
          };
        }),
    }),
    {
      name: 'wujian-workshop-progress',
      // hydrated 是运行时状态，不入库
      partialize: (s) => ({
        sessionId: s.sessionId,
        completed: s.completed,
        answers: s.answers,
        submitted: s.submitted,
        referenceAnswers: s.referenceAnswers,
        verdicts: s.verdicts,
        analyses: s.analyses,
        images: s.images,
        simRuns: s.simRuns,
        studentInfo: s.studentInfo,
        achievementUnlocked: s.achievementUnlocked,
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
