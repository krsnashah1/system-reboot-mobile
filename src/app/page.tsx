// src/app/page.tsx
'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import CacheGame from '@/components/cache/CacheGame';
import PipelineGame from '@/components/pipeline/PipelineGame';
import LeaderboardView from '@/components/leaderboard/LeaderboardView';

export default function HomePage() {
  const { phase, setPhase, isCacheCompleted, isPipelineCompleted } = useGameStore();

  return (
    <div className="flex-1 flex flex-col justify-between pb-24 md:pb-16">
      {phase === 'CACHE' && <CacheGame />}
      {phase === 'PIPELINE' && <PipelineGame />}
      {phase === 'LEADERBOARD' && <LeaderboardView />}

      {/* Persistent Bottom Bar with Locked Phase Progression & Subtle Creator Credit */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-3 md:px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:py-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-1.5 md:gap-2 font-mono text-xs">
        <div className="grid grid-cols-3 md:flex md:items-center gap-1.5 md:gap-2">
          <span className="text-slate-500 hidden md:inline text-[11px]">
            PROGRESSION:
          </span>

          <button
            onClick={() => setPhase('CACHE')}
            disabled={isCacheCompleted}
            className={`px-1.5 md:px-3 py-2 md:py-1 min-h-10 md:min-h-0 text-[10px] md:text-xs rounded font-bold transition-all ${
              isCacheCompleted
                ? 'bg-slate-900/50 text-slate-600 border border-slate-800/60 cursor-not-allowed line-through'
                : phase === 'CACHE'
                ? 'bg-emerald-500 text-slate-950 cursor-pointer'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 cursor-pointer'
            }`}
          >
            <span className="md:hidden">{isCacheCompleted ? '🔒 01 DONE' : '01 CACHE'}</span>
            <span className="hidden md:inline">{isCacheCompleted ? '🔒 01 // CACHE DONE' : '01 // CACHE MAPPING'}</span>
          </button>

          <button
            onClick={() => setPhase('PIPELINE')}
            disabled={isPipelineCompleted}
            className={`px-1.5 md:px-3 py-2 md:py-1 min-h-10 md:min-h-0 text-[10px] md:text-xs rounded font-bold transition-all ${
              isPipelineCompleted
                ? 'bg-slate-900/50 text-slate-600 border border-slate-800/60 cursor-not-allowed line-through'
                : phase === 'PIPELINE'
                ? 'bg-emerald-500 text-slate-950 cursor-pointer'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 cursor-pointer'
            }`}
          >
            <span className="md:hidden">{isPipelineCompleted ? '🔒 02 DONE' : '02 PIPELINE'}</span>
            <span className="hidden md:inline">{isPipelineCompleted ? '🔒 02 // PIPELINE DONE' : '02 // PIPELINE HAZARDS'}</span>
          </button>

          <button
            onClick={() => setPhase('LEADERBOARD')}
            className={`px-1.5 md:px-3 py-2 md:py-1 min-h-10 md:min-h-0 text-[10px] md:text-xs rounded font-bold transition-all cursor-pointer ${
              phase === 'LEADERBOARD'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-amber-300/80 hover:text-amber-300 border border-slate-800'
            }`}
          >
            <span className="md:hidden">03 RANKS 🏆</span>
            <span className="hidden md:inline">03 // LEADERBOARD 🏆</span>
          </button>
        </div>

        {/* Subtle Persistent Creator Watermark */}
        <div className="text-[10px] md:text-[11px] text-center md:text-right text-slate-400 tracking-wider select-none">
          Made by <span className="text-emerald-400 font-bold">Krsna Shah</span>{' '}
          <span className="text-slate-600">|</span>{' '}
          <span className="text-amber-300/90 font-semibold">25BCA7363</span>
        </div>
      </footer>
    </div>
  );
}