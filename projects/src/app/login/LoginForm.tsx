'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import {
  AuthError,
  AuthField,
  AuthShell,
  AuthSubmitButton,
  useAuthPageReady,
} from '@/components/workshop/AuthShell';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';

export function LoginForm() {
  const router = useRouter();
  const { ready, screen } = useAuthPageReady();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!ready) return screen;

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
      setError('网络异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      cardTitle="账号登录"
      altLink={{ hint: '还没有账号？', href: '/register', label: '去注册' }}
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
    </AuthShell>
  );
}
