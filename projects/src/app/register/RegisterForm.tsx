'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, LockKeyhole } from 'lucide-react';
import {
  AuthError,
  AuthField,
  AuthShell,
  AuthSubmitButton,
  useAuthPageReady,
} from '@/components/workshop/AuthShell';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';

export function RegisterForm() {
  const router = useRouter();
  const { ready, screen } = useAuthPageReady();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!ready) return screen;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('该邮箱已被注册');
        } else {
          setError(authError.message);
        }
        return;
      }

      /* mailer_auto_confirm=true 时注册即登录，data.session 直接可用 */
      if (data.session) {
        router.replace('/');
      } else {
        /* 兜底：如果 session 没有立即返回，跳登录页 */
        router.replace('/login');
      }
    } catch {
      setError('网络异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      cardTitle="创建账号"
      altLink={{ hint: '已有账号？', href: '/login', label: '去登录' }}
    >
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
          autoComplete="new-password"
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

        <AuthField
          id="confirmPassword"
          label="确认密码"
          icon={LockKeyhole}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="再次输入密码"
        />

        <AuthError message={error} />

        <AuthSubmitButton submitting={submitting} idleText="注 册" busyText="注册中..." />
      </form>
    </AuthShell>
  );
}
