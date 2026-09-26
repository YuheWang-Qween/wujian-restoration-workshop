import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { CASES, getCase } from '@/lib/workshop/exhibition';
import { ExhibitionShell, FigureCard, SlipText } from '@/components/workshop/ExhibitionParts';
import { ExhibitVisit } from '@/components/workshop/ExhibitVisit';
import { DataTable } from '@/components/workshop/DataTable';

/**
 * 简牍鉴赏篇 · 案例精读页
 *
 * 五个案例共用同一副骨架，按字段驱动顺序渲染：
 * 背景 → 释文 → 对照表 → 图版 → 程序链 → 解读 → 补记。
 * 纯阅读：没有细问、没有答题框；小简不出场（她只在发掘篇环节页）。
 */

export function generateStaticParams() {
  return CASES.map((c) => ({ id: String(c.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = getCase(Number(id));
  return { title: c ? `${c.title} · 简牍鉴赏` : '简牍鉴赏' };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = getCase(Number(id));
  if (!current) notFound();

  const prev = getCase(current.id - 1);
  const next = getCase(current.id + 1);

  return (
    <ExhibitionShell crumb="案例精读" width="read">
      <ExhibitVisit id={`case-${current.id}`} />
      {/* 篇头 */}
        <header className="max-w-3xl">
          <p className="font-mono text-xs tracking-[0.2em] text-wj-cinnabar">{current.ordinal}</p>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-wide text-wj-ink sm:text-3xl">
            {current.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-wj-muted">{current.summary}</p>
        </header>

        <div className="mt-8 space-y-8">
          {/* 背景 */}
          {current.intro && (
            <p className="max-w-3xl text-sm leading-8 text-wj-ink/85">{current.intro}</p>
          )}

          {/* 释文 */}
          {current.quote && <SlipText slip={current.quote} />}

          {/* 简文｜解读对照表 */}
          {current.table && <DataTable table={current.table} />}

          {/* 单幅图版 */}
          {current.figure && (
            <div className="max-w-xl">
              <FigureCard figure={current.figure} tall />
            </div>
          )}

          {/* 并排分段图版（案例一：上中下三段） */}
          {current.plates && (
            <div>
              {/* 窄屏竖排（上→中→下顺序不变），sm 起三联并排 */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {current.plates.map((plate) => (
                  <figure
                    key={plate.src}
                    className="rounded-md border border-wj-border bg-wj-surface p-1.5"
                  >
                    <img
                      src={plate.src}
                      alt={plate.alt}
                      loading="lazy"
                      className="w-full rounded-sm object-cover"
                    />
                    <figcaption className="pt-1 pb-0.5 text-center text-[11px] text-wj-muted">
                      {plate.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
              {current.plateNote && (
                <p className="mt-2 text-xs leading-6 text-wj-muted">{current.plateNote}</p>
              )}
            </div>
          )}

          {/* 程序链条（案例四） */}
          {current.steps && (
            <div className="rounded-md border border-wj-border bg-wj-surface p-4">
              <h2 className="text-xs font-medium text-wj-muted">{current.steps.label}</h2>
              <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
                {current.steps.items.map((step, i) => (
                  <li key={step} className="flex items-center gap-1.5">
                    {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-wj-dim" aria-hidden />}
                    <span
                      className={`rounded-sm border px-2 py-1 font-serif text-xs ${
                        i === current.steps!.items.length - 1
                          ? 'border-wj-cinnabar/45 font-semibold text-wj-cinnabar'
                          : 'border-wj-border bg-wj-raised text-wj-ink'
                      }`}
                    >
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 解读段落 */}
          {current.analysis?.map((para, i) => (
            <p key={i} className="max-w-3xl text-sm leading-8 text-wj-ink/85">
              {para}
            </p>
          ))}

          {/* 补记 */}
          {current.outro && (
            <p className="max-w-3xl border-t border-wj-line pt-4 text-xs leading-7 text-wj-muted">
              {current.outro}
            </p>
          )}
        </div>

        {/* 案例间导航 */}
        <nav className="mt-12 flex items-center justify-between gap-3 border-t border-wj-line pt-5">
          {prev ? (
            <Link
              href={`/exhibition/case/${prev.id}`}
              className="group inline-flex max-w-56 items-center gap-2 text-sm text-wj-muted transition-colors hover:text-wj-cinnabar"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{prev.ordinal}　{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/exhibition/case/${next.id}`}
              className="group inline-flex max-w-56 items-center gap-2 text-sm text-wj-muted transition-colors hover:text-wj-cinnabar"
            >
              <span className="truncate">{next.ordinal}　{next.title}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <Link
              href="/?tab=exhibition"
              className="inline-flex items-center gap-2 text-sm text-wj-muted transition-colors hover:text-wj-cinnabar"
            >
              返回展厅
            </Link>
          )}
        </nav>
    </ExhibitionShell>
  );
}
