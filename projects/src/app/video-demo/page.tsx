'use client';

import { useState } from 'react';
import { Loader2, Download, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const PRESETS = [
  {
    label: '揭取工序',
    prompt:
      '考古人员在昏暗的地下库房中，戴着手套小心翼翼地从泥土中揭取一枚枚叠压的古代竹简，竹简呈黄褐色，表面有墨迹文字，灯光柔和，镜头从上方俯拍，氛围庄重安静，纪录片风格',
  },
  {
    label: '清洗修复',
    prompt:
      '修复师用软毛笔在清水中轻柔地刷洗一枚古代竹简，泥沙缓缓褪去，竹简上的墨字逐渐显现，特写镜头，水波微荡，光线从侧面打来，纪录片质感',
  },
  {
    label: '简册编联',
    prompt:
      '数枚古代竹简被编绳串联成册，平铺在木质工作台上，竹简呈深褐色，编绳为麻绳，镜头缓慢横移展示整卷简册，暖色调灯光，考古纪录片风格',
  },
  {
    label: '脱水固化',
    prompt:
      '实验室中，白色竹简浸泡在透明容器里的液体中，温度计显示58度，液体微沸冒泡，竹简逐渐从白色变为自然竹色，侧光特写，科学纪录片风格',
  },
];

export default function VideoDemoPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration: 10, ratio: '16:9', resolution: '720p' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '生成失败');
      } else {
        setVideoUrl(data.videoUrl);
      }
    } catch {
      setError('网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-wj-paper">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-wj-dim hover:text-wj-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          返回工坊
        </Link>

        <h1 className="mb-2 font-serif text-2xl font-bold text-wj-ink">
          演示视频生成
        </h1>
        <p className="mb-8 text-sm text-wj-dim">
          输入工序描述，AI 自动生成 10 秒演示短片。可在线播放或下载。
        </p>

        {/* 预设标签 */}
        <div className="mb-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPrompt(p.prompt)}
              className="rounded-full border border-wj-border bg-wj-raised px-3 py-1 text-xs text-wj-ink2 transition-colors hover:border-wj-cinnabar hover:text-wj-cinnabar"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 输入框 */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要生成的视频画面，例如：考古人员从泥土中揭取古代竹简……"
          className="mb-4 h-28 w-full resize-none rounded-lg border border-wj-border bg-white p-3 text-sm text-wj-ink placeholder:text-wj-dim/50 focus:border-wj-cinnabar focus:outline-none"
        />

        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="mb-8 inline-flex items-center gap-2 rounded-lg bg-wj-cinnabar px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-wj-cinnabar/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中（约1-3分钟）…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              生成视频
            </>
          )}
        </button>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 rounded-lg border border-wj-ochre/30 bg-wj-ochre/5 p-4 text-sm text-wj-ochre">
            {error}
          </div>
        )}

        {/* 视频展示 */}
        {videoUrl && (
          <div className="overflow-hidden rounded-xl border border-wj-border bg-black shadow-lg">
            <video
              src={videoUrl}
              controls
              autoPlay
              className="h-auto w-full"
            />
          </div>
        )}

        {videoUrl && (
          <a
            href={videoUrl}
            download
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-wj-border bg-wj-raised px-4 py-2 text-sm text-wj-ink2 transition-colors hover:border-wj-cinnabar hover:text-wj-cinnabar"
          >
            <Download className="h-4 w-4" />
            下载视频
          </a>
        )}
      </div>
    </div>
  );
}
