import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseCredentials, getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

/**
 * 教师手动分班：把学生移动到指定班级（存 class_assignments 表），
 * className 传 null 表示移出班级。校验与 overview 一致：Bearer 登录
 * + 教师角色（账号标记或本机口令自愈兜底）。
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
    // 老会话自愈：本机存过口令也放行（与 overview 行为一致）
    return req.headers.get('x-teacher-passcode') === (process.env.TEACHER_PASSCODE || '123');
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyTeacher(req))) {
    return NextResponse.json({ error: '仅教师可操作' }, { status: 403 });
  }

  let body: { userId?: unknown; className?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId) {
    return NextResponse.json({ error: '缺少学生标识' }, { status: 400 });
  }
  const className =
    typeof body.className === 'string' ? body.className.trim().slice(0, 40) : '';

  try {
    const admin = getSupabaseClient();
    if (!className) {
      const { error } = await admin.from('class_assignments').delete().eq('user_id', userId);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from('class_assignments')
        .upsert({ user_id: userId, class_name: className }, { onConflict: 'user_id' });
      if (error) throw error;
    }
    return NextResponse.json({ ok: true, className: className || null });
  } catch {
    return NextResponse.json({ error: '保存班级失败' }, { status: 500 });
  }
}
