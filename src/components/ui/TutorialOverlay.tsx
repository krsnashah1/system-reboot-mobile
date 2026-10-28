// src/components/ui/TutorialOverlay.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

const WALKTHROUGH_STEPS = [
  {
    id: 0,
    tag: '01 // BRIEFING',
    title: 'Welcome, System Technician',
    subtitle: 'Understanding the Memory Hierarchy & Reboot Sequence',
    content: (
      <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
        <p className="text-xs md:text-sm">
          The central processor is stalling because its <strong className="text-emerald-400">Cache Memory</strong> and{' '}
          <strong className="text-emerald-400">Instruction Pipeline</strong> are desynchronized. Your job is to manually
          route memory blocks and resolve pipeline hazards.
        </p>
        <div className="grid grid-cols-3 gap-2.5 bg-slate-950 p-3 rounded-lg border border-emerald-500/30 text-center">
          <div className="p-2 bg-emerald-950/40 rounded border border-emerald-500/20">
            <div className="text-xs text-emerald-400 font-bold">CPU REGISTERS</div>
            <div className="text-[10px] text-slate-400 mt-1">Fastest (~0.5ns)</div>
          </div>
          <div className="p-2 bg-amber-950/40 rounded border border-amber-500/30">
            <div className="text-xs text-amber-300 font-bold">CACHE (SRAM)</div>
            <div className="text-[10px] text-amber-400 mt-1">Your Workspace!</div>
          </div>
          <div className="p-2 bg-cyan-950/40 rounded border border-cyan-500/20">
            <div className="text-xs text-cyan-300 font-bold">MAIN RAM (DRAM)</div>
            <div className="text-[10px] text-slate-400 mt-1">Slow (~100ns)</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 1,
    tag: '02 // DIRECT MAP',
    title: 'Level 1: Direct Mapping Protocol',
    subtitle: 'One-to-One Modulo Routing',
    content: (
      <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
        <p className="text-xs md:text-sm">
          In <strong className="text-emerald-400">Direct Mapping</strong>, every block from Main Memory can only be
          placed into <strong>one specific Cache Line</strong>:
        </p>
        <div className="bg-slate-950 p-3 rounded-lg border border-emerald-500/40 font-mono text-center">
          <div className="text-base text-emerald-300 font-bold">
            Cache Line = (Block Address) mod 4
          </div>
        </div>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 bg-slate-950/60 p-3 rounded border border-slate-800">
          <li>
            Incoming <strong className="text-white">Block 4</strong> &rarr; <code>4 mod 4 = 0</code> &rarr; Drop into{' '}
            <strong className="text-emerald-400">Line 0</strong>.
          </li>
          <li>
            Incoming <strong className="text-white">Block 7</strong> &rarr; <code>7 mod 4 = 3</code> &rarr; Drop into{' '}
            <strong className="text-emerald-400">Line 3</strong>.
          </li>
          <li>
            <strong className="text-amber-300">Cache Hit:</strong> If a block is <em>already</em> in a line, click that
            line to score an instant Cache Hit!
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 2,
    tag: '03 // ASSOCIATIVE',
    title: 'Levels 2 & 3: Associative & Set-Associative',
    subtitle: 'Eliminating Thrashing with Flexibility & LRU',
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <div className="p-3 bg-slate-950 rounded border border-cyan-500/30">
          <h4 className="font-bold text-cyan-300 uppercase">Fully Associative Mapping (Level 2)</h4>
          <p className="mt-1">
            Any Main Memory block can go into <strong>ANY empty cache line</strong>! Once all 4 lines are full, you must
            overwrite the line marked <strong className="text-rose-400">LRU (OLDEST)</strong>.
          </p>
        </div>
        <div className="p-3 bg-slate-950 rounded border border-amber-500/30">
          <h4 className="font-bold text-amber-300 uppercase">2-Way Set-Associative Mapping (Level 3)</h4>
          <p className="mt-1">
            The 4 lines are split into <strong>2 Sets</strong> (Set 0 = Lines 0,1 | Set 1 = Lines 2,3). First find{' '}
            <code>Set = Block mod 2</code>, then pick any free line in that Set (or the Set&apos;s LRU line if full)!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    tag: '04 // PIPELINE',
    title: 'Phase 2: Instruction Level Pipelining',
    subtitle: 'Overlapping Fetch, Decode, Execute & Writeback',
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
        <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded">
          <div className="font-bold text-rose-300">1. Data Hazard (RAW)</div>
          <p className="mt-1">
            Instruction 2 reads a memory/register location before Instruction 1 finishes Writing Back (WR).
          </p>
          <div className="mt-2 text-emerald-300 font-bold">Fix: Operand Forwarding / NOP Stall</div>
        </div>
        <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded">
          <div className="font-bold text-amber-300">2. Control &amp; Structural Hazards</div>
          <p className="mt-1">
            <code>JMP</code> instructions require flushing wrong-path fetches + Branch Prediction. Slow Execution stages
            can be split into sub-stages!
          </p>
        </div>
      </div>
    ),
  },
];

export default function TutorialOverlay() {
  const {
    isTutorialOpen,
    tutorialStep,
    setTutorialStep,
    closeTutorial,
    playerName,
    playerRegNo,
    hasRegistered,
    setPlayerInfo,
  } = useGameStore();

  const [nameInput, setNameInput] = useState(playerName);
  const [regInput, setRegInput] = useState(playerRegNo);
  const [nameError, setNameError] = useState(false);

  if (!isTutorialOpen) return null;

  const currentStep = WALKTHROUGH_STEPS[tutorialStep] || WALKTHROUGH_STEPS[0];

  const handleStartOrClose = () => {
    if (!hasRegistered) {
      if (!nameInput.trim()) {
        setNameError(true);
        return;
      }
      setPlayerInfo(nameInput, regInput);
    }
    closeTutorial();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-mono"
      >
        <motion.div
          initial={{ scale: 0.94, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 15 }}
          className="w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col bg-slate-900 border-2 border-emerald-500/60 rounded-xl shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-slate-950 px-3 sm:px-5 py-3 border-b border-emerald-500/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                <span className="hidden sm:inline">COA FIELD MANUAL &amp; TECHNICIAN LOGIN</span>
                <span className="sm:hidden">COA FIELD MANUAL</span>
              </span>
            </div>
            {hasRegistered && (
              <button
                onClick={closeTutorial}
                className="text-xs text-slate-400 hover:text-rose-400 font-bold px-3 py-2 sm:px-2 sm:py-0.5 rounded border border-slate-800 sm:border-transparent cursor-pointer shrink-0"
              >
                <span className="hidden sm:inline">[ESC / RESUME]</span>
                <span className="sm:hidden">[RESUME]</span>
              </button>
            )}
          </div>

          {/* Scrollable body (registration + tabs + content); footer stays pinned below */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Player Registration Bar (Always visible until registered) */}
          {!hasRegistered && (
            <div className="bg-emerald-950/30 border-b border-emerald-500/40 px-4 sm:px-6 py-3 sm:py-4">
              <div className="text-xs font-bold text-emerald-300 uppercase mb-2">
                ⚡ STEP 1: IDENTIFY YOURSELF FOR THE LIVE CLASS LEADERBOARD
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="ENTER YOUR NAME / CALLSIGN *"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      setNameError(false);
                    }}
                    maxLength={16}
                    className={`w-full bg-slate-950 border rounded-lg px-3.5 py-2.5 sm:py-2 text-xs text-white focus:outline-none ${
                      nameError
                        ? 'border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                        : 'border-emerald-500/50 focus:border-emerald-400'
                    }`}
                  />
                  {nameError && (
                    <span className="text-[10px] text-rose-400 mt-1 block">
                      Please enter your name/username before starting!
                    </span>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="REG NO (OPTIONAL, e.g. 24BCE...)"
                    value={regInput}
                    onChange={(e) => setRegInput(e.target.value)}
                    maxLength={12}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 sm:py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Walkthrough Tabs */}
          <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/50">
            {WALKTHROUGH_STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setTutorialStep(index)}
                className={`py-2.5 px-1 sm:px-2 leading-tight text-[10px] md:text-xs font-bold tracking-wider border-b-2 transition-all cursor-pointer ${
                  tutorialStep === index
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {step.tag}
              </button>
            ))}
          </div>

          {/* Walkthrough Content */}
          <div className="p-4 sm:p-6 sm:min-h-[250px]">
            <div>
              <h2 className="text-lg font-extrabold text-white">{currentStep.title}</h2>
              <p className="text-xs text-emerald-400/80 mb-3">{currentStep.subtitle}</p>
              {currentStep.content}
            </div>

          </div>
          </div>

            {/* Footer Controls (pinned; stacks on phones) */}
            <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/60 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
              <button
                onClick={() => setTutorialStep(Math.max(0, tutorialStep - 1))}
                disabled={tutorialStep === 0}
                className="px-4 py-2.5 sm:py-2 rounded text-xs font-bold border border-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
              >
                &larr; PREV TAB
              </button>

              <div className="contents sm:flex sm:items-center sm:gap-2">
                {tutorialStep < WALKTHROUGH_STEPS.length - 1 && (
                  <button
                    onClick={() => setTutorialStep(tutorialStep + 1)}
                    className="px-4 py-2.5 sm:py-2 rounded text-xs font-bold bg-slate-800 text-emerald-300 hover:bg-slate-700 cursor-pointer"
                  >
                    NEXT TAB &rarr;
                  </button>
                )}

                <button
                  onClick={handleStartOrClose}
                  className="col-span-2 sm:col-auto px-5 py-3 sm:py-2 rounded text-xs font-extrabold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] cursor-pointer"
                >
                  {hasRegistered ? 'RESUME GAME →' : 'START REBOOT SEQUENCE →'}
                </button>
              </div>
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}