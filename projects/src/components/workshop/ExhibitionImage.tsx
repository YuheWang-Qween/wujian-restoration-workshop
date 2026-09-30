'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Expand, Minus, Plus, RotateCcw, X } from 'lucide-react';
import type { ExFigure } from '@/lib/workshop/exhibition';
import styles from './ExhibitionImage.module.css';

type Size = { width: number; height: number };

/** 实物保持完整比例；放大阅读只发生在原图弹窗中。 */
export function ExhibitionImage({ figure, tall = false }: { figure: ExFigure; tall?: boolean }) {
  const titleId = useId();
  const captionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pendingCenterRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState<Size>({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 });
  const fitScale = naturalSize.width && naturalSize.height
    ? Math.min(
        Math.max(1, viewportSize.width - 32) / naturalSize.width,
        Math.max(1, viewportSize.height - 32) / naturalSize.height,
      )
    : 0;
  const imageWidth = naturalSize.width * fitScale * zoom;
  const imageHeight = naturalSize.height * fitScale * zoom;

  useEffect(() => {
    if (!open) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      observer.disconnect();
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !open) return;
    const center = pendingCenterRef.current;
    if (center) {
      viewport.scrollLeft = center.x * viewport.scrollWidth - viewport.clientWidth / 2;
      viewport.scrollTop = center.y * viewport.scrollHeight - viewport.clientHeight / 2;
      pendingCenterRef.current = null;
    } else if (zoom === 1) {
      viewport.scrollTo(0, 0);
    }
  }, [open, zoom, imageWidth, imageHeight]);

  function openImage() {
    setNaturalSize({ width: figure.width ?? 0, height: figure.height ?? 0 });
    setZoom(1);
    pendingCenterRef.current = null;
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function restorePage() {
    setOpen(false);
    setDragging(false);
    dragRef.current = null;
    triggerRef.current?.focus({ preventScroll: true });
  }

  function changeZoom(nextZoom: number) {
    const next = Math.min(4, Math.max(1, nextZoom));
    if (next === zoom) return;
    const viewport = viewportRef.current;
    pendingCenterRef.current = viewport && next !== 1 ? {
      x: (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth,
      y: (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight,
    } : null;
    setZoom(next);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (zoom === 1 || !event.isPrimary || event.button !== 0) return;
    const viewport = event.currentTarget;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    viewport.setPointerCapture(event.pointerId);
    setDragging(true);
    event.preventDefault();
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x);
    event.currentTarget.scrollTop = drag.top - (event.clientY - drag.y);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <>
      <figure className={styles.figure}>
        <button
          ref={triggerRef}
          type="button"
          className={`${styles.preview} ${tall ? styles.tall : ''}`}
          aria-label={`查看原图：${figure.alt}`}
          aria-haspopup="dialog"
          onClick={openImage}
        >
          <img src={figure.src} alt={figure.alt} width={figure.width} height={figure.height} loading="lazy" />
          <span className={styles['open-label']}><Expand size={14} aria-hidden="true" />查看原图</span>
        </button>
        <figcaption className={styles.caption}>
          <p>{figure.caption}</p>
          {figure.credit && (
            <details className={styles.credit}>
              <summary>图片来源</summary>
              <p>{figure.credit}</p>
            </details>
          )}
        </figcaption>
      </figure>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} aria-describedby={captionId} onClose={restorePage}>
        <div className={styles['dialog-frame']}>
          <header className={styles.header}>
            <h2 id={titleId}>原图细读</h2>
            <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()} aria-label="关闭原图">
              <X size={18} aria-hidden="true" /><span>关闭</span>
            </button>
          </header>
          <div className={styles.toolbar} aria-label="图片缩放">
            <button type="button" onClick={() => changeZoom(zoom - 0.5)} disabled={zoom === 1} aria-label="缩小图片"><Minus size={16} aria-hidden="true" /></button>
            <output className={styles['zoom-value']} aria-label="缩放比例" aria-live="polite">{Math.round(zoom * 100)}%</output>
            <button type="button" onClick={() => changeZoom(zoom + 0.5)} disabled={zoom === 4} aria-label="放大图片"><Plus size={16} aria-hidden="true" /></button>
            <button type="button" className={styles.reset} onClick={() => changeZoom(1)} disabled={zoom === 1}><RotateCcw size={14} aria-hidden="true" />恢复全图</button>
          </div>
          <div
            ref={viewportRef}
            className={`${styles.viewport} ${zoom > 1 ? styles.zoomed : ''} ${dragging ? styles.dragging : ''}`}
            tabIndex={0}
            role="region"
            aria-label="图片细节"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onKeyDown={(event) => {
              if (event.key === '+' || event.key === '=') { event.preventDefault(); changeZoom(zoom + 0.5); }
              if (event.key === '-') { event.preventDefault(); changeZoom(zoom - 0.5); }
              if (event.key === '0') { event.preventDefault(); changeZoom(1); }
            }}
          >
            <div className={styles.canvas} style={fitScale ? { width: imageWidth + 32, height: imageHeight + 32 } : undefined}>
              {open && (
                <img
                  src={figure.originalSrc ?? figure.src}
                  alt={figure.alt}
                  draggable={false}
                  className={fitScale ? styles.original : styles['loading-image']}
                  style={fitScale ? { width: imageWidth, height: imageHeight } : undefined}
                  onLoad={(event) => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                />
              )}
            </div>
          </div>
          <footer id={captionId} className={styles['dialog-caption']}>
            <p>{figure.caption}</p>
            {figure.credit && <p className={styles['dialog-credit']}>{figure.credit}</p>}
          </footer>
        </div>
      </dialog>
    </>
  );
}
