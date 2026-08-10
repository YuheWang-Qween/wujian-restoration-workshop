/**
 * 数字人向导「小简」· 台词解析器
 *
 * 纯预设脚本，没有任何 AI 对话。根据学生的实时位置（路由 + 各环节读到的节序号
 * + 完成记录）解析出一句台词和一副表情，位置本身也会显式标注在气泡上。
 *
 * 内容纪律与 content.ts 相同：台词里的事实与数字只能出自报告（与 content.ts
 * 同口径），新增台词前先在 content.ts 里找到出处；拿不准的数字不要写进台词。
 */

import { ACT_DATA, ACT_WHY, getStage, stageActTitles } from './content';

/** 表情四态：立绘差分图尚未到位，目前统一用 public/guide-avatar.png，待官方差分图后按态切换 */
export type GuideMood = 'default' | 'pointing' | 'thinking' | 'happy';

export interface GuideLine {
  text: string;
  mood: GuideMood;
}

export interface GuideSpeech {
  /** 当前位置的显式标注（气泡右上角的小字），让「感知」看得见 */
  where: string;
  /** 同一情境可备多句，点头像轮换 */
  lines: GuideLine[];
}

export interface GuideContextInput {
  pathname: string;
  /** 已完成环节编号（store.completed） */
  completed: number[];
  /** 各环节当前读到第几节（store.actsRevealed，1 起） */
  actsRevealed: Record<number, number>;
}

/** 每个环节三节的台词：why=第一节，data=第二节，question=细问节（未完成），done=本环节已完成 */
interface StageLines {
  why: string;
  data: string;
  question: string;
  /** 完成时的贺词尾巴；会拼上「『下一环节名』已解锁」，最后一环则用整句 */
  done: string;
}

const STAGE_LINES: Record<number, StageLines> = {
  1: {
    why: '先读这一节——揭取为什么「不可重来」。I 区五小坨的叠压记录（a→b→c、b→d、d→e），后面的排序题要直接用。',
    data: '记住这组对比：井内原位 228 枚带着层位与揭剥图，扰土里追回的 2000 余枚只剩实物。同一批简，两种档案命运。',
    question:
      '排序题先看清约定：箭头表示「压在其上」。实在确定不了先后的单位对，也要指出来、写明为什么。',
    done: '下一环，字迹要第一次露出来了。',
  },
  2: {
    why: '竹黄面好写但墨迹散淡，竹青面难写但字迹牢固——同一个材料学原因的两个后果，清洗顺序就藏在这里。',
    data: '73631 枚、每枚 40～50 分钟。规模一旦换算成工时，「要多少人、洗多少年」就是一道能算出来的题。',
    question:
      '三代工具题：先把每一代具体的失败机制写出来，再说尼龙勾线笔为什么能同时解决前两代的问题。',
    done: '那是六道工序里最轻的一环，只有两道细问。',
  },
  3: {
    why: '这一环管「身份」：揭剥号记空间位置，脱色号记批次顺序，核对对的是两套编号之间的映射。',
    data: '2003 年 7 月那次串槽编号混乱，是真实发生过的流程失败——从那以后，脱色前全部改为单面绑。',
    question: '只有两道题。q1 想编号映射丢了什么，q2 想那次串槽事故为什么不可逆。',
    done: '持续时间最长、失控风险最隐性的一环来了。',
  },
  4: {
    why: '蚀斑病暴发在 1999 年、在保存期，而不是出土时。这一阶段不是等待，是主动管理。',
    data: '四种候选药剂都是「好保存剂」。看表别只看抑菌性能——「对人的影响」那一列才是真正的筛选维度。',
    question: 'q1 的手柄是那个关键事实：提高浓度后稳定有效。拿着它，先排除那条不相容的假设。',
    done: '简牍要从「能保存」变成「能使用」了。',
  },
  5: {
    why: '变色有两条路径：醌类氧化（有机）与铁络合物（无机）。后面的两步脱色操作，正好一步对一条。',
    data: '记几个数：1% EDTA 二钠泡 24 小时；1% 连二亚硫酸钠，60℃ 配制、保温 45～50℃。这场仗打了 11 年。',
    question: '反常数据题最绕：0.25% 时简内铁不降反升。先大胆提假说，再给每条假说配一个验证思路。',
    done: '最后一环，也是不可逆程度最高的一环。',
  },
  6: {
    why: '含水率 471% 的简体全靠水撑着；撤水不填充，宽度平均要缩 50.6%。脱水就是给简找一个「替身」。',
    data: '十六醇赢在三个指标：颜色、收缩率、化学稳定性。再记两个参数：熔点 49℃，填充量 205%。',
    question: '流程题里藏着平方关系：扩散时间约与厚度平方成正比——6mm 的简要等的不是两倍，是四倍。',
    done: '从 J22 井底到十六醇填充，一枚简的路，你陪它走完了。',
  },
};

function stageSpeech(stageId: number, ctx: GuideContextInput): GuideSpeech | null {
  const stage = getStage(stageId);
  if (!stage) return null;
  const whereBase = `环节${stage.ordinal} · ${stage.name}`;

  // 未解锁：指回上一环节（与环节页守卫同一口径）
  if (stageId > 1 && !ctx.completed.includes(stageId - 1)) {
    const prev = getStage(stageId - 1);
    return {
      where: whereBase,
      lines: [
        {
          text: `这一环还锁着——先答完「${prev?.name}」的最后一道细问，它就会自己打开。`,
          mood: 'thinking',
        },
      ],
    };
  }

  // 节数口径统一走 content.stageActTitles（有关键数据内容为三节，否则两节；
  // 目前六个环节都是三节，含轻量的环节三）。不写死 3：若将来出现两节环节，
  // 其「第二节」是细问，按序号分支会错发关键数据台词，按标题分支不会
  const actTitles = stageActTitles(stage);
  const totalActs = actTitles.length;
  const revealed = Math.min(ctx.actsRevealed[stageId] ?? 1, totalActs);
  const actTitle = actTitles[revealed - 1];
  const where = `${whereBase} · ${actTitle}`;
  const lines = STAGE_LINES[stageId];
  const isDone = ctx.completed.includes(stageId);

  if (actTitle === ACT_WHY) return { where, lines: [{ text: lines.why, mood: 'pointing' }] };
  if (actTitle === ACT_DATA) return { where, lines: [{ text: lines.data, mood: 'pointing' }] };

  // 细问节
  if (isDone) {
    const next = getStage(stageId + 1);
    return {
      where,
      lines: [
        {
          text: next ? `答完啦，「${next.name}」已解锁——${lines.done}` : lines.done,
          mood: 'happy',
        },
      ],
    };
  }
  return {
    where,
    lines: [
      { text: lines.question, mood: 'thinking' },
      { text: '作答不用交卷，写在框里即存；最后一道细问写下内容，这一环自动完成。', mood: 'default' },
    ],
  };
}

/**
 * 解析当前情境下小简该说什么。返回 null 表示这个页面不出场：
 * 小简只在环节页出场——大厅、登录 / 注册页、未知路由都不出场。
 */
export function resolveGuideSpeech(ctx: GuideContextInput): GuideSpeech | null {
  const { pathname } = ctx;

  const m = /^\/stage\/(\d+)/.exec(pathname);
  if (m) return stageSpeech(Number(m[1]), ctx);

  return null;
}
