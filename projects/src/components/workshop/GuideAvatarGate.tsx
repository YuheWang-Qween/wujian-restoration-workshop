'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

/**
 * 小简的出场闸门：只在环节页（/stage/N）渲染。
 * 用动态导入把 GuideAvatar 连带的 content.ts（全量教学文本）、guide-lines.ts
 * 从全局共享 chunk 里摘出去——登录/注册、大厅、展示篇不为此付包体积；
 * 出不出场的语义判定仍在 guide-lines.resolveGuideSpeech（非环节路由返回 null）。
 */
const GuideAvatar = dynamic(() => import('./GuideAvatar').then((m) => m.GuideAvatar), {
  ssr: false,
});

export function GuideAvatarGate() {
  const pathname = usePathname();
  if (!/^\/stage\/\d+/.test(pathname)) return null;
  return <GuideAvatar />;
}
