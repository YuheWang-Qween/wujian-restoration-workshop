'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, Play, LogIn } from 'lucide-react';
import type { ChaoxingLoginOptions } from '@/lib/chaoxing-client';
import {
  AuthError,
  AuthField,
  AuthShell,
  AuthSubmitButton,
  useAuthPageReady,
} from '@/components/workshop/AuthShell';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';

/** 未配置名称时 name 会回落成 FID 本身，此时不必再括号重复一遍。 */
function formatInstitution({ fid, name }: { fid: string; name: string }): string {
  return name === fid ? fid : `${name}（${fid}）`;
}

/**
 * 登录页：超星集成登录为主入口。配置了 CHAOXING_* 环境变量时只展示超星
 * 按钮（多机构时带下拉框）；未配置时按钮禁用并回落到邮箱密码表单，
 * 本地开发不至于被锁死。
 */
export function LoginForm({ chaoxing }: { chaoxing: ChaoxingLoginOptions }) {
  const router = useRouter();
  const { ready, screen } = useAuthPageReady();

  const [fid, setFid] = useState('');
  const [pending, setPending] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!ready) return screen;

  function handleChaoxingLogin() {
    setPending(true);
    // 没有下拉框时不带 fid，服务端会用第一个 FID 起头再轮询其余机构。
    window.location.assign(
      fid ? `/api/auth/chaoxing?fid=${encodeURIComponent(fid)}` : '/api/auth/chaoxing',
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('邮箱或密码错误');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('邮箱尚未确认，请检查收件箱');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.session) {
        router.replace('/');
      }
    } catch {
      const cfg = window.__SUPABASE_CONFIG__;
      if (!cfg?.url || !cfg?.anonKey) {
        setError('登录服务未就绪，请稍后再试或联系管理员');
      } else {
        setError('网络异常，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const chaoxingPrimary = (
    <>
      {chaoxing.institutions.length > 0 && (
        <div data-demo="login-fid">
          <label htmlFor="fid" className="mb-2 block text-sm font-medium text-wj-muted">
            所属机构
          </label>
          <div className="group relative">
            <LogIn className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wj-dim transition-colors group-focus-within:text-wj-cinnabar" />
            <select
              id="fid"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              disabled={pending}
              className="w-full appearance-none rounded border border-wj-border bg-wj-raised py-2.5 pl-10 pr-3 text-base text-wj-ink transition-all focus:border-wj-cinnabar focus:bg-wj-surface focus:outline-none focus:ring-2 focus:ring-wj-cinnabar/20 sm:text-sm"
            >
              <option value="">请选择所属机构</option>
              {chaoxing.institutions.map((institution) => (
                <option key={institution.fid} value={institution.fid}>
                  {formatInstitution(institution)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleChaoxingLogin}
        disabled={!chaoxing.configured || pending || (chaoxing.institutions.length > 0 && !fid)}
        data-demo="login-chaoxing"
        className="w-full rounded bg-wj-cinnabar py-3 text-sm font-medium tracking-[0.2em] text-white shadow-[0_2px_8px_-1px_rgba(163,57,42,0.3)] transition-all hover:bg-wj-cinnabar/90 hover:shadow-[0_4px_16px_-2px_rgba(163,57,42,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? '正在跳转…' : '使用超星账号登录'}
      </button>
      {!chaoxing.configured && (
        <p className="text-center text-xs text-wj-dim">超星登录未配置，请联系管理员</p>
      )}
    </>
  );

  return (
    <AuthShell
      cardTitle="账号登录"
      altLink={
        chaoxing.configured
          ? undefined
          : { hint: '还没有账号？', href: '/register', label: '去注册' }
      }
    >
      <div className="space-y-5">
        {chaoxingPrimary}

        {/* 演示按钮：与超星登录并列，访客可不注册先看完整演示 */}
        <button
          type="button"
          onClick={() => window.__startDemo?.()}
          data-demo="login-demo"
          className="demo-cta group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-wj-water py-3 text-sm font-medium tracking-wide text-wj-cinnabar-ink shadow-sm transition-all hover:-translate-y-px hover:brightness-110 hover:shadow-md active:translate-y-0"
        >
          <span className="demo-cta-glow" aria-hidden />
          <Play className="demo-cta-icon h-4 w-4" />
          观看演示 · 约 3 分钟
        </button>

        {chaoxing.configured ? (
          <p className="text-center text-xs leading-relaxed text-wj-dim">
            首次登录将自动创建账号，学习进度与超星账号绑定
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-wj-line" />
              <span className="text-xs text-wj-dim">开发环境邮箱登录</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-wj-line" />
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <AuthField
                id="email"
                label="邮箱"
                icon={Mail}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />

              <AuthField
                id="password"
                label="密码"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center text-wj-dim transition-colors hover:text-wj-muted"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <AuthError message={error} />

              <AuthSubmitButton submitting={submitting} idleText="登 录" busyText="登录中..." />
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}
