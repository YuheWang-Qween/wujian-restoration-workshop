import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { ExFigure, ExSlipText } from '@/lib/workshop/exhibition';

/**
 * 展示篇共享展示组件（无 'use client'，服务端 / 客户端页面均可引用）。
 * 展厅首页挂在大厅页签（客户端），各板块独立页是服务端组件。
 */

/** 节标题：沿用环节页的朱砂描边小方章，序号用〔壹〕—〔捌〕 */
export function SectionHeading({
  order,
  title,
  note,
}: {
  order: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-wj-line pb-2.5">
      <span className="inline-flex shrink-0 items-center gap-2.5">
        <span className="inline-flex size-6 items-center justify-center rounded-sm border border-wj-cinnabar/45 font-serif text-[13px] leading-none font-semibold text-wj-cinnabar">
          {order}
        </span>
        <h2 className="font-serif text-lg font-semibold text-wj-ink">{title}</h2>
      </span>
      {note && <span className="text-xs text-wj-muted">{note}</span>}
    </div>
  );
}

/** 图版卡：照片 + 图题 + 署名。展示篇的照片是真实文物照，署名必须跟着图走 */
export function FigureCard({ figure, tall = false }: { figure: ExFigure; tall?: boolean }) {
  return (
    <figure className="rounded-md border border-wj-border bg-wj-surface p-2">
      <img
        src={figure.src}
        alt={figure.alt}
        loading="lazy"
        className={`w-full rounded-sm object-cover ${tall ? 'max-h-105' : 'max-h-80'}`}
      />
      <figcaption className="px-1 pt-2 pb-1">
        <p className="text-xs leading-6 text-wj-ink/85">{figure.caption}</p>
        <p className="mt-0.5 text-[11px] leading-5 text-wj-muted">{figure.credit}</p>
      </figcaption>
    </figure>
  );
}

/** 释文引用块：竹青左缘细边 + 纸色底 + serif 释文 */
export function SlipText({ slip }: { slip: ExSlipText }) {
  return (
    <blockquote className="rounded-md border-l-2 border-wj-bamboo/50 bg-wj-raised px-4 py-3">
      {slip.label && <p className="mb-2 text-xs font-medium text-wj-muted">{slip.label}</p>}
      <div className="space-y-1.5">
        {slip.lines.map((line, i) => (
          <p key={i} className="font-serif text-sm leading-7 text-wj-ink">
            {line}
          </p>
        ))}
      </div>
    </blockquote>
  );
}

/**
 * 展示篇独立页外壳：固定顶栏（返回展厅 + 所在板块）+ 内容容器。
 * width='read' 给案例精读这类长文页（max-w-4xl），'wide' 给展签网格页（max-w-6xl）。
 */
export function ExhibitionShell({
  crumb,
  width = 'wide',
  children,
}: {
  crumb: string;
  width?: 'wide' | 'read';
  children: ReactNode;
}) {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-wj-line bg-wj-bg/95 backdrop-blur-sm">
        <div
          className={`mx-auto flex w-full items-center justify-between px-4 py-3 sm:px-6 ${
            width === 'read' ? 'max-w-4xl' : 'max-w-6xl'
          }`}
        >
          <Link
            href="/?tab=exhibition"
            className="inline-flex items-center gap-1.5 text-sm text-wj-muted transition-colors hover:text-wj-cinnabar"
          >
            <ArrowLeft className="h-4 w-4" />
            返回展厅
          </Link>
          <span className="font-serif text-xs tracking-wide text-wj-muted">
            简牍展示 · {crumb}
          </span>
        </div>
      </header>
      <div className="h-[49px]" />
      <main
        className={`mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 ${
          width === 'read' ? 'max-w-4xl' : 'max-w-6xl'
        }`}
      >
        {children}
      </main>
    </>
  );
}

/** 板块独立页的页头：序号章 + serif 大标题 + 一句话 */
export function BoardHeader({
  order,
  title,
  desc,
}: {
  order: string;
  title: string;
  desc: string;
}) {
  return (
    <header className="max-w-3xl">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-7 items-center justify-center rounded-sm border border-wj-cinnabar/45 font-serif text-sm leading-none font-semibold text-wj-cinnabar">
          {order}
        </span>
        <h1 className="font-serif text-2xl font-semibold tracking-wide text-wj-ink sm:text-3xl">
          {title}
        </h1>
      </div>
      <p className="mt-3 text-sm leading-7 text-wj-muted">{desc}</p>
    </header>
  );
}
