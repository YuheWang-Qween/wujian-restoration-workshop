/**
 * 学情指标与展示口径（教师端学情分析、学生端我的学情共用）。
 * 细问答完口径与学生端 store 的 isQuestionAnswered 一致；
 * 逐题判定取首个判据键（与小简评阅写回的 verdicts 结构对应）。
 */

import { STAGES, ACT_WHY, ACT_DATA, ACT_SIM, ACT_QUESTIONS } from '@/lib/workshop/content';
import { answerKey, isQuestionAnswered } from '@/store/useWorkshopStore';

export interface Learner {
  userId: string;
  name: string;
  staffNo: string;
  className: string;
  avatarUrl: string;
  updatedAt: string | null;
  completed: number[];
  actsRevealed: Record<string, number>;
  answers: Record<string, string>;
  submitted: Record<string, unknown>;
  verdicts: Record<string, string>;
  imageKeys: string[];
  exhibitsViewed: Record<string, string>;
}

export const TOTAL_STAGES = STAGES.length;
export const TOTAL_QUESTIONS = STAGES.reduce((n, s) => n + s.questions.length, 0);
export const ACT_NAMES = [ACT_WHY, ACT_DATA, ACT_SIM, ACT_QUESTIONS];

export function imagesOf(l: Learner): Record<string, string> {
  return Object.fromEntries(l.imageKeys.map((k) => [k, '1']));
}

export function answeredCount(l: Learner): number {
  const imgs = imagesOf(l);
  return STAGES.reduce(
    (n, s) => n + s.questions.filter((q) => isQuestionAnswered(l.answers, imgs, s.id, q)).length,
    0,
  );
}

export function verdictOf(l: Learner, stageId: number, q: { id: string; parts: { label: string }[] }): string {
  const keys = [answerKey(stageId, q.id), ...q.parts.map((p) => answerKey(stageId, q.id, p.label))];
  for (const k of keys) {
    const v = l.verdicts[k];
    if (v) return v;
  }
  return '';
}

export function submittedOf(l: Learner, stageId: number, q: { id: string; parts: { label: string }[] }): boolean {
  const keys = [answerKey(stageId, q.id), ...q.parts.map((p) => answerKey(stageId, q.id, p.label))];
  return keys.some((k) => Boolean(l.submitted[k]));
}

/** 已写答但未必提交（草稿口径：细问有实质内容即算） */
export function draftOf(l: Learner, stageId: number, q: { id: string; parts: { label: string }[] }): boolean {
  const imgs = imagesOf(l);
  return isQuestionAnswered(l.answers, imgs, stageId, q);
}

export function answerTextOf(
  l: Learner,
  stageId: number,
  q: { id: string; parts: { label: string }[] },
): string {
  const keys = [answerKey(stageId, q.id), ...q.parts.map((p) => answerKey(stageId, q.id, p.label))];
  const segs = keys
    .map((k) => {
      const t = (l.answers[k] ?? '').trim();
      if (t) return t;
      if (l.imageKeys.includes(k)) return '（画图作答）';
      return '';
    })
    .filter(Boolean);
  return segs.join(' / ');
}

/** 一组学习者的细问判定分布（口径与逐题徽章一致：每题取首个判据键的判定） */
export function verdictStats(list: Learner[]): { ok: number; part: number; bad: number } {
  let ok = 0;
  let part = 0;
  let bad = 0;
  for (const l of list) {
    for (const s of STAGES) {
      for (const q of s.questions) {
        const v = verdictOf(l, s.id, q);
        if (v === '成立') ok++;
        else if (v === '部分成立') part++;
        else if (v === '不成立') bad++;
      }
    }
  }
  return { ok, part, bad };
}

export function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `今天 ${hh}:${mm}`;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}-${day} ${hh}:${mm}`;
}

/** 鉴赏篇五个板块的 id 与展示名（与 exhibition.ts 的 EXH_NAV 对齐，轻量副本） */
export const EXH_BOARDS = [
  { id: 'discovery', label: '发现与归属' },
  { id: 'forms', label: '形制六类' },
  { id: 'themes', label: '主题八类' },
  { id: 'cases', label: '案例精读' },
  { id: 'reference', label: '术语·出版·来源' },
];
export const EXH_CASE_IDS = [1, 2, 3, 4, 5];

export function exhBoardCount(l: Learner): number {
  return EXH_BOARDS.filter((b) => l.exhibitsViewed[b.id]).length;
}

export function exhCaseCount(l: Learner): number {
  return EXH_CASE_IDS.filter((n) => l.exhibitsViewed[`case-${n}`]).length;
}

export function exhLatest(l: Learner): string | null {
  const times = Object.values(l.exhibitsViewed ?? {}).filter(Boolean).sort();
  return times[times.length - 1] ?? null;
}
