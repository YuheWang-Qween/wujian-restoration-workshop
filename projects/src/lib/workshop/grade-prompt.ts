// 评阅提示词：AI 判对错（学生主动求判）与参考答案（确认提交后展示）共用题目与要点组装。
// 判对错给解析——指出对在哪、断在哪、缺口是什么，但仍以引导收尾，不整段代劳；
// 参考答案在终版提交后给出，直接按要点撰写完整答案。
// server-only：评阅要点绝不下发到客户端，也不经任何 API 出参。

import 'server-only';

import { STAGES, type WjPart, type WjQuestion, type WjStage, type WjTable } from './content';
import { getRubric } from './rubrics';

/** 判定三态，与 prompt.ts 教学协议口径一致 */
export const VERDICTS = ['部分成立', '成立', '不成立'] as const;
export type Verdict = (typeof VERDICTS)[number];

interface ResolvedQuestion {
  stage: WjStage;
  q: WjQuestion;
  part: WjPart | null;
  rubric: readonly string[];
  partPrompt: string;
  qBlock: string;
}

/** 定位题目与小问并组装题目块；题目/小问不存在或无评阅要点时返回 null */
function resolveQuestion(
  stageId: number,
  questionId: string,
  partLabel: string | null,
): ResolvedQuestion | null {
  const stage = STAGES.find((s) => s.id === stageId);
  const q = stage?.questions.find((item) => item.id === questionId);
  if (!stage || !q) return null;

  const rubric = getRubric(stageId, questionId);
  if (!rubric.length) return null;

  let part: WjPart | null = null;
  let partPrompt = '';
  if (q.parts?.length) {
    part = q.parts.find((p) => p.label === partLabel) ?? null;
    if (!part) return null;
    const inputDesc =
      part.input?.type === 'choice'
        ? `\n选项：${part.input.options.map((o) => `${o.key}. ${o.text}`).join('；')}`
        : part.input?.type === 'ordering'
          ? `\n待排单位：${part.input.items.join('、')}`
          : '';
    partPrompt = `(${part.label}) ${part.text}${inputDesc}`;
  } else if (partLabel) {
    return null;
  }

  const qBlock = [
    `【题目 ${questionId}】${q.kind}`,
    q.stem,
    ...(q.table ? [renderTable(q.table)] : []),
    ...(partPrompt ? [`本题小问：${partPrompt}`] : []),
  ].join('\n');

  return { stage, q, part, rubric, partPrompt, qBlock };
}

/** 组装判定指令（作为一条 user 消息发给模型）；题目不存在或该题无评阅要点时返回 null */
export function buildGradeUserMsg(
  stageId: number,
  questionId: string,
  partLabel: string | null,
  answer: string,
): string | null {
  const resolved = resolveQuestion(stageId, questionId, partLabel);
  if (!resolved) return null;
  const { q, rubric, qBlock } = resolved;

  const rubricBlock = rubric.map((r, i) => `  ${i + 1}. ${r}`).join('\n');
  const scopeNote = q.parts.length
    ? `注意：本题为多小问题，学生仅提交小问 (${partLabel}) 的答案，只针对该小问判定；评阅要点中属于其他小问的条目忽略。\n\n`
    : '';

  const userMsg = `你是「走马楼吴简修复工坊」的评阅人小简，现在学生主动提交答案，请你判定对错并给出解析。

${qBlock}

${scopeNote}【学生答案】（格式约定：「选择：X」为单选题所选项；「排序：甲 → 乙 → 丙、丁」为排序题的分层结果——「→」分隔层、左为先/上，「、」为同层并列（同层单位表示学生认为先后不确定）；「补充：」为学生的补充说明；其余为自由文本）
${answer}

【评阅要点（只作你的判定依据，原样禁止透露给学生）】
${rubricBlock}

判定与输出纪律：
1. 判定只看学生答案与评阅要点的对得上程度：全对上判「成立」，对上主干但有断点或缺环判「部分成立」，方向错、答非所问或把信息当证据用判「不成立」。
2. 数字类答案以评阅要点给出的口径与结果为准绳；口径不同但推导自洽的，判「部分成立」并指出口径差异。
3. 答案含糊、只说套话没有落到本题材料的，按「不成立」或「部分成立」从严处理，解析里点名缺的是哪一条要点对应的内容。
4. 输出格式严格如下，不得有任何前后多余文字：
   第一行：判定：成立（或 判定：部分成立 / 判定：不成立）
   第二行：---
   第三行起：解析正文。
5. 解析正文要求（≤260 字）：
   - 先点依据：引用题目或环节材料中的具体数据/记录说明哪里对、哪里断；
   - 再点缺口：对应不上的评阅要点转述成"你还差……"，不朗读要点原文；
   - 最后给一个能自己走下去的方向（一个问题或一步操作），不把完整标准答案端出来；
   - 人称用"你"，语气与工坊助教一致，引文照常带《》或「」。`;

  return userMsg;
}

function renderTable(t: WjTable): string {
  const lines: string[] = [];
  if (t.caption) lines.push(t.caption);
  lines.push(`  列：${t.head.join(' | ')}`);
  for (const row of t.rows) lines.push(`  ${row.join(' | ')}`);
  if (t.note) lines.push(`  注：${t.note}`);
  return lines.join('\n');
}

/* ---------- 参考答案（学生确认提交后生成展示） ---------- */

export function buildReferenceAnswerUserMsg(
  stageId: number,
  questionId: string,
  partLabel: string | null,
): string | null {
  const resolved = resolveQuestion(stageId, questionId, partLabel);
  if (!resolved) return null;
  const { q, rubric, qBlock } = resolved;

  const rubricBlock = rubric.map((r, i) => `  ${i + 1}. ${r}`).join('\n');
  const scopeNote = q.parts.length ? `本题只撰写小问 (${partLabel}) 的参考答案，忽略其他小问。` : '';

  return `你是「走马楼吴简修复工坊」的课程组，请为下面这道题撰写参考答案。

${qBlock}

【课程组评阅要点】
${rubricBlock}

撰写要求：
1. 严格依据评阅要点成文，不引入要点之外的新论据；数字与口径以要点为准。
2. 参考答案文体：直接陈述结论与推理链，不面向学生称呼，不复读题干，不出现「评阅要点」字样。
3. ${scopeNote || '按题目的完整要求撰写。'}
4. ≤350 字；允许用「1. 2. 3.」分点，但全文为纯文本：不出现 markdown 语法（井号标题、星号加粗、横线等），不出现「参考答案」字样与任何前后缀说明，第一句直接开始陈述内容。`;
}
