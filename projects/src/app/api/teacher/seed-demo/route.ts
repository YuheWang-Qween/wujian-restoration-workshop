import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseCredentials, getSupabaseClient } from '@/storage/database/supabase-client';
import { seedDemoData, clearDemoData } from '@/lib/workshop/seed-demo';

export const dynamic = 'force-dynamic';

/**
 * 演示学情数据注入/清除。沙箱预览与线上部署是两套独立数据库——
 * 演示数据不再依赖沙箱脚本，教师在哪个环境点按钮就注入到哪个环境。
 * 校验与 class-assign 一致：Bearer 登录 + 教师角色（账号标记或本机口令兜底）。
 */

async function verifyTeacher(req: NextRequest): Promise<boolean> {
  let url: string, anonKey: string;
  try {
    ({ url, anonKey } = getSupabaseCredentials());
  } catch {
    return false;
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  try {
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return false;
    if (data.user.app_metadata?.teacher === true) return true;
    return req.headers.get('x-teacher-passcode') === (process.env.TEACHER_PASSCODE || '123');
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyTeacher(req))) {
    return NextResponse.json({ error: '仅教师可操作' }, { status: 403 });
  }

  let action = 'seed';
  try {
    const body = (await req.json()) as { action?: unknown };
    if (typeof body.action === 'string') action = body.action;
  } catch {
    // 空请求体按默认注入处理
  }
  if (action !== 'seed' && action !== 'clear') {
    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  }

  try {
    const admin = getSupabaseClient();
    const result =
      action === 'clear' ? await clearDemoData(admin) : await seedDemoData(admin);
    return NextResponse.json({ ok: true, action, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '操作失败' },
      { status: 500 },
    );
  }
}
