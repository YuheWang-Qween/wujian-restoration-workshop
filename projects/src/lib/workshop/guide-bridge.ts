/**
 * 页面内容与全局数字人「小简」之间的桥。
 *
 * 题卡上的「问小简这道题」按钮在环节页组件树里，小简挂在根 layout——
 * 两者没有共同的 React 祖先可传 props，用 window CustomEvent 解耦：
 * 页面 askGuide() 发事件，GuideAvatar 监听后展开对话面板并把提问语
 * 交给 GuideChat（面板未开时作为开场触发语，已开时作为追加通知）。
 */

export const WJ_ASK_GUIDE_EVENT = 'wj:ask-guide';

export interface AskGuideDetail {
  /** 发给小简的提问语（hidden 消息：进模型上下文，不渲染成用户气泡） */
  prompt: string;
}

export function askGuide(prompt: string) {
  window.dispatchEvent(
    new CustomEvent<AskGuideDetail>(WJ_ASK_GUIDE_EVENT, { detail: { prompt } }),
  );
}
