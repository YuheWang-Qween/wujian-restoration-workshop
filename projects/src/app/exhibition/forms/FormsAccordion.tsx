'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ExForm } from '@/lib/workshop/exhibition';
import { FigureCard, SlipText } from '@/components/workshop/ExhibitionParts';

export default function FormsAccordion({ forms }: { forms: ExForm[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (openId === null) return;
    detailRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, [openId]);

  return (
    <div className="mt-8 space-y-4">
      {/* 完整器形预览，展开后查看原图与展签。 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {forms.map((form, i) => {
          const isOpen = openId === form.id;
          return (
            <button
              key={form.id}
              type="button"
              onClick={() => setOpenId(isOpen ? null : form.id)}
              aria-expanded={isOpen}
              aria-controls={isOpen ? 'form-detail' : undefined}
              className={`flex cursor-pointer flex-col overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wj-cinnabar ${
                isOpen
                  ? 'border-wj-cinnabar/45 bg-wj-raised'
                  : 'border-wj-border bg-wj-surface hover:border-wj-cinnabar/30'
              }`}
            >
              {form.figures?.[0] && (
                <div className="w-full border-b border-wj-line bg-wj-raised p-3">
                  <img
                    src={form.figures[0].src}
                    alt={form.figures[0].alt}
                    loading="lazy"
                    className="h-48 w-full object-contain"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs tabular-nums text-wj-cinnabar">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-serif text-base font-semibold text-wj-ink">{form.name}</h3>
              </div>
              <p className="mt-2 font-mono text-[11px] tabular-nums text-wj-water">
                {form.spec.join(' ｜ ')}
              </p>
              <p className="mt-2 flex-1 text-xs leading-6 text-wj-muted">{form.tagline}</p>
              <span className={`inline-flex items-center gap-1 text-[11px] ${isOpen ? 'text-wj-cinnabar' : 'text-wj-cinnabar/70'}`}>
                {isOpen ? '收起展签' : '查看展签'}
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 展开内容：独立通栏，不撑高网格 */}
      {openId && (
        <div ref={detailRef} id="form-detail" className="scroll-mt-20 rounded-lg border border-wj-cinnabar/30 bg-wj-surface p-5">
          {forms.filter((f) => f.id === openId).map((form) => (
            <div key={form.id} className="space-y-3">
              <h4 className="font-serif text-base font-semibold text-wj-ink">{form.name}</h4>
              <div className={form.figures?.length ? 'grid items-start gap-6 lg:grid-cols-2' : ''}>
              {form.figures && form.figures.length > 0 && (
                <div className="grid gap-3">
                  {form.figures.map((fig) => (
                    <FigureCard key={fig.src} figure={fig} tall />
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {form.detail.map((para, pi) => (
                  <p key={pi} className="text-sm leading-7 text-wj-ink/85">
                    {para}
                  </p>
                ))}
              {form.quote && (
                <div className="space-y-2">
                  <p className="text-xs text-wj-muted">同类释文选例（与配图非逐字对应）</p>
                  <SlipText slip={form.quote} />
                </div>
              )}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
