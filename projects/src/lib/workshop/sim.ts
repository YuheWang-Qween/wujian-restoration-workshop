/**
 * 走马楼吴简修复工坊 · 虚拟仿真工作台（数据层）
 *
 * 每个环节一台工作台。学习者不是选 A/B/C/D，而是按真实工序动手：
 * 排揭取次序、挑工具、调参数、逐段推进，简牍的状态随操作实时变化，
 * 出错的后果按报告记载的机理扣在指标上，其中一部分明确标注不可逆。
 *
 * 全部工具、参数区间、失败机制与后果均出自《长沙走马楼三国吴简的保护与整理》，
 * 与 content.ts 的 why / facts / tables 同源。**不额外编造数字**：
 * 安全带取报告给出的操作区间（如推进「每 2～3 厘米停看一次」、保温 45～50℃），
 * 扣分幅度是本工坊为教学设定的权重，不是报告中的实测值——结算页会讲明这一点。
 *
 * 这份文件进浏览器包：里面的后果说明就是仿真反馈本身，本来就要当场给学习者看，
 * 与 rubrics.ts（细问的评阅要点，只走服务端）性质不同。
 */

/** 工作台上实时跳动的四个指标 + 一个不显示的累积风险 */
export interface WjSimState {
  /** 简体完整度 % */
  integrity: number;
  /** 字迹可辨度 % */
  legibility: number;
  /** 信息完整度 %：环节一是层位，环节三是编号身份 */
  provenance: number;
  /** 累计工时（小时） */
  hours: number;
  /** 累积操作风险 0–100：不显示在面板上，在「逐段推进」时兑现为实际损伤 */
  risk: number;
}

export type WjSimMetric = keyof WjSimState;

export const SIM_INIT: WjSimState = {
  integrity: 100,
  legibility: 100,
  provenance: 100,
  hours: 0,
  risk: 0,
};

/** 一次操作对指标的增量，负为损失 */
export type WjSimEffect = Partial<Record<WjSimMetric, number>>;

export type WjSimVerdict = 'good' | 'fair' | 'bad';

export interface WjSimChoice {
  key: string;
  label: string;
  /** 工具牌上的小字：这件工具/这个做法是什么 */
  hint?: string;
  verdict: WjSimVerdict;
  effect: WjSimEffect;
  /** 落手之后立刻给的后果说明——仿真的反馈，不是评分 */
  feedback: string;
  /** 标红「此步不可逆」 */
  irreversible?: boolean;
}

interface WjSimStepBase {
  id: string;
  /** 工步名，如「清理横断面」 */
  title: string;
  /** 这一步在做什么，一句话 */
  brief: string;
}

/** 选工具 / 选做法 */
export interface WjSimPickStep extends WjSimStepBase {
  type: 'pick';
  prompt: string;
  choices: WjSimChoice[];
}

/** 调参数：滑杆 + 安全带，出带即时报警，偏离越远代价越大 */
export interface WjSimDialStep extends WjSimStepBase {
  type: 'dial';
  prompt: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  init: number;
  /** 报告给出的操作区间 */
  safe: [number, number];
  /** 每偏离安全带一个单位的代价 */
  perUnit: WjSimEffect;
  /** 无论落在哪都要付的固定代价（如工时） */
  base?: WjSimEffect;
  okFeedback: string;
  offFeedback: string;
  /** 刻度上的注记 */
  marks?: { at: number; label: string }[];
}

/** 排操作次序：违反一条层位约束扣一次 */
export interface WjSimOrderStep extends WjSimStepBase {
  type: 'order';
  prompt: string;
  items: { key: string; label: string; hint?: string }[];
  /** [前, 后]：前者必须先于后者取出 */
  before: [string, string][];
  perViolation: WjSimEffect;
  okFeedback: string;
  badFeedback: string;
  /** 排完之后补一句：哪些对本来就无法判定 */
  undecidable?: string;
}

/** 逐段推进：一拍一拍走，风险在这里兑现成实际损伤，中途可能触发处置 */
export interface WjSimAdvanceStep extends WjSimStepBase {
  type: 'advance';
  prompt: string;
  unit: string;
  total: number;
  /** 每拍推进量；perTickFrom 指向某个 dial 步，用学习者调出来的值当步距 */
  perTick?: number;
  perTickFrom?: string;
  /** 每拍的固定代价 */
  tickEffect: WjSimEffect;
  /** 每拍按当前 risk 比例追加的损伤（risk=100 时足额计） */
  riskEffect?: WjSimEffect;
  /** 推进到 at（0–1）触发的处置 */
  events?: { at: number; text: string; choices?: WjSimChoice[] }[];
  doneFeedback: string;
  /** 读数条的名字，如「已揭长度」「干燥进程」 */
  gaugeLabel: string;
}

export type WjSimStep = WjSimPickStep | WjSimDialStep | WjSimOrderStep | WjSimAdvanceStep;

/** 工作台的画面：每种画面对同一套指标做不同的可视化 */
export type WjSimScene = 'stack' | 'clean' | 'bind' | 'tank' | 'bleach' | 'dry';

export interface WjSimReadout {
  key: WjSimMetric;
  label: string;
  unit?: string;
  /** true 表示这个指标越低越好（工时） */
  lower?: boolean;
}

export interface WjSim {
  stageId: number;
  /** 工作台名 */
  title: string;
  /** 情境：你现在站在哪、面前是什么 */
  scene: string;
  visual: WjSimScene;
  readouts: WjSimReadout[];
  steps: WjSimStep[];
  /** 验收线 */
  pass: { key: WjSimMetric; min?: number; max?: number; label: string }[];
  /** 结算时给出：报告里实际是怎么做的 */
  benchmark: string[];
}

// ═══════════════════════ 环节一　揭取 ═══════════════════════
const SIM_1: WjSim = {
  stageId: 1,
  title: '揭取工作台 · J22 I 区',
  scene:
    'I 区简坨已析为 a、b、c、d、e 五小坨，记录在案的叠压关系是 a→b→c、b→d、d→e（箭头表示压在其上）。坨在你面前的浅盘里，泥还是湿的。这道工序做坏了没有第二次。',
  visual: 'stack',
  readouts: [
    { key: 'integrity', label: '简体完整度' },
    { key: 'legibility', label: '字迹可辨度' },
    { key: 'provenance', label: '层位信息' },
    { key: 'hours', label: '累计工时', unit: 'h', lower: true },
  ],
  steps: [
    {
      id: 's1-order',
      type: 'order',
      title: '定揭取次序',
      brief: '揭取只能从上往下。次序一旦走错，被压住的那条叠压关系就再也无法记录。',
      prompt:
        '把五个小坨按你打算动手的先后排好。记录在案的关系是 a→b→c、b→d、d→e——左边的压在右边的上面。',
      items: [
        { key: 'a', label: 'a 坨', hint: '压在 b 之上' },
        { key: 'b', label: 'b 坨', hint: '压住 c、d' },
        { key: 'c', label: 'c 坨', hint: '自身可再分 c①→c②→c③' },
        { key: 'd', label: 'd 坨', hint: '与 II 区 a 坨相连接' },
        { key: 'e', label: 'e 坨', hint: '被 d 压住' },
      ],
      before: [
        ['a', 'b'],
        ['b', 'c'],
        ['b', 'd'],
        ['d', 'e'],
      ],
      perViolation: { provenance: -22, risk: 8 },
      okFeedback:
        '次序合法。每揭掉一层，被它压住的那一层的叠压关系就在这一刻固定进揭剥图——位置信息没有留存的办法，只有记录的办法。',
      badFeedback:
        '次序违反了已记录的叠压关系：先动下层，就是在上层还压着的时候把它拽出来。这条关系随之作废，事后测量和摄影都补不回来——被破坏的不是实物，是实物之间的关系。',
      undecidable:
        'c 与 d 之间没有任何记录约束——两者都只被 b 压住，谁先谁后都合法，这一对本来就不可判定。凡是排出唯一序列却不指出不可判定的单位对，就是把「没测到」当成了「测到了」。',
    },
    {
      id: 's1-face',
      type: 'pick',
      title: '找缝隙',
      brief: '叠压面之间没有明显界面可循，下刀之前得先看得见层次。',
      prompt: '简端的横断面糊着淤泥。你怎么起手？',
      choices: [
        {
          key: 'clean',
          label: '先清理简端横断面的淤泥',
          hint: '观察找准层次后再下刀',
          verdict: 'good',
          effect: { hours: 0.2 },
          feedback:
            '横断面露出来了，层次可辨，刀口有地方可去。多花的这点时间是找缝隙唯一的办法。',
        },
        {
          key: 'guess',
          label: '照大致走向直接下刀',
          hint: '省去清理，先试着分层',
          verdict: 'bad',
          effect: { integrity: -15, risk: 20 },
          feedback:
            '刀尖找不准界面，从简体中间穿了过去。报告把「找不准缝隙」列为揭取四难之首，对策只有一条：先清理简端横断面的淤泥，观察找准层次后再下刀。',
        },
        {
          key: 'wash',
          label: '整坨先冲水，把泥冲掉再分',
          hint: '一次把视野清出来',
          verdict: 'bad',
          effect: { integrity: -20, provenance: -12, risk: 25 },
          feedback:
            '水流把已经松动的简冲移位了。纤维浸泡日久已严重腐朽、没有拉伸强度，冲刷既伤简体，也把尚未记录的叠压关系搅乱——这时候还没到清洗环节。',
        },
      ],
    },
    {
      id: 's1-tool',
      type: 'pick',
      title: '选起简工具',
      brief: '粘连太紧，无缝插针、毫厘难起。工具决定刀口能不能贴着界面走。',
      prompt: '工具架上有四件。挑一件插进缝隙。',
      choices: [
        {
          key: 'bamboo',
          label: '竹刀尖',
          hint: '报告首选',
          verdict: 'good',
          effect: {},
          feedback: '竹刀尖软硬相当，贴着界面走不咬简体。这是报告记载的首选工具。',
        },
        {
          key: 'palette',
          label: '小号油画铲',
          hint: '与竹刀尖并列可用',
          verdict: 'good',
          effect: {},
          feedback: '小号油画铲是报告并列给出的另一件可用工具，铲面薄而宽，托得住整段简身。',
        },
        {
          key: 'tweezer',
          label: '金属镊子',
          hint: '夹住一端往外提',
          verdict: 'bad',
          effect: { integrity: -18, risk: 22 },
          feedback:
            '镊子是点受力。糟朽的简体在夹点上被压出凹痕，提拉时应力全集中在这一点——揭取要的是沿界面剥离，不是把简拽出来。',
        },
        {
          key: 'hand',
          label: '直接用手指分',
          hint: '凭手感找层',
          verdict: 'bad',
          effect: { integrity: -25, legibility: -10, risk: 30 },
          feedback:
            '指腹的接触面比刀口宽得多，既进不了缝隙，又在简面上蹭。竹黄面组织不致密、耐磨强度低，蹭过的地方墨迹当场就淡了。',
        },
      ],
    },
    {
      id: 's1-lube',
      type: 'pick',
      title: '润滑渗透',
      brief: '干着推，刀口和简面之间全是摩擦。',
      prompt: '刀尖已插入缝隙。推进之前怎么润滑？',
      choices: [
        {
          key: 'brush',
          label: '毛笔点蘸蒸馏水，沿缝点润',
          hint: '报告记载的做法',
          verdict: 'good',
          effect: { hours: 0.1 },
          feedback: '水顺着缝隙渗进去，界面滑了，刀口可以左右起伏徐徐推进。',
        },
        {
          key: 'pour',
          label: '温水直接淋在简上',
          hint: '一次润透，省事',
          verdict: 'bad',
          effect: { legibility: -30, risk: 15 },
          feedback:
            '字迹当场晕开。升温法是有用的——但报告写得很清楚：切忌温水直接倒在文字上。要升温得用活动木盒加塑料薄膜套隔开，让热透过去、水不落在字上。',
          irreversible: true,
        },
        {
          key: 'dry',
          label: '不润滑，直接推',
          hint: '避免水接触字迹',
          verdict: 'bad',
          effect: { integrity: -20, risk: 25 },
          feedback:
            '干推的摩擦力全部由已经腐朽的纤维承担。躲开水确实躲开了晕墨，但简体在刀口前面一段一段地崩——报告给的是「点蘸」，不是「不用」。',
        },
      ],
    },
    {
      id: 's1-oil',
      type: 'pick',
      title: '处置油粘连',
      brief:
        '这一块简坨表面覆盖的植物油造成黏性力，刀口推不动了。报告另记：防腐封护油类涂刷不匀、油质不一也会造成粘连。',
      prompt: '推到一半卡住了。怎么办？',
      choices: [
        {
          key: 'warm',
          label: '升温法：活动木盒 + 塑料薄膜套 + 温水',
          hint: '隔着薄膜升温，水不碰字',
          verdict: 'good',
          effect: { hours: 0.3 },
          feedback:
            '油的黏度随温度下降，刀口重新走得动。报告称加热升温「也是一种解决揭剥困难的有效途径」，最大的一块简坨就是这么揭下来的。',
        },
        {
          key: 'force',
          label: '加力，硬推过去',
          hint: '不换方案',
          verdict: 'bad',
          effect: { integrity: -22, risk: 25 },
          feedback: '黏性力没有消失，加的力全部转成简体内部的剪应力。推过去了，简也裂了。',
        },
        {
          key: 'solvent',
          label: '上有机溶剂洗掉油层',
          hint: '直接去除粘连来源',
          verdict: 'bad',
          effect: { legibility: -25, integrity: -10, risk: 20 },
          feedback:
            '溶剂不认得哪些是油、哪些是墨。这个阶段的任务是把简完整取出来，不是处理表面覆盖物——清洗有它自己的环节和自己的工具。',
        },
      ],
    },
    {
      id: 's1-pitch',
      type: 'dial',
      title: '定推进步距',
      brief: '刀口每走一段就要停下来看一次界面，走多远停一次由你定。',
      prompt: '设定每次推进的距离。',
      unit: 'cm',
      min: 1,
      max: 8,
      step: 0.5,
      init: 5,
      safe: [2, 3],
      perUnit: { risk: 14, integrity: -4 },
      okFeedback: '落在报告给的区间里：左右起伏徐徐推进，每 2～3 厘米停看一次。',
      offFeedback:
        '步距超出报告给的 2～3 厘米。走得越远，下一次停看之间刀口偏离界面的距离就越长，等发现走偏时已经切进简体了。',
      marks: [
        { at: 2, label: '2' },
        { at: 3, label: '3' },
        { at: 8, label: '8' },
      ],
    },
    {
      id: 's1-advance',
      type: 'advance',
      title: '逐段推进',
      brief: '一段一段往前走。每停一次看一眼界面，风险在这里兑现成实际的断口。',
      prompt: '按你定的步距把这枚简从坨里剥出来。简长约 23 厘米。',
      unit: 'cm',
      total: 23,
      perTickFrom: 's1-pitch',
      tickEffect: { hours: 0.09 },
      riskEffect: { integrity: -5, legibility: -1.5 },
      gaugeLabel: '已剥离长度',
      events: [
        {
          at: 0.55,
          text: '刀口下面的纤维发出轻微的撕裂声——这一段腐朽得比别处厉害。',
          choices: [
            {
              key: 'slow',
              label: '停手，补一次点蘸润滑再走',
              verdict: 'good',
              effect: { hours: 0.15, risk: -12 },
              feedback: '水渗进去之后撕裂声停了。停下来这一下，比省下的几分钟值。',
            },
            {
              key: 'push',
              label: '照原步距推过去',
              verdict: 'bad',
              effect: { integrity: -12, risk: 12 },
              feedback: '撕裂声是纤维在断。浸泡日久的简没有拉伸强度，听见了还推，就是听着它断。',
            },
          ],
        },
      ],
      doneFeedback: '简已与坨分离，但还搭在原位上——现在它整个的重量要有地方承接。',
    },
    {
      id: 's1-lift',
      type: 'pick',
      title: '托举',
      brief: '纤维严重腐朽、无拉伸强度：只要有一段悬空，自重就能把它拉断。',
      prompt: '简已剥离。怎么把它端走？',
      choices: [
        {
          key: 'board',
          label: '水润托片承接一端，再用木板整体托举',
          hint: '报告对策',
          verdict: 'good',
          effect: { hours: 0.15 },
          feedback:
            '受力沿整条简身均布，没有一段悬空。这正是报告为「纤维腐朽、无拉伸强度」开出的对策。',
        },
        {
          key: 'pinch',
          label: '捏住一端提起来',
          hint: '快',
          verdict: 'bad',
          effect: { integrity: -45, risk: 20 },
          feedback:
            '从捏点往外，整条简都靠自身纤维吊着。它没有这个强度——断在半空中，断口还带走了跨断口的两个字。',
          irreversible: true,
        },
        {
          key: 'slide',
          label: '沿盘底把它推到边上再端起',
          hint: '不让它悬空',
          verdict: 'fair',
          effect: { integrity: -12, legibility: -8, risk: 8 },
          feedback:
            '不悬空这个判断是对的，但推的过程中简面一直在蹭盘底。竹黄面耐磨强度低，蹭掉的是墨。',
        },
      ],
    },
  ],
  pass: [
    { key: 'integrity', min: 70, label: '简体完整度 ≥ 70%' },
    { key: 'legibility', min: 70, label: '字迹可辨度 ≥ 70%' },
    { key: 'provenance', min: 80, label: '层位信息 ≥ 80%' },
    { key: 'hours', max: 1.6, label: '单枚工时 ≤ 1.6 h' },
  ],
  benchmark: [
    '报告记载的揭取速度是一天不到 10 枚，每枚约一小时——慢不是效率问题，是这道工序的物理下限。',
    '井内原位清理出大木简 228 枚，另从四周扰土中清理和追回 2000 余枚，合计 2480 枚。也就是说，大木简里的绝大多数根本没有经过你刚才这道工序：它们没有层位，没有揭剥图，只剩下自身。',
    'III 区三分之一受井壁坍塌泥土挤压呈倾斜状、原位发生移动，IV 区南部大木简错位下沉 76 厘米——揭剥图要还原的本来就是一个已经受过扰动的堆积。',
  ],
};

// ═══════════════════════ 环节二　清洗 ═══════════════════════
const SIM_2: WjSim = {
  stageId: 2,
  title: '清洗工作台 · 单枚竹简',
  scene:
    '一枚饱水竹简躺在浅盘里，表面糊着泥，有没有字都还看不出来。清洗要在不损伤字迹的前提下去掉污垢——这两个目标之间有真实的张力。',
  visual: 'clean',
  readouts: [
    { key: 'legibility', label: '字迹可辨度' },
    { key: 'integrity', label: '简体完整度' },
    { key: 'hours', label: '本枚工时', unit: 'min', lower: true },
  ],
  steps: [
    {
      id: 's2-face',
      type: 'pick',
      title: '定起手面',
      brief: '字绝大部分写在竹黄面，少数写在竹青面。先洗哪一面不是习惯问题。',
      prompt: '简翻过来了。从哪一面开始？',
      choices: [
        {
          key: 'green',
          label: '从背面（竹青面）开始',
          hint: '组织致密、字迹耐磨',
          verdict: 'good',
          effect: {},
          feedback:
            '对。竹青面组织致密，即便有字也是清晰牢固、耐磨持久的那一类——先洗它，风险最低，而且能先探出这枚简是不是双面有字。',
        },
        {
          key: 'yellow',
          label: '从正面（竹黄面）开始',
          hint: '绝大部分字写在这面',
          verdict: 'bad',
          effect: { legibility: -25 },
          feedback:
            '竹黄面吸墨渗透好，但组织不致密、耐磨强度低，1700 年后墨迹本就散淡。在还没探明力度之前先动这一面，蹭掉的是全枚简上最要紧的那部分字。清洗规定先从背面即竹青面开始。',
          irreversible: true,
        },
      ],
    },
    {
      id: 's2-tool',
      type: 'pick',
      title: '选清洗笔',
      brief: '清洗工具经历了三代演变，每一代的淘汰都有具体的失败机制。',
      prompt: '笔筒里三代工具都在。挑一支。',
      choices: [
        {
          key: 'wolf',
          label: '狼毫毛笔',
          hint: '第一代',
          verdict: 'bad',
          effect: { hours: 18, legibility: -6 },
          feedback:
            '太软。简面凹凸不平处洗不净，只能反复蹭同一块——洗不掉泥，倒是把那一块的墨蹭淡了。这正是第一代被淘汰的原因。',
        },
        {
          key: 'lacquer',
          label: '笔锋外封油漆的毛笔',
          hint: '第二代',
          verdict: 'fair',
          effect: { hours: 12 },
          feedback:
            '有效——封漆提高了笔锋的弯曲刚度，解决了「太软」。但它不耐水，泡几小时即废，一支笔洗不完几枚简，换笔的时间全算在工时里。',
        },
        {
          key: 'nylon',
          label: '尼龙勾线笔',
          hint: '第三代，沿用至今',
          verdict: 'good',
          effect: {},
          feedback:
            '较柔软而力量比毛笔大，且本身耐水不怕泡——同时解决了前两代各自的问题，所以它是终选。',
        },
      ],
    },
    {
      id: 's2-force',
      type: 'dial',
      title: '定运笔力度',
      brief: '力度是这道工序唯一连续可调的量，也是字迹存亡所系。',
      prompt: '把力度调到你要的档位。',
      unit: '档',
      min: 1,
      max: 10,
      step: 1,
      init: 7,
      safe: [3, 5],
      perUnit: { legibility: -6, risk: 9 },
      okFeedback: '泥在走，墨没动。力度落在可控区间里。',
      offFeedback:
        '力度过大，笔锋压进了竹黄面的疏松组织。墨迹散淡本来就是这一面的宿命，再加力就是替 1700 年的时间把剩下的墨也抹掉。',
      marks: [
        { at: 3, label: '3' },
        { at: 5, label: '5' },
        { at: 10, label: '10' },
      ],
    },
    {
      id: 's2-advance',
      type: 'advance',
      title: '走完六道工序',
      brief: '清洗内部还有 6 道工序、10 余种工具。一枚简 40～50 分钟就耗在这里。',
      prompt: '逐道推进。中途简面上会出现新的情况。',
      unit: '道',
      total: 6,
      perTick: 1,
      tickEffect: { hours: 6 },
      riskEffect: { legibility: -4 },
      gaugeLabel: '清洗工序',
      events: [
        {
          at: 0.5,
          text: '背面洗到一半，竹黄面那侧的泥下面透出墨色——这是一枚双面有字的简。',
          choices: [
            {
              key: 'slow',
              label: '立即减速控力',
              verdict: 'good',
              effect: { hours: 8, risk: -15 },
              feedback:
                '这正是规程要求的动作：发现双面有字立即减速控力。多花的八分钟买的是竹黄面那一侧的字。',
            },
            {
              key: 'same',
              label: '按原力度继续，洗完再说',
              verdict: 'bad',
              effect: { legibility: -20, risk: 15 },
              feedback:
                '双面有字意味着两面都不能按「无字面」的力度对待。等洗完再看，竹黄面的墨迹已经淡到无法判断原本有没有字——这个损失不可逆。',
              irreversible: true,
            },
          ],
        },
      ],
      doneFeedback: '六道走完。泥去了，这枚简上有没有字、写了什么，第一次能看见了。',
    },
  ],
  pass: [
    { key: 'legibility', min: 75, label: '字迹可辨度 ≥ 75%' },
    { key: 'integrity', min: 80, label: '简体完整度 ≥ 80%' },
    { key: 'hours', max: 50, label: '本枚工时 ≤ 50 min' },
  ],
  benchmark: [
    '报告给的单枚清洗工时是 40～50 分钟，6 道工序，10 余种工具。',
    '竹简共 73631 枚。把 45 分钟乘进去，就是这批文物「规模」二字的真实含义——清洗这一项的总工时，本身就是一个需要按年计的工程量。',
  ],
};

// ═══════════════════ 环节三　绑夹与核对 ═══════════════════
const SIM_3: WjSim = {
  stageId: 3,
  title: '绑夹台 · 送脱色前的最后一关',
  scene:
    '面前一盒 40 枚已清洗的竹简，下一站是脱色槽。绑夹是形态管理，核对是身份绑定——这两件事都不能附带在别的工序里顺手做完。',
  visual: 'bind',
  readouts: [
    { key: 'provenance', label: '编号身份完整度' },
    { key: 'integrity', label: '简体完整度' },
    { key: 'legibility', label: '脱色药剂可及度' },
  ],
  steps: [
    {
      id: 's3-boil',
      type: 'pick',
      title: '备棉线',
      brief: '棉线是这一步唯一接触简体的材料，它自己也有参数。',
      prompt: '线轴刚拆封。直接用吗？',
      choices: [
        {
          key: 'boil',
          label: '先沸水蒸煮，晾至半干再用',
          hint: '规程要求',
          verdict: 'good',
          effect: {},
          feedback:
            '蒸煮让棉线的收缩先在简外发生完。此后它遇水不再收缩，缠在简上就只是约束，不是夹具。',
        },
        {
          key: 'raw',
          label: '直接用',
          hint: '省一道',
          verdict: 'bad',
          effect: { integrity: -20, risk: 15 },
          feedback:
            '棉线一进水就收缩，勒进简面。简体平均相对含水率 471%、结构全靠水撑着，这点局部应力足以压出一道永久的痕——原理简单，遗漏的后果直接且不可逆。',
          irreversible: true,
        },
      ],
    },
    {
      id: 's3-method',
      type: 'pick',
      title: '选绑夹方式',
      brief: '两套方法服务于不同目的。这一盒简的去向是脱色槽。',
      prompt: '这盒简要送去脱色。怎么绑？',
      choices: [
        {
          key: 'single',
          label: '单面「之」字形棉线缠绕，字迹一面朝外',
          hint: '脱色 / 脱水前用',
          verdict: 'good',
          effect: {},
          feedback:
            '对。药剂需要接触简体，双面夹住会挡住渗透路径——脱色脱水前必须改用单面之字形缠绕，字迹一面朝外。',
        },
        {
          key: 'double',
          label: '双面无机玻璃条夹住，两端棉线捆绑打活结',
          hint: '入库存放用',
          verdict: 'bad',
          effect: { legibility: -30, risk: 12 },
          feedback:
            '这是入库存放的方法，不是送脱色的方法。玻璃条把两面都遮住了，药液进不去，脱色效果会大打折扣。双面约束适合长期静置，不适合需要渗透的工序。',
        },
        {
          key: 'none',
          label: '不绑夹，直接放进特制脱色槽',
          hint: '2003 年 7 月第三批次试过',
          verdict: 'bad',
          effect: { provenance: -55, integrity: -10, risk: 30 },
          feedback:
            '这不是假设，是 2003 年 7 月真实发生过的事：第三批次脱色使用特制脱色槽、竹简不绑夹直接放入，结果有的简又薄又小，随水流漂移到其他简的槽内，造成编号混乱，并可能引起简的损伤，还大大降低了工作效率。此后的吴简脱色全部改为单面绑。',
          irreversible: true,
        },
      ],
    },
    {
      id: 's3-map',
      type: 'order',
      title: '核对编号',
      brief:
        '核对的不是数量，是映射关系。同一枚简在不同工序里可能有不同的身份标识。',
      prompt:
        '四枚简的记录卡混在一起了。按「揭剥号 → 脱色号」这条映射能够成立的可信程度，从最可信排到最不可信。',
      items: [
        {
          key: 'm1',
          label: '揭剥号 30-27-38 ⇢ 脱色号 08217',
          hint: '编号 ≤ 10545，先编号后脱色',
        },
        {
          key: 'm2',
          label: '揭剥号 12-04-09 ⇢ 脱色号 10545',
          hint: '恰在变更点之前的最后一枚',
        },
        {
          key: 'm3',
          label: '揭剥号 待查 ⇢ 脱色号 41880',
          hint: '编号 > 10546，先脱色再给编号',
        },
        {
          key: 'm4',
          label: '揭剥号 待查 ⇢ 脱色号 29130',
          hint: '落在 28051～30000 空号段内',
        },
      ],
      before: [
        ['m1', 'm3'],
        ['m2', 'm3'],
        ['m3', 'm4'],
      ],
      perViolation: { provenance: -18 },
      okFeedback:
        '排序成立。10545 及以前是先给编号再脱色，揭剥号与脱色号在同一份记录里对上；10546 以后是先脱色再给编号，映射要靠事后回查；落在空号段里的编号，则意味着这张卡本身就存疑。',
      badFeedback:
        '映射的可信度取决于编号是在哪一步产生的。报告写明「10546 以后的竹简是先脱色再给编号」——编号产生的时点晚于脱色，中间隔着一道工序，这条链就比 10545 之前弱。而 28051～30000 是空号段，落在里面的号码不该存在。',
      undecidable:
        'm1 与 m2 之间无法排出先后：两枚都在变更点之前、都是先编号后脱色，映射强度同级。',
    },
  ],
  pass: [
    { key: 'provenance', min: 80, label: '编号身份完整度 ≥ 80%' },
    { key: 'integrity', min: 85, label: '简体完整度 ≥ 85%' },
    { key: 'legibility', min: 80, label: '药剂可及度 ≥ 80%' },
  ],
  benchmark: [
    '脱色顺序编号 1～77731，其中 28051～30000（1950 个）与 67851～70000（2150 个）两段是空号；编号方式的变更点在 10546。',
    '2003 年 7 月第三批次的漂移事故之后，吴简脱色全部改为单面绑。这不是操作失误，是一次真实发生过的流程决策失败。',
  ],
};

// ═══════════════════════ 环节四　饱水保存 ═══════════════════════
const SIM_4: WjSim = {
  stageId: 4,
  title: '存放室 · 24 个月值守',
  scene:
    '搪瓷盘上架，简泡在水里。这一环不是等待：水里放什么、放多浓、多久换一次，要按微生物监测结果动态判断。1999 年蚀斑病大规模暴发，就发生在这个阶段。',
  visual: 'tank',
  readouts: [
    { key: 'integrity', label: '简体完整度' },
    { key: 'legibility', label: '字迹可辨度' },
    { key: 'hours', label: '已历时长', unit: '月', lower: false },
  ],
  steps: [
    {
      id: 's4-agent',
      type: 'pick',
      title: '选防腐药剂',
      brief:
        '存放室分离出细菌、放线菌、酵母菌和霉菌共 122 株、归为 25 个种；定种的 4 株里蜡状芽孢杆菌腐蚀作用最明显。',
      prompt: '药品柜里六种。选一种下到水里。',
      choices: [
        {
          key: 'iso',
          label: '异噻唑啉酮',
          hint: '0.5% 浓度 96 小时仍有 9mm 抑菌环',
          verdict: 'good',
          effect: {},
          feedback:
            '抑菌性能最优——其余药剂在 96 小时这个点上全部归零或长菌，只有它还留着 9mm 抑菌环；浸泡 315 天，颜色、强度均无变化。注意原液对皮肤有腐蚀性，配液时要防护。',
        },
        {
          key: 'mold',
          label: '霉敌',
          hint: '抑菌良好',
          verdict: 'fair',
          effect: { legibility: -12, risk: 10 },
          feedback:
            '抑菌良好，浸泡 200 天颜色、强度也无变化——但它会析出白色结晶包裹简面，字就藏在结晶下面。另外部分工作人员对它过敏。',
        },
        {
          key: 'cuso4',
          label: '硫酸铜',
          hint: '抑菌良好',
          verdict: 'fair',
          effect: { legibility: -18, risk: 8 },
          feedback: '抑菌良好、对人无特别问题，但对竹简颜色有副作用——而下一环恰恰是脱色。',
        },
        {
          key: 'benza',
          label: '新洁尔灭',
          hint: '0.1% 无效，0.2%～0.3% 有效',
          verdict: 'fair',
          effect: { risk: 18 },
          feedback:
            '可用，但浓度是硬门槛：0.1% 压不住，必须 0.2%～0.3%。下一步的浓度别调错。（筛选实验里的「新洁尔灭」与第三章实际使用的「复方新洁尔灭」并非同一种药剂。）',
        },
        {
          key: 'peracetic',
          label: '过氧乙酸',
          hint: '对照组',
          verdict: 'bad',
          effect: { integrity: -30, legibility: -25, risk: 25 },
          feedback:
            '24 小时即使竹简褪色、强度严重减弱。它是实验里表现更差的对照药剂之一，不是候选方案。',
          irreversible: true,
        },
        {
          key: 'glutar',
          label: '戊二醛',
          hint: '对照组',
          verdict: 'bad',
          effect: { legibility: -20, risk: 30 },
          feedback:
            '24 小时看着无害，但它久置自身聚合出沉淀——沉淀落在简面上，且药效随聚合流失。保存期按月计，不按小时计。',
        },
      ],
    },
    {
      id: 's4-conc',
      type: 'dial',
      title: '配浓度',
      brief: '浓度不是越高越好，但低于阈值就是完全无效。',
      prompt: '把药液浓度配到你要的值。',
      unit: '%',
      min: 0.05,
      max: 1,
      step: 0.05,
      init: 0.1,
      safe: [0.3, 0.6],
      perUnit: { risk: 60, integrity: -12 },
      okFeedback:
        '浓度落在有效区间。异噻唑啉酮的实验数据取在 0.5%，新洁尔灭的有效下限是 0.2%～0.3%——这个区间两者都压得住。',
      offFeedback:
        '浓度偏离有效区间。偏低压不住菌：新洁尔灭 0.1% 就是无效的那一档，而简体 471% 的含水率还会进一步稀释药剂，实际作用浓度低于标称值。偏高则把药剂本身变成了风险源。',
      marks: [
        { at: 0.1, label: '0.1' },
        { at: 0.3, label: '0.3' },
        { at: 0.6, label: '0.6' },
        { at: 1, label: '1.0' },
      ],
    },
    {
      id: 's4-cycle',
      type: 'dial',
      title: '定换液周期',
      brief: '药剂会随时间消耗，菌会随时间积累。换液周期是这一环唯一的节拍。',
      prompt: '每隔多少天换一次液？',
      unit: '天',
      min: 5,
      max: 90,
      step: 5,
      init: 60,
      safe: [15, 30],
      perUnit: { risk: 0.8, integrity: -0.2 },
      base: { hours: 0 },
      okFeedback: '周期适中：药效没跌到阈值以下，操作频次也没高到每次换液都成为一次扰动。',
      offFeedback:
        '周期偏离。拖太久，药效衰减之后就是无保护的空窗期；换得太勤，每一次搬盘换水都是对糟朽简体的一次机械扰动，而且人力也耗不起。',
      marks: [
        { at: 15, label: '15' },
        { at: 30, label: '30' },
        { at: 90, label: '90' },
      ],
    },
    {
      id: 's4-advance',
      type: 'advance',
      title: '值守 24 个月',
      brief: '按月推进，每月看一次监测。风险在这里慢慢兑现——失控是隐性的。',
      prompt: '开始值守。',
      unit: '月',
      total: 24,
      perTick: 2,
      tickEffect: { hours: 2 },
      riskEffect: { integrity: -6, legibility: -3 },
      gaugeLabel: '值守进程',
      events: [
        {
          at: 0.42,
          text:
            '第 10 个月，几枚简上出现半透明的膜状白斑，指甲轻碰即碎；另有几盘简面发黏。这是蚀斑病的白斑与黏液两种形态。',
          choices: [
            {
              key: 'raise',
              label: '立即提浓度，并把发病盘隔离单独处置',
              verdict: 'good',
              effect: { risk: -25, hours: 1 },
              feedback:
                '判断正确。白斑危害最大——竹体变半透明膜状、一碰就碎；隔离是为了不让它成为其他盘的菌源。新洁尔灭从 0.1% 提到 0.2%～0.3% 后抑菌效果稳定有效，说明浓度这条路是通的。',
            },
            {
              key: 'wash',
              label: '把发黏的简捞出来先清洗一遍',
              verdict: 'bad',
              effect: { integrity: -18, risk: 10 },
              feedback:
                '黏液本身不直接破坏简体，但清洗时反而伤简——而且黏液是真菌的碳源，不去掉菌源，洗过还会再长。先处理菌，不是先处理表象。',
            },
            {
              key: 'wait',
              label: '先观察一个周期再说',
              verdict: 'bad',
              effect: { integrity: -22, risk: 20 },
              feedback:
                '白斑已经出现就不是观察期。再等一个周期，软腐会跟上来——简体如海绵，那是结构性破坏，没有回头路。1999 年的大规模暴发就是这样起来的。',
              irreversible: true,
            },
          ],
        },
      ],
      doneFeedback: '24 个月走完。简还泡在水里，但它现在的状态就是下一环的起点。',
    },
  ],
  pass: [
    { key: 'integrity', min: 75, label: '简体完整度 ≥ 75%' },
    { key: 'legibility', min: 75, label: '字迹可辨度 ≥ 75%' },
  ],
  benchmark: [
    '四种候选药剂都是「很好的保存剂」，落选各有其因：霉敌析出白色结晶、硫酸铜影响颜色、新洁尔灭 0.1% 无效。最终胜出的是异噻唑啉酮——0.5% 浓度 96 小时仍有 9mm 抑菌环，浸泡 315 天颜色、强度均无变化。',
    '简体平均相对含水率 471%，纤维素含量已从新竹材的约 42% 降到 14.7%，木质素从约 28% 降到 7.86%。你这 24 个月守的，是一具全靠水撑着的结构。',
  ],
};

// ═══════════════════════ 环节五　脱色 ═══════════════════════
const SIM_5: WjSim = {
  stageId: 5,
  title: '脱色槽 · 两步法',
  scene:
    '简牍只要暴露于空气中，几分钟时间即可使其上的文字无法识别。变色有两条并行路径：木质素中的酚类被氧化成深色醌类（有机），Fe²⁺ 氧化为 Fe³⁺ 后与酚类、醌类络合成深色络合物（无机）。所以脱色是两步独立操作，不是一步。',
  visual: 'bleach',
  readouts: [
    { key: 'legibility', label: '字迹可辨度' },
    { key: 'integrity', label: '简体完整度' },
    { key: 'hours', label: '本批耗时', unit: 'h', lower: true },
  ],
  steps: [
    {
      id: 's5-edta-conc',
      type: 'dial',
      title: '第一步 · EDTA 二钠浓度',
      brief: '螯合 Fe³⁺，使其从简体析出进入溶液。不做这一步，后面还原了也会返色。',
      prompt: '这批简颜色中等偏深。配 EDTA 二钠水溶液。',
      unit: '%',
      min: 0.5,
      max: 3,
      step: 0.5,
      init: 0.5,
      safe: [1, 2],
      perUnit: { legibility: -10, risk: 12 },
      okFeedback: '落在报告区间：常规 1%，颜色过深的可增至 2%。',
      offFeedback:
        '浓度出了报告给的 1%～2%。偏低螯合不完全，残留的金属离子足以促成返色；偏高则是在没有必要的情况下延长简体与螯合剂的接触。',
      marks: [
        { at: 1, label: '1' },
        { at: 2, label: '2' },
        { at: 3, label: '3' },
      ],
    },
    {
      id: 's5-edta-time',
      type: 'dial',
      title: '第一步 · 浸泡时长',
      brief: '螯合需要时间走完，Fe³⁺ 要从简体内部扩散出来。',
      prompt: '浸多久？',
      unit: 'h',
      min: 6,
      max: 96,
      step: 6,
      init: 12,
      safe: [24, 72],
      perUnit: { legibility: -0.6, risk: 0.7 },
      base: { hours: 0 },
      okFeedback: '落在报告区间：常规 24 小时，颜色过深的可延长至 72 小时。',
      offFeedback:
        '时长出了报告给的 24～72 小时。不足则 Fe³⁺ 没来得及扩散出来，简是脱了一层表面的色；过长则是白白让简体多泡。',
      marks: [
        { at: 24, label: '24' },
        { at: 72, label: '72' },
      ],
    },
    {
      id: 's5-agent',
      type: 'pick',
      title: '第二步 · 选还原试剂',
      brief: '第二步要把深色的醌类还原回无色的酚类。四种试剂都做过实验。',
      prompt: '选一种配液。',
      choices: [
        {
          key: 'dithionite',
          label: '连二亚硫酸钠',
          hint: '1%，60℃ 蒸馏水配制',
          verdict: 'good',
          effect: {},
          feedback:
            '水溶液为中性，其作用只是恢复简牍深埋地下时的化学结构；红外实验证明它对竹简内部结构破坏性小。2002 年《走马楼三国吴简科技保护方案》通过评审后，后续全部改用此法。',
        },
        {
          key: 'oxalic',
          label: '草酸',
          hint: '3%，前两批用过',
          verdict: 'bad',
          effect: { integrity: -25, risk: 20 },
          feedback:
            '酸性对简牍降解成分有部分溶出作用——这既是它的脱色原理，也是它损害简牍的根本原因；且残留金属离子仍足以促成返色。前两批（2480 枚大木简、编号 1～10545 的竹简）用的就是草酸法，此后弃用。',
          irreversible: true,
        },
        {
          key: 'h2o2',
          label: '过氧化氢（双氧水）',
          hint: '10%',
          verdict: 'bad',
          effect: { integrity: -20, legibility: -12, risk: 18 },
          feedback:
            '氧化作用很广泛，对与颜色变化无关的化学结构也有破坏。测色数据上它 24 小时能到 4.3，和草酸持平——但「颜色变浅」从来不是脱色试剂的唯一评价标准。',
        },
        {
          key: 'nabh4',
          label: '硼氢化钠',
          hint: '0.5%',
          verdict: 'bad',
          effect: { integrity: -60, legibility: -40, risk: 40 },
          feedback:
            '完全失败：即使 0.5% 浓度，竹简也会在几分钟后变腐松软、漂浮于液面。槽里现在浮着的不是简，是简的残骸。',
          irreversible: true,
        },
      ],
    },
    {
      id: 's5-temp',
      type: 'dial',
      title: '第二步 · 保温温度',
      brief: '连二亚硫酸钠用 60℃ 蒸馏水配制 1% 溶液，作用过程保温。温度是这一步唯一要盯住的量。',
      prompt: '把恒温槽调到作用温度。',
      unit: '℃',
      min: 20,
      max: 80,
      step: 1,
      init: 25,
      safe: [45, 50],
      perUnit: { legibility: -2.2, integrity: -1.2, risk: 3 },
      okFeedback: '恒温槽稳在 45～50℃，正是报告给的保温区间。蓝色值开始往下走。',
      offFeedback:
        '温度出了 45～50℃ 的保温区间。偏低反应走不动，蓝色值停在高位；偏高则在给一具纤维素结晶度只剩 21.3% 的简体额外加热应力。',
      marks: [
        { at: 45, label: '45' },
        { at: 50, label: '50' },
        { at: 80, label: '80' },
      ],
    },
    {
      id: 's5-advance',
      type: 'advance',
      title: '保温作用',
      brief: '按分钟推进，罗维朋蓝色值实时读数——数值越低脱色效果越好。',
      prompt: '开始计时。报告给的作用时长是 20～40 分钟。',
      unit: 'min',
      total: 40,
      perTick: 5,
      tickEffect: { hours: 0.083 },
      riskEffect: { integrity: -3, legibility: -2 },
      gaugeLabel: '作用时长',
      events: [
        {
          at: 0.5,
          text: '20 分钟到。蓝色值已经落到接近平台区，再往下走的空间不大了。',
          choices: [
            {
              key: 'stop',
              label: '按 20～40 分钟的下限收，起简',
              verdict: 'good',
              effect: { risk: -10 },
              feedback:
                '收得住。连二亚硫酸钠的实测曲线是「快而彻底」——30 分钟即到 3.3，此后 24 小时也只降到 3.1。剩下那 0.2 不值得让简体多泡二十分钟。',
            },
            {
              key: 'extend',
              label: '延长到 60 分钟，再多脱一点',
              verdict: 'bad',
              effect: { integrity: -12, risk: 12 },
              feedback:
                '超出报告给的 20～40 分钟。曲线早已进入平台，多出来的时间不换颜色，只换简体在热药液里的额外暴露。',
            },
          ],
        },
      ],
      doneFeedback: '起简、换清水。这批简从「能保存」跨进了「能使用」。',
    },
  ],
  pass: [
    { key: 'legibility', min: 75, label: '字迹可辨度 ≥ 75%' },
    { key: 'integrity', min: 80, label: '简体完整度 ≥ 80%' },
  ],
  benchmark: [
    '测色数据（罗维朋蓝色值，越低越好）：连二亚硫酸钠 1% 在 30min 即达 3.3，24h 为 3.1；草酸 3% 从 5.0 降到 4.3；双氧水 10% 从 5.5 降到 4.3。草酸与双氧水 24h 时数值相同，但一个溶出简牍降解成分、一个破坏无关化学结构，都被排除。',
    '脱色工作从 1997 年 6 月开始至 2008 年 11 月彻底结束，共 10 批次，历时 11 年。',
  ],
};

// ═══════════════════════ 环节六　脱水 ═══════════════════════
const SIM_6: WjSim = {
  stageId: 6,
  title: '脱水台 · 填充与干燥',
  scene:
    '这枚简的纤维素结晶度已从天然竹的 72.6% 降到 21.3%，平均相对含水率 471%，内部结构完全靠水分支撑——直观感觉就是海绵。脱水要在撤走水的同时，用固体材料接替水的支撑功能。这是不可逆程度最高的一道。',
  visual: 'dry',
  readouts: [
    { key: 'integrity', label: '形态保持度' },
    { key: 'legibility', label: '字迹可辨度' },
    { key: 'hours', label: '本批耗时', unit: 'h', lower: true },
  ],
  steps: [
    {
      id: 's6-triage',
      type: 'pick',
      title: '判材质',
      brief: '脱水方法的选择依据是材质状况，不是形制分类。',
      prompt: '台上这一批是竹简。先确认走哪条路。',
      choices: [
        {
          key: 'fill',
          label: '走填充脱水',
          hint: '竹简腐朽严重，必须填充',
          verdict: 'good',
          effect: {},
          feedback:
            '对。竹简纤维素结晶度只剩 21.3%，撤水之后没有东西撑得住它——必须先把固体填进去。',
        },
        {
          key: 'natural',
          label: '走自然干燥，省去填充',
          hint: '2480 枚大木简当年这么做',
          verdict: 'bad',
          effect: { integrity: -55, legibility: -35, risk: 30 },
          feedback:
            '自然干燥法只适用于大木简：它们材质为杉木，腐朽程度远低于竹简，1997 年 7 月至 1998 年 6 月自然干燥、无须填充。竹简照搬这条路，宽度平均收缩率就是 50.6%——简皱缩变形，字迹随之扭曲。',
          irreversible: true,
        },
      ],
    },
    {
      id: 's6-material',
      type: 'pick',
      title: '选填充材料',
      brief: '五种方法做过对比实验，胜负可直接从数据读出。',
      prompt: '料柜里五种。选一种。',
      choices: [
        {
          key: 'hexadecanol',
          label: '十六醇',
          hint: '熔点 49℃',
          verdict: 'good',
          effect: {},
          feedback:
            '颜色浅黄、收缩率（长度 3% 以内、宽度 5% 左右）、化学稳定性三项全面胜出。憎水性强，脱水后简牍不再吸水，返潮和颜色不稳的问题一并解决。',
        },
        {
          key: 'peg',
          label: 'PEG4000',
          hint: '经典水置换填充剂',
          verdict: 'bad',
          effect: { legibility: -40, risk: 15 },
          feedback: '简面颜色偏黑，字迹无法识辨。上一环刚把颜色脱出来，这一步又给盖回去了。',
          irreversible: true,
        },
        {
          key: 'sucrose',
          label: '蔗糖',
          hint: '廉价易得',
          verdict: 'bad',
          effect: { legibility: -40, risk: 15 },
          feedback: '同样是简面颜色偏黑、字迹无法识辨。',
          irreversible: true,
        },
        {
          key: 'mastic',
          label: '乳香胶',
          hint: '天然树脂',
          verdict: 'fair',
          effect: { legibility: -15, integrity: -15, risk: 12 },
          feedback:
            '部分竹简表面颜色偏暗，且垂直于竹纤维方向的收缩率较大——恰好是宽度方向，也就是收缩本来就最厉害的那个方向。',
        },
        {
          key: 'glyoxal',
          label: '乙二醛',
          hint: '可行但挑环境',
          verdict: 'fair',
          effect: { legibility: -10, risk: 10 },
          feedback:
            '南方高湿环境下吸湿后颜色略暗，对保存环境湿度要求偏高。长沙就在南方——这个条件不是实验室里能约掉的。',
        },
      ],
    },
    {
      id: 's6-temp',
      type: 'dial',
      title: '控熔融温度',
      brief: '十六醇熔点 49℃，接近常温，温控要求精确。',
      prompt: '调熔融槽温度。要让它保持液态，又不能烫着简。',
      unit: '℃',
      min: 30,
      max: 90,
      step: 1,
      init: 40,
      safe: [52, 60],
      perUnit: { integrity: -2.5, legibility: -1.2, risk: 3.5 },
      okFeedback: '略高于熔点 49℃，十六醇保持液态可以渗入，简体也没有承受多余的热。',
      offFeedback:
        '温度不合适。低于 49℃ 十六醇会在渗入途中凝固，只填了个表层；过高则是拿热去烤一具结晶度只剩 21.3% 的纤维骨架。',
      marks: [
        { at: 49, label: '49 熔点' },
        { at: 60, label: '60' },
      ],
    },
    {
      id: 's6-load',
      type: 'dial',
      title: '定填充量',
      brief:
        '这是结构性填充，不是表面涂层——填充物要比竹材本身还重，才接替得了水的支撑功能。',
      prompt: '按简牍本体重量的百分比设定填充量。',
      unit: '%',
      min: 40,
      max: 280,
      step: 10,
      init: 80,
      safe: [180, 230],
      perUnit: { integrity: -0.35, risk: 0.4 },
      okFeedback: '落在 205% 这一档附近——填充物比竹材本身还重，水撤走之后有东西接替支撑。',
      offFeedback:
        '填充量偏离报告实测的 205%。偏低则内部还有空腔，撤水后照样塌；偏高则简体被多余的固体撑着，重量和内应力都是白加的。',
      marks: [
        { at: 100, label: '100' },
        { at: 205, label: '205 实测' },
        { at: 280, label: '280' },
      ],
    },
    {
      id: 's6-advance',
      type: 'advance',
      title: '干燥',
      brief:
        '撤水开始。长度与宽度的收缩率实时读出——无填充时分别是 20.4% 和 50.6%，字会被压扁。',
      prompt: '开始干燥，直到重量稳定。',
      unit: '%',
      total: 100,
      perTick: 20,
      tickEffect: { hours: 6 },
      riskEffect: { integrity: -7, legibility: -4 },
      gaugeLabel: '干燥进程',
      events: [
        {
          at: 0.6,
          text: '收缩读数开始分叉：宽度方向掉得比长度方向快得多。字正在被压扁。',
          choices: [
            {
              key: 'hold',
              label: '维持当前温湿度，让它按节奏走完',
              verdict: 'good',
              effect: { hours: 2 },
              feedback:
                '各向异性是竹材本身的性质——纤维沿轴向排列，长度方向就是轴向，所以宽度缩得多。填充到位的话，两个方向都会收在 5% 之内。分叉不等于失控。',
            },
            {
              key: 'rush',
              label: '升温加快，把剩下的水赶紧赶出去',
              verdict: 'bad',
              effect: { integrity: -20, legibility: -15, risk: 18 },
              feedback:
                '加快撤水，等于让填充材料来不及在腾出的空腔里就位。收缩率会冲出 5% 的指标线——而脱水是不可逆程度最高的一道，冲出去就收不回来。',
              irreversible: true,
            },
          ],
        },
      ],
      doneFeedback: '重量稳定，干燥结束。这枚简此后就是这个形状了。',
    },
  ],
  pass: [
    { key: 'integrity', min: 80, label: '形态保持度 ≥ 80%（对应收缩率 ≤ 5%）' },
    { key: 'legibility', min: 75, label: '字迹可辨度 ≥ 75%' },
  ],
  benchmark: [
    '脱水指标：收缩率应在 5% 之内，最好能达到 3% 之内。十六醇实测长度 3% 以内、宽度 5% 左右。',
    '十六醇填充量达简牍本体重量的 205%，脱水后抗张强度提升至原来的 919%。',
    '无填充自然干燥（20℃、相对湿度 75%）的对照数据：长度平均收缩率 20.4%，宽度平均收缩率 50.6%。',
  ],
};

export const SIMS: WjSim[] = [SIM_1, SIM_2, SIM_3, SIM_4, SIM_5, SIM_6];

export function getSim(stageId: number): WjSim | undefined {
  return SIMS.find((s) => s.stageId === stageId);
}

// ───────────────────────── 结算 ─────────────────────────

export interface WjSimRun {
  /** 各步的选择：pick 存 choice key，dial 存数值，order 存 key 顺序，advance 存事件处置 */
  picks: Record<string, string>;
  dials: Record<string, number>;
  orders: Record<string, string[]>;
  /** 终值 */
  state: WjSimState;
  /** 是否已结算 */
  settled: boolean;
  /** 第几次开工 */
  attempt: number;
}

export function clampState(s: WjSimState): WjSimState {
  return {
    integrity: Math.max(0, Math.min(100, s.integrity)),
    legibility: Math.max(0, Math.min(100, s.legibility)),
    provenance: Math.max(0, Math.min(100, s.provenance)),
    hours: Math.max(0, s.hours),
    risk: Math.max(0, Math.min(100, s.risk)),
  };
}

export function applyEffect(s: WjSimState, e: WjSimEffect): WjSimState {
  return clampState({
    integrity: s.integrity + (e.integrity ?? 0),
    legibility: s.legibility + (e.legibility ?? 0),
    provenance: s.provenance + (e.provenance ?? 0),
    hours: s.hours + (e.hours ?? 0),
    risk: s.risk + (e.risk ?? 0),
  });
}

/** dial 偏离安全带的单位数（在带内为 0） */
export function dialDeviation(step: WjSimDialStep, value: number): number {
  const [lo, hi] = step.safe;
  if (value < lo) return lo - value;
  if (value > hi) return value - hi;
  return 0;
}

/** order 违反的约束条数 */
export function orderViolations(step: WjSimOrderStep, order: string[]): [string, string][] {
  const idx = new Map(order.map((k, i) => [k, i]));
  return step.before.filter(([first, second]) => {
    const a = idx.get(first);
    const b = idx.get(second);
    return a !== undefined && b !== undefined && a > b;
  });
}

export function isPassed(sim: WjSim, state: WjSimState): boolean {
  return sim.pass.every((p) => {
    const v = state[p.key];
    if (p.min !== undefined && v < p.min) return false;
    if (p.max !== undefined && v > p.max) return false;
    return true;
  });
}
