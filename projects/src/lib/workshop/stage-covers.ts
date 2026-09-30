/**
 * 首页工序入口的真实资料照片，均来自项目提供的「走马楼图片.rar」。
 * 原文件与处理记录见 public/exhibition/supplied/sources.json。
 * 封面按画面主题选用，图注不据外观认定具体工序、药剂或处理阶段。
 */
type StageCover = {
  src: string;
  alt: string;
  caption: string;
  position: string;
};

export const STAGE_COVERS: Record<number, StageCover> = {
  1: {
    src: '/exhibition/supplied/basin-sorting.webp', // 8.png
    alt: '工作人员在盆内用工具整理叠压的简牍',
    caption: '盆内简牍整理',
    position: 'center 52%',
  },
  2: {
    src: '/exhibition/supplied/workroom.webp', // 34.png
    alt: '工作人员在窗边工作台上整理简牍材料',
    caption: '工作室整理现场',
    position: 'center 42%',
  },
  3: {
    src: '/exhibition/supplied/mesh-tray.webp', // 35.png
    alt: '蓝色托盘内并列放置的简片与外侧网架',
    caption: '网架与简片排列',
    position: 'center 48%',
  },
  4: {
    src: '/exhibition/supplied/shelved-trays.webp', // 36.png
    alt: '装有简片的托盘分层放置在架子上',
    caption: '托盘上架存放',
    position: 'center',
  },
  5: {
    src: '/exhibition/supplied/containers.webp', // 40.png
    alt: '工作人员在大型槽体内摆放蓝色容器',
    caption: '修复现场的槽体与容器',
    position: 'center 44%',
  },
  6: {
    src: '/exhibition/supplied/tabletop-arrangement.webp', // 43.png
    alt: '工作人员在整理台旁查看分格排列的简牍',
    caption: '简牍整理工作台',
    position: 'center 42%',
  },
};

export const STAGE_COVER_CREDIT = '封面图片：项目提供的走马楼吴简现场资料。';
