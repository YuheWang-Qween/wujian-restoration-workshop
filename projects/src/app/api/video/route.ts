import { NextRequest, NextResponse } from 'next/server';
import { VideoGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { prompt, duration, ratio, resolution } = await request.json();

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return NextResponse.json({ error: '请输入视频描述' }, { status: 400 });
  }

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const client = new VideoGenerationClient(new Config(), customHeaders);

  const content = [{ type: 'text' as const, text: prompt }];

  try {
    const response = await client.videoGeneration(content, {
      model: 'doubao-seedance-1-5-pro-251215',
      duration: duration || 10,
      ratio: ratio || '16:9',
      resolution: resolution || '720p',
      watermark: false,
    });

    if (response.videoUrl) {
      return NextResponse.json({ videoUrl: response.videoUrl });
    }
    return NextResponse.json(
      { error: response.response.error_message || '视频生成失败' },
      { status: 500 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '视频生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
