import { NextRequest, NextResponse } from 'next/server';
import { getRealOrigin, normalizeSafeRedirectPath } from '@/lib/auth-utils';
import { clearLoginContextCookie, readLoginContext } from '@/lib/chaoxing-login-context';
import { resolveChaoxingIdentity } from '@/lib/chaoxing-client';
import {
  chaoxingErrorReason,
  loginErrorRedirect,
  type LoginErrorReason,
} from '@/lib/login-error';
import { createSupabaseLoginToken } from '@/lib/supabase-chaoxing-user';

function loginError(request: NextRequest, reason: LoginErrorReason): NextResponse {
  const response = loginErrorRedirect(request, reason);
  clearLoginContextCookie(response, request);
  return response;
}

/**
 * 回调只有一个 code：先换 token，再按候选机构解析超星身份，最后把身份落成
 * Supabase 用户并生成一次性 magic link token。
 *
 * 与超星官方模板不同：本应用的会话建立在浏览器端（localStorage），进度同步
 * 等链路都从浏览器客户端取 access_token。因此这里不在服务端消费 token 建立
 * Cookie 会话，而是带着 token_hash 跳到 /auth/finish，由浏览器端 verifyOtp
 * 建立会话——与 Supabase 邮件 magic link 的 SPA 流程一致。
 */
async function finishChaoxingLogin(request: NextRequest): Promise<NextResponse> {
  const search = request.nextUrl.searchParams;
  const code = search.get('code');
  // 超星把 state 用作机构 FID，即发起授权时送出的那个。
  const callbackFid = search.get('state')?.trim() ?? '';
  const providerError = search.get('error_description') || search.get('error');
  if (providerError) {
    console.error('超星返回授权错误:', providerError);
    return loginError(request, 'oauth_failed');
  }

  if (!code) {
    return loginError(request, 'oauth_failed');
  }

  // 从应用主动发起登录时会有签名上下文；微服务平台直达回调时没有该 Cookie。
  const context = readLoginContext(request);

  // 分两段捕获：超星侧的失败对用户是「机构或授权的问题」，
  // Supabase 侧的失败只能是「稍后重试」，混在一起就没法区分了。
  let identity;
  try {
    identity = await resolveChaoxingIdentity(code, callbackFid);
  } catch (error) {
    console.error('解析超星身份失败:', error);
    return loginError(request, chaoxingErrorReason(error));
  }

  try {
    const tokenHash = await createSupabaseLoginToken(identity, {
      teacher: context?.teacher === true,
    });
    const nextPath = normalizeSafeRedirectPath(context?.nextPath ?? '/') ?? '/';
    const finishUrl = new URL('/auth/finish', getRealOrigin(request));
    finishUrl.searchParams.set('token_hash', tokenHash);
    finishUrl.searchParams.set('next', nextPath);

    const response = NextResponse.redirect(finishUrl);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('创建超星用户的 Supabase 登录凭据失败:', error);
    return loginError(request, 'session_failed');
  }
}

export async function GET(request: NextRequest) {
  try {
    return await finishChaoxingLogin(request);
  } catch (error) {
    console.error('处理超星登录回调失败:', error);
    return loginErrorRedirect(request, 'session_failed');
  }
}
