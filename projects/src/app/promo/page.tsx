'use client';

import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';

const VIDEOS = [
  {
    title: '发现',
    subtitle: '1996 · 长沙走马楼',
    description: '挖掘机停住的瞬间，泥土中露出古井。考古人员俯身，从湿泥中捧起一枚竹简——一千七百年前的墨字，依稀可辨。',
    url: 'https://coze-coding-project.tos.coze.site/coze_storage_7672099628447465535/video/video_generate_cgt-20260812151106-gt52z.mp4?sign=1818054795-a44a1c25c2-0-e9c50fb7a79a40bb543a1b59aa259ff0ad4211d3d87d315204d67afd5f94874a',
  },
  {
    title: '修复',
    subtitle: '修复室 · 灯下',
    description: '尼龙毛笔蘸蒸馏水，轻刷竹简。泥沙褪去，墨迹渐显。编号、拍照、脱水、封存——每一枚简都经手过眼。',
    url: 'https://coze-coding-project.tos.coze.site/coze_storage_7672099628447465535/video/video_generate_cgt-20260812151322-qv2s2.mp4?sign=1818054922-0701fffcad-0-fe6d8ff1fec6ce668e2e08795e307815b0c3125a34b1bbe96f84461aba68faa2',
  },
  {
    title: '传承',
    subtitle: '数字时代 · 教室',
    description: '学生在屏幕前拖拽竹简排序，朱红印章浮现。千年简牍，在指尖重生——这是考古走入课堂的此刻。',
    url: 'https://coze-coding-project.tos.coze.site/coze_storage_7672099628447465535/video/video_generate_cgt-20260812151544-zpd8z.mp4?sign=1818055038-a004f3f5cd-0-8e9c7e616914768db7fdc7f43326b05198d848a4c4b8cd23e417a965eafd22ea',
  },
];

export default function PromoPage() {
  return (
    <div className="min-h-screen bg-wj-paper">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-wj-dim hover:text-wj-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          返回工坊
        </Link>

        <h1 className="mb-2 font-serif text-3xl font-bold text-wj-ink">
          走马楼吴简 · 修复工坊
        </h1>
        <p className="mb-2 font-serif text-lg text-wj-cinnabar">
          一千七百年前的墨迹，如何在今天被重新看见
        </p>
        <p className="mb-10 text-sm text-wj-dim">
          三段影像，讲述从泥土到课堂的完整旅程
        </p>

        <div className="space-y-12">
          {VIDEOS.map((v, i) => (
            <div key={i}>
              <div className="mb-3 flex items-baseline gap-3">
                <span className="font-mono text-2xl tabular-nums tracking-wider text-wj-cinnabar/40">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-serif text-xl font-semibold text-wj-ink">
                  {v.title}
                </h2>
                <span className="text-xs text-wj-dim">{v.subtitle}</span>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-wj-muted">
                {v.description}
              </p>

              <div className="overflow-hidden rounded-xl border border-wj-border bg-black shadow-lg">
                <video
                  src={v.url}
                  controls
                  className="h-auto w-full"
                />
              </div>

              <a
                href={v.url}
                download
                className="mt-3 inline-flex items-center gap-2 text-xs text-wj-dim transition-colors hover:text-wj-cinnabar"
              >
                <Download className="h-3.5 w-3.5" />
                下载本段
              </a>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-wj-line pt-6 text-center">
          <p className="font-serif text-sm text-wj-muted">
            竹简一千枚，皆经手过眼
          </p>
        </div>
      </div>
    </div>
  );
}
