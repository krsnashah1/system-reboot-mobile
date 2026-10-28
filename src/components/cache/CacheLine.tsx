// src/components/cache/CacheLine.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CacheLineState } from '@/lib/mapping';
import { CacheMappingMode } from '@/store/gameStore';

interface CacheLineProps {
  line: CacheLineState;
  mode: CacheMappingMode;
  waysPerSet: number;
  isLruCandidate: boolean;
  isMatchingHit: boolean;
  onDropBlock: (lineIndex: number) => void;
}

export default function CacheLine({
  line,
  mode,
  waysPerSet,
  isLruCandidate,
  isMatchingHit,
  onDropBlock,
}: CacheLineProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const setNumber = Math.floor(line.lineIndex / waysPerSet);
  const wayNumber = line.lineIndex % waysPerSet;

  const handleDragOver = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsDragOver(false);
    onDropBlock(line.lineIndex);
  };

  return (
    <motion.div
      layout
      data-cache-line={line.lineIndex}
      whileHover={{ scale: 1.01 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => onDropBlock(line.lineIndex)}
      className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
        isMatchingHit
          ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
          : isDragOver
          ? 'bg-emerald-950/70 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
          : line.valid
          ? 'bg-slate-900/95 border-emerald-500/40 hover:border-emerald-400'
          : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 border-dashed'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-300 text-xs font-extrabold">
            LINE {line.lineIndex}
          </span>

          {mode === 'SET_ASSOCIATIVE' && (
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
              SET {setNumber} // WAY {wayNumber}
            </span>
          )}

          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              line.valid
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            V:{line.valid ? '1' : '0'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isMatchingHit && (
            <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-extrabold animate-bounce">
              ⚡ TAP FOR CACHE HIT!
            </span>
          )}

          {line.valid && isLruCandidate && mode !== 'DIRECT' && (
            <span
              className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[10px] font-bold"
              title="Least Recently Used: Evict this line if cache/set is full"
            >
              LRU (OLDEST)
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-12 gap-1.5 sm:gap-2 items-center bg-slate-950/90 p-2 sm:p-2.5 rounded-lg border border-slate-800/80 text-[11px] sm:text-xs">
        <div className="col-span-4 border-r border-slate-800 pr-1.5 sm:pr-2">
          <div className="text-[9px] text-slate-500 uppercase">Tag Bits</div>
          <div className="font-bold text-emerald-300 tracking-widest mt-0.5">
            {line.valid ? line.tag : '——'}
          </div>
        </div>

        <div className="col-span-4 border-r border-slate-800 px-1.5 sm:px-2">
          <div className="text-[9px] text-slate-500 uppercase">Block Stored</div>
          <div className="font-extrabold text-white mt-0.5">
            {line.valid && line.blockNumber !== null
              ? `Block #${line.blockNumber}`
              : 'EMPTY'}
          </div>
        </div>

        <div className="col-span-4 pl-1.5 sm:pl-2 text-right">
          <div className="text-[9px] text-slate-500 uppercase">Data Word</div>
          <div className="font-bold text-cyan-400 mt-0.5">
            {line.valid && line.dataHex ? line.dataHex : '0x0000'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}