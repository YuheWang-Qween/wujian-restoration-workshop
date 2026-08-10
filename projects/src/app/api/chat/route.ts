import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LLMClient, Config, HeaderUtils, type ContentPart } from 'coze-coding-dev-sdk';
import { buildSystemPrompt } from '@/lib/workshop/prompt';
import { retrieveReferencePages } from '@/lib/workshop/knowledge';
import { ACT_DATA, ACT_QUESTIONS, ACT_WHY, STAGES } from '@/lib/workshop/content';
import { getSupabaseCredentials } from '@/storage/database/supabase-client';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

/** 单条消息与总轮数的硬上限：防止脚本用超长 payload 放大 token 消耗 */
const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 4000;

/** 限速：滑动窗口，按登录用户（或 IP）计。开场 + 翻节通知也各占一次，额度给足正常学习节奏 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

/** SSE 心跳间隔（防代理空闲断连）与单轮回复的总时限 */
const HEARTBEAT_INTERVAL_MS = 15_000;
const STREAM_DEADLINE_MS = 180_000;

/**
 * 鉴权结果：denied 非空表示直接返回该响应；
 * key 是限速的记账主体——已验证用户用 user.id，降级场景用 IP。
 */
interface AuthResult {
  denied: Response | null;
  key: string;
}

function clientIp(req: NextRequest): string {
  // XFF 由代理逐跳追加：首值是客户端可任意伪造的，最后一个才是最近一跳
  // 可信代理看到的真实对端——用首值做限速主体等于让限速可被绕过
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Supabase 凭据可用时强制校验 Bearer token（部署环境即此形态），
 * 凭据不可用（本地起服务）时降级放行——与前端「配置拉不到仍可阅读」的口径一致。
 */
async function requireUser(req: NextRequest): Promise<AuthResult> {
  let url: string, anonKey: string;
  try {
    ({ url, anonKey } = getSupabaseCredentials());
  } catch {
    return { denied: null, key: `ip:${clientIp(req)}` }; // 本地无凭据：鉴权服务不存在，降级放行
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return {
      denied: Response.json({ error: '请先登录，再与小简对话。' }, { status: 401 }),
      key: '',
    };
  }
  try {
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return {
        denied: Response.json({ error: '登录已过期，请重新登录。' }, { status: 401 }),
        key: '',
      };
    }
    return { denied: null, key: `user:${data.user.id}` };
  } catch {
    // 鉴权服务本身不可用（网络抖动/超时）：这不是登录问题，按 503 报，
    // 免得会话完全有效的学习者被 401 文案误导去重新登录
    return {
      denied: Response.json({ error: '登录校验暂时不可用，请稍后重试。' }, { status: 503 }),
      key: '',
    };
  }
}

/** 内存滑动窗口限速。server.ts 是单进程常驻服务，进程内 Map 即可覆盖部署形态 */
const rateBuckets = new Map<string, number[]>();
/** 桶数硬上限：伪造来源批量刷新 key 时按插入序淘汰最旧的桶，杜绝无界增长 */
const RATE_LIMIT_MAX_BUCKETS = 2000;

function isRateLimited(key: string, maxRequests = RATE_LIMIT_MAX_REQUESTS): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const hits = (rateBuckets.get(key) ?? []).filter((t) => t > windowStart);
  if (hits.length >= maxRequests) {
    rateBuckets.set(key, hits);
    return true;
  }
  hits.push(now);
  // 先删再插：Map 保持插入序，活跃桶始终沉到末尾（近似 LRU），
  // 超限时从头部淘汰即可，代价 O(超出量) 而非全表扫描
  rateBuckets.delete(key);
  rateBuckets.set(key, hits);
  if (rateBuckets.size > RATE_LIMIT_MAX_BUCKETS) {
    const overflow = rateBuckets.size - RATE_LIMIT_MAX_BUCKETS;
    let evicted = 0;
    for (const k of rateBuckets.keys()) {
      rateBuckets.delete(k);
      if (++evicted >= overflow) break;
    }
  }
  return false;
}

/** 只收 user/assistant 两种角色的纯文本消息：拦掉客户端注入的 system 角色与超长内容 */
function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string',
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      content:
        m.content.length > MAX_CHARS_PER_MESSAGE
          ? m.content.slice(0, MAX_CHARS_PER_MESSAGE)
          : m.content,
    }));
}

/**
 * 本地起服务时 Coze 运行时不会注入模型凭据，SDK 会在流开始后才抛 Missing credentials。
 * 这类失败与网络抖动的处理方式完全不同，必须在提示里说清楚，否则只会看到「重试」而重试永远不会成功。
 */
function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/credential|api[_ ]?key|unauthor|401/i.test(msg)) {
    return '小简未接通：当前环境没有模型凭据（部署到 Coze 运行时会自动注入）。环节资料与细问不受影响，仍可正常阅读。';
  }
  return '小简暂时没接通，请重试。';
}

export async function POST(req: NextRequest) {
  try {
    const { denied, key } = await requireUser(req);
    if (denied) return denied;
    if (isRateLimited(key)) {
      return Response.json({ error: '提问有点太快了，歇一会儿再试。' }, { status: 429 });
    }
    // 降级形态（按 IP 记账）再叠一只全局桶兜底：IP 可被伪造 XFF 刷新绕过
    // 单桶限速，全局总额度保证匿名流量烧不穿模型配额
    if (key.startsWith('ip:') && isRateLimited('global:degraded', 60)) {
      return Response.json({ error: '当前提问的人有点多，稍等片刻再试。' }, { status: 429 });
    }

    const body = await req.json();
    const messages = sanitizeMessages(body?.messages);
    // stage 可选：从环节页进入助教页时携带；从大厅进入时不带，走通用带教口径
    const stageId = Number(body?.stage);
    const validStage = STAGES.some((s) => s.id === stageId) ? stageId : 0;
    // act 可选：学习者当前读到的节名（环节页一节一屏，前端实时透传）
    const ACT_TITLES = [ACT_WHY, ACT_DATA, ACT_QUESTIONS];
    const actTitle = ACT_TITLES.includes(body?.act) ? (body.act as string) : undefined;
    // noRag：hidden 触发消息（开场 / 翻节通知）不做知识库检索，免得无意义烧检索
    const noRag = body?.noRag === true;

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const client = new LLMClient(new Config(), customHeaders);

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(validStage, actTitle) },
      ...messages,
    ];

    // 首轮由前端发一条空消息触发开场，这里补一条用户消息，
    // 否则部分模型会拒绝只有 system 的请求
    const hasUserMessage = chatMessages.some((m) => m.role === 'user');
    if (!hasUserMessage) {
      chatMessages.push({ role: 'user', content: '我进入了本环节，请开始带教。' });
    }

    const encoder = new TextEncoder();
    let closed = false;
    // 定时器与模型流句柄放在 start/cancel 共享的作用域：
    // 客户端断开（cancel）时也要能清定时器、停上游，否则每个被放弃的
    // 请求都拖着最长 180s 的闭包，模型还在对一条死连接继续生成
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let modelIterator: AsyncIterator<{ content?: { toString(): string } }> | undefined;

    const clearTimers = () => {
      if (heartbeat) clearInterval(heartbeat);
      if (deadline) clearTimeout(deadline);
    };
    // 尽力中止上游模型流：async generator 的 return() 会走 SDK 的清理路径
    const stopUpstream = () => {
      void modelIterator?.return?.(undefined)?.catch(() => {});
    };
    // 中止信号：deadline / cancel 触发后让消费循环立刻退出——
    // 上游彻底悬死时 iterator.next() 可能永远不 settle，仅靠它循环出不去
    let signalAbort: (() => void) | undefined;
    const abortedSignal = new Promise<'stopped'>((resolve) => {
      signalAbort = () => resolve('stopped');
    });

    // RAG 检索与模型调用都放进流内执行：响应头立即返回，
    // 检索期间靠心跳占位，代理不会因首字节迟迟不来而掐断连接
    return new Response(
      new ReadableStream({
        async start(controller) {
          const send = (payload: unknown) => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            } catch {
              // 断开竞态：cancel 尚未回调但流已不可写。enqueue 的异常若从
              // deadline 定时器回调里逃逸会变成未捕获异常，必须就地吞掉
              closed = true;
            }
          };
          const finish = (payload?: unknown) => {
            if (closed) return;
            if (payload) send(payload);
            try {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              closed = true;
              controller.close();
            } catch {
              closed = true;
            }
            // 就地清定时器：模型流悬死时 finally 可能永远走不到
            clearTimers();
          };

          // 心跳：SSE 注释行，客户端按行前缀过滤自动忽略
          heartbeat = setInterval(() => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(': ping\n\n'));
            } catch {
              closed = true;
            }
          }, HEARTBEAT_INTERVAL_MS);

          // 总时限兜底：模型长时间不产出时以 error 帧收尾，并主动停掉上游，
          // 不能只关浏览器这头、任由模型对死连接继续生成
          deadline = setTimeout(() => {
            finish({ error: '这轮回复超时了，请重试。' });
            stopUpstream();
            signalAbort?.();
          }, STREAM_DEADLINE_MS);

          try {
            // 知识库增强（RAG）：用学习者本轮的真实发问检索三册参考书的扫描页，
            // 以图片形式贴进本轮用户消息。hidden 触发语不检索；失败静默降级。
            if (hasUserMessage && !noRag) {
              const last = chatMessages[chatMessages.length - 1];
              if (last.role === 'user' && typeof last.content === 'string') {
                try {
                  const pages = await retrieveReferencePages(last.content, customHeaders);
                  if (pages.length) {
                    const parts: ContentPart[] = [
                      {
                        type: 'text',
                        text: `【参考书籍扫描页 ${pages.length} 张，按系统提示词第五节使用】`,
                      },
                    ];
                    for (const [i, p] of pages.entries()) {
                      parts.push({ type: 'text', text: `扫描页 ${i + 1}，摘自${p.book}：` });
                      parts.push({
                        type: 'image_url',
                        image_url: { url: p.imageUrl, detail: 'high' },
                      });
                    }
                    parts.push({ type: 'text', text: `【学习者的发言】\n${last.content}` });
                    chatMessages[chatMessages.length - 1] = { role: 'user', content: parts };
                  }
                } catch (err) {
                  console.error('[wujian] rag error (degraded to no-rag):', err);
                }
              }
            }

            // RAG 的 await 期间客户端可能已断开（翻节/收起都会掐掉在途请求）：
            // 此时绝不能再发起模型调用——那是对一条死连接烧一次完整 prefill
            if (closed) return;

            const stream = client.stream(chatMessages, {
              model: 'doubao-seed-2-0-lite-260215',
              temperature: 0.6,
            });
            modelIterator = stream[Symbol.asyncIterator]();

            for (;;) {
              // 与中止信号赛跑：上游悬死时 next() 永不 settle，
              // 没有这层 race，finally 不可达、整个闭包随请求泄漏
              const result = await Promise.race([modelIterator.next(), abortedSignal]);
              if (result === 'stopped') break;
              const { done, value } = result;
              if (done) break;
              if (closed) {
                stopUpstream();
                break;
              }
              if (value?.content) send({ content: value.content.toString() });
            }
            finish({ done: true });
          } catch (err) {
            // 流已经开始，用户可能已经看到部分文字：用一个 error 帧收尾，
            // 而不是 controller.error() 把已输出的内容一起截断
            if (!closed) console.error('[wujian] stream error:', err);
            finish({ error: describeError(err) });
          } finally {
            clearTimers();
          }
        },
        cancel() {
          // 客户端断开：置标志、清定时器、停上游、放行消费循环，四者都要做
          closed = true;
          clearTimers();
          stopUpstream();
          signalAbort?.();
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  } catch (error) {
    console.error('[wujian] chat api error:', error);
    return Response.json({ error: '助教服务暂不可用' }, { status: 500 });
  }
}
