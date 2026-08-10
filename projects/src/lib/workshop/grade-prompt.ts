// 判分提示词：AI 判对错（学生主动提交答案求判）专用。
// 与 prompt.ts 的助教对话不同：此处学生已作答，可以给解析——指出对在哪、断在哪、
// 缺口是什么，但仍以引导收尾，不整段代劳标准答案。
// server-only：评阅要点绝不下发到客户端，也不经任何 API 出参。

import 'server-only';

import { STAGES, type WjTable } from './content';
import { getRubric } from './rubrics';

/** 判定三态，与 prompt.ts 教学协议口径一致 */
export const VERDICTS = ['部分成立', '成立', '不成立'] as const;
export type Verdict = (typeof VERDICTS)[number];

/** 组装判定指令（作为一条 user 消息发给模型）；题目不存在或该题无评阅要点时返回 null */
export function buildGradeUserMsg(
  stageId: number,
  questionId: string,
  partLabel: string | null,
  answer: string,
): string | null {
  const stage = STAGES.find((s) => s.id === stageId);
  const q = stage?.questions.find((item) => item.id === questionId);
  if (!stage || !q) return null;

  const rubric = getRubric(stageId, questionId);
  if (!rubric.length) return null;

  let partPrompt = '';
  if (q.parts?.length) {
    const part = q.parts.find((p) => p.label === partLabel);
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
    ...(q.parts?.length
      ? [`（本题为多小问题，学生仅提交小问 (${partLabel}) 的答案，只针对该小问判定。）`]
      : []),
  ].join('\n');

  const rubricBlock = rubric.map((r, i) => `  ${i + 1}. ${r}`).join('\n');

  const userMsg = `你是「走马楼吴简修复工坊」的评阅人小简，现在学生主动提交答案，请你判定对错并给出解析。

${qBlock}

【学生答案】（格式约定：「选择：X」为单选题所选项；「排序：甲 → 乙 → …」为排序题结果，左侧为先/上；「补充：」为学生的补充说明；其余为自由文本）
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
