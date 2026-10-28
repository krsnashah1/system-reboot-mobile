// src/components/cache/TouchDragChip.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';

interface TouchDragChipProps {
  /** Called with the cache line index under the finger when released */
  onDropLine: (lineIndex: number) => void;
  onStart?: () => void;
  className?: string;
  children: React.ReactNode;
  /** Text shown on the floating ghost while dragging */
  ghostLabel: string;
}

/**
 * Touch / pen drag handle. Native HTML5 drag-and-drop does not fire on most
 * touch screens, so this uses Pointer Events instead. Mouse input is ignored
 * (desktop keeps its existing native drag + click behaviour).
 * Drop targets are any element carrying a `data-cache-line="<index>"` attribute.
 */
export default function TouchDragChip({
  onDropLine,
  onStart,
  className = '',
  children,
  ghostLabel,
}: TouchDragChipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const hoverEl = useRef<HTMLElement | null>(null);
  const lastPoint = useRef({ x: 0, y: 0 });
  const scrollTimer = useRef<number | null>(null);

  const lineAt = (x: number, y: number): HTMLElement | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const hit = (el as HTMLElement).closest?.('[data-cache-line]') as HTMLElement | null;
      if (hit) return hit;
    }
    return null;
  };

  const setHover = (el: HTMLElement | null) => {
    if (hoverEl.current === el) return;
    hoverEl.current?.removeAttribute('data-touch-hover');
    el?.setAttribute('data-touch-hover', 'true');
    hoverEl.current = el;
  };

  const stopAutoScroll = () => {
    if (scrollTimer.current !== null) {
      window.clearInterval(scrollTimer.current);
      scrollTimer.current = null;
    }
  };

  // Edge auto-scroll so lines further down/up the page stay reachable mid-drag
  const startAutoScroll = () => {
    stopAutoScroll();
    scrollTimer.current = window.setInterval(() => {
      const y = lastPoint.current.y;
      if (y > window.innerHeight - 90) window.scrollBy(0, 14);
      else if (y < 170) window.scrollBy(0, -14);
      setHover(lineAt(lastPoint.current.x, lastPoint.current.y));
    }, 16);
  };

  useEffect(() => () => {
    stopAutoScroll();
    setHover(null);
  }, []);

  const handleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    lastPoint.current = { x: e.clientX, y: e.clientY };
    setPos({ x: e.clientX, y: e.clientY });
    onStart?.();
    startAutoScroll();
  };

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    setPos({ x: e.clientX, y: e.clientY });
    setHover(lineAt(e.clientX, e.clientY));
  };

  const finish = (e: React.PointerEvent<HTMLButtonElement>, drop: boolean) => {
    if (!pos) return;
    const target = lineAt(e.clientX, e.clientY);
    stopAutoScroll();
    setHover(null);
    setPos(null);
    if (drop && target) {
      navigator.vibrate?.(12);
      onDropLine(Number(target.dataset.cacheLine));
    }
  };

  return (
    <>
      <button
        type="button"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={(e) => finish(e, true)}
        onPointerCancel={(e) => finish(e, false)}
        onContextMenu={(e) => e.preventDefault()}
        className={`touch-none select-none ${className}`}
      >
        {children}
      </button>

      {pos && (
        <div
          className="fixed z-[60] pointer-events-none px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-base shadow-[0_0_30px_rgba(16,185,129,0.8)] border-2 border-emerald-200"
          style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -140%)' }}
        >
          {ghostLabel}
        </div>
      )}
    </>
  );
}
