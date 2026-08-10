import { NextResponse } from 'next/server';
import { getSupabaseCredentials } from '@/storage/database/supabase-client';

/**
 * 凭据未注入（本地起服务）是预期形态，返回 200 + configured:false，
 * 让前端安静降级——不要按 5xx 抛：那会在浏览器控制台与开发浮层里
 * 变成一条真报错，把「没配置」伪装成「坏了」。
 */
export async function GET() {
  try {
    const { url, anonKey } = getSupabaseCredentials();
    if (!url || !anonKey) {
      return NextResponse.json({ configured: false });
    }
    return NextResponse.json({ configured: true, url, anonKey });
  } catch {
    return NextResponse.json({ configured: false });
  }
}
