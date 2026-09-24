import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { getChaoxingLoginOptions } from '@/lib/chaoxing-client';
import { normalizeLoginErrorReason, type LoginErrorReason } from '@/lib/login-error';

export const metadata: Metadata = {
  title: '登录失败',
  description: '超星登录未能完成',
};

const ERROR_COPY: Record<LoginErrorReason, { title: string; description: string }> = {
  institution_mismatch: {
    title: '账号无权登录本应用',
    description:
      '你的超星账号不属于本应用允许的任何机构，或这些机构未开通本应用。请联系管理员确认账号所在机构。',
  },
  oauth_failed: {
    title: '超星授权未完成',
    description: '超星没有返回有效的授权信息，授权码可能已过期或被重复使用。请返回登录页重试。',
  },
  session_failed: {
    title: '登录会话建立失败',
    description: '超星身份已验证通过，但创建本地登录会话时出错。请稍后重试，若持续失败请联系管理员。',
  },
  config_missing: {
    title: '登录服务未正确配置',
    description: '应用缺少超星登录所需的配置项，用户侧无法自行解决，请联系管理员。',
  },
};

/** 登录页有下拉框时，institution_mismatch 是"选错了"，用户自己就能补救。 */
const INSTITUTION_MISMATCH_WITH_CHOICE = {
  title: '无法在该机构下登录',
  description:
    '你的超星账号不属于所选机构，或该机构未开通本应用。请返回登录页换一个机构再试。',
};

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

interface LoginErrorPageProps {
  searchParams: Promise<{ reason?: string | string[] }>;
}

export default async function LoginErrorPage({ searchParams }: LoginErrorPageProps) {
  const params = await searchParams;
  const reason = normalizeLoginErrorReason(firstParam(params.reason).trim());
  const canChooseInstitution = getChaoxingLoginOptions().institutions.length > 0;
  const copy =
    reason === 'institution_mismatch' && canChooseInstitution
      ? INSTITUTION_MISMATCH_WITH_CHOICE
      : ERROR_COPY[reason];

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/login-bg.jpg)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/15 to-white/45" />
      <main className="relative z-10 flex w-full max-w-md flex-col items-center gap-5 rounded-lg border border-wj-border/60 bg-wj-surface/[0.97] p-8 text-center shadow-[0_8px_32px_-8px_rgba(30,27,22,0.12)] backdrop-blur-md">
        <AlertCircle className="size-10 text-wj-cinnabar" />
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-lg font-semibold text-wj-ink">{copy.title}</h1>
          <p className="text-sm leading-relaxed text-wj-muted">{copy.description}</p>
        </div>
        <Link
          href="/login"
          className="w-full rounded bg-wj-cinnabar py-3 text-sm font-medium tracking-[0.2em] text-white transition-colors hover:bg-wj-cinnabar/90"
        >
          返回登录页
        </Link>
      </main>
    </div>
  );
}
