// src/components/ui/TopSystemHUD.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { LeaderboardEntry, mergeAndSortEntries } from '../leaderboard/LeaderboardView';

export function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const STORAGE_KEY = 'coa_leaderboard_backup_v1';

export default function TopSystemHUD() {
  const {
    score,
    streak,
    phase,
    level,
    elapsedSeconds,
    isTimerRunning,
    tickTimer,
    openTutorial,
    requestTacticalHint,
    isLeaderboardModalOpen,
    openLeaderboardModal,
    closeLeaderboardModal,
    playerName,
  } = useGameStore();

  const [liveEntries, setLiveEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, tickTimer]);

  const fetchLiveRanks = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      const data = await res.json();
      const serverEntries: LeaderboardEntry[] = Array.isArray(data.entries)
        ? data.entries
        : [];
      let localCached: LeaderboardEntry[] = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) localCached = JSON.parse(raw);
      } catch {}

      const merged = mergeAndSortEntries(localCached, serverEntries);
      setLiveEntries(merged);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {}
    } catch {}
  }, []);

  useEffect(() => {
    if (!isLeaderboardModalOpen) return;
    fetchLiveRanks();
    const interval = setInterval(fetchLiveRanks, 4000);
    return () => clearInterval(interval);
  }, [isLeaderboardModalOpen, fetchLiveRanks]);

  const handleOpenManual = () => {
    if (phase === 'PIPELINE') {
      openTutorial(3);
    } else if (level === 1) {
      openTutorial(1);
    } else {
      openTutorial(2);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-[calc(var(--hud-h)+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-slate-950/90 backdrop-blur-md border-b border-emerald-500/30 font-mono select-none">
        {/* ROW 1: title + action buttons (+ centred score box on desktop) */}
        <div className="relative h-12 md:h-16 px-3 md:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <div className="h-3 w-3 shrink-0 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
            <div className="min-w-0">
              <div className="text-[9px] md:text-[10px] tracking-widest text-emerald-500/80 uppercase flex items-center gap-2 truncate">
                <span>SYS.REBOOT // {phase}</span>
                <span className="hidden xl:inline text-slate-500">
                  • Made by Krsna Shah (25BCA7363)
                </span>
              </div>
              <div className="text-[11px] md:text-sm font-bold text-emerald-300 tracking-wider truncate">
                <span className="md:hidden">
                  {phase === 'CACHE'
                    ? `M5 · STAGE 0${level}/03`
                    : phase === 'PIPELINE'
                    ? 'M6 · PIPELINE'
                    : 'LEADERBOARD'}
                </span>
                <span className="hidden md:inline">
                  {phase === 'CACHE'
                    ? `MODULE 5 : STAGE 0${level} OF 03`
                    : phase === 'PIPELINE'
                    ? 'MODULE 6 : PIPELINE OVERDRIVE'
                    : 'FINAL : LIVE LEADERBOARD'}
                </span>
              </div>
            </div>
          </div>

          {/* CENTER (desktop): Persistent Score Counter + Stopwatch */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1 flex-col items-center">
            <div className="bg-slate-900/95 border-2 border-emerald-500/60 px-6 py-1 rounded-b-xl shadow-[0_0_25px_rgba(16,185,129,0.25)] flex items-center gap-6">
              <div className="text-center">
                <span className="block text-[9px] uppercase tracking-[0.2em] text-emerald-500/80">
                  System Score
                </span>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={score}
                    initial={{ scale: 1.3, color: '#6ee7b7' }}
                    animate={{ scale: 1, color: '#34d399' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className="block text-2xl font-extrabold tracking-widest text-emerald-400"
                  >
                    {score.toString().padStart(6, '0')}
                  </motion.span>
                </AnimatePresence>
              </div>

              <div className="h-7 w-[1px] bg-slate-800" />

              <div className="text-center">
                <span className="block text-[9px] uppercase tracking-[0.2em] text-cyan-400/80">
                  Elapsed Time
                </span>
                <span className="block text-2xl font-extrabold tracking-widest text-cyan-300">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>

              {streak > 1 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-amber-500/20 border border-amber-400/60 text-amber-300 px-2 py-0.5 rounded text-xs font-bold"
                >
                  {streak}x
                </motion.div>
              )}
            </div>
          </div>

          {/* RIGHT: Leaderboard Tab, Hint Button & Manual Button */}
          <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
            <button
              onClick={openLeaderboardModal}
              aria-label="Live leaderboard"
              className="min-h-10 min-w-10 md:min-h-0 md:min-w-0 px-2.5 md:px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              title="View Live Classroom Leaderboard"
            >
              <span>🏆</span>
              <span className="hidden md:inline">RANKS</span>
            </button>

            <button
              onClick={requestTacticalHint}
              aria-label="Get a hint"
              className="min-h-10 min-w-10 md:min-h-0 md:min-w-0 px-2.5 md:px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/25 border border-amber-400/50 text-amber-300 text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              title="Get a hint for the current puzzle"
            >
              <span className="text-amber-400 font-extrabold">[?]</span>
              <span className="hidden sm:inline">HINT</span>
            </button>

            <button
              onClick={handleOpenManual}
              aria-label="Open manual"
              className="min-h-10 min-w-10 md:min-h-0 md:min-w-0 px-2.5 md:px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              title="Open COA Field Manual & Walkthrough"
            >
              <span className="text-emerald-400 font-extrabold">[i]</span>
              <span className="hidden sm:inline">MANUAL</span>
            </button>
          </div>
        </div>

        {/* ROW 2 (phones only): score + timer strip */}
        <div className="md:hidden h-9 px-3 flex items-center justify-center gap-4 border-t border-slate-800/70 bg-slate-900/60">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.15em] text-emerald-500/80">Score</span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={score}
                initial={{ scale: 1.3, color: '#6ee7b7' }}
                animate={{ scale: 1, color: '#34d399' }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="text-lg font-extrabold tracking-widest text-emerald-400"
              >
                {score.toString().padStart(6, '0')}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="h-5 w-[1px] bg-slate-700" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.15em] text-cyan-400/80">Time</span>
            <span className="text-lg font-extrabold tracking-widest text-cyan-300">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          {streak > 1 && (
            <div className="bg-amber-500/20 border border-amber-400/60 text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-bold">
              {streak}x
            </div>
          )}
        </div>
      </header>

      {/* LIVE LEADERBOARD OVERLAY MODAL */}
      <AnimatePresence>
        {isLeaderboardModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 font-mono"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col bg-slate-900 border-2 border-cyan-400/60 rounded-2xl shadow-[0_0_50px_rgba(34,211,238,0.25)] overflow-hidden"
            >
              <div className="bg-slate-950 px-3 sm:px-5 py-3 sm:py-3.5 border-b border-cyan-500/30 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span>🏆</span>
                  <span className="text-xs font-extrabold tracking-widest text-cyan-300 uppercase">
                    <span className="hidden sm:inline">LIVE CLASSROOM STANDINGS (PERSISTENT SYNC)</span>
                    <span className="sm:hidden">LIVE STANDINGS</span>
                  </span>
                </div>
                <button
                  onClick={closeLeaderboardModal}
                  className="text-xs text-slate-400 hover:text-rose-400 font-bold px-3 py-2 sm:px-2.5 sm:py-1 rounded border border-slate-800 hover:border-rose-500/40 cursor-pointer shrink-0"
                >
                  <span className="hidden sm:inline">[CLOSE &amp; RESUME]</span>
                  <span className="sm:hidden">[CLOSE]</span>
                </button>
              </div>

              <div className="bg-cyan-950/25 px-3 sm:px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs shrink-0">
                <div>
                  <span className="text-slate-400">Your Active Run: </span>
                  <strong className="text-white">{playerName || 'TECHNICIAN'}</strong>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400 font-bold">
                    Score: {score} PTS
                  </span>
                  <span className="text-cyan-300 font-bold">
                    Time: {formatTime(elapsedSeconds)}
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto md:max-h-[340px] divide-y divide-slate-800/70">
                {liveEntries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No finished runs posted yet. Finish Phase 2 to claim #1 on the board!
                  </div>
                ) : (
                  liveEntries.map((entry, idx) => (
                    <div
                      key={`${entry.name}-${entry.regNo}`}
                      className="px-3 sm:px-5 py-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{entry.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{entry.regNo}</div>
                          <div className="sm:hidden text-[10px] text-cyan-300">⏱ {formatTime(entry.timeSeconds ?? 0)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                        <div className="hidden sm:block text-right">
                          <div className="text-[9px] text-slate-500">TIME</div>
                          <div className="font-bold text-cyan-300">
                            {formatTime(entry.timeSeconds ?? 0)}
                          </div>
                        </div>
                        <div className="text-right min-w-[60px] sm:min-w-[70px]">
                          <div className="text-[9px] text-slate-500">FINAL SCORE</div>
                          <div className="font-extrabold text-amber-400 text-sm">
                            {entry.score}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-slate-950 px-3 sm:px-5 py-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <span>Rankings factor in Accuracy, CPI &amp; Completion Speed!</span>
                <button
                  onClick={closeLeaderboardModal}
                  className="px-4 py-2.5 sm:py-1.5 rounded bg-emerald-500 text-slate-950 font-extrabold text-xs cursor-pointer"
                >
                  BACK TO GAME &rarr;
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}