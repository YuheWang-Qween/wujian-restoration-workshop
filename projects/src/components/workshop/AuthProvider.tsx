'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import { useSupabaseConfig } from '@/lib/supabase-config-inject';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/** 不需要登录态就能访问的路径 */
const PUBLIC_PATHS = new Set(['/login', '/register']);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { config, isLoading: configLoading } = useSupabaseConfig();
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ---- 初始化：读一次当前 session ---- */
  useEffect(() => {
    if (configLoading) return;
    // 配置拉取失败（本地无凭据 / 接口异常）：按未登录落定，不能让 isLoading
    // 卡在 true——那会使登录页死转圈、路由守卫永不生效
    if (!config) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch {
        // 配置尚未就绪，忽略
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, configLoading]);

  /* ---- 监听 auth 状态变化 ---- */
  useEffect(() => {
    if (configLoading || !config) return;

    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [config, configLoading, router]);

  /* ---- 路由守卫：未登录跳登录页 ----
   * 只在鉴权服务可用（config 拿到了）时执行；配置服务整体不可用时降级放行，
   * 与 /api/chat「本地无凭据仍可阅读资料」的口径一致，避免本地开发被锁死。
   * 用 replace 而非 push：跳转页不进历史，防止「后退又被弹回」的循环。 */
  useEffect(() => {
    if (isLoading || configLoading) return;
    if (window.__DEMO_MODE__) return;
    if (config && !user && !PUBLIC_PATHS.has(pathname)) {
      router.replace('/login');
    }
  }, [isLoading, configLoading, config, user, pathname, router]);

  /* ---- 登出 ---- */
  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // 即使 signOut 失败也强制跳转
    }
    setSession(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  /* ---- 渲染层闸门：配置可用但未登录时不输出受保护内容 ----
   * isLoading / configLoading 期间直接放行渲染，避免全屏 spinner。
   * 只在鉴权明确落定（config 有值且 user 为 null）时才拦截。 */
  const demoMode = typeof window !== 'undefined' && window.__DEMO_MODE__ === true;
  const gated = !PUBLIC_PATHS.has(pathname) && !!config && !user && !demoMode;

  return (
    <AuthContext.Provider
      value={{ user, session, isAuthenticated: !!user, isLoading: isLoading || configLoading, signOut }}
    >
      {gated ? null : children}
    </AuthContext.Provider>
  );
}
