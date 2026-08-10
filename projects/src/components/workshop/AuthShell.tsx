'use client';

import { useEffect, type ComponentType, type InputHTMLAttributes, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useSupabaseConfig } from '@/lib/supabase-config-inject';
import { cn } from '@/lib/utils';

/**
 * 登录 / 注册两页的公共骨架：背景图 + 渐变遮罩 + 朱文方印标题 + 竹简纹卡片。
 * 两页此前是 ~200 行的结构级复制，改动一处漏一处（历史上确实发生过），
 * 收拢到这里之后页面只剩各自的表单字段与提交逻辑。
 */

const APP_NAME = '走马楼三国吴简';
const APP_SUBTITLE = '简牍修复工坊';

/** 背景图 + 渐变遮罩（加载态与正式页共用同一底子，切换时背景不跳） */
function AuthBackdrop() {
  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/login-bg.jpg)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/15 to-white/45" />
    </>
  );
}

/**
 * 鉴权页的公共守卫：已登录直接回首页；鉴权状态未落定时渲染加载屏。
 * 返回 true 表示页面应渲染表单，false 表示本组件已代为渲染（加载屏 / 空）。
 */
export function useAuthPageReady(): { ready: boolean; screen: ReactNode } {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: configLoading } = useSupabaseConfig();

  /* 已登录 → 直接跳首页（跳转必须放进 effect，渲染期调 router 会触发 React 告警） */
  useEffect(() => {
    if (!authLoading && !configLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [authLoading, configLoading, isAuthenticated, router]);

  if (authLoading || configLoading) {
    return {
      ready: false,
      screen: (
        <div className="relative flex min-h-dvh items-center justify-center">
          <AuthBackdrop />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-wj-cinnabar" />
            <p className="font-serif text-sm text-wj-muted">正在加载...</p>
          </div>
        </div>
      ),
    };
  }
  if (isAuthenticated) return { ready: false, screen: null };
  return { ready: true, screen: null };
}

interface AuthShellProps {
  /** 卡片内的小标题：「账号登录」/「创建账号」 */
  cardTitle: string;
  /** 卡片底部的互跳链接：{ hint: '还没有账号？', href: '/register', label: '去注册' } */
  altLink: { hint: string; href: string; label: string };
  children: ReactNode;
}

export function AuthShell({ cardTitle, altLink, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-12 lg:justify-end lg:pr-16 xl:pr-24">
      <AuthBackdrop />

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* 标题区：印章 + 名称 */}
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-5 flex size-14 flex-col items-center justify-center rounded bg-wj-cinnabar ring-2 ring-wj-cinnabar/20 ring-offset-2 ring-offset-transparent shadow-[0_4px_16px_-2px_rgba(163,57,42,0.3)]">
            <span className="wj-seal text-lg leading-none text-wj-cinnabar-ink">吴</span>
            <span className="wj-seal text-lg leading-none text-wj-cinnabar-ink">簡</span>
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold tracking-[0.15em] text-wj-ink sm:text-3xl">
            {APP_NAME}
          </h1>
          <p className="mt-2 font-serif text-sm tracking-wider text-wj-muted">{APP_SUBTITLE}</p>
        </div>

        {/* 卡片：竹简纹 + 顶部朱砂细线 */}
        <div className="wj-slip relative overflow-hidden rounded-lg border border-wj-border/60 bg-wj-surface/[0.97] bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_3px,rgba(30,27,22,0.008)_3px,rgba(30,27,22,0.008)_4px)] shadow-[0_8px_32px_-8px_rgba(30,27,22,0.12),0_2px_8px_-2px_rgba(30,27,22,0.06)] backdrop-blur-md">
          <div className="h-[3px] bg-gradient-to-r from-wj-cinnabar/0 via-wj-cinnabar to-wj-cinnabar/0" />
          <div className="p-8">
            <h2 className="mb-6 text-center font-serif text-lg font-medium tracking-wide text-wj-ink">
              {cardTitle}
            </h2>

            {children}

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-wj-line" />
              <span className="text-xs text-wj-dim">或</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-wj-line" />
            </div>

            <p className="text-center text-sm text-wj-muted">
              {altLink.hint}{' '}
              <Link
                href={altLink.href}
                className="font-medium text-wj-cinnabar underline-offset-4 transition-colors hover:text-wj-cinnabar/80 hover:underline"
              >
                {altLink.label}
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs tracking-wide text-wj-ink/25">
          资料出自《长沙走马楼三国吴简的保护与整理》
        </p>
      </div>
    </div>
  );
}

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** 输入框左侧的 lucide 图标 */
  icon: ComponentType<{ className?: string }>;
  /** 右侧附加控件（如密码可见性切换），占 pr-10 的位置 */
  trailing?: ReactNode;
}

export function AuthField({ id, label, icon: Icon, trailing, ...input }: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-wj-muted">
        {label}
      </label>
      <div className="group relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wj-dim transition-colors group-focus-within:text-wj-cinnabar" />
        <input
          id={id}
          {...input}
          className={cn(
            'w-full rounded border border-wj-border bg-wj-raised py-2.5 pl-10 text-base text-wj-ink transition-all placeholder:text-wj-dim focus:border-wj-cinnabar focus:bg-wj-surface focus:outline-none focus:ring-2 focus:ring-wj-cinnabar/20 sm:text-sm',
            trailing ? 'pr-10' : 'pr-3',
          )}
        />
        {trailing}
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="animate-in fade-in slide-in-from-top-1 rounded-md border border-wj-cinnabar/25 bg-wj-cinnabar/8 px-4 py-3 text-sm leading-relaxed text-wj-cinnabar">
      {message}
    </div>
  );
}

export function AuthSubmitButton({
  submitting,
  idleText,
  busyText,
}: {
  submitting: boolean;
  idleText: string;
  busyText: string;
}) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className={cn(
        'w-full rounded bg-wj-cinnabar py-3 text-sm font-medium tracking-[0.2em] text-white shadow-[0_2px_8px_-1px_rgba(163,57,42,0.3)] transition-all hover:bg-wj-cinnabar/90 hover:shadow-[0_4px_16px_-2px_rgba(163,57,42,0.4)] active:scale-[0.98]',
        submitting && 'cursor-not-allowed opacity-60',
      )}
    >
      {submitting ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {busyText}
        </span>
      ) : (
        idleText
      )}
    </button>
  );
}
