/**
 * 演示学情数据 seed：3 个班级 × 7 名学生，进度梯度错落。
 * 账号 email = 学工号@demo.invalid，可按此清理。
 * 可重复运行（幂等：账号按 email 复用，progress 按 user_id upsert）。
 */
import { createClient } from '@supabase/supabase-js';
import { STAGES } from './src/lib/workshop/content.ts';

const admin = createClient(
  process.env.COZE_SUPABASE_URL,
  process.env.COZE_SUPABASE_SERVICE_ROLE_KEY,
);

// ---------- 小问清单（按学习顺序展开） ----------
const PARTS = [];
for (const s of STAGES) {
  for (const q of s.questions) {
    if (q.parts.length === 0) {
      PARTS.push({ stageId: s.id, qid: q.id, label: null });
    } else {
      for (const p of q.parts) PARTS.push({ stageId: s.id, qid: q.id, label: p.label });
    }
  }
}
const QUESTIONS = [];
for (const s of STAGES) {
  for (const q of s.questions) {
    QUESTIONS.push({
      stageId: s.id,
      qid: q.id,
      parts: q.parts.map((p) => p.label),
      draw: q.parts.some((p) => p.input?.type === 'drawing'),
    });
  }
}

// ---------- 标准答案（full = 完整作答；mid/low 由句子截取生成） ----------
const A = {
  // 环节一 揭取
  '1-q1-a':
    '排序：a → b → c① → c② → c③ → d → e\n补充：b→d 只约束 b 在 d 上、d→e 只约束 d 在 e 上，c 坨与 d 坨之间没有任何记录约束直接先后——把 d 放在 c 坨之上同样合法，两种排法都与全部记录相容。',
  '1-q1-b':
    '可行的揭取顺序与层序一致：a → b → c 坨（c①→c②→c③）→ d → e。若 d 在 b 之前取出，破坏的是 b→d 这条记录；叠压面一旦被破坏就永久消失，事后测量或摄影都只能记录破坏后的状态，无法补救。',
  '1-q2-a':
    '选择：误\n说明：层位关系的破坏并非全部由 1996 年施工机械造成——III 区三分之一受井壁坍塌挤压倾斜错乱、IV 区大木简下沉 76 厘米，都是出土前的自然扰动。',
  '1-q2-b':
    '选择：正\n说明：揭剥号（区—坨—序）记录的是简在井中的空间位置，是后续所有工序中简牍身份的维系。',
  '1-q2-c':
    '选择：误\n说明：2480 枚大木简中只有 228 枚是井内原位清理、配有揭剥图；其余 2000 余枚从扰土中追回，没有层位，只剩实物。',
  '1-q2-d':
    '选择：误\n说明：升温针对的是植物油的黏性——软化油层解决粘连；且规定严禁温水直接浇在文字上。',
  '1-q2-e':
    '选择：误\n说明：最大困难是叠压面之间无明显界面可循、粘连太紧，加上纤维腐朽无拉伸强度；「脆」只是困难之一，而且托片承接、整体托举就是对它的对策。',
  '1-q3-b':
    '前提至少两条：一是编绳磨痕的间距与形态如实保留了原始编联位置；二是简端平/弧面与字面朝向的对应关系在整个卷册中保持一致，不受扰动影响。',
  '1-q3-c':
    '可以看简端断面的形制与磨损、编绳孔的错位与间距变化、简身弯曲弧度的残留；单条判据可靠性都有限，必须多条互相印证。',
  // 环节二 清洗
  '2-q1-a': '选择：B',
  '2-q1-b':
    '竹黄组织致密度低、孔隙大，所以吸墨渗透好；但同样的孔隙让墨迹随纤维降解而散淡。竹青致密耐磨，字迹浮在表面反而清晰牢固——两种后果同源于组织致密度的差异。',
  '2-q1-c':
    '最坏情况是把竹黄面散淡的字迹直接刷掉，字迹永久失去，不可逆。所以规定先从竹青面开始清洗，发现双面有字立即减速控力。',
  '2-q2-a':
    '尼龙勾线笔锋有足够弹性力量压住简面凹凸处的泥污，同时不吸水、耐长时间浸泡——同时解决了第一代「太软洗不净」和第二代「不耐水泡几小时即废」两个失败机制。',
  '2-q2-b':
    '封漆改变的是笔锋的刚度：硬化后的锋尖能把力传到凹凸处的污垢上，代替狼毫的软毛压住简面。',
  '2-q2-c':
    '柔软指弹性模量低、能贴合简面；力量大指弹性回复力强、受压后回弹足。尼龙丝细而有刚性恢复，两个性质分属不同的力学量，并不矛盾。',
  '2-q2-d':
    '硬度可略升（竹青字迹耐磨，承受得住）、吸水要更小（避免反复润湿）、弹性保持——字迹耐磨但简体糟朽，吸水大反而有风险。',
  '2-q3-a':
    '73631 枚 × 45 分钟 ≈ 331.3 万分钟 ≈ 55223 小时；单人 5 年工时 = 5×12×22×10 = 13200 小时；55223 ÷ 13200 ≈ 4.2，至少需要 5 名工人同时作业。',
  '2-q3-b':
    '人数取半（约 2.1 人），工期约翻倍，拉长到 10 年左右才能完成全部清洗。',
  '2-q3-c':
    '可线性压缩的：分枚独立的前处理类工序，加人即加产能。不可压缩的：单枚简 40～50 分钟的逐枚清理本身——对一枚简是串行操作，加人不能让一枚简更快洗完，这是单枚不可并行的物理限制。',
  // 环节三 绑夹与核对
  '3-q1-a':
    '1～10545 是先有揭剥号再进脱色，「空间位置 → 作业顺序」是双向档案；10546 以后先脱色再给号，给号那一刻起两个体系就断了直接对应，只能靠批次记录回溯，映射不再是一一对应的档案关系。',
  '3-q1-b':
    '空号说明编号是按预估规模预留、实际清理数小于预留额；它正好解释了有字简 76552 与编号上限 77731 的差额——不是简丢了，是号没有发出去。',
  '3-q1-c':
    '损失的是井中空间位置信息（区—坨—序）。层位关系无法从其他简反推，最多靠文书内容的连读关系推测同册归属，且只是推测。',
  '3-q2-a':
    '脱色后外观趋于一致，简与号一旦错开就没有特征可以辨认；错号会把修复记录和释文挂到错误的简上，而且无人察觉——这是系统性、不可逆的身份错乱。',
  '3-q2-b':
    '多选：A、B、C\n说明：影像比对残缺轮廓与断口可行性最高；形制测量有个体差异但同批简差异小、局限大；字迹连读可复原同册归属但依赖释读条件；称重不可行——含水与糟朽差异远大于个体差。',
  '3-q2-c':
    '针对的是棉线的遇水收缩率。省略蒸煮，收缩应力直接压在平均相对含水率 471% 的糟朽简体上留下压痕。编号混乱比压痕更严重：压痕是可评估的物损，编号混乱是身份错乱，会让所有下游记录失真。',
  // 环节四 饱水保存
  '4-q1-a':
    '选择：④\n说明：若细菌已产生抗药性，把浓度从 0.1% 提到 0.2%～0.3% 不足以跨过抗药阈值——但事实是提高浓度后稳定有效，说明问题只是剂量不足，与抗药性假设不相容。',
  '4-q1-b':
    '多选：①、③、④\n说明：三条在现象层面都表现为「低浓度剂量不足、高浓度即可压制」的剂量依赖关系，仅凭这一个事实无法区分。',
  '4-q1-c':
    '① 稀释说：配制 0.1% 与 0.2% 药液各两组，分别浸泡等量干燥竹材样本与不浸泡对照，检测药液实际浓度衰减；③ 代谢物中和：在无菌滤液中加菌培养后测抑菌环，与新鲜药液对照；④ 抗药性：把处理组细菌转接多代于亚抑菌浓度药液中，再测最低抑菌浓度是否上升。',
  '4-q2-a': '选择：A',
  '4-q2-b':
    '异噻唑啉酮的决定性落选理由：原液对皮肤有腐蚀性——抑菌性能和安全性两项它都是最优。',
  '4-q2-c':
    '第三类约束是对操作人员的职业健康安全。它不能靠加强个人防护简单绕过：吴简饱水保存期长达十余年、涉及数十名工作人员的日常接触，防护的依从性无法在这么长的时间尺度上保证；只要人长期暴露，风险就是系统性的。',
  '4-q2-d':
    '白色结晶包裹简面归入「对竹简的影响」一列。它比过敏更致命：过敏是人的问题、可以用防护和管理控制，结晶需要毛笔轻刷清除，稍不留意就把字迹洗淡甚至洗掉——直接威胁文物本体。',
  '4-q3-a':
    '排序：白斑 → 软腐 → 黏液\n补充：白斑竹体已成半透明膜状、一碰就碎，危害最大须最先处理；软腐是结构性破坏、继续发展会失去整简；黏液静置时不直接破坏简体，可最后清理。',
  '4-q3-b':
    '静置时黏液层不受剪切、与简面附着稳定；清洗时剪切力作用于黏液层，黏液带着与它粘连的简体表面组织一起被剥离——伤简的不是黏液本身，是清除黏液的操作。',
  '4-q3-c':
    '形成了代谢耦合关系：细菌的黏液产物为真菌提供碳源。它比两种独立病害棘手在于：抑制其中一个不能止损，营养链让真菌病害跟着细菌病害长出来，治理必须两条线同时压。',
  '4-q3-d':
    '黏液必须用液体冲洗清除；先处理黏液等于在白斑区施加带剪切力的操作，而白斑一碰就碎——等于先把最脆弱的部分暴露在最伤简的工序下，应先稳定白斑再清黏液。',
  // 环节五 脱色
  '5-q1-a':
    '选择：B\n说明：连二亚硫酸钠蓝色值全时段最低（30min 已到 3.3，24h 3.1），且从不回升。',
  '5-q1-b':
    '初始值：连二亚硫酸钠 3.3 一出场就领先，草酸 5.0、双氧水 5.5 落后；24h 相对 30min 的降幅：双氧水降 1.2 持续下探，草酸只降 0.7 快速平台。快而彻底的是连二亚硫酸钠，慢而持续的是双氧水。',
  '5-q1-c':
    '不等价。评价标准不止颜色变浅：草酸的酸性会溶出简牍降解成分（脱色原理即损害机制），且残留金属离子仍促成返色；双氧水氧化面太广，对与颜色无关的化学结构也有破坏。颜色指标打平，安全性指标把它们排除。',
  '5-q1-d':
    '只做 30 分钟会得出「连二亚硫酸钠最优、双氧水最差」的结论——与 24 小时结论部分不一致：双氧水的持续脱色能力被严重低估，会被误判为无效试剂。启示：评价脱色剂必须覆盖足够长的时间窗，短期数据不能外推。',
  '5-q2-a':
    '假说一：AAS 取样在表层，低浓度时铁从体相向表层迁移富集，表层读数反而升高；假说二：低浓度还原剂把 Fe³⁺ 还原为迁移性更强的 Fe²⁺，促成铁在简体内重新分布而非脱出；假说三：铁在简体内部分布不均，低浓度处理只激活了表层结合态铁的溶出-再沉积。',
  '5-q2-b':
    '假说一：分层取样（表层剥离与体相消解分别测）看铁分布剖面；假说二：价态分析（XPS 或穆斯堡尔谱）对比处理前后 Fe²⁺/Fe³⁺ 比例；假说三：沿浓度梯度做系列处理，对简体截面做铁染色显微观察，看富集带位置。',
  '5-q2-c':
    '警示：低浓度不是省钱而是引铁入简——0.25% 时竹简内铁含量升到对照组三倍多（388.5 vs 116.1），颜色更深、后续更难脱。擅自降浓度会造出一批「铁超标简」，返工成本远高于省下的药剂钱。',
  '5-q3-a': '匹配：A→②；B→①；C→①',
  '5-q3-b':
    '用 XRF 或 EDS 做无损表层元素分析，直接看铁信号丰度：铁信号高则无机路径主导，反之有机发色团为主。AAS 需要取样消解、是破坏性检测，不适合在完整简上做预判。',
  '5-q3-c':
    '铁离子偏高优先调 A——EDTA 二钠就是螯合 Fe³⁺ 的，加浓到 2%、延时到 72 小时直接针对无机路径；有机发色团为主则调 B 或 C——连二亚硫酸钠把醌类还原回酚类，加浓或延时都作用在有机路径上。',
  '5-q3-d':
    '合理性：颜色特别深的厚简「一次成功」价值高，吴简数量庞大、无法逐枚检测，按最坏情况统一加强参数是工程上的稳妥折中。风险：EDTA 2% 浸 72 小时的螯合作用和双倍连二亚硫酸钠的还原强度都超出标准流程，属于过度处理，可能伤及简体——报告选择承受这个风险换取成功率。',
  // 环节六 脱水
  '6-q1-a':
    '竹纤维沿竹竿轴向排列，简的长度方向即轴向：失水时纤维网络像钢筋一样约束轴向收缩，细胞壁只能横向坍缩——径向/弦向的收缩直接叠加，所以宽度收缩（50.6%）远大于长度（20.4%）。',
  '6-q1-b':
    '长缩两成、宽缩一半：原本方正的字变成高度约 0.8、宽度约 0.5 的窄扁条，横向笔画挤死、字腔糊没——单字尚可猜，连读的字与字会挤成一条墨带，释文基本无法进行。',
  '6-q1-c':
    '选择：B\n说明：脱水指标要求收缩率在 5% 之内、最好 3% 之内；长度仍有 15% 远超指标，纵向的字会被压扁变形，不可接受。',
  '6-q1-d':
    '多选：A、B\n说明：一是材质种类——杉木与竹的细胞结构不同，杉木天然收缩各向异性弱；二是降解程度——竹简纤维素结晶度已从 72.6% 降至 21.3%、含水率 471%，结构全靠水撑着，杉木腐朽程度低得多。',
  '6-q2-a':
    '苦竹脱水后均值 (1.67+1.60)/2 = 1.635，相对饱水 0.17 约 9.6 倍（960%）；刚竹 1.73/0.20 = 8.65 倍（865%）。报告的 919% 落在两者之间，是混合口径，与计算吻合。',
  '6-q2-b':
    '十六醇填满细胞腔和纤维间隙，固化后把整个截面连成连续承载网络：受力时填充物承担载荷传递、把应力分散开，代替水分支撑结构——所以强度提升接近一个数量级。',
  '6-q2-c':
    '脱水前差距 17.6%；脱水后 (1.73−1.635)/1.635 ≈ 5.8%，差距明显缩小。说明填充物的贡献占主导后，竹材本体初始强度的差异被稀释——最终强度主要由十六醇决定。',
  '6-q2-d':
    '填充 50% 意味着大量空腔残留，收缩率会超标、强度也上不去。上限的物理约束在熔点 49℃：南方夏季室温可到三十七八度、密闭库房更高，接近熔点十六醇就会软化流失——填充量越大，热稳定性风险越尖锐。',
  '6-q3-a':
    '扩散时间与厚度的平方成正比，不是线性。宽厚简按薄简的 3 天/步走，芯部溶剂浓度根本到不到要求，置换不完全——脱水时芯部残留水分出不来，收缩不均、开裂变形都在等它。',
  '6-q3-b':
    '平方律：6mm 是 3mm 的两倍厚，需要 4 倍时间——每步 3 天变 12 天。「每步延长 1～3 天」只到 4～6 天，对 6mm 的简远远不够。',
  '6-q3-c':
    '必须高于熔点 49℃ 十六醇才是完全熔化的液体，才能渗进简体。降到 45℃ 会部分凝固，堵在简面和孔隙里置换不进去。升到 70℃ 接近乙醇沸点 78.3℃，乙醇加速挥发——闪点低、爆炸下限 3.3%，蒸汽积聚有燃爆风险；竹材热分解 354℃ 虽远，但溶剂蒸汽先出事。',
  '6-q3-d':
    '排序：② → ① → ④ → ③\n补充：先在 58℃ 完成十六醇置换（②），取出后立刻清掉表面残留（①），再自然干燥（④），最后对断简做粘接修复（③）。若先干燥后清理，残留十六醇会把简粘在托板上；先粘接后干燥，粘接面会因收缩错位。',
};

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="150"><rect width="220" height="150" fill="#f5efe0"/><path d="M25 120 A85 85 0 0 1 195 120" fill="none" stroke="#8a6f4d" stroke-width="4"/><path d="M50 120 A60 60 0 0 1 170 120" fill="none" stroke="#8a6f4d" stroke-width="3"/><path d="M78 120 A32 32 0 0 1 142 120" fill="none" stroke="#8a6f4d" stroke-width="2.5"/><circle cx="110" cy="120" r="5" fill="#b3402a"/><path d="M110 120 L150 60" stroke="#b3402a" stroke-width="1.5" stroke-dasharray="4 3" fill="none"/><text x="152" y="55" font-size="13" fill="#b3402a">卷心</text><text x="30" y="140" font-size="12" fill="#666">上半有字面朝下 → 自外向内卷</text></svg>';
const DRAWING = 'data:image/svg+xml;base64,' + Buffer.from(SVG).toString('base64');

// ---------- 句子截取（mid/low 风格） ----------
function linesOf(text) {
  return text.split('\n');
}
function sentencesOf(text) {
  return text
    .split(/(?<=[。？！])/)
    .map((s) => s.trim())
    .filter(Boolean);
}
function styled(key, level) {
  const raw = A[key];
  if (!raw) return '';
  if (level === 'full') return raw;
  const lines = linesOf(raw);
  const protocol = lines[0].match(/^(排序|选择|多选|判断|匹配)：/) ? lines[0] : '';
  const body = (protocol ? lines.slice(1).join('\n') : raw).replace(/^(说明|补充)：/, '');
  const sents = sentencesOf(body);
  const take = level === 'mid' ? 2 : 1;
  const head = sents.slice(0, take).join('');
  if (!head) return protocol || raw;
  return protocol ? protocol + '\n说明：' + head : head;
}

// ---------- 画像 ----------
const PROFILES = {
  top: { stages: 6, answerQ: 17, submitQ: 17, revealCurrent: 4, v: [0.85, 0.15, 0] },
  good: { stages: 5, answerQ: 16, submitQ: 15, revealCurrent: 2, v: [0.7, 0.28, 0.02] },
  solid: { stages: 4, answerQ: 12, submitQ: 11, revealCurrent: 2, v: [0.6, 0.35, 0.05] },
  mid: { stages: 3, answerQ: 9, submitQ: 8, revealCurrent: 1, v: [0.5, 0.4, 0.1] },
  low: { stages: 2, answerQ: 7, submitQ: 6, revealCurrent: 1, v: [0.45, 0.4, 0.15] },
  starter: { stages: 1, answerQ: 4, submitQ: 3, revealCurrent: 1, v: [0.4, 0.45, 0.15] },
  none: null,
};

const STUDENTS = [
  // 202501 班 · 标准梯度
  ['2025010101', '林知远', 'top', 2],
  ['2025010102', '沈清和', 'good', 21],
  ['2025010103', '顾晓帆', 'solid', 9],
  ['2025010104', '周雨桐', 'mid', 50],
  ['2025010105', '陈默', 'low', 74],
  ['2025010106', '韩霜', 'starter', 142],
  ['2025010107', '方启', 'none', null],
  // 202502 班 · 整体较好
  ['2025020101', '苏砚', 'top', 5],
  ['2025020102', '江晚晴', 'good', 30],
  ['2025020103', '罗一鸣', 'good', 12],
  ['2025020104', '谭星', 'solid', 46],
  ['2025020105', '孟真', 'mid', 66],
  ['2025020106', '白露', 'low', 120],
  ['2025020107', '程曦', 'none', null],
  // 202503 班 · 整体偏弱
  ['2025030101', '姜叙', 'good', 27],
  ['2025030102', '秦朗', 'solid', 40],
  ['2025030103', '阮小满', 'mid', 58],
  ['2025030104', '华沐', 'mid', 96],
  ['2025030105', '邵芃', 'low', 130],
  ['2025030106', '岑露', 'starter', 168],
  ['2025030107', '应川', 'none', null],
];

function rand(seed) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (h >>> 0) / 2 ** 32;
}

function levelOf(profile, isTopClass) {
  if (profile === 'top') return 'full';
  if (profile === 'good') return isTopClass ? 'full' : 'mid';
  if (profile === 'solid') return 'mid';
  return 'low';
}

async function main() {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const byEmail = new Map(list.users.map((u) => [u.email, u.id]));

  for (const [staffNo, name, profileKey, hoursAgo] of STUDENTS) {
    const email = `${staffNo}@demo.invalid`;
    const profile = PROFILES[profileKey];
    const cls = staffNo.slice(0, 6);
    const isTopClass = cls === '202502';

    let userId = byEmail.get(email);
    if (!userId) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name },
        app_metadata: {
          chaoxing: { openid: `demo_${staffNo}`, name: staffNo, displayName: name },
        },
      });
      if (error) throw new Error(`${email}: ${error.message}`);
      userId = created.user.id;
      console.log('created', staffNo, name);
    }

    if (!profile) {
      await admin.from('workshop_progress').delete().eq('user_id', userId);
      console.log('ready', staffNo, name, '(未开始)');
      continue;
    }

    const { answerQ, submitQ, stages, revealCurrent, v } = profile;
    const level = levelOf(profileKey, isTopClass);

    const answers = {};
    const submitted = {};
    const verdicts = {};
    const images = {};
    const actsRevealed = {};
    const completed = [];
    for (let i = 1; i <= stages; i++) {
      completed.push(i);
      actsRevealed[String(i)] = 4;
    }

    let qIdx = 0;
    for (const q of QUESTIONS) {
      qIdx++;
      if (qIdx > answerQ) break;
      const isSubmitted = qIdx <= submitQ;
      for (const label of q.parts) {
        const key = `${q.stageId}-${q.qid}-${label}`;
        answers[key] = styled(key, level);
        if (isSubmitted) submitted[key] = true;
      }
      const drawLabel = q.parts[q.parts.findIndex((_, i) => q['draw'] && i === 0)];
      if (q.draw && level !== 'low') {
        images[`${q.stageId}-${q.qid}-${q.parts[0]}`] = DRAWING;
      }
      if (isSubmitted) {
        for (const label of q.parts) {
          const key = `${q.stageId}-${q.qid}-${label}`;
          const r = rand(key + staffNo);
          if (r < 0.92) {
            const p = rand('v' + key + staffNo);
            verdicts[key] = p < v[0] ? '成立' : p < v[0] + v[1] ? '部分成立' : '不成立';
          }
        }
      }
    }
    actsRevealed[String(stages + 1)] = revealCurrent;

    const { error: upErr } = await admin
      .from('workshop_progress')
      .upsert(
        {
          user_id: userId,
          data: { completed, actsRevealed, answers, submitted, verdicts, images },
          updated_at: new Date(Date.now() - hoursAgo * 3600e3).toISOString(),
        },
        { onConflict: 'user_id' },
      );
    if (upErr) throw new Error(`${staffNo}: ${upErr.message}`);
    console.log('ready', staffNo, name, `${completed.length}/6`, `${submitQ}/17 提交`);
  }
  console.log('done');
}

main();
