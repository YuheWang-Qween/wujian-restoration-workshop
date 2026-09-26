import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

async function verifyUser(req: NextRequest): Promise<string | null> {
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
    return data.user.id;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await verifyUser(req);
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const { url, anonKey } = getSupabaseCredentials();
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from('workshop_progress')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: '读取进度失败' }, { status: 500 });
    }

    return NextResponse.json({ data: (data?.data as ProgressData) ?? null });
  } catch {
    return NextResponse.json({ error: '服务暂时不可用' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await verifyUser(req);
  if (!userId) {
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

  try {
    const { url, anonKey } = getSupabaseCredentials();
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
  } catch {
    return NextResponse.json({ error: '服务暂时不可用' }, { status: 503 });
  }
}
