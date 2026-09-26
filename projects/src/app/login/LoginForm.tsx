'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, LogIn, GraduationCap, KeyRound, Compass } from 'lucide-react';
import type { ChaoxingLoginOptions } from '@/lib/chaoxing-client';
import { enterGuestMode, exitGuestMode } from '@/lib/guest-mode';
import { AuthShell, useAuthPageReady } from '@/components/workshop/AuthShell';

const TEACHER_PASSCODE = '123';

/** 未配置名称时 name 会回落成 FID 本身，此时不必再括号重复一遍。 */
function formatInstitution({ fid, name }: { fid: string; name: string }): string {
  return name === fid ? fid : `${name}（${fid}）`;
}

/**
 * 登录页：仅超星集成登录。学生直接登录；教师需输入口令解锁。
 * 角色随登录写入 localStorage('wj-role')，供应用内教师标识使用。
 */
export function LoginForm({ chaoxing }: { chaoxing: ChaoxingLoginOptions }) {
  const { ready, screen } = useAuthPageReady();
  const router = useRouter();

  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [passcode, setPasscode] = useState('');
  const [fid, setFid] = useState('');
  const [pending, setPending] = useState(false);

  if (!ready) return screen;

  const teacherLocked = role === 'teacher' && passcode !== TEACHER_PASSCODE;

  function handleChaoxingLogin() {
    if (teacherLocked) return;
    setPending(true);
    localStorage.setItem('wj-role', role);
    exitGuestMode();
    // 登录页已验过教师口令，存入本会话供 /teacher 免二次验证。
    if (role === 'teacher') window.sessionStorage.setItem('wj-teacher-passcode', passcode);
    else window.sessionStorage.removeItem('wj-teacher-passcode');
    // 没有下拉框时不带 fid，服务端会用第一个 FID 起头再轮询其余机构。
    window.location.assign(
      fid ? `/api/auth/chaoxing?fid=${encodeURIComponent(fid)}` : '/api/auth/chaoxing',
    );
  }

  function handleGuestBrowse() {
    enterGuestMode();
    router.push('/');
  }

  return (
    <AuthShell cardTitle="账号登录">
      <div className="space-y-5">
        {/* 身份选择：学生直接登录，教师需口令 */}
        <div className="grid grid-cols-2 gap-2" data-demo="login-role">
          <button
            type="button"
            onClick={() => setRole('student')}
            data-demo="login-role-student"
            className={`flex items-center justify-center gap-1.5 rounded border py-2.5 text-sm transition-all ${
              role === 'student'
                ? 'border-wj-cinnabar bg-wj-cinnabar/5 font-medium text-wj-cinnabar'
                : 'border-wj-border bg-wj-raised text-wj-muted hover:border-wj-muted/50'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            我是学生
          </button>
          <button
            type="button"
            onClick={() => setRole('teacher')}
            data-demo="login-role-teacher"
            className={`flex items-center justify-center gap-1.5 rounded border py-2.5 text-sm transition-all ${
              role === 'teacher'
                ? 'border-wj-cinnabar bg-wj-cinnabar/5 font-medium text-wj-cinnabar'
                : 'border-wj-border bg-wj-raised text-wj-muted hover:border-wj-muted/50'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            我是教师
          </button>
        </div>

        {role === 'teacher' && (
          <div data-demo="login-passcode">
            <label htmlFor="passcode" className="mb-2 block text-sm font-medium text-wj-muted">
              教师口令
            </label>
            <div className="group relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wj-dim transition-colors group-focus-within:text-wj-cinnabar" />
              <input
                id="passcode"
                type="password"
                inputMode="numeric"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={pending}
                placeholder="请输入教师口令"
                autoComplete="off"
                className="w-full rounded border border-wj-border bg-wj-raised py-2.5 pl-10 pr-3 text-base text-wj-ink transition-all placeholder:text-wj-dim focus:border-wj-cinnabar focus:bg-wj-surface focus:outline-none focus:ring-2 focus:ring-wj-cinnabar/20 sm:text-sm"
              />
            </div>
            {passcode.length > 0 && passcode !== TEACHER_PASSCODE && (
              <p className="mt-1.5 text-xs text-wj-cinnabar">口令不正确，请重新输入</p>
            )}
          </div>
        )}

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
          disabled={
            !chaoxing.configured || pending || teacherLocked || (chaoxing.institutions.length > 0 && !fid)
          }
          data-demo="login-chaoxing"
          className="w-full rounded bg-wj-cinnabar py-3 text-sm font-medium tracking-[0.2em] text-white shadow-[0_2px_8px_-1px_rgba(163,57,42,0.3)] transition-all hover:bg-wj-cinnabar/90 hover:shadow-[0_4px_16px_-2px_rgba(163,57,42,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? '正在跳转…'
            : teacherLocked
              ? '请先输入教师口令'
              : '使用超星账号登录'}
        </button>
        {!chaoxing.configured && (
          <p className="text-center text-xs text-wj-dim">超星登录未配置，请联系管理员</p>
        )}

        <p className="text-center text-xs leading-relaxed text-wj-dim">
          {role === 'teacher'
            ? '教师口令验证后登录，学习进度与超星账号绑定'
            : '首次登录将自动创建账号，学习进度与超星账号绑定'}
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

        {/* 游客浏览：跳过登录自由逛，进度只存本机 */}
        <button
          type="button"
          onClick={handleGuestBrowse}
          className="flex w-full items-center justify-center gap-2 rounded border border-wj-border bg-transparent py-2.5 text-sm text-wj-muted transition-colors hover:border-wj-muted/60 hover:text-wj-ink"
        >
          <Compass className="h-4 w-4" />
          游客浏览 · 不登录先逛逛
        </button>
        <p className="text-center text-xs leading-relaxed text-wj-dim">
          游客模式下学习进度仅保存在本机浏览器，登录后可同步到账号
        </p>
      </div>
    </AuthShell>
  );
}
