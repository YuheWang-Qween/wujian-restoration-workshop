'use client';

import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Play, X } from 'lucide-react';

const VIDEO_SRC = '/videos/workshop-demo-20260930-male.mp4?v=5';

/** 登录页直接播放成片，不触发自动操作演示或改变学习状态。 */
export function DemoVideo() {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleOpenChange(next: boolean) {
    if (!next) videoRef.current?.pause();
    setFailed(false);
    setOpen(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          data-demo="login-demo"
          className="demo-cta group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-wj-water py-3 text-sm font-medium tracking-wide text-wj-cinnabar-ink shadow-sm transition-all hover:-translate-y-px hover:brightness-110 hover:shadow-md active:translate-y-0"
        >
          <span className="demo-cta-glow" aria-hidden />
          <Play className="demo-cta-icon h-4 w-4" aria-hidden />
          观看演示 · 约 8 分钟
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/75" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-wj-border bg-wj-bg shadow-2xl outline-none">
          <div className="flex items-center justify-between gap-4 border-b border-wj-border px-4 py-3 sm:px-5">
            <Dialog.Title className="font-serif text-base font-semibold text-wj-ink sm:text-lg">
              简牍修复工坊 · 演示
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              约 8 分钟了解简牍修复、简牍鉴赏与学情分析，视频配有中文解说和字幕。
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="关闭演示视频"
                className="flex size-9 shrink-0 items-center justify-center rounded text-wj-muted transition-colors hover:bg-wj-surface hover:text-wj-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wj-cinnabar"
              >
                <X size={20} aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          {open && (
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              poster="/videos/workshop-demo-20260930-poster.jpg?v=5"
              controls
              autoPlay
              playsInline
              preload="metadata"
              aria-label="简牍修复工坊演示视频"
              onError={() => setFailed(true)}
              className="aspect-video max-h-[calc(100dvh-8rem)] w-full bg-black object-contain"
            >
              您的浏览器暂不支持视频播放，可直接打开视频观看。
            </video>
          )}
          {failed && (
            <p role="alert" className="px-4 py-3 text-sm text-wj-muted">
              视频暂时无法播放，您可以
              <a href={VIDEO_SRC} download className="ml-1 text-wj-cinnabar underline underline-offset-4">
                下载后观看
              </a>
              。
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
