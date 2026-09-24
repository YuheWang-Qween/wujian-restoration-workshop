'use client';

import { useState } from 'react';
import { Play, LogIn } from 'lucide-react';
import type { ChaoxingLoginOptions } from '@/lib/chaoxing-client';
import { AuthShell, useAuthPageReady } from '@/components/workshop/AuthShell';

/** 未配置名称时 name 会回落成 FID 本身，此时不必再括号重复一遍。 */
function formatInstitution({ fid, name }: { fid: string; name: string }): string {
  return name === fid ? fid : `${name}（${fid}）`;
}

/**
 * 登录页：仅超星集成登录。配置了 CHAOXING_* 环境变量时展示超星按钮
 * （多机构时带下拉框）；未配置时按钮禁用并提示联系管理员。
 */
export function LoginForm({ chaoxing }: { chaoxing: ChaoxingLoginOptions }) {
  const { ready, screen } = useAuthPageReady();

  const [fid, setFid] = useState('');
  const [pending, setPending] = useState(false);

  if (!ready) return screen;

  function handleChaoxingLogin() {
    setPending(true);
    // 没有下拉框时不带 fid，服务端会用第一个 FID 起头再轮询其余机构。
    window.location.assign(
      fid ? `/api/auth/chaoxing?fid=${encodeURIComponent(fid)}` : '/api/auth/chaoxing',
    );
  }

  return (
    <AuthShell cardTitle="账号登录">
      <div className="space-y-5">
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

        <p className="text-center text-xs leading-relaxed text-wj-dim">
          首次登录将自动创建账号，学习进度与超星账号绑定
        </p>

        {/* 演示按钮：与超星登录并列，访客可不登录先看完整演示 */}
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
      </div>
    </AuthShell>
  );
}
