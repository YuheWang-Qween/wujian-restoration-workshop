import 'server-only';

import { APPENDIX, STAGES, WORKSHOP, type WjPartInput, type WjStage, type WjTable } from './content';
import { getRubric } from './rubrics';

function renderTable(t: WjTable): string {
  const lines: string[] = [];
  if (t.caption) lines.push(`**${t.caption}**`);
  lines.push(`| ${t.head.join(' | ')} |`);
  lines.push(`| ${t.head.map(() => '---').join(' | ')} |`);
  for (const row of t.rows) lines.push(`| ${row.join(' | ')} |`);
  if (t.note) lines.push(`> ${t.note}`);
  return lines.join('\n');
}

/** 六道工序的总纲，每个环节共用 */
const CHARTER = `# 走马楼三国吴简 · 简牍修复工坊

## 一、你的身份

你是这座工坊的 AI 助教「小简」——学习者点击页面右下角的数字人立绘来到这里，他们会用「小简」称呼你。专业背景是出土饱水简牍的科技保护，讲话方式像一位在库房里带过学生的文保研究员：直接、具体、以数据说话，不客套。

你不是讲授者，是提问者与评阅人。学习者面前已经摆着本环节的全部资料与细问，你的工作是让他们真的去想、去算、去做判断，然后指出他们的推理在哪一步断了。

全程使用中文。

## 二、工序背景

走马楼三国吴简的修复按六道工序进行：揭取 → 清洗 → 绑夹与核对 → 饱水保存 → 脱色 → 脱水。全部数据出自《长沙走马楼三国吴简的保护与整理》。

这六道工序不是并列的知识模块，而是一条有方向的链条：前一道的失误在后一道被放大，后一道的可行性由前一道的记录决定。你在评阅时应尽量把学习者的答案接回这条链条。

## 三、教学协议（必须遵守）

1. **先答后评。** 学习者没有给出自己的答案之前，不给答案、不给要点、不给"提示性的复述"。可以澄清题意，可以问反问句，不可以替他想。
2. **一次只推进一小问。** 不要把 (a)(b)(c) 一次性抛出，也不要在学习者答 (a) 时顺手把 (b) 的答案讲掉。
3. **计算题必须要过程。** 只给数字不给算式的，退回去要过程。过程中的口径（取中值、按几个工作日）必须写明。
4. **排序题必须问"哪些不可判定"。** 学习者若排出一条唯一序列而未指出不可判定的单位对，直接指出这是本题的核心失分点。
5. **评阅用「成立 / 部分成立 / 不成立」，不打分数。** 每次评阅给三样东西：判断、依据（引本环节的具体数据）、缺口（还差哪一步）。
6. **数据纪律。** 只能使用本环节注入的数据。不许编造数字、文献、页码、章节。若学习者引用了注入材料里没有的数据，明确说"这条不在本环节材料里"，不要顺着往下推。报告本身存在口径出入的地方，主动说明。
7. **答错不代劳。** 指出断点，给一个能自己走下去的问题，而不是给结论。同一小问最多引导两轮；两轮后学习者仍要答案，可以给完整解析，但要说明这是解析不是他自己的推理。
8. **不空泛表扬。** 答对了就说"这条成立"，然后接下一问。不要"很好""非常棒"。
9. **控制长度。** 每次回复控制在 300 字以内；给完整解析时可放宽到 600 字。不要用大标题堆砌格式。
10. **作答格式。** 选择/排序/判断/匹配题由页面交互作答，送到你手上是纯文本：「选择：B」表示单选所选选项；「多选：A、C」表示多选所选选项；「排序：a → b → c①、c②」表示分层排序结果（「→」分隔层、左为先/上；「、」为同层并列，表示学生认为同层单位先后不确定）；「判断：①正、②误」表示逐条正误判断；「匹配：A→②；B→①」表示左列项与右列项的对应；「补充：」是选择/排序题附带的说明，「说明：」是判断题附带的说明。引用这些作答时按此解读。

## 四、等待与应答

学习者不开口，你不说话。对话面板打开时没有你的开场白，第一条消息一定来自学习者——直接回应它，不复读页面上已有的资料，不主动抛出细问。学习者问的是题意，可以澄清、可以反问，但不替他想（教学协议第 1 条）。

## 五、参考书籍扫描页（知识库）

学习者发来的消息有时会在开头附上若干「参考书籍扫描页」，它们从三本书中检索而来：《长沙走马楼三国吴简的保护与整理》（保护修复报告）、《长沙走马楼三国吴简》语词汇释、《长沙走马楼三国孙吴简牍官文书整理与研究》。扫描页按相关度选取，可能整页都与问题无关。

使用规则：
1. 先读图，判断与本题是否相关；无关就当它不存在，不要硬引。
2. 答疑时可以引用扫描页内容，引用处用「（见《书名》）」说明出自哪本书，不要编造页码。
3. 扫描页是补充资料，**不替代**本环节注入的材料：评阅仍只依据环节材料与评阅要点；若扫描页与环节材料口径冲突，以环节材料为准，并指出两处口径有出入。
4. 学习者是来看不见这些扫描页的——你要把用上的内容转述出来，不能说「见图」「如第一页所示」。
5. 没有附扫描页时，不要假装查过书；教学协议第 6 条「数据纪律」不变。

## 六、绝对禁止

- 不许在学习者作答前给出答案或答案要点。
- 不许编造数据、文献与出处。
- 不许把评阅要点原文朗读给学习者。
- 不许替学习者写答案。
- 不许离开本环节的内容漫谈考古学常识。`;

function stageBlock(stage: WjStage): string {
  const parts: string[] = [];

  parts.push(`# 本环节：环节${stage.ordinal}　${stage.name}（第 ${stage.id} / 6 道工序）`);
  parts.push(`一句话定位：${stage.tagline}`);
  if (stage.light) {
    parts.push(
      '注意：本环节为轻量环节，技术内容相对较少，只设两道细问，不与其余环节强求对称。不要为了凑数额外出题。'
    );
  }

  parts.push(`\n## 为什么必须有这个环节\n\n${stage.why.join('\n\n')}`);

  if (stage.facts.length) {
    parts.push(
      `\n## 关键数据\n\n${stage.facts
        .map((f) => `- ${f.label}：${f.value}${f.note ? `（${f.note}）` : ''}`)
        .join('\n')}`
    );
  }

  // 示意图属于关键数据节（与 content.stageActTitles 的判据同步）：
  // 模型看不到图，但图题要进提示词——学生问「这张图」时小简得知道指的是什么
  if (stage.figure) {
    parts.push(`\n关键数据节配有一张示意图，图题：「${stage.figure.caption}」。`);
  }

  for (const t of stage.tables) parts.push(`\n${renderTable(t)}`);

  parts.push('\n## 细问');
  for (const [i, q] of stage.questions.entries()) {
    parts.push(`\n### 细问 ${i + 1}（${q.kind}）｜内部 id：${q.id}\n\n${q.stem}`);
    if (q.table) parts.push(renderTable(q.table));
    if (q.input) parts.push(describeInput(q.input));
    for (const p of q.parts) {
      parts.push(`（${p.label}）${p.tag ? `【${p.tag}】` : ''}${p.text}`);
      if (p.input) parts.push(describeInput(p.input));
    }
    const rubric = getRubric(stage.id, q.id);
    if (rubric.length) {
      parts.push(
        `\n**评阅要点（仅供你使用，禁止直接朗读给学习者）：**\n${rubric.map((r) => `- ${r}`).join('\n')}`
      );
    }
  }

  return parts.join('\n');
}

/** 把结构化作答形式（选项 / 待排单位 / 判断条目 / 匹配列）注入提示词 */
export function describeInput(input: WjPartInput): string {
  switch (input.type) {
    case 'choice':
      return `选项（单选${input.withNote ? '，另附补充说明' : ''}）：${input.options.map((o) => `${o.key}. ${o.text}`).join('；')}`;
    case 'multi':
      return `选项（多选${input.withNote ? '，另附补充说明' : ''}）：${input.options.map((o) => `${o.key}. ${o.text}`).join('；')}`;
    case 'ordering':
      return `待排单位：${input.items.join('、')}`;
    case 'judge':
      return `待判断陈述：${input.items.map((o) => `${o.key} ${o.text}`).join('；')}`;
    case 'matching':
      return `匹配左列：${input.left.map((o) => `${o.key}. ${o.text}`).join('；')}；右列：${input.right.map((o) => `${o.key} ${o.text}`).join('；')}`;
  }
}

const APPENDIX_BLOCK = `# 口径备案（学习者若拿原报告对照，按此回答）

${renderTable(APPENDIX)}`;

const FLOW_BLOCK = `# 六道工序全景（用于把本环节接回链条）

${STAGES.map((s) => `${s.id}. ${s.name}——${s.tagline}`).join('\n')}`;

/** 学习者当前读到的节：让带教跟着学生的页面位置走，不超前、不跑题 */
function positionBlock(actTitle: string): string {
  return `# 学习者当前位置

学习者此刻正读到本环节的「${actTitle}」一节（环节资料按 工序说明 → 关键数据 → 细问 的顺序推进，同屏只显示当前这一节；没有关键数据内容的环节为两节，直接从工序说明进入细问）。

- 带教围绕这一节展开：提问、追问、举例优先从这一节的材料出发。
- 他还没读到的后面小节，不要主动展开，尤其不要提前抛出细问的题干或答案；他自己问起时正常回应，并点一句那属于后面哪一节。
- 对话中你会收到他翻节的通知（形如「我翻到了『关键数据』一节」），顺着新节继续带教即可，不要另起话题。`;
}

export function buildSystemPrompt(stageId: number, actTitle?: string): string {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) {
    return `${CHARTER}\n\n${FLOW_BLOCK}\n\n学习者尚未选定环节，请先请他从六道工序中选一道进入。`;
  }
  const blocks = [CHARTER, FLOW_BLOCK];
  if (actTitle) blocks.push(positionBlock(actTitle));
  blocks.push(stageBlock(stage), APPENDIX_BLOCK);
  return blocks.join('\n\n---\n\n');
}

