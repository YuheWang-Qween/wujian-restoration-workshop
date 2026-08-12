import { NextRequest, NextResponse } from 'next/server';
import { TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  const { text } = await request.json();

  if (!text || typeof text !== 'string' || text.length > 2000) {
    return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
  }

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = new Config();
  const client = new TTSClient(config, customHeaders);

  const response = await client.synthesize({
    uid: 'demo-mode',
    text,
    speaker: 'zh_male_ruyayichen_saturn_bigtts',
    audioFormat: 'mp3',
    sampleRate: 32000,
    speechRate: -10,
  });

  return NextResponse.json({ audioUri: response.audioUri });
}
