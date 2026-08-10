'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface SupabaseConfigContextType {
  config: SupabaseConfig | null;
  isLoading: boolean;
  error: string | null;
}

const SupabaseConfigContext = createContext<SupabaseConfigContextType>({
  config: null,
  isLoading: true,
  error: null,
});

export const SUPABASE_CONFIG_READY_EVENT = 'supabase-config-ready';

export function useSupabaseConfig() {
  return useContext(SupabaseConfigContext);
}

interface SupabaseConfigProviderProps {
  children: ReactNode;
}

export function SupabaseConfigProvider({ children }: SupabaseConfigProviderProps) {
  const [config, setConfig] = useState<SupabaseConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/supabase-config')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.url && data.anonKey) {
          const config: SupabaseConfig = { url: data.url, anonKey: data.anonKey };
          setConfig(config);
          (window as unknown as { __SUPABASE_CONFIG__: SupabaseConfig }).__SUPABASE_CONFIG__ = config;
          window.dispatchEvent(new CustomEvent(SUPABASE_CONFIG_READY_EVENT, { detail: config }));
        } else {
          // 接口 200 + configured:false：凭据未注入（本地开发的预期形态），
          // 鉴权按未配置降级，只留一条 warn 说明原因——不是错误，不进红色浮层
          setError('not-configured');
          console.warn(
            '[wujian] Supabase 未配置，登录功能降级（本地起服务无凭据时属预期；部署到 Coze 运行时会自动注入）。',
          );
        }
      })
      .catch((err) => {
        // 真正的网络/接口异常才落到这里
        setError(err instanceof Error ? err.message : String(err));
        console.warn('[wujian] Supabase 配置拉取失败：', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <SupabaseConfigContext.Provider value={{ config, isLoading, error }}>
      {children}
    </SupabaseConfigContext.Provider>
  );
}
