// src/components/cache/DraggableBlock.tsx
'use client';

import React, { useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import TouchDragChip from './TouchDragChip';

interface DraggableBlockProps {
  blockNumber: number;
  dataHex: string;
  binaryBlock: string;
  isSelected: boolean;
  alreadyInCacheLine: number | null;
  onSelect: () => void;
  /** Touch-screen drop handler (called with the cache line index under the finger) */
  onTouchDrop?: (lineIndex: number) => void;
}

export default function DraggableBlock({
  blockNumber,
  dataHex,
  binaryBlock,
  isSelected,
  alreadyInCacheLine,
  onSelect,
  onTouchDrop,
}: DraggableBlockProps) {
  // Native HTML5 drag only on devices with a precise pointer; touch uses TouchDragChip
  const isTouch = useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia('(pointer: coarse)');
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => window.matchMedia('(pointer: coarse)').matches,
    () => false
  );

  
  // FIXED: Changed type to 'any' to prevent Framer Motion type clashes 
  // with the native HTML5 Drag and Drop API
  const handleDragStart = (e: any) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', blockNumber.toString());
    }
    onSelect();
  };

  return (
    <motion.div
      key={blockNumber}
      initial={{ scale: 0.9, opacity: 0, x: -20 }}
      animate={{ scale: 1, opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      draggable={!isTouch}
      onDragStart={handleDragStart}
      onClick={onSelect}
      className={`cursor-grab active:cursor-grabbing p-3.5 sm:p-5 rounded-xl border-2 transition-all select-none ${
        isSelected
          ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
          : 'bg-slate-900/90 border-emerald-500/50 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-emerald-500 text-slate-950 uppercase">
          CPU Request
        </span>
        <span className="text-xs text-emerald-400 font-bold">
          MM BLOCK #{blockNumber}
        </span>
      </div>

      <div className="my-3 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] text-slate-400 uppercase">Block Address</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-wider">
            B{blockNumber}
            <span className="text-sm text-emerald-400 ml-2 font-normal">
              ({binaryBlock}₂)
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-400 uppercase">Payload</div>
          <div className="text-sm font-bold text-cyan-300">{dataHex}</div>
        </div>
      </div>

      {alreadyInCacheLine !== null ? (
        <div className="mt-3 p-2 rounded bg-amber-500/20 border border-amber-400/60 text-amber-200 text-xs font-bold text-center animate-pulse">
          ⚡ BLOCK IN CACHE! Tap / click Cache Line {alreadyInCacheLine} to trigger a CACHE HIT!
        </div>
      ) : (
        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="hidden md:inline">Drag to Cache Line or Click to Route</span>
          <span className="md:hidden">Tap a cache line to route</span>
          <span className="text-emerald-400 font-bold">&rarr;</span>
        </div>
      )}

      {onTouchDrop && isTouch && (
        <TouchDragChip
          onDropLine={onTouchDrop}
          onStart={onSelect}
          ghostLabel={`B${blockNumber}`}
          className="mt-3 w-full py-3 rounded-lg bg-emerald-500/15 border-2 border-dashed border-emerald-400/70 text-emerald-300 text-xs font-extrabold tracking-wider"
        >
          ⠿ HOLD &amp; DRAG B{blockNumber} TO A LINE
        </TouchDragChip>
      )}
    </motion.div>
  );
}