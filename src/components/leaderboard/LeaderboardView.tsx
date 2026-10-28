// src/components/leaderboard/LeaderboardView.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { formatTime } from '../ui/TopSystemHUD';

export interface LeaderboardEntry {
  id: string;
  name: string;
  regNo: string;
  score: number;
  hitRatio: number;
  cpi: number;
  timeSeconds: number;
}

const STORAGE_KEY = 'coa_leaderboard_backup_v1';
const RESET_KEY = 'coa_leaderboard_reset_ts';

export function mergeAndSortEntries(
  localList: LeaderboardEntry[],
  serverList: LeaderboardEntry[]
): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();
  for (const item of [...localList, ...serverList]) {
    if (!item || !item.name) continue;
    const key = `${item.name.toUpperCase()}::${(item.regNo || 'VIT-AP').toUpperCase()}`;
    const existing = map.get(key);
    if (
      !existing ||
      item.score > existing.score ||
      (item.score === existing.score &&
        (item.timeSeconds || 9999) < (existing.timeSeconds || 9999))
    ) {
      map.set(key, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.timeSeconds || 9999) - (b.timeSeconds || 9999);
  });
}

export default function LeaderboardView() {
  const {
    playerName,
    playerRegNo,
    score,
    hits,
    misses,
    cpi,
    elapsedSeconds,
    setPhase,
    resetGame,
    openTutorial,
  } = useGameStore();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const hasPostedRef = useRef(false);

  const totalAccesses = hits + misses;
  const hitRatio =
    totalAccesses > 0 ? Number(((hits / totalAccesses) * 100).toFixed(1)) : 100;

  const accuracyBonus =
    score > 0 ? Math.round(hitRatio * 2 + Math.max(0, (2.0 - cpi) * 150)) : 0;
  const speedBonus =
    score > 0 ? Math.max(0, Math.round((480 - elapsedSeconds) * 1.5)) : 0;
  const finalEfficiencyScore = score + accuracyBonus + speedBonus;

  const syncLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      const data = await res.json();
      const serverEntries: LeaderboardEntry[] = Array.isArray(data.entries)
        ? data.entries
        : [];
      const serverResetTs = Number(data.resetTimestamp) || 0;

      let localCached: LeaderboardEntry[] = [];
      try {
        const lastSeenReset = Number(localStorage.getItem(RESET_KEY)) || 0;
        if (serverResetTs > lastSeenReset) {
          // Intentional ?reset=vitap occurred -> clear local backup
          localStorage.setItem(RESET_KEY, String(serverResetTs));
          localStorage.removeItem(STORAGE_KEY);
        } else {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) localCached = JSON.parse(raw);
        }
      } catch {}

      const merged = mergeAndSortEntries(localCached, serverEntries);
      setEntries(merged);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {}

      // Self-heal serverless cold start if client has entries missing from server
      if (merged.length > serverEntries.length) {
        fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ knownEntries: merged }),
        }).catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    const submitAndFetch = async () => {
      if (playerName && finalEfficiencyScore > 0 && !hasPostedRef.current) {
        hasPostedRef.current = true;
        let localCached: LeaderboardEntry[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) localCached = JSON.parse(raw);
        } catch {}

        try {
          const res = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: playerName,
              regNo: playerRegNo || 'VIT-AP',
              score: finalEfficiencyScore,
              hitRatio,
              cpi,
              timeSeconds: elapsedSeconds,
              knownEntries: localCached,
            }),
          });
          const data = await res.json();
          if (Array.isArray(data.entries)) {
            const merged = mergeAndSortEntries(localCached, data.entries);
            setEntries(merged);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {}
          }
          setAutoSubmitted(true);
          return;
        } catch {}
      }
      syncLeaderboard();
    };

    submitAndFetch();
    const interval = setInterval(syncLeaderboard, 4000);
    return () => clearInterval(interval);
  }, [
    playerName,
    playerRegNo,
    finalEfficiencyScore,
    hitRatio,
    cpi,
    elapsedSeconds,
    syncLeaderboard,
  ]);

  return (
    <section className="max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 md:py-8 font-mono flex flex-col gap-4 md:gap-6">
      <div className="bg-slate-900/95 border-2 border-emerald-400 rounded-2xl p-4 sm:p-6 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded bg-emerald-400 text-slate-950 uppercase">
              SYSTEM REBOOT COMPLETE // COA SIMULATOR
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
              LIVE CLASSROOM LEADERBOARD
            </h1>
            <p className="text-xs text-emerald-300 mt-1">
              Technician: <strong>{playerName || 'UNREGISTERED'}</strong> ({playerRegNo || 'VIT-AP'})
              {autoSubmitted && ' — Score & Time Auto-Synced!'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/40 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Hit Ratio</div>
              <div className="text-lg font-extrabold text-emerald-400">{hitRatio}%</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/40 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Completion Time</div>
              <div className="text-lg font-extrabold text-cyan-300">
                {formatTime(elapsedSeconds)}
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-purple-500/40 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Speed Bonus</div>
              <div className="text-lg font-extrabold text-purple-300">+{speedBonus}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-amber-400/60 text-center">
              <div className="text-[10px] text-amber-300 uppercase">Final Score</div>
              <div className="text-xl font-extrabold text-amber-400">
                {finalEfficiencyScore}
              </div>
            </div>
          </div>
        </div>

        {!playerName && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/15 border border-amber-400/50 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
            <span>You haven&apos;t set your Technician Callsign yet!</span>
            <button
              onClick={() => openTutorial(0)}
              className="px-3 py-2 sm:py-1 rounded bg-amber-400 text-slate-950 font-extrabold cursor-pointer"
            >
              SET USERNAME
            </button>
          </div>
        )}
      </div>

      {/* Live Rankings Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-3 sm:px-6 py-3 sm:py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            // TOP SYSTEM ARCHITECTS (PERSISTENT AUTO-SYNC)
          </span>
          <span className="text-[10px] text-slate-500">RANKED BY SCORE &amp; SPEED</span>
        </div>

        {entries.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No scores recorded yet. Complete a run to claim #1 on the board!
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {entries.map((entry, idx) => (
              <motion.div
                key={`${entry.name}-${entry.regNo}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-3 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs ${
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
                    <div className="font-extrabold text-sm text-white truncate">{entry.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{entry.regNo}</div>
                    <div className="sm:hidden text-[10px] text-emerald-400">{entry.hitRatio}% hit</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                  <div className="hidden sm:block text-right">
                    <div className="text-[10px] text-slate-500">HIT RATIO</div>
                    <div className="font-bold text-emerald-400">{entry.hitRatio}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">TIME</div>
                    <div className="font-bold text-cyan-300">
                      {formatTime(entry.timeSeconds ?? 0)}
                    </div>
                  </div>
                  <div className="text-right min-w-[64px] sm:min-w-[85px]">
                    <div className="text-[10px] text-slate-500">FINAL SCORE</div>
                    <div className="text-base font-extrabold text-amber-400">
                      {entry.score}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Academic References & Replay Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-900/70 border border-slate-800 p-4 rounded-xl text-xs">
        <div className="md:col-span-9 text-slate-400 space-y-1 leading-relaxed">
          <div className="text-emerald-400 font-bold uppercase mb-1">
            Academic References &amp; Technical Sources:
          </div>
          <div>
            1. William Stallings, <em>Computer Organization and Architecture: Designing for Performance (8th Ed.)</em>, Prentice Hall — Ch. 4 (Cache Memory) &amp; Ch. 12–14 (Instruction-Level Parallelism &amp; Pipelining).
          </div>
          <div>
            2. John L. Hennessy &amp; David A. Patterson, <em>Computer Architecture: A Quantitative Approach</em>, Morgan Kaufmann — Memory Hierarchy Design &amp; Pipeline Hazard Resolution.
          </div>
          <div>
            3. Alan Jay Smith, <em>&ldquo;Cache Memories,&rdquo;</em> ACM Computing Surveys (CSUR), Vol. 14, No. 3, pp. 473–530 (Associative Mapping &amp; LRU Replacement Analysis).
          </div>
        </div>

        <div className="md:col-span-3 flex justify-end">
          <button
            onClick={() => {
              hasPostedRef.current = false;
              resetGame();
              setPhase('CACHE');
            }}
            className="w-full md:w-auto px-5 py-2.5 rounded-lg bg-emerald-500 text-slate-950 font-extrabold hover:bg-emerald-400 cursor-pointer"
          >
            NEW RANDOMIZED RUN ↻
          </button>
        </div>
      </div>
    </section>
  );
}