import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { buildReferenceAnswerUserMsg } from '@/lib/workshop/grade-prompt';
import { getSupabaseCredentials } from '@/storage/database/supabase-client';

/** 参考答案限速：滑动窗口，按登录用户（或 IP）计。每小问前端只生成一次并缓存，额度从紧 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

/** SSE 心跳间隔（防代理空闲断连）与单次生成的总时限 */
const HEARTBEAT_INTERVAL_MS = 15_000;
const STREAM_DEADLINE_MS = 60_000;

/**
 * 鉴权结果：denied 非空表示直接返回该响应；
 * key 是限速的记账主体——已验证用户用 user.id，降级场景用 IP。
 * 与 /api/chat、/api/grade 同一套口径。
 */
interface AuthResult {
  denied: Response | null;
  key: string;
}

function clientIp(req: NextRequest): string {
  // XFF 由代理逐跳追加：首值可任意伪造，最后一个才是最近一跳可信代理看到的真实对端
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Supabase 凭据可用时强制校验 Bearer token（部署环境即此形态），
 * 凭据不可用（本地起服务）时降级放行——与 /api/grade 的口径一致。
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
      denied: Response.json({ error: '请先登录，再查看参考答案。' }, { status: 401 }),
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
    // 鉴权服务本身不可用（网络抖动/超时）：按 503 报，免得会话有效的学习者被 401 文案误导
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
  // 先删再插：Map 保持插入序，活跃桶始终沉到末尾（近似 LRU），超限时从头部淘汰
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

/**
 * 本地起服务时 Coze 运行时不会注入模型凭据，SDK 会在流开始后才抛 Missing credentials。
 * 这类失败必须在提示里说清楚，否则学习者只会看到「重试」而重试永远不会成功。
 */
function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/credential|api[_ ]?key|unauthor|401/i.test(msg)) {
    return '参考答案未接通：当前环境没有模型凭据（部署到 Coze 运行时会自动注入）。已提交的作答不受影响。';
  }
  return '参考答案生成失败了，稍后再试一次。';
}

export async function POST(req: NextRequest) {
  try {
    const { denied, key } = await requireUser(req);
    if (denied) return denied;
    if (isRateLimited(key)) {
      return Response.json({ error: '操作太频繁了，歇一会儿再试。' }, { status: 429 });
    }
    // 降级形态（按 IP 记账）再叠一只全局桶兜底：IP 可被伪造 XFF 刷新绕过，
    // 全局总额度保证匿名流量烧不穿模型配额
    if (key.startsWith('ip:') && isRateLimited('global:degraded', 60)) {
      return Response.json({ error: '当前使用的人有点多，稍等片刻再试。' }, { status: 429 });
    }

    const body = await req.json();
    const stageId = Number(body?.stage);
    const questionId = typeof body?.questionId === 'string' ? body.questionId : '';
    const partLabel = typeof body?.partLabel === 'string' ? body.partLabel : null;

    if (!questionId) {
      return Response.json({ error: '缺少题目。' }, { status: 400 });
    }

    const userMsg = buildReferenceAnswerUserMsg(stageId, questionId, partLabel);
    if (!userMsg) {
      return Response.json({ error: '题目不存在，或该题暂无参考答案。' }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const client = new LLMClient(new Config(), customHeaders);

    const encoder = new TextEncoder();
    let closed = false;
    // 定时器与模型流句柄放在 start/cancel 共享的作用域：
    // 客户端断开（cancel）时也要能清定时器、停上游，否则被放弃的请求拖着闭包
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

    return new Response(
      new ReadableStream({
        async start(controller) {
          const send = (payload: unknown) => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            } catch {
              // 断开竞态：cancel 尚未回调但流已不可写，就地吞掉防未捕获异常
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

          // 总时限兜底：模型长时间不产出时以 error 帧收尾，并主动停掉上游
          deadline = setTimeout(() => {
            finish({ error: '这次生成超时了，再试一次。' });
            stopUpstream();
            signalAbort?.();
          }, STREAM_DEADLINE_MS);

          try {
            const stream = client.stream([{ role: 'user', content: userMsg }], {
              model: 'doubao-seed-2-0-lite-260215',
              temperature: 0.2,
            });
            modelIterator = stream[Symbol.asyncIterator]();

            for (;;) {
              // 与中止信号赛跑：上游悬死时 next() 永不 settle，
              // 没有这层 race，finally 不可达、整个闭包随请求泄漏
              const result = await Promise.race([modelIterator.next(), abortedSignal]);
              if (result === 'stopped') return;
              const { done, value } = result;
              if (done) break;
              if (closed) {
                stopUpstream();
                return;
              }
              const text = value?.content?.toString() ?? '';
              if (!text) continue;
              send({ content: text });
            }
            finish({ done: true });
          } catch (err) {
            // 流可能已经开始，学习者可能已看到部分文字：用 error 帧收尾，
            // 而不是 controller.error() 把已输出的内容一起截断
            if (!closed) console.error('[wujian] reference-answer stream error:', err);
            finish({ error: describeError(err) });
          } finally {
            clearTimers();
          }
        },
        cancel() {
          // 客户端断开：清定时器、尽力停上游、唤醒可能悬死的 next()，闭包随请求释放
          closed = true;
          clearTimers();
          stopUpstream();
          signalAbort?.();
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      },
    );
  } catch (err) {
    console.error('[reference-answer] error:', err);
    return Response.json({ error: '服务开了个小差，请稍后再试。' }, { status: 500 });
  }
}
