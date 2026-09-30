import type { ExFigure } from './exhibition';

/**
 * 项目于 2026-09-29 提供的实物与现场照片。
 * 原包文件、散列、处理方式见 public/exhibition/supplied/sources.json。
 * 图注仅描述可核对的画面，不从照片外观补定简号、井号或人物身份。
 */
const credit = '项目提供的走马楼吴简图片资料';
const asset = (name: string) => `/exhibition/supplied/${name}.webp`;

export const EXHIBITION_IMAGES = {
  site: {
    src: asset('site'),
    alt: '城市场地俯瞰照片',
    caption: '城市场地俯瞰：观察发掘区域与周围建筑的关系。',
    credit,
    width: 618,
    height: 698,
  },
  excavation: {
    src: asset('excavation'),
    alt: '井坑内的简牍堆积近景',
    caption: '井坑近景：简牍在泥土中的堆积状态。',
    credit,
    width: 1205,
    height: 860,
  },
  fieldwork: {
    src: asset('fieldwork'),
    alt: '工作人员在井坑内清理的现场照片',
    caption: '坑内清理：工作人员与简牍堆积所在的作业环境。',
    credit,
    width: 1204,
    height: 821,
  },
  recovery: {
    src: asset('recovery'),
    alt: '工作人员在岸边查看泥土的现场照片',
    caption: '岸边清理：工作人员查看泥土中的材料。',
    credit,
    width: 1182,
    height: 841,
  },
  basins: {
    src: asset('basins'),
    alt: '室内多盆盛放简牍材料的整理场景',
    caption: '室内整理：材料分盆盛放。',
    credit,
    width: 1178,
    height: 862,
  },
  recording: {
    src: asset('recording'),
    alt: '工作人员在测量框旁整理简牍材料',
    caption: '整理记录：测量框旁的简牍材料。',
    credit,
    width: 716,
    height: 537,
  },
  photography: {
    src: asset('photography'),
    alt: '工作人员使用摄影架记录简牍',
    caption: '摄影记录：在摄影架下拍摄简牍。',
    credit,
    width: 636,
    height: 476,
  },
  storage: {
    src: asset('storage'),
    alt: '抽屉中分装排列的简牍',
    caption: '入藏保存：简牍分装后排列于抽屉中。',
    credit,
    width: 657,
    height: 484,
  },
  woodenTablet: {
    src: asset('wooden-tablet'),
    alt: '宽片状木牍的完整照片',
    caption: '木牍形态观察：较宽的简面与分栏书写的文字。',
    credit,
    width: 1000,
    height: 793,
  },
  tags: {
    src: asset('tags'),
    alt: '两枚顶部切肩、侧边带缺口的牌状实物',
    caption: '牌状实物：观察顶部的切肩、侧边缺口与大字书写。',
    credit,
    width: 1310,
    height: 994,
  },
  bamboo: {
    src: asset('bamboo'),
    alt: '多枚窄长简片并列的实物照片',
    caption: '窄长简片并列：比较宽度、断口与纵向文字排列。',
    credit,
    width: 1000,
    height: 793,
  },
  groupedSlips: {
    src: asset('grouped-slips'),
    alt: '嘉禾吏民田家莂六枚大木简并列',
    caption: '嘉禾吏民田家莂：六枚大木简并列，可观察简体轮廓与文字布局。',
    credit: '项目提供；原图见长沙简牍博物馆《三国农民的纳税凭证——嘉禾吏民田家莂》配图。',
    width: 422,
    height: 715,
  },
  callingCard: {
    src: asset('calling-card'),
    alt: '黄朝名刺原简',
    caption: '黄朝名刺：简面可见「弟子黄朝再拜」「问起居」等字样。',
    credit: '项目提供；原图见中央纪委监察部网站《走进博物馆：长沙简牍博物馆》专题配图。',
    width: 500,
    height: 396,
  },
  granary: {
    src: asset('granary'),
    originalSrc: '/exhibition/supplied/granary-original.jpg',
    alt: '起首有出倉字样的简牍全图',
    caption: '仓储文字观察：起首可见「出倉」，可放大查看文字排列。',
    credit,
    width: 4032,
    height: 6048,
  },
  numbering: {
    src: asset('numbering'),
    alt: '保护槽中排列的简牍及58530至58536编号',
    caption: '整理编号：保护槽旁可见58530—58536编号，与各枚简逐一对应。',
    credit,
    width: 459,
    height: 599,
  },
  peeling: {
    src: asset('peeling'),
    alt: '标有简牍位置、编号和截面示意的揭剥记录图',
    caption: '揭剥记录：用位置、编号和截面示意记录简牍的叠压关系。',
    credit,
    width: 780,
    height: 1070,
  },
} satisfies Record<string, ExFigure>;

export const DISCOVERY_SCENES: ExFigure[] = [
  EXHIBITION_IMAGES.site,
  EXHIBITION_IMAGES.excavation,
  EXHIBITION_IMAGES.fieldwork,
  EXHIBITION_IMAGES.recovery,
];

export const DISCOVERY_ARCHIVE: ExFigure[] = [
  EXHIBITION_IMAGES.basins,
  EXHIBITION_IMAGES.recording,
  EXHIBITION_IMAGES.photography,
  EXHIBITION_IMAGES.storage,
];

export const RECORD_FIGURES: ExFigure[] = [
  EXHIBITION_IMAGES.numbering,
  EXHIBITION_IMAGES.peeling,
];
