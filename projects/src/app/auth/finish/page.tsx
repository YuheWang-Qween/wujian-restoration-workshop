'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';

/**
 * 超星登录的客户端收尾：服务端回调已把超星身份落成 Supabase 用户并生成
 * 一次性 magic link token，本页用浏览器客户端消费它建立本地会话。
 * 会话落在 localStorage，与进度同步、成就等现有链路完全一致。
 */
function FinishInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;

    const tokenHash = params.get('token_hash');
    const nextPath = params.get('next');

    if (!tokenHash) {
      setError('登录凭据缺失，请从登录页重新发起');
      return;
    }

    // next 只允许站内相对路径，与回调侧同一套校验口径
    const safeNext =
      nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';

    (async () => {
      try {
        const supabase = await getSupabaseBrowserClientWithRetry();
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });
        if (otpError) throw otpError;
        router.replace(safeNext);
      } catch (err) {
        console.error('建立登录会话失败:', err);
        setError('登录会话建立失败，请返回登录页重试');
      }
    })();
  }, [params, router]);

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/login-bg.jpg)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/15 to-white/45" />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-wj-border/60 bg-wj-surface/[0.97] p-8 text-center shadow-[0_8px_32px_-8px_rgba(30,27,22,0.12)] backdrop-blur-md">
        <div className="mb-5 flex flex-col items-center">
          <div className="flex size-14 flex-col items-center justify-center rounded bg-wj-cinnabar ring-2 ring-wj-cinnabar/20 ring-offset-2 ring-offset-transparent">
            <span className="wj-seal text-lg leading-none text-wj-cinnabar-ink">吴</span>
            <span className="wj-seal text-lg leading-none text-wj-cinnabar-ink">簡</span>
          </div>
        </div>
        {error ? (
          <>
            <p className="font-serif text-lg text-wj-cinnabar">{error}</p>
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="mt-6 w-full rounded bg-wj-cinnabar py-3 text-sm font-medium tracking-[0.2em] text-white transition-colors hover:bg-wj-cinnabar/90"
            >
              返回登录页
            </button>
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 font-serif text-lg text-wj-muted">
            <Loader2 className="h-5 w-5 animate-spin text-wj-cinnabar" />
            正在完成登录，请稍候…
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuthFinishPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-wj-surface">
          <Loader2 className="h-6 w-6 animate-spin text-wj-cinnabar" />
        </div>
      }
    >
      <FinishInner />
    </Suspense>
  );
}
