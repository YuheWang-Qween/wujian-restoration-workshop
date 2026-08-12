'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { RefreshCw, X } from 'lucide-react';
import { useWorkshopStore } from '@/store/useWorkshopStore';
import { resolveGuideSpeech } from '@/lib/workshop/guide-lines';
import { STAGES } from '@/lib/workshop/content';
import { WJ_ASK_GUIDE_EVENT, type AskGuideDetail } from '@/lib/workshop/guide-bridge';
import { GuideChat, type GuideAsk } from './GuideChat';

/**
 * 数字人向导「小简」
 *
 * 常驻右下角的 Q 版简牍少女（官方透明底立绘，无底悬浮）。实时感知学生所在
 * 页面：路由（大厅 / 登录注册 / 哪个环节）+ 各环节读到的节序号 + 完成记录，
 * 任一变化都会让她换上对应的台词（预设脚本），气泡右上角的小字
 * 显式标注她「看到」的当前位置。点 × 收起气泡；气泡上的「换一句」轮换备选台词。
 * 点击立绘就地展开 AI 助教对话框（不另起一页），上下文跟随当前所在环节；
 * 换环节时对话框以 key 重挂、重新开场。再点立绘或点 × 收起对话框。
 * guide-lines 里的 mood 四态保留——待官方表情差分图到位后按态切换立绘。
 */

/** 官方形象：透明底 PNG（已裁边降采样，位于 public/guide-avatar.png） */
const AVATAR_SRC = '/guide-avatar.png';

const TYPE_INTERVAL_MS = 40;

export function GuideAvatar() {
  const pathname = usePathname();
  const hydrated = useWorkshopStore((s) => s.hydrated);
  const completed = useWorkshopStore((s) => s.completed);
  const actsRevealed = useWorkshopStore((s) => s.actsRevealed);

  // persist 落定前不解析，避免拿「空进度」说出错位的台词（与环节页守卫同一口径）
  const speech = useMemo(
    () => (hydrated ? resolveGuideSpeech({ pathname, completed, actsRevealed }) : null),
    [hydrated, pathname, completed, actsRevealed],
  );

  const [variant, setVariant] = useState(0);
  const [open, setOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [typed, setTyped] = useState('');

  // 对话框上下文跟随当前路由：环节页是该环节，其余页面是大厅总览
  const stageMatch = pathname.match(/^\/stage\/(\d+)/);
  const chatStage = STAGES.find((s) => s.id === Number(stageMatch?.[1])) ?? null;

  const line = speech ? speech.lines[variant % speech.lines.length] : undefined;
  const text = line?.text ?? '';

  // 台词切换时在渲染期同步清空打字机，避免新气泡首帧闪现整句旧台词
  // （React 官方 state-adjust-during-render 模式，不经过 effect 的 paint 间隙）
  const [prevText, setPrevText] = useState(text);
  if (prevText !== text) {
    setPrevText(text);
    setTyped('');
  }
  const typing = typed.length < text.length;

  // 对话面板展开期间给 <html> 打标：桌面端正文容器据此右移让位（globals.css .wj-chat-dodge）
  useEffect(() => {
    const root = document.documentElement;
    if (chatOpen) root.setAttribute('data-wj-chat-open', '');
    else root.removeAttribute('data-wj-chat-open');
    return () => root.removeAttribute('data-wj-chat-open');
  }, [chatOpen]);

  // 题卡「问小简这道题」：打开面板并把提问语交给 GuideChat
  //（面板未开时作开场触发语，已开时作追加通知——seq 递增保证连点同一题也生效）
  const [ask, setAsk] = useState<GuideAsk | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AskGuideDetail>).detail;
      if (!detail?.prompt) return;
      setAsk((prev) => ({ prompt: detail.prompt, seq: (prev?.seq ?? 0) + 1 }));
      setChatOpen(true);
    };
    window.addEventListener(WJ_ASK_GUIDE_EVENT, handler);
    return () => window.removeEventListener(WJ_ASK_GUIDE_EVENT, handler);
  }, []);

  // 情境切换（换页面 / 换节 / 完成或进度翻转）→ 回到第一句并重新展开气泡。
  // 注意不含 variant：轮换台词不算换情境。
  const contextKey = speech ? `${pathname}|${speech.where}|${speech.lines[0].text}` : '';
  const prevContext = useRef(contextKey);
  useEffect(() => {
    if (prevContext.current !== contextKey) {
      prevContext.current = contextKey;
      setVariant(0);
      setOpen(true);
    }
  }, [contextKey]);

  // 打字机：台词或气泡开关闭合变化时从头打起；对话框展开时气泡不可见，暂停节拍
  useEffect(() => {
    if (!open || !text || chatOpen) return;
    setTyped('');
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) window.clearInterval(timer);
    }, TYPE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [text, open, chatOpen]);

  if (!speech || !line) return null;

  // 点击立绘：就地展开 / 收起 AI 助教对话框（不离开当前页面）
  const handleAvatarClick = () => {
    setChatOpen((v) => !v);
  };

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {/* 列容器保持指针穿透：气泡与立绘之间的空白不能吞掉底下正文的点击，
          只有气泡和立绘本体接收指针事件 */}
      <div className="pointer-events-none relative flex flex-col items-end gap-2.5">
        {!chatOpen && open && (
          // key=text：台词切换时重挂，重新触发气泡进场动效
          <div key={text} className="wj-bubble-pop pointer-events-auto relative">
            <div className="wj-scrollbar-none max-h-44 w-60 overflow-y-auto rounded-lg border border-wj-border bg-wj-surface/95 px-3.5 py-2.5 shadow-lg backdrop-blur-sm sm:w-72">
              <div className="flex items-center gap-2">
                <span className="shrink-0 font-serif text-sm font-semibold text-wj-cinnabar">
                  小简
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-right text-[11px] text-wj-dim"
                  title={speech.where}
                >
                  {speech.where}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="收起小简的提示"
                  className="-my-1.5 -mr-1.5 shrink-0 rounded p-1.5 text-wj-dim transition-colors hover:text-wj-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-[13px] leading-6 text-wj-ink">
                {typed}
                {typing && (
                  <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-wj-cinnabar/70" />
                )}
              </p>
              <div className="mt-1 flex items-center justify-end gap-1">
                {speech.lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setVariant((v) => v + 1)}
                    className="flex items-center gap-1 rounded px-1.5 py-1.5 text-xs text-wj-dim transition-colors hover:text-wj-ink"
                  >
                    <RefreshCw className="h-3 w-3" />
                    换一句
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="rounded px-1.5 py-1.5 text-xs font-medium text-wj-cinnabar transition-colors hover:opacity-80"
                >
                  问小简 →
                </button>
              </div>
            </div>
            {/* 指向立绘的小尾巴（约对齐立绘中线） */}
            <span className="absolute right-10 -bottom-[5px] h-2.5 w-2.5 rotate-45 border-r border-b border-wj-border bg-wj-surface sm:right-14" />
          </div>
        )}

        {/* 变换容器：对话框展开时立绘脱离文档流（绝对定位到同一锚点，不再占高
            把对话框顶上半空），在对话框底下向右下缩小退场，收起时弹回占位 */}
        <div
          className={`origin-bottom-right transition-all duration-200 ease-out ${
            chatOpen
              ? 'pointer-events-none absolute right-0 bottom-0 translate-y-4 scale-[0.3] opacity-0'
              : 'pointer-events-auto translate-y-0 scale-100 opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={handleAvatarClick}
            aria-label={chatOpen ? '小简：收起对话' : '小简：展开对话'}
            title="小简 · 点击对话"
            className="wj-guide-float block transition-transform hover:scale-105"
          >
            <img
              src={AVATAR_SRC}
              alt="数字人向导小简"
              className="wj-guide-shadow h-32 w-auto sm:h-44"
            />
          </button>
        </div>

      </div>

      {/* 对话面板：fixed 右侧全高（自己定位，不挂在右下角锚点里）。
          换环节以 key 重挂、重新开场 */}
      {chatOpen && (
        <GuideChat
          key={chatStage?.id ?? 0}
          stage={chatStage}
          ask={ask}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
