import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseCredentials, getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

/**
 * 教师端学情总览。校验两层：登录 Bearer + 账号教师角色（app_metadata.teacher，
 * 由登录页教师口令验证后在回调写入）。数据用 service-role 读全表：
 * auth.users 的身份元数据 + workshop_progress。画图题只回 key 不回
 * dataURL（大字段），前端构造成“有图”标记。
 */

interface ProgressPayload {
  completed?: unknown;
  actsRevealed?: unknown;
  answers?: unknown;
  submitted?: unknown;
  verdicts?: unknown;
  images?: unknown;
}

async function verifyUser(
  req: NextRequest,
): Promise<{ id: string; isTeacher: boolean; appMetadata: Record<string, unknown> } | null> {
  let url: string, anonKey: string;
  try {
    ({ url, anonKey } = getSupabaseCredentials());
  } catch {
    return null;
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      isTeacher: data.user.app_metadata?.teacher === true,
      appMetadata: (data.user.app_metadata ?? {}) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export async function GET(req: NextRequest) {
  const user = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  if (!user.isTeacher) {
    // 账号还没落教师标记（老会话/换浏览器）：凭本机存过的口令放行并补写标记，
    // 下次起任何设备直接按账号角色放行，不再需要口令。
    const passcode = req.headers.get('x-teacher-passcode');
    if (passcode !== (process.env.TEACHER_PASSCODE || '123')) {
      return NextResponse.json({ error: '该账号不是教师账号' }, { status: 403 });
    }
    try {
      const admin = getSupabaseClient();
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...user.appMetadata, teacher: true },
      });
    } catch {
      // 补写失败不阻断本次访问
    }
  }

  try {
    const admin = getSupabaseClient();

    const users: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
      app_metadata?: Record<string, unknown>;
    }[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data || data.users.length === 0) break;
      users.push(
        ...data.users.map((u) => ({
          id: u.id,
          email: u.email,
          user_metadata: u.user_metadata as Record<string, unknown> | undefined,
          app_metadata: u.app_metadata as Record<string, unknown> | undefined,
        })),
      );
      if (users.length >= data.total) break;
    }

    const { data: rows, error: rowsError } = await admin
      .from('workshop_progress')
      .select('user_id, data, updated_at');
    if (rowsError) {
      return NextResponse.json({ error: '读取学习档案失败' }, { status: 500 });
    }
    const progressByUser = new Map(
      (rows ?? []).map((r) => [r.user_id as string, r as { user_id: string; data: ProgressPayload; updated_at: string }]),
    );

    const learners = users
      .map((u) => {
        const row = progressByUser.get(u.id);
        const d: ProgressPayload = (row?.data as ProgressPayload) ?? {};
        const cx = (u.app_metadata?.chaoxing ?? {}) as Record<string, unknown>;
        const meta = u.user_metadata ?? {};
        const images = asRecord(d.images);
        return {
          userId: u.id,
          name:
            (typeof meta.full_name === 'string' && meta.full_name) ||
            u.email?.split('@')[0] ||
            '未命名',
          staffNo: typeof cx.name === 'string' ? cx.name : '',
          avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : '',
          updatedAt: row?.updated_at ?? null,
          completed: Array.isArray(d.completed) ? (d.completed as number[]) : [],
          actsRevealed: (d.actsRevealed ?? {}) as Record<string, number>,
          answers: asRecord(d.answers) as Record<string, string>,
          submitted: asRecord(d.submitted),
          verdicts: asRecord(d.verdicts) as Record<string, string>,
          imageKeys: Object.keys(images).filter((k) => String(images[k] ?? '').length > 0),
        };
      })
      .filter((l) => l.staffNo || l.updatedAt || l.completed.length > 0);

    return NextResponse.json({ learners, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: '服务暂时不可用' }, { status: 503 });
  }
}
