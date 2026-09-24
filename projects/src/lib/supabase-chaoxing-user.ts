import { createHash } from 'crypto';
import type { ChaoxingIdentity } from '@/lib/chaoxing-client';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 将已验证的超星身份映射为 Supabase Auth 用户，并生成一次性登录 token。
 * 不创建或保存用户密码。身份标识写入 app_metadata（仅服务端可写），
 * 展示字段写入 user_metadata（Supabase 生态约定键名）。
 */
export async function createSupabaseLoginToken(
  identity: ChaoxingIdentity,
): Promise<string> {
  // getSupabaseClient() 无参时使用 service role 密钥，即管理员客户端
  const admin = getSupabaseClient();
  const { avatar, ...userInfo } = identity;
  const email = virtualEmail(userInfo.openid);
  const userMetadata = {
    full_name: userInfo.displayName,
    avatar_url: avatar,
  };
  // app_metadata 会进入 JWT，只放已解析的字段，不把超星原始响应原样塞进来。
  const appMetadata = { chaoxing: userInfo };

  const { data: created } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError || !link.properties?.hashed_token || !link.user?.id) {
    throw new Error(`无法为超星用户生成 Supabase 登录凭据：${linkError?.message || '未知错误'}`);
  }

  const userId = created.user?.id || link.user.id;
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...link.user.app_metadata, ...appMetadata },
    user_metadata: { ...link.user.user_metadata, ...userMetadata },
  });
  if (updateError) throw new Error(`无法同步超星用户资料：${updateError.message}`);

  return link.properties.hashed_token;
}

/** 超星 openid 不带邮箱，虚拟邮箱按 openid 哈希生成，避免暴露真实标识。 */
function virtualEmail(openid: string): string {
  const subjectHash = createHash('sha256').update(openid).digest('hex').slice(0, 48);
  return `chaoxing_${subjectHash}@oauth.invalid`;
}
