'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { stageActTitles, type WjStage } from '@/lib/workshop/content';
import { useWorkshopStore } from '@/store/useWorkshopStore';
import { useAuth } from './AuthProvider';

/**
 * 小简的 AI 助教对话面板：固定在视口右侧、顶栏（h-14）以下到底部（小于 lg 全宽覆盖，lg 起 24rem 宽），
 * 在原页面就地展开，不另起一页；顶栏保持全宽可见，桌面端展开时正文滚动区让位（.wj-chat-dodge，同为 lg 断点），互不遮挡。
 * 真实 LLM 对话（/api/chat SSE 流式 + 环节材料注入 + 三册参考书 RAG）。
 * 上下文实时跟随学生所在页面：哪个环节（宿主 key 重挂）+ 读到第几节
 * （订阅 store.actsRevealed，随请求透传给后端写进系统提示）；
 * 学生在节之间翻动时，自动发一条 hidden 翻节通知让小简接住新话题。
 * 对话只存组件 state，收起即卸载、重开重新开场。
 */

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  /** 自动开场的触发语：发给 API 但不渲染出来 */
  hidden?: boolean;
}

const ERROR_TEXT = '连接出错，请检查网络后重试。';

/** 服务端明确给出的用户可读错误（401 未登录 / 429 太频繁等），原样展示不套通用文案 */
class ApiError extends Error {}

/** 小简的圆形头像：右下角的全身立绘放大取头部，对话框里与立绘同一张脸 */
function GuideFace({ size = 'h-7 w-7' }: { size?: string }) {
  return (
    <span
      className={`relative ${size} shrink-0 overflow-hidden rounded-full border border-wj-border bg-wj-surface`}
    >
      <img
        src="/guide-avatar.png"
        alt="小简"
        className="absolute top-0 left-1/2 h-auto w-[190%] max-w-none -translate-x-1/2"
      />
    </span>
  );
}

/** 学习者头像：登录邮箱首字符的字母章（竹青淡底，与学习者气泡同色系） */
function UserFace({ email, size = 'h-7 w-7' }: { email?: string | null; size?: string }) {
  const initial = (email?.trim().charAt(0) ?? '').toUpperCase() || '我';
  return (
    <span
      title={email ?? undefined}
      className={`flex ${size} shrink-0 items-center justify-center rounded-full border border-wj-bamboo/40 bg-wj-bamboo/15 font-serif text-[11px] font-semibold text-wj-bamboo`}
    >
      {initial}
    </span>
  );
}

/** 极简行内渲染：只处理 **粗体**，其余原样（换行靠 whitespace-pre-wrap） */
function renderInline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-wj-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

/**
 * 历史消息气泡（memo）：流式期间只有独立的流式气泡在更新，
 * 已落定的历史消息不随每个 token 重渲染。
 */
const MessageBubble = memo(function MessageBubble({
  msg,
  index,
  email,
}: {
  msg: ChatMsg;
  index: number;
  email?: string | null;
}) {
  if (msg.role === 'user') {
    return (
      <div className="flex items-start justify-end gap-2">
        <div className="max-w-[80%] rounded-lg border border-wj-bamboo/40 bg-wj-bamboo/10 px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-wj-ink">
          {msg.content}
        </div>
        <UserFace email={email} />
      </div>
    );
  }
  return (
    <div className="flex items-start justify-start gap-2">
      <GuideFace />
      <div className="max-w-[80%] rounded-lg border border-wj-line bg-wj-raised px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-wj-ink">
        {renderInline(msg.content, `a${index}`)}
      </div>
    </div>
  );
});

export interface GuideAsk {
  /** 发给小简的提问语（hidden：进上下文不进气泡），来自题卡「问小简这道题」 */
  prompt: string;
  /** 单调递增：同一文案连点两次也要被视为新请求 */
  seq: number;
}

export function GuideChat({
  stage,
  onClose,
  ask,
}: {
  stage: WjStage | null;
  onClose: () => void;
  ask?: GuideAsk | null;
}) {
  const stageId = stage?.id ?? 0;
  const { user, session } = useAuth();

  // 实时感知学生读到第几节（环节页一节一屏，节序号存本机）
  const actRaw = useWorkshopStore((s) => (stageId ? (s.actsRevealed[stageId] ?? 1) : 1));
  const actTitles = useMemo(() => (stage ? stageActTitles(stage) : []), [stage]);
  const actTitle = stage ? actTitles[Math.min(actRaw, actTitles.length) - 1] : null;

  const topic = stage
    ? `环节${stage.ordinal} · ${stage.name}${actTitle ? ` · ${actTitle}` : ''}`
    : '大厅总览';

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  /** 正在流式输出的助教文本：独立于 messages，历史气泡不随 token 重渲染 */
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAttemptRef = useRef<{ conversation: ChatMsg[]; noRag: boolean } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busy = isLoading || isStreaming;

  // 翻节通知要在 effect 里拿到最新对话，用 ref 同步一份
  const messagesRef = useRef<ChatMsg[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, streamingText, isLoading, error]);

  const runRequest = useCallback(
    async (conversation: ChatMsg[], opts?: { noRag?: boolean }) => {
      lastAttemptRef.current = { conversation, noRag: opts?.noRag === true };
      // 同一时刻只允许一条流：发新请求前掐掉上一条（StrictMode 双跑的开场流也在此收敛）
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setIsLoading(true);

      // 已收到的助教文本放在 try 外：网络中途断掉时也要把已有的部分落进历史
      let assistant = '';
      const commitAssistant = () => {
        if (assistant) setMessages([...conversation, { role: 'assistant', content: assistant }]);
      };

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            messages: conversation.map(({ role, content }) => ({ role, content })),
            stage: stageId || undefined,
            act: actTitle ?? undefined,
            noRag: opts?.noRag === true || undefined,
          }),
        });
        if (!res.ok || !res.body) {
          // 服务端的 401/429/500 都带用户可读的 error 字段，能读到就原样展示
          let msg = ERROR_TEXT;
          try {
            const data = (await res.json()) as { error?: string };
            if (data?.error) msg = data.error;
          } catch {
            // 响应体不是 JSON（如网关错误页），用通用文案
          }
          throw new ApiError(msg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamError: string | null = null;

        const handleLine = (line: string) => {
          if (!line.startsWith('data: ')) return;
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data) as { content?: string; error?: string };
            if (parsed.error) {
              streamError = parsed.error;
              return;
            }
            if (parsed.content) {
              if (!assistant) {
                // 首个内容块才切换状态：RAG 检索期间「正在翻资料」的占位继续亮着
                setIsLoading(false);
                setIsStreaming(true);
              }
              assistant += parsed.content;
              setStreamingText(assistant);
            }
          } catch {
            // 半截 JSON：忽略，等下一块拼上
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          // 一个网络块可能在行中间截断，保留尾巴拼到下一块
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) handleLine(line);
        }
        buffer += decoder.decode();
        if (buffer) handleLine(buffer);

        commitAssistant();
        if (streamError) setError(streamError);
        else if (!assistant) setError(ERROR_TEXT);
      } catch (err) {
        // 主动中止（收起对话框 / 发起新请求）不算错误，静默退出
        if (controller.signal.aborted) return;
        commitAssistant();
        setError(err instanceof ApiError ? err.message : ERROR_TEXT);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsStreaming(false);
          setStreamingText('');
        }
      }
    },
    [stageId, actTitle, session?.access_token],
  );

  // 开场触发语按「当下」的环节与节名组装：开场失败后翻节再重试，也要用新节名。
  // 若面板是被题卡「问小简这道题」唤起的，开场直接带上那道题的提问语
  const askConsumedRef = useRef(0);
  const makeOpeningTrigger = useCallback((): ChatMsg => {
    if (ask && ask.seq > askConsumedRef.current) {
      askConsumedRef.current = ask.seq;
      return { role: 'user', content: ask.prompt, hidden: true };
    }
    return {
      role: 'user',
      content: stage
        ? `我进入了「${stage.name}」环节，正读到「${actTitle}」一节，请开始带教。`
        : '我来到了工坊大厅，想请你带我认识这座工坊。',
      hidden: true,
    };
  }, [stage, actTitle, ask]);
  const makeOpeningTriggerRef = useRef(makeOpeningTrigger);
  useEffect(() => {
    makeOpeningTriggerRef.current = makeOpeningTrigger;
  }, [makeOpeningTrigger]);

  // 挂载即自动开场（触发语不渲染，带上当前读到的节）；
  // 换环节时宿主用 key 重挂本组件，回到这里重新开场。
  // cleanup 中止在途流：收起即卸载不再白烧 token，StrictMode 双跑也不会双开场
  useEffect(() => {
    void runRequest([makeOpeningTriggerRef.current()], { noRag: true });
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hidden 通知队列：翻节通知与题卡直达提问共用。回复途中先排队，
  // 等不忙了逐条发出，避免并发流互相覆盖
  const pendingNoticesRef = useRef<string[]>([]);
  const [noticeTick, setNoticeTick] = useState(0);
  const queueNotice = useCallback((text: string) => {
    pendingNoticesRef.current.push(text);
    setNoticeTick((t) => t + 1);
  }, []);

  // 翻节实时通知：学生翻到另一节时，补一条 hidden 通知让小简接住新话题
  const prevActRef = useRef(actTitle);
  useEffect(() => {
    if (actTitle && actTitle !== prevActRef.current) {
      prevActRef.current = actTitle;
      queueNotice(`我翻到了「${actTitle}」一节。`);
    }
  }, [actTitle, queueNotice]);

  // 题卡「问小简这道题」：面板已开时把提问语排进通知队列（未开时走开场触发语）
  useEffect(() => {
    if (!ask || ask.seq <= askConsumedRef.current) return;
    askConsumedRef.current = ask.seq;
    queueNotice(ask.prompt);
  }, [ask, queueNotice]);

  useEffect(() => {
    if (busy || !pendingNoticesRef.current.length) return;
    const base = messagesRef.current;
    // 开场尚未成功：保留队列，等开场成功后再逐条补发
    if (!base.length) return;
    const text = pendingNoticesRef.current.shift();
    if (!text) return;
    const notice: ChatMsg = { role: 'user', content: text, hidden: true };
    const next = [...base, notice];
    setMessages(next);
    void runRequest(next, { noRag: true });
  }, [busy, noticeTick, runRequest]);

  // 重试：开场从未成功时用当前节名重建触发语（旧触发语里的节名可能已过时），
  // 并清空排队的通知——重建的开场已含最新上下文，补发只会让小简重复开场；
  // 其余情况原样重放上一次请求（保留其 noRag 口径）
  const retry = () => {
    if (busy) return;
    if (!messagesRef.current.length) {
      pendingNoticesRef.current = [];
      void runRequest([makeOpeningTriggerRef.current()], { noRag: true });
      return;
    }
    const last = lastAttemptRef.current;
    if (last) void runRequest(last.conversation, { noRag: last.noRag });
  };

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatMsg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    void runRequest(next);
  };

  // Esc 收起面板（面板盖住右侧内容，给键盘用户一条快速退路）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const visible = messages.filter((m) => !m.hidden);

  return (
    <div
      role="dialog"
      aria-label="小简 AI 助教"
      className="wj-panel-in pointer-events-auto fixed bottom-0 right-0 top-14 z-40 flex w-full flex-col border-l border-wj-border bg-wj-surface/95 shadow-[-12px_0_32px_-16px_rgb(30_27_22/0.35)] backdrop-blur-md lg:w-96"
    >
      {/* 头部：小简头像 + 名签 + 当前话题 + 收起 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-wj-line px-3.5 py-3">
        <GuideFace size="h-6 w-6" />
        <span className="shrink-0 font-serif text-sm font-semibold text-wj-cinnabar">小简</span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-wj-dim" title={topic}>
          {topic}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="收起对话"
          className="-my-2 -mr-1.5 shrink-0 rounded p-2 text-wj-dim transition-colors hover:text-wj-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 消息区：aria-live 让流式回复对读屏可感知 */}
      <div
        role="log"
        aria-live="polite"
        aria-label="与小简的对话"
        className="wj-scrollbar-none min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3"
      >
        {visible.map((m, i) => (
          <MessageBubble key={i} msg={m} index={i} email={user?.email} />
        ))}

        {/* 流式中的助教气泡：独立 state，历史消息不随 token 重渲染 */}
        {isStreaming && (
          <div className="flex items-start justify-start gap-2">
            <GuideFace />
            <div className="max-w-[80%] rounded-lg border border-wj-line bg-wj-raised px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-wj-ink">
              {renderInline(streamingText, 'streaming')}
              <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-wj-cinnabar/70" />
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-start justify-start gap-2">
            <GuideFace />
            <div className="flex items-center gap-2 rounded-lg border border-wj-line bg-wj-raised px-3 py-2 text-sm text-wj-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              小简正在翻资料…
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-md border border-wj-ochre/40 bg-wj-ochre/10 px-3 py-1.5 text-[11px] text-wj-ochre">
              {error}
              <button
                type="button"
                onClick={retry}
                className="-my-1 px-1 py-1 underline underline-offset-2 hover:opacity-80"
              >
                重试
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="shrink-0 border-t border-wj-line px-3 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setInput(e.target.value);
              const ta = e.currentTarget;
              ta.style.height = 'auto';
              ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`;
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={busy ? '小简回复中…' : '向小简提问…'}
            disabled={busy}
            aria-label="向小简提问"
            className="wj-scrollbar-none max-h-24 flex-1 resize-none rounded-md border border-wj-border bg-wj-raised px-2.5 py-1.5 text-base leading-6 text-wj-ink placeholder:text-wj-dim focus:border-wj-cinnabar focus:outline-none disabled:opacity-60 sm:text-[13px]"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || !input.trim()}
            aria-label="发送"
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-wj-cinnabar text-wj-surface transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
