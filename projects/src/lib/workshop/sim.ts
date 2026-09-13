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
 *
 * **分工纪律：仿真管「手」，细问管「脑」。**
 * 工步只做操作——排次序、挑工具、调参数、逐段推进；反馈只说三件事：发生了什么现象、
 * 指标掉了多少、规程是怎么规定的。**不讲机理，不讲为什么**——机理、推理、计算、设计
 * 全部留给紧跟其后的细问去追问。凡一条反馈把某道细问的评阅要点说出来了，就是越界；
 * 凡一个工步本身就是某道细问的题干，就换成另一个手上的动作。
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
      id: 's1-record',
      type: 'pick',
      title: '建档',
      brief: '简一离开叠压状态，它在井里的位置就只剩记录。揭剥图和盆号在这一刻产生。',
      prompt: '面前是 a 坨。下刀之前，这一坨的档案先建到哪一步？',
      choices: [
        {
          key: 'full',
          label: '拍照、绘揭剥图、登记盆号，三样齐了再动',
          hint: '规程要求',
          verdict: 'good',
          effect: { hours: 0.25 },
          feedback: '揭剥图上 a 坨这一格填上了：位置、与 b 坨的叠压关系、盆号。现在可以下刀。',
        },
        {
          key: 'photo',
          label: '只拍一张照，图和号回头补',
          hint: '省时间',
          verdict: 'fair',
          effect: { provenance: -14, risk: 6 },
          feedback: '照片里看得见这一坨在哪，但里头哪一枚是哪一枚，没有号对不上。揭剥图这一格还是空的。',
        },
        {
          key: 'none',
          label: '先揭，揭完凭印象补记录',
          hint: '快',
          verdict: 'bad',
          effect: { provenance: -38, risk: 10 },
          feedback: '揭起来了。揭剥图上 a 坨这一格空着，盆号也没登——此刻它和 b 坨之间的关系，只在你的印象里。',
          irreversible: true,
        },
      ],
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
          feedback: '夹点上压出一道凹痕，提拉时从这一点裂开。揭取要的是沿界面剥离，不是把简拽出来。',
        },
        {
          key: 'hand',
          label: '直接用手指分',
          hint: '凭手感找层',
          verdict: 'bad',
          effect: { integrity: -25, legibility: -10, risk: 30 },
          feedback: '指腹进不了缝隙，只在简面上蹭。蹭过的地方，墨当场淡了一层。',
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
          feedback: '字迹当场晕开一片。报告写得很清楚：切忌温水直接倒在文字上。',
          irreversible: true,
        },
        {
          key: 'dry',
          label: '不润滑，直接推',
          hint: '避免水接触字迹',
          verdict: 'bad',
          effect: { integrity: -20, risk: 25 },
          feedback: '刀口前面的简体一段一段地崩。报告给的是「点蘸」，不是「不用」。',
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
              feedback: '撕裂声没停。推过去了，这一段多了一道断口。',
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
          feedback: '断在半空中。断口带走了跨断口的两个字。',
          irreversible: true,
        },
        {
          key: 'slide',
          label: '沿盘底把它推到边上再端起',
          hint: '不让它悬空',
          verdict: 'fair',
          effect: { integrity: -12, legibility: -8, risk: 8 },
          feedback: '不悬空这个判断是对的，但推的过程中简面一直在蹭盘底。蹭掉的是墨。',
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
          feedback: '这是规程规定的起手面。先洗它，还能先探出这枚简是不是双面有字。',
        },
        {
          key: 'yellow',
          label: '从正面（竹黄面）开始',
          hint: '绝大部分字写在这面',
          verdict: 'bad',
          effect: { legibility: -25 },
          feedback: '还没探明力度就先动了这一面。这一面上本来就淡的墨，又掉了一层。清洗规定先从背面即竹青面开始。',
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
          feedback: '凹处的泥洗不净，同一块蹭了三遍。泥还在，那一块的墨倒淡了。',
        },
        {
          key: 'lacquer',
          label: '笔锋外封油漆的毛笔',
          hint: '第二代',
          verdict: 'fair',
          effect: { hours: 12 },
          feedback: '能洗。两个小时后笔锋泡散了，换了一支——换笔的时间全算在工时里。',
        },
        {
          key: 'nylon',
          label: '尼龙勾线笔',
          hint: '第三代，沿用至今',
          verdict: 'good',
          effect: {},
          feedback: '能洗，泡一天也不坏。这是现在在用的那一支。',
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
      offFeedback: '力度过大。泥走得快，墨也跟着走——字迹读数在掉。',
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
              feedback: '这是规程要求的动作：发现双面有字立即减速控力。多花了八分钟。',
            },
            {
              key: 'same',
              label: '按原力度继续，洗完再说',
              verdict: 'bad',
              effect: { legibility: -20, risk: 15 },
              feedback: '洗完了。另一面的墨掉了一层，字迹读数掉了二十。',
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
          feedback: '按规程蒸煮过的棉线。缠上去之后入水，没有再收紧。',
        },
        {
          key: 'raw',
          label: '直接用',
          hint: '省一道',
          verdict: 'bad',
          effect: { integrity: -20, risk: 15 },
          feedback: '棉线一进水就收缩，勒进简面，留下一道压痕。规程要求使用前沸水蒸煮。',
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
          feedback: '这是脱色、脱水前规定的绑法：单面之字形缠绕，字迹一面朝外。',
        },
        {
          key: 'double',
          label: '双面无机玻璃条夹住，两端棉线捆绑打活结',
          hint: '入库存放用',
          verdict: 'bad',
          effect: { legibility: -30, risk: 12 },
          feedback: '这是入库存放的绑法。玻璃条把两面都遮住了，药剂可及度读数掉了三十。',
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
      id: 's3-check',
      type: 'pick',
      title: '送槽前核对',
      brief: '核对的不是数量，是每一枚简与它那张记录卡之间的对应。',
      prompt: '一盒 40 枚，卡也是 40 张。送进脱色槽之前怎么核？',
      choices: [
        {
          key: 'each',
          label: '逐枚对卡，简与卡同框拍一张再入槽',
          hint: '规程要求',
          verdict: 'good',
          effect: { hours: 0.5 },
          feedback: '40 枚、40 张卡、40 张同框照。这盒简进槽之前，每一枚的身份都留了底。',
        },
        {
          key: 'count',
          label: '点数：40 枚，齐了',
          hint: '快',
          verdict: 'bad',
          effect: { provenance: -26, risk: 10 },
          feedback: '数量对上了。哪一枚对应哪张卡，这一步没有人看过。',
        },
        {
          key: 'sample',
          label: '抽 10 枚对卡，对得上就整盒放行',
          hint: '折中',
          verdict: 'fair',
          effect: { provenance: -10, hours: 0.15, risk: 5 },
          feedback: '抽到的 10 枚都对得上。剩下 30 枚的对应关系，没有被任何人确认过。',
        },
      ],
    },
  ],
  pass: [
    { key: 'provenance', min: 80, label: '编号身份完整度 ≥ 80%' },
    { key: 'integrity', min: 85, label: '简体完整度 ≥ 85%' },
    { key: 'legibility', min: 80, label: '药剂可及度 ≥ 80%' },
  ],
  benchmark: [
    '2003 年 7 月第三批次的漂移事故之后，吴简脱色全部改为单面绑。这不是操作失误，是一次真实发生过的流程决策失败。',
    '入库存放与送脱色前是两套绑法：前者双面无机玻璃条夹住、两端棉线打活结；后者单面「之」字形棉线缠绕，字迹一面朝外。棉线使用前须沸水蒸煮。',
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
          feedback: '下药。菌落读数稳住了，简的颜色和手感没有变化。配液时按规程戴了手套。',
        },
        {
          key: 'mold',
          label: '霉敌',
          hint: '抑菌良好',
          verdict: 'fair',
          effect: { legibility: -12, risk: 10 },
          feedback: '下药。菌落读数稳住了。两个月后简面裹上一层白色结晶，字迹读数掉了。',
        },
        {
          key: 'cuso4',
          label: '硫酸铜',
          hint: '抑菌良好',
          verdict: 'fair',
          effect: { legibility: -18, risk: 8 },
          feedback: '下药。菌落读数稳住了。简面泛出一层色，字迹读数掉了。',
        },
        {
          key: 'benza',
          label: '新洁尔灭',
          hint: '0.1% 无效，0.2%～0.3% 有效',
          verdict: 'fair',
          effect: { risk: 18 },
          feedback: '下药。菌落读数会不会压住，看下一步配多浓。',
        },
        {
          key: 'peracetic',
          label: '过氧乙酸',
          hint: '对照组',
          verdict: 'bad',
          effect: { integrity: -30, legibility: -25, risk: 25 },
          feedback: '下药。24 小时后简褪了色，一捏就软。',
          irreversible: true,
        },
        {
          key: 'glutar',
          label: '戊二醛',
          hint: '对照组',
          verdict: 'bad',
          effect: { legibility: -20, risk: 30 },
          feedback: '下药。头一天没事。几周后药液浑了，盘底和简面上落了一层沉淀。',
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
      okFeedback: '浓度落在有效区间。',
      offFeedback: '浓度偏离有效区间。偏低，菌落读数压不下去；偏高，简的颜色开始变。',
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
      okFeedback: '周期适中。',
      offFeedback: '周期偏离。拖太久，菌落读数在换液前就抬头；换得太勤，每次搬盘都碰掉一点简体，人力也耗不起。',
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
              feedback: '提浓度、隔离发病盘。两周后菌落读数回落，白斑没有再扩。',
            },
            {
              key: 'wash',
              label: '把发黏的简捞出来先清洗一遍',
              verdict: 'bad',
              effect: { integrity: -18, risk: 10 },
              feedback: '捞出来洗。洗的时候两枚简面掉了一层。一个月后，同一批简又发黏了。',
            },
            {
              key: 'wait',
              label: '先观察一个周期再说',
              verdict: 'bad',
              effect: { integrity: -22, risk: 20 },
              feedback: '等了一个周期。白斑扩到了隔壁两盘，有三枚简摸上去像海绵。',
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
    '存放室分离出 122 株、归为 25 个种；定种的 4 株里蜡状芽孢杆菌腐蚀作用最明显。1999 年蚀斑病大规模暴发，就发生在保存期。',
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
      offFeedback: '浓度出了报告给的 1%～2%。偏低，起简几天后颜色回深；偏高，简体多泡了没必要的一程。',
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
      offFeedback: '时长出了报告给的 24～72 小时。不足，第二步之后颜色回深；过长，白白多泡。',
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
          feedback: '配 1% 溶液，60℃ 蒸馏水。2002 年《走马楼三国吴简科技保护方案》通过评审后，后续批次用的都是它。',
        },
        {
          key: 'oxalic',
          label: '草酸',
          hint: '3%，前两批用过',
          verdict: 'bad',
          effect: { integrity: -25, risk: 20 },
          feedback: '颜色退了一些。起简后简体读数掉了，几天后颜色又回深了一层。前两批用的是它，此后弃用。',
          irreversible: true,
        },
        {
          key: 'h2o2',
          label: '过氧化氢（双氧水）',
          hint: '10%',
          verdict: 'bad',
          effect: { integrity: -20, legibility: -12, risk: 18 },
          feedback: '颜色退得慢，泡到很久才见效。起简后简体读数掉了。',
        },
        {
          key: 'nabh4',
          label: '硼氢化钠',
          hint: '0.5%',
          verdict: 'bad',
          effect: { integrity: -60, legibility: -40, risk: 40 },
          feedback: '几分钟后，简变腐松软、漂上了液面。',
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
      offFeedback: '温度出了 45～50℃ 的保温区间。偏低，蓝色值停在高位不动；偏高，简体读数在掉。',
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
              feedback: '20 分钟起简。蓝色值读数落在平台区。',
            },
            {
              key: 'extend',
              label: '延长到 60 分钟，再多脱一点',
              verdict: 'bad',
              effect: { integrity: -12, risk: 12 },
              feedback: '超出报告给的 20～40 分钟。多泡的二十分钟里蓝色值只降了 0.1，简体读数掉了。',
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
    '报告的标准流程：1% EDTA 二钠浸泡 24 小时（颜色过深的 2%、72 小时）→ 1% 连二亚硫酸钠，60℃ 蒸馏水配制，保温 45～50℃，作用 20～40 分钟。',
    '脱色工作从 1997 年 6 月开始至 2008 年 11 月彻底结束，共 10 批次，历时 11 年。前两批用草酸法，2002 年方案评审后全部改用连二亚硫酸钠法。',
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
          feedback: '走填充。这是报告对竹简的规定路线。',
        },
        {
          key: 'natural',
          label: '走自然干燥，省去填充',
          hint: '2480 枚大木简当年这么做',
          verdict: 'bad',
          effect: { integrity: -55, legibility: -35, risk: 30 },
          feedback: '不填充直接干。报告里自然干燥只用于 2480 枚大木简；竹简这么走，等一下看收缩率读数。',
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
          feedback: '报告最终采用的材料。熔点 49℃，下一步温度要盯住。',
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
          feedback: '简面颜色偏暗。干燥后宽度那一栏的读数比长度掉得多。',
        },
        {
          key: 'glyoxal',
          label: '乙二醛',
          hint: '可行但挑环境',
          verdict: 'fair',
          effect: { legibility: -10, risk: 10 },
          feedback: '干燥当时没问题。入库一个夏天后，简面吸了湿、颜色转暗。',
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
      okFeedback: '槽里的十六醇保持清亮的液态。',
      offFeedback: '温度不合适。偏低，槽里的十六醇结出白块、简只挂了一层壳；偏高，简面颜色转深，读数在掉。',
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
      okFeedback: '落在报告实测的 205% 附近。',
      offFeedback: '填充量偏离报告实测的 205%。偏低，干燥时收缩率读数会冲线；偏高，简比原来重了一截。',
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
              feedback: '按节奏走完。两个方向的读数最后都停在了指标线以内。',
            },
            {
              key: 'rush',
              label: '升温加快，把剩下的水赶紧赶出去',
              verdict: 'bad',
              effect: { integrity: -20, legibility: -15, risk: 18 },
              feedback: '升温赶水。宽度那一栏冲过了 5% 的指标线，简面裂了两道。',
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
    '十六醇熔点 49℃，填充量达简牍本体重量的 205%。',
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
