import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseCredentials } from '@/storage/database/supabase-client';

interface ProgressData {
  completed?: number[];
  answers?: Record<string, string>;
  submitted?: Record<string, true>;
  referenceAnswers?: Record<string, string>;
  verdicts?: Record<string, string>;
  analyses?: Record<string, string>;
  images?: Record<string, string>;
  studentInfo?: { studentId: string; name: string } | null;
  achievementUnlocked?: boolean;
  actsRevealed?: Record<string, number>;
  exhibitsViewed?: Record<string, string>;
  sessionId?: string;
}

/**
 * 以用户本人的 JWT 建客户端：workshop_progress 开了 RLS（auth.uid() = user_id），
 * 必须带上用户 token 才能读写自己的行——匿名客户端会被 RLS 静默挡成空结果。
 */
function userClient(token: string): SupabaseClient | null {
  let url: string, anonKey: string;
  try {
    ({ url, anonKey } = getSupabaseCredentials());
  } catch {
    return null;
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function verifyUser(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const supabase = userClient(token);
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const userId = token ? await verifyUser(req) : null;
  if (!token || !userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const supabase = userClient(token);
  if (!supabase) {
    return NextResponse.json({ error: '服务暂时不可用' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('workshop_progress')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: '读取进度失败' }, { status: 500 });
  }

  return NextResponse.json({
    data: (data?.data as ProgressData) ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const userId = token ? await verifyUser(req) : null;
  if (!token || !userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let body: ProgressData;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const supabase = userClient(token);
  if (!supabase) {
    return NextResponse.json({ error: '服务暂时不可用' }, { status: 503 });
  }

  const { error } = await supabase
    .from('workshop_progress')
    .upsert(
      { user_id: userId, data: body, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (error) {
    return NextResponse.json({ error: '保存进度失败' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
