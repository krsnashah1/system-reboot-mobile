// src/components/ui/LiveTelemetryDashboard.tsx
'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { getAddressBreakdown } from '@/lib/mapping';

export default function LiveTelemetryDashboard() {
  const {
    hits,
    misses,
    mappingMode,
    activeBlockAddress,
    totalCacheLines,
    waysPerSet,
  } = useGameStore();

  const totalAccesses = hits + misses;
  const hitRatio = totalAccesses > 0 ? hits / totalAccesses : 0;
  const hitPercentage = (hitRatio * 100).toFixed(1);

  // Two-level memory access time (Stallings Example 4.1):
  // T1 (Cache) = 10ns, T2 (Main Memory) = 100ns
  const t1 = 10;
  const t2 = 100;
  const amat =
    totalAccesses > 0
      ? (hitRatio * t1 + (1 - hitRatio) * (t1 + t2)).toFixed(1)
      : '10.0';

  const breakdown = getAddressBreakdown(
    activeBlockAddress ?? 0,
    mappingMode,
    totalCacheLines,
    waysPerSet
  );

  return (
    <aside className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 sm:p-4 font-mono shadow-[0_0_25px_rgba(16,185,129,0.1)]">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 pb-2 mb-3 sm:mb-4">
        <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
          // LIVE COA TELEMETRY
        </span>
        <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          T1=10ns | T2=100ns
        </span>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-slate-950/90 p-2 sm:p-3 rounded-lg border border-emerald-500/30 min-w-0">
          <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase truncate">Hit Ratio (H)</div>
          <div className="text-base sm:text-xl font-extrabold text-emerald-400 mt-0.5">
            {hitPercentage}%
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 mt-1 truncate">
            {hits} Hits / {misses} Faults
          </div>
        </div>

        <div className="bg-slate-950/90 p-2 sm:p-3 rounded-lg border border-cyan-500/30 min-w-0">
          <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase truncate">Avg Access (Ts)</div>
          <div className="text-base sm:text-xl font-extrabold text-cyan-300 mt-0.5">
            {amat} <span className="text-xs font-normal">ns</span>
          </div>
          <div className="hidden sm:block text-[10px] text-slate-500 mt-1">
            H·T1 + (1-H)(T1+T2)
          </div>
        </div>

        <div className="bg-slate-950/90 p-2 sm:p-3 rounded-lg border border-amber-500/30 min-w-0">
          <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase truncate">Active Rule</div>
          <div className="text-xs font-bold text-amber-300 mt-1.5 truncate">
            {mappingMode === 'DIRECT' && 'i = Block mod 4'}
            {mappingMode === 'ASSOCIATIVE' && 'Any Line + LRU'}
            {mappingMode === 'SET_ASSOCIATIVE' && 'Set = Block mod 2'}
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 mt-1 truncate">
            {totalCacheLines} Lines ({waysPerSet}-Way)
          </div>
        </div>
      </div>

      {/* Physical Address Bit Breakdown Visualizer */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] text-slate-400 mb-2">
          <span className="uppercase font-bold text-emerald-300">
            Physical Address Bit Split (6-Bit PA)
          </span>
          <span>
            Block #{activeBlockAddress ?? 0} ({breakdown.binaryAddress}₂)
          </span>
        </div>

        <div className="grid grid-cols-12 gap-1 text-center text-xs font-bold">
          {/* TAG FIELD */}
          <div
            className="col-span-5 bg-emerald-950/60 border border-emerald-500/50 rounded p-1.5 sm:p-2"
            title="Tag Bits identify which Main Memory block is stored"
          >
            <div className="text-[9px] text-emerald-400 uppercase">
              TAG ({breakdown.tagLength}b)
            </div>
            <div className="text-sm text-white tracking-widest mt-0.5">
              {breakdown.tagBits}
            </div>
          </div>

          {/* LINE / SET INDEX FIELD */}
          <div
            className="col-span-4 bg-amber-950/60 border border-amber-500/50 rounded p-1.5 sm:p-2"
            title="Index/Set Bits select the target Cache Line or Set"
          >
            <div className="text-[9px] text-amber-300 uppercase">
              {mappingMode === 'SET_ASSOCIATIVE'
                ? `SET (${breakdown.indexLength}b)`
                : mappingMode === 'DIRECT'
                ? `LINE (${breakdown.indexLength}b)`
                : 'INDEX (0b)'}
            </div>
            <div className="text-sm text-white tracking-widest mt-0.5">
              {breakdown.indexBits}
            </div>
          </div>

          {/* WORD OFFSET FIELD */}
          <div
            className="col-span-3 bg-cyan-950/60 border border-cyan-500/50 rounded p-1.5 sm:p-2"
            title="Byte/Word Offset selects the byte within the 4-byte block"
          >
            <div className="text-[9px] text-cyan-300 uppercase">
              OFFSET ({breakdown.offsetLength}b)
            </div>
            <div className="text-sm text-white tracking-widest mt-0.5">
              {breakdown.offsetBits}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}