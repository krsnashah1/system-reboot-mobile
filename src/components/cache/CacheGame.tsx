// src/components/cache/CacheGame.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import {
  CacheLineState,
  getAddressBreakdown,
  validateCachePlacement,
} from '@/lib/mapping';
import { sound } from '@/lib/sound';
import TouchDragChip from './TouchDragChip';
import DraggableBlock from './DraggableBlock';
import CacheLine from './CacheLine';
import LiveTelemetryDashboard from '../ui/LiveTelemetryDashboard';

// ============================================================================
// LEVEL 2 DATA: MEMORY HIERARCHY PYRAMID (From Intro to Memory Org Slides)
// ============================================================================
interface HierarchyTier {
  id: string;
  correctLevel: number; // 0 (Top) to 4 (Bottom)
  name: string;
  tech: string;
  accessTime: string;
  typicalSize: string;
}

const HIERARCHY_TIERS: HierarchyTier[] = [
  {
    id: 'REG',
    correctLevel: 0,
    name: 'CPU Registers',
    tech: 'Flip-Flops / Multi-Port',
    accessTime: '0.25 – 0.5 ns',
    typicalSize: '< 1 KB',
  },
  {
    id: 'CACHE',
    correctLevel: 1,
    name: 'Cache Memory (L1/L2)',
    tech: 'On-Chip SRAM',
    accessTime: '0.5 – 25 ns',
    typicalSize: '< 16 MB',
  },
  {
    id: 'MAIN',
    correctLevel: 2,
    name: 'Main Memory (RAM)',
    tech: 'Capacitor DRAM (DDR)',
    accessTime: '80 – 250 ns',
    typicalSize: '< 16 GB',
  },
  {
    id: 'DISK',
    correctLevel: 3,
    name: 'Magnetic Disk (Secondary)',
    tech: 'HDD / Non-Volatile Platters',
    accessTime: '~5,000,000 ns (5 ms)',
    typicalSize: '> 100 GB',
  },
  {
    id: 'TAPE',
    correctLevel: 4,
    name: 'Magnetic Tape / Optical',
    tech: 'Sequential Backup Media',
    accessTime: 'Slowest (Seconds)',
    typicalSize: 'Terabytes (Archival)',
  },
];

// ============================================================================
// LEVEL 3 DATA: GATE-STYLE PA BIT-SPLITTER & 3Cs CACHE MISS DECODER
// ============================================================================
interface BitSplitChallenge {
  mmSizeLabel: string;
  cacheSizeLabel: string;
  blockSizeLabel: string;
  ways: number;
  totalPaBits: number;
  expectedTagBits: number;
  expectedSetBits: number;
  expectedOffsetBits: number;
  numLinesPower: number;
  numSetsPower: number;
  missScenarioQuestion: string;
  expectedMissType: 'COMPULSORY' | 'CONFLICT' | 'CAPACITY' | 'COHERENCE';
  missExplanation: string;
}

function generateLevel1Sequence(): number[] {
  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const remPool = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  const bA1 = remPool[0] + 4 * randInt(0, 1);
  const bB1 = remPool[1] + 4 * randInt(0, 2);
  const bA2 = remPool[0] + 4 * randInt(2, 3); // Collides with bA1 on Line remPool[0]
  const bC1 = remPool[2] + 4 * randInt(0, 3);
  return [bA1, bB1, bA1, bA2, bC1, bA2]; // 6 crisp, fast requests
}

function generateLevel3Challenge(): BitSplitChallenge {
  const specs = [
    {
      mmSizeLabel: '128 KB (2¹⁷ Bytes)',
      cacheSizeLabel: '16 KB (2¹⁴ Bytes)',
      blockSizeLabel: '256 Bytes (2⁸ Bytes)',
      ways: 2,
      totalPaBits: 17,
      expectedOffsetBits: 8,
      numLinesPower: 6, // 2^14 / 2^8 = 2^6
      numSetsPower: 5, // 2^6 / 2^1 = 2^5 -> 5 Set bits
      expectedSetBits: 5,
      expectedTagBits: 4, // 17 - 5 - 8 = 4 Tag bits
    },
    {
      mmSizeLabel: '64 KB (2¹⁶ Bytes)',
      cacheSizeLabel: '2 KB (2¹¹ Bytes)',
      blockSizeLabel: '64 Bytes (2⁶ Bytes)',
      ways: 2,
      totalPaBits: 16,
      expectedOffsetBits: 6,
      numLinesPower: 5, // 2^11 / 2^6 = 2^5
      numSetsPower: 4, // 2^5 / 2^1 = 2^4 -> 4 Set bits
      expectedSetBits: 4,
      expectedTagBits: 6, // 16 - 4 - 6 = 6 Tag bits
    },
    {
      mmSizeLabel: '1 MB (2²⁰ Bytes)',
      cacheSizeLabel: '32 KB (2¹⁵ Bytes)',
      blockSizeLabel: '64 Bytes (2⁶ Bytes)',
      ways: 4,
      totalPaBits: 20,
      expectedOffsetBits: 6,
      numLinesPower: 9, // 2^15 / 2^6 = 2^9
      numSetsPower: 7, // 2^9 / 2^2 = 2^7 -> 7 Set bits
      expectedSetBits: 7,
      expectedTagBits: 7, // 20 - 7 - 6 = 7 Tag bits
    },
  ];

  const misses: {
    q: string;
    ans: 'COMPULSORY' | 'CONFLICT' | 'CAPACITY' | 'COHERENCE';
    exp: string;
  }[] = [
    {
      q: 'Block #128 and Block #2176 both map to Set 0010 and repeatedly evict each other even though Sets 0000, 0001, and 0011 are completely empty. What type of cache miss is this?',
      ans: 'CONFLICT',
      exp: 'Conflict (Collision) Misses occur when multiple blocks map to the same cache line/set and evict each other while other sets sit empty.',
    },
    {
      q: 'The CPU requests Memory Block #14 for the very first time since system boot. The block has never been brought into the cache before. What type of cache miss is this?',
      ans: 'COMPULSORY',
      exp: 'Compulsory (Cold) Misses occur on the very first reference to a memory block.',
    },
    {
      q: 'In a Dual-Core SMP processor, Core 1 modifies shared variable X in its private L1 cache, invalidating the stale copy of X inside Core 2’s L1 cache. When Core 2 reads X, what miss occurs?',
      ans: 'COHERENCE',
      exp: 'Coherence Misses happen in multiprocessor systems when another processor updates shared data and invalidates stale private cache lines.',
    },
  ];

  const pickedSpec = specs[Math.floor(Math.random() * specs.length)];
  const pickedMiss = misses[Math.floor(Math.random() * misses.length)];

  return {
    ...pickedSpec,
    missScenarioQuestion: pickedMiss.q,
    expectedMissType: pickedMiss.ans,
    missExplanation: pickedMiss.exp,
  };
}

const INITIAL_LINES: CacheLineState[] = [0, 1, 2, 3].map((idx) => ({
  lineIndex: idx,
  valid: false,
  tag: '',
  blockNumber: null,
  dataHex: null,
  lastUsedStep: 0,
}));

export default function CacheGame() {
  const {
    isCacheCompleted,
    completeCachePhase,
    setLevelConfig,
    setActiveBlock,
    recordHit,
    recordMiss,
    addScore,
    triggerHint,
    setPhase,
  } = useGameStore();

  const [isMounted, setIsMounted] = useState(false);
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  // Stage 1 State (Direct Mapping Router)
  const [lvl1Sequence, setLvl1Sequence] = useState<number[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [lines, setLines] = useState<CacheLineState[]>(INITIAL_LINES);
  const [stepCounter, setStepCounter] = useState(1);

  // Stage 2 State (Memory Hierarchy Pyramid Architect)
  const [shuffledPool, setShuffledPool] = useState<HierarchyTier[]>([]);
  const [pyramidSlots, setPyramidSlots] = useState<(HierarchyTier | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [selectedTier, setSelectedTier] = useState<HierarchyTier | null>(null);

  // Stage 3 State (PA Bit-Splitter & 3Cs Decoder)
  const [bitChallenge, setBitChallenge] = useState<BitSplitChallenge | null>(
    null
  );
  const [userTagBits, setUserTagBits] = useState(5);
  const [userSetBits, setUserSetBits] = useState(5);
  const [userOffsetBits, setUserOffsetBits] = useState(7);
  const [selectedMissType, setSelectedMissType] = useState<string | null>(null);

  const [banner, setBanner] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  useEffect(() => {
    setLvl1Sequence(generateLevel1Sequence());
    setShuffledPool(
      [...HIERARCHY_TIERS].sort(() => Math.random() - 0.5)
    );
    const ch = generateLevel3Challenge();
    setBitChallenge(ch);
    setUserTagBits(6);
    setUserSetBits(4);
    setUserOffsetBits(ch.totalPaBits - 10);
    setIsMounted(true);
  }, []);

  const currentBlock = lvl1Sequence[stepIdx];

  useEffect(() => {
    if (stage === 1) {
      setLevelConfig(1, 'DIRECT', 4, 1);
      setActiveBlock(currentBlock ?? null);
    } else if (stage === 2) {
      setLevelConfig(2, 'ASSOCIATIVE', 4, 4);
      setActiveBlock(null);
    } else {
      setLevelConfig(3, 'SET_ASSOCIATIVE', 4, 2);
      setActiveBlock(null);
    }
  }, [stage, currentBlock, setLevelConfig, setActiveBlock]);

  if (!isMounted || lvl1Sequence.length === 0 || !bitChallenge) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-emerald-400 animate-pulse text-xs uppercase tracking-widest">
        INITIALIZING MEMORY SUBSYSTEM...
      </div>
    );
  }

  // ==========================================================================
  // STAGE 1 HANDLER: DIRECT MAPPING BLOCK ROUTING
  // ==========================================================================
  const existingHitLine =
    lines.find((l) => l.valid && l.blockNumber === currentBlock)?.lineIndex ??
    null;

  const handleStage1Drop = (targetLineIndex: number) => {
    if (currentBlock === undefined) return;
    const result = validateCachePlacement(
      currentBlock,
      targetLineIndex,
      lines,
      'DIRECT',
      1
    );

    if (!result.valid) {
      sound.playFault();
      recordMiss(result.errorReason || 'Invalid placement', result.formula);
      setBanner({
        text: `❌ MAPPING FAULT (-50 PTS): ${result.errorReason} [${result.formula}]`,
        isError: true,
      });
      return;
    }

    sound.playHit();
    const breakdown = getAddressBreakdown(currentBlock, 'DIRECT', 4, 1);
    const hexPayload = `0x${((currentBlock + 1) * 4369)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0')}`;

    setLines((prev) =>
      prev.map((l) =>
        l.lineIndex === targetLineIndex
          ? {
              ...l,
              valid: true,
              tag: breakdown.tagBits,
              blockNumber: currentBlock,
              dataHex: hexPayload,
              lastUsedStep: stepCounter,
            }
          : l
      )
    );
    setStepCounter((c) => c + 1);
    recordHit();

    if (stepIdx + 1 < lvl1Sequence.length) {
      setStepIdx(stepIdx + 1);
      setBanner({
        text: result.isCacheHit
          ? `⚡ CACHE HIT on Line ${targetLineIndex}!`
          : `✅ Routed Block #${currentBlock} into Line ${targetLineIndex} (${currentBlock} mod 4 = ${targetLineIndex}).`,
        isError: false,
      });
    } else {
      setStage(2);
      setBanner(null);
      triggerHint({
        title: 'STAGE 1 COMPLETE! UNLOCKED: MEMORY HIERARCHY PYRAMID',
        message:
          'Now arrange the 5 computer memory technologies from Fastest / Highest Cost-per-Bit (Level 0) to Largest Capacity / Slowest Access (Level 4)!',
        type: 'TACTICAL',
      });
    }
  };

  // ==========================================================================
  // STAGE 2 HANDLER: MEMORY HIERARCHY PYRAMID BUILDER
  // ==========================================================================
  const handlePlaceInPyramid = (slotIdx: number, tierToPlace?: HierarchyTier) => {
    const tier = tierToPlace || selectedTier;
    if (!tier) return;

    const newSlots = [...pyramidSlots];
    // If this tier was already in another slot, clear that old slot
    const prevSlotIdx = newSlots.findIndex((s) => s?.id === tier.id);
    if (prevSlotIdx >= 0) newSlots[prevSlotIdx] = null;

    newSlots[slotIdx] = tier;
    setPyramidSlots(newSlots);
    setSelectedTier(null);
  };

  const handleVerifyPyramid = () => {
    if (pyramidSlots.some((s) => s === null)) {
      sound.playFault();
      setBanner({
        text: '⚠️ Please place all 5 memory technologies into Levels 0 through 4 of the pyramid first!',
        isError: true,
      });
      return;
    }

    const wrongSlot = pyramidSlots.findIndex(
      (s, idx) => s && s.correctLevel !== idx
    );

    if (wrongSlot >= 0) {
      const badTier = pyramidSlots[wrongSlot]!;
      sound.playFault();
      recordMiss(
        `${badTier.name} (${badTier.accessTime}) does not belong at Level ${wrongSlot}! Remember: Fastest & smallest (<1 KB Registers) goes at Level 0; slowest & largest (Magnetic Tape) goes at Level 4.`,
        'Order: L0 Registers -> L1 Cache (SRAM) -> L2 Main Memory (DRAM) -> L3 Magnetic Disk -> L4 Magnetic Tape'
      );
      setBanner({
        text: `❌ HIERARCHY FAULT (-50 PTS): "${badTier.name}" is in the wrong tier! Check its access time (${badTier.accessTime}) and capacity (${badTier.typicalSize}).`,
        isError: true,
      });
      return;
    }

    sound.playHit();
    recordHit();
    addScore(250);
    setStage(3);
    setBanner(null);
    triggerHint({
      title: 'STAGE 2 COMPLETE! UNLOCKED: PA BIT-SPLITTER & 3Cs DECODER',
      message:
        'Configure the hardware address decoder by splitting the Physical Address bits into Tag, Set Index, and Byte Offset!',
      type: 'TACTICAL',
    });
  };

  // ==========================================================================
  // STAGE 3 HANDLER: PHYSICAL ADDRESS BIT-SPLITTER & 3Cs MISS CLASSIFIER
  // ==========================================================================
  const handleVerifyBitSplit = () => {
    const sumBits = userTagBits + userSetBits + userOffsetBits;
    if (sumBits !== bitChallenge.totalPaBits) {
      sound.playFault();
      setBanner({
        text: `⚠️ Total bits must add up to ${bitChallenge.totalPaBits} bits! Currently: ${userTagBits} + ${userSetBits} + ${userOffsetBits} = ${sumBits} bits.`,
        isError: true,
      });
      return;
    }

    if (
      userOffsetBits !== bitChallenge.expectedOffsetBits ||
      userSetBits !== bitChallenge.expectedSetBits ||
      userTagBits !== bitChallenge.expectedTagBits
    ) {
      sound.playFault();
      const formula = `Offset = log2(${bitChallenge.blockSizeLabel.split(' ')[0]}) = ${bitChallenge.expectedOffsetBits}b | Sets = 2^${bitChallenge.numLinesPower}/2^${Math.log2(bitChallenge.ways)} = 2^${bitChallenge.numSetsPower} -> ${bitChallenge.expectedSetBits}b | Tag = ${bitChallenge.totalPaBits} - ${bitChallenge.expectedSetBits} - ${bitChallenge.expectedOffsetBits} = ${bitChallenge.expectedTagBits}b`;
      recordMiss(
        `Bit-Split Mismatch! Check your Offset (${bitChallenge.expectedOffsetBits}b), Set Index (${bitChallenge.expectedSetBits}b), and Tag (${bitChallenge.expectedTagBits}b) math.`,
        formula
      );
      setBanner({
        text: `❌ ADDRESS DECODER FAULT (-50 PTS): Expected [${bitChallenge.expectedTagBits}b TAG | ${bitChallenge.expectedSetBits}b SET | ${bitChallenge.expectedOffsetBits}b OFFSET].`,
        isError: true,
      });
      return;
    }

    if (selectedMissType !== bitChallenge.expectedMissType) {
      sound.playFault();
      recordMiss(
        `Incorrect Cache Miss Classification! ${bitChallenge.missExplanation}`,
        `Correct 3Cs Classification: ${bitChallenge.expectedMissType} MISS`
      );
      setBanner({
        text: `❌ 3Cs CLASSIFICATION FAULT (-50 PTS): ${bitChallenge.missExplanation}`,
        isError: true,
      });
      return;
    }

    sound.playHit();
    recordHit();
    addScore(350);
    completeCachePhase();
  };

  return (
    <section className="relative max-w-6xl mx-auto w-full px-3 sm:px-4 py-4 md:py-6 font-mono flex flex-col gap-4 md:gap-6">
      {/* Phase 1 Lock Overlay once all 3 stages are completed */}
      {isCacheCompleted && (
        <div className="fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-8 bg-slate-900 border-2 border-emerald-400 rounded-2xl text-center shadow-[0_0_60px_rgba(16,185,129,0.35)]"
          >
            <div className="inline-block px-3 py-1 rounded bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-extrabold uppercase mb-3">
              🔒 MODULE 5 LOCKED &amp; COMPLETED
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              MEMORY SUBSYSTEM ONLINE
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mb-6 leading-relaxed">
              You have mastered Direct Mapping, the Memory Hierarchy Pyramid, and Set-Associative Physical Address
              Decoding. Advance to <strong className="text-emerald-400">Phase 2: Instruction Pipeline Overdrive</strong>!
            </p>
            <button
              onClick={() => setPhase('PIPELINE')}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.5)] cursor-pointer transition-all"
            >
              PROCEED TO PHASE 2: PIPELINE OVERDRIVE &rarr;
            </button>
          </motion.div>
        </div>
      )}

      <div
        className={`flex flex-col gap-4 md:gap-6 transition-all ${
          isCacheCompleted ? 'opacity-25 pointer-events-none grayscale' : ''
        }`}
      >
        {/* Top Stage Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 bg-slate-900/80 border border-emerald-500/30 p-3 sm:p-4 rounded-xl">
          <div>
            <h1 className="text-base md:text-lg font-extrabold text-white tracking-wide">
              {stage === 1 && 'LEVEL 01 // DIRECT MAPPING BLOCK ROUTER'}
              {stage === 2 && 'LEVEL 02 // MEMORY HIERARCHY PYRAMID ARCHITECT'}
              {stage === 3 && 'LEVEL 03 // HARDWARE ADDRESS BIT-SPLITTER & 3Cs DECODER'}
            </h1>
            <p className="text-xs text-emerald-400/90 mt-0.5">
              {stage === 1 &&
                'Route 6 CPU memory requests into the 4 Cache Lines using Line = Block mod 4.'}
              {stage === 2 &&
                'Arrange the 5 storage technologies from Level 0 (Fastest / Highest Cost per bit) to Level 4 (Largest Capacity / Slowest).'}
              {stage === 3 &&
                'Slice the Physical Address bits into [TAG | SET INDEX | OFFSET] and diagnose the 3Cs Cache Miss scenario!'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`px-3 py-1.5 rounded text-xs font-bold border select-none ${
                  stage === s
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : stage > s
                    ? 'bg-slate-900 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-950 text-slate-600 border-slate-800'
                }`}
              >
                {stage > s ? '✓' : `LVL ${s}`}
              </div>
            ))}
          </div>
        </div>

        {/* ===================================================================
            STAGE 1: DIRECT MAPPING ROUTER
           =================================================================== */}
        {stage === 1 && (
          <>
            {/* Phones: sticky active-block bar so the block stays visible (and draggable) while scrolling to the lines */}
            <div className="lg:hidden sticky top-[calc(var(--hud-h)+env(safe-area-inset-top))] z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-slate-950/95 backdrop-blur border-b border-emerald-500/30 flex items-center gap-3">
              <TouchDragChip
                onDropLine={handleStage1Drop}
                ghostLabel={`B${currentBlock}`}
                className="shrink-0 min-w-16 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 font-extrabold text-base border-2 border-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.5)]"
              >
                ⠿ B{currentBlock}
              </TouchDragChip>
              <div className="min-w-0 text-[11px] leading-tight">
                {existingHitLine !== null ? (
                  <div className="text-amber-300 font-bold">⚡ Already cached: tap Line {existingHitLine} for a HIT</div>
                ) : (
                  <>
                    <div className="text-emerald-300 font-bold truncate">Rule: Line = B{currentBlock} mod 4</div>
                    <div className="text-slate-400">Drag ⠿ onto a line, or just tap a line</div>
                  </>
                )}
              </div>
            </div>
            <LiveTelemetryDashboard />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
              <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-3 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    // MAIN MEMORY STREAM
                  </span>
                  <span className="text-xs text-slate-400">
                    Request {stepIdx + 1} of {lvl1Sequence.length}
                  </span>
                </div>

                <DraggableBlock
                  blockNumber={currentBlock}
                  dataHex={`0x${((currentBlock + 1) * 4369)
                    .toString(16)
                    .toUpperCase()
                    .padStart(4, '0')}`}
                  binaryBlock={currentBlock.toString(2).padStart(4, '0')}
                  isSelected={true}
                  alreadyInCacheLine={existingHitLine}
                  onSelect={() => {}}
                  onTouchDrop={handleStage1Drop}
                />

                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-2.5">
                    <span>Upcoming CPU Block Request Queue</span>
                    <span className="text-emerald-400 font-bold">
                      Active: B{currentBlock}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-2">
                    {lvl1Sequence.map((blk, idx) => {
                      const isPast = idx < stepIdx;
                      const isCurrent = idx === stepIdx;
                      return (
                        <div
                          key={idx}
                          className={`h-8 rounded-md text-xs font-bold border flex items-center justify-center transition-all select-none ${
                            isPast
                              ? 'bg-slate-950/40 border-slate-900 text-slate-600 line-through'
                              : isCurrent
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          B{blk}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-3 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    // L1 CACHE MEMORY (4 LINES — DIRECT MAPPED)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Rule: Line = Block B{currentBlock} mod 4
                  </span>
                </div>

                <div className="space-y-3">
                  {lines.map((line) => (
                    <CacheLine
                      key={line.lineIndex}
                      line={line}
                      mode="DIRECT"
                      waysPerSet={1}
                      isLruCandidate={false}
                      isMatchingHit={existingHitLine === line.lineIndex}
                      onDropBlock={handleStage1Drop}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===================================================================
            STAGE 2: MEMORY HIERARCHY PYRAMID ARCHITECT
           =================================================================== */}
        {stage === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
            {/* LEFT: Scrambled Hardware Modules */}
            <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-200 leading-relaxed">
                <strong>📋 HOW TO PLAY LEVEL 2:</strong> Click (or drag) each memory technology below and place it into
                the correct tier of the <strong>Memory Hierarchy Pyramid</strong> on the right:
                <div className="mt-1.5 text-[11px] text-amber-300">
                  • <strong>Top (Level 0):</strong> Fastest Access Time, Smallest Size, Highest Cost/Bit
                  <br />• <strong>Bottom (Level 4):</strong> Slowest Access Time, Largest Capacity, Lowest Cost/Bit
                </div>
              </div>

              <div className="text-xs font-bold text-emerald-400 uppercase">
                // AVAILABLE MEMORY TECHNOLOGIES (CLICK OR DRAG)
              </div>

              <div className="space-y-2.5">
                {shuffledPool.map((tier) => {
                  const isPlaced = pyramidSlots.some((s) => s?.id === tier.id);
                  const isSelected = selectedTier?.id === tier.id;
                  return (
                    <div
                      key={tier.id}
                      draggable
                      onDragStart={(e: any) => {
                        if (e.dataTransfer) e.dataTransfer.setData('text/plain', tier.id);
                        setSelectedTier(tier);
                      }}
                      onClick={() => setSelectedTier(tier)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                          : isPlaced
                          ? 'bg-slate-950/50 border-slate-800 opacity-50'
                          : 'bg-slate-950 border-emerald-500/30 hover:border-emerald-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-white">
                          {tier.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold">
                          {tier.accessTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                        <span>Tech: {tier.tech}</span>
                        <span className="text-amber-300">Cap: {tier.typicalSize}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Visual Pyramid Slots (Level 0 Narrowest -> Level 4 Widest) */}
            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    // MEMORY HIERARCHY PYRAMID (L0 TO L4)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedTier
                      ? `Click a Pyramid Level to place "${selectedTier.name}"`
                      : 'Select a module on the left first'}
                  </span>
                </div>

                <div className="flex flex-col items-center space-y-3 py-2">
                  {[
                    { lvl: 0, widthClass: 'w-[86%] sm:w-7/12', hint: 'L0: Fastest / Inside CPU' },
                    { lvl: 1, widthClass: 'w-[90%] sm:w-8/12', hint: 'L1: Fast On-Chip SRAM' },
                    { lvl: 2, widthClass: 'w-[94%] sm:w-9/12', hint: 'L2: Primary DRAM' },
                    { lvl: 3, widthClass: 'w-[97%] sm:w-10/12', hint: 'L3: Non-Volatile Disk Storage' },
                    { lvl: 4, widthClass: 'w-full', hint: 'L4: Offline Archival Backup' },
                  ].map(({ lvl, widthClass, hint }) => {
                    const occupant = pyramidSlots[lvl];
                    return (
                      <div
                        key={lvl}
                        onDragOver={(e: any) => e.preventDefault && e.preventDefault()}
                        onDrop={(e: any) => {
                          e.preventDefault && e.preventDefault();
                          handlePlaceInPyramid(lvl);
                        }}
                        onClick={() => handlePlaceInPyramid(lvl)}
                        className={`${widthClass} p-3.5 rounded-xl border-2 transition-all cursor-pointer text-center ${
                          occupant
                            ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                            : 'bg-slate-950/80 border-slate-700 border-dashed hover:border-emerald-400'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-x-2 text-[10px] text-slate-400 mb-1">
                          <span className="font-extrabold text-emerald-400">
                            LEVEL {lvl}
                          </span>
                          <span>{hint}</span>
                        </div>
                        {occupant ? (
                          <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs mt-1">
                            <span className="font-extrabold text-white">
                              {occupant.name}
                            </span>
                            <span className="text-[11px] text-cyan-300 font-bold">
                              {occupant.accessTime} ({occupant.typicalSize})
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 py-1">
                            [ Click or Drop Memory Tier Here ]
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleVerifyPyramid}
                className="mt-6 w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.35)] cursor-pointer"
              >
                VERIFY MEMORY HIERARCHY PYRAMID &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            STAGE 3: PHYSICAL ADDRESS BIT-SPLITTER & 3Cs MISS DECODER
           =================================================================== */}
        {stage === 3 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-6 space-y-5 sm:space-y-6">
            {/* Hardware Spec Card */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
              <div className="text-xs font-extrabold text-emerald-300 uppercase mb-2">
                📋 PART A: CONFIGURE THE SET-ASSOCIATIVE ADDRESS DECODER
              </div>
              <p className="text-xs text-slate-300 mb-3">
                Given the following computer memory specifications from your COA lecture slides, use the{' '}
                <span className="text-emerald-300 font-bold">[-] / [+]</span> controls to allocate the exact number of
                bits for the <strong>TAG</strong>, <strong>SET INDEX</strong>, and <strong>BYTE OFFSET</strong> fields:
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Main Memory Size</div>
                  <div className="text-xs md:text-sm font-extrabold text-white mt-0.5">
                    {bitChallenge.mmSizeLabel}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Cache Size</div>
                  <div className="text-xs md:text-sm font-extrabold text-emerald-400 mt-0.5">
                    {bitChallenge.cacheSizeLabel}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Block / Line Size</div>
                  <div className="text-xs md:text-sm font-extrabold text-cyan-300 mt-0.5">
                    {bitChallenge.blockSizeLabel}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Associativity</div>
                  <div className="text-xs md:text-sm font-extrabold text-amber-300 mt-0.5">
                    {bitChallenge.ways}-Way Set Associative
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Visual Address Bit-Splitter */}
            <div className="bg-slate-950 p-3 sm:p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 uppercase">
                  // {bitChallenge.totalPaBits}-BIT PHYSICAL ADDRESS FORMAT
                </span>
                <span
                  className={`font-extrabold px-2.5 py-0.5 rounded ${
                    userTagBits + userSetBits + userOffsetBits ===
                    bitChallenge.totalPaBits
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  Total Allocated: {userTagBits + userSetBits + userOffsetBits} /{' '}
                  {bitChallenge.totalPaBits} Bits
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* TAG BITS */}
                <div className="p-4 rounded-xl bg-emerald-950/50 border-2 border-emerald-500/50 text-center">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold">
                    1. TAG FIELD BITS
                  </div>
                  <div className="text-3xl font-extrabold text-white my-2">
                    {userTagBits} <span className="text-sm font-normal">bits</span>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setUserTagBits(Math.max(1, userTagBits - 1))}
                      className="px-5 py-2.5 sm:px-3 sm:py-1 rounded bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 font-extrabold cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserTagBits(Math.min(16, userTagBits + 1))}
                      className="px-5 py-2.5 sm:px-3 sm:py-1 rounded bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 font-extrabold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    PA Bits − Set Bits − Offset Bits
                  </div>
                </div>

                {/* SET INDEX BITS */}
                <div className="p-4 rounded-xl bg-amber-950/50 border-2 border-amber-500/50 text-center">
                  <div className="text-[10px] text-amber-300 uppercase font-bold">
                    2. SET INDEX BITS
                  </div>
                  <div className="text-3xl font-extrabold text-white my-2">
                    {userSetBits} <span className="text-sm font-normal">bits</span>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setUserSetBits(Math.max(1, userSetBits - 1))}
                      className="px-5 py-2.5 sm:px-3 sm:py-1 rounded bg-slate-900 hover:bg-amber-400 hover:text-slate-950 font-extrabold cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserSetBits(Math.min(16, userSetBits + 1))}
                      className="px-5 py-2.5 sm:px-3 sm:py-1 rounded bg-slate-900 hover:bg-amber-400 hover:text-slate-950 font-extrabold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    log₂(Total Cache Lines ÷ {bitChallenge.ways}-Way)
                  </div>
                </div>

                {/* WORD / BYTE OFFSET BITS */}
                <div className="p-4 rounded-xl bg-cyan-950/50 border-2 border-cyan-500/50 text-center">
                  <div className="text-[10px] text-cyan-300 uppercase font-bold">
                    3. BLOCK / BYTE OFFSET BITS
                  </div>
                  <div className="text-3xl font-extrabold text-white my-2">
                    {userOffsetBits} <span className="text-sm font-normal">bits</span>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setUserOffsetBits(Math.max(1, userOffsetBits - 1))
                      }
                      className="px-5 py-2.5 sm:px-3 sm:py-1 rounded bg-slate-900 hover:bg-cyan-400 hover:text-slate-950 font-extrabold cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setUserOffsetBits(Math.min(16, userOffsetBits + 1))
                      }
                      className="px-5 py-2.5 sm:px-3 sm:py-1 rounded bg-slate-900 hover:bg-cyan-400 hover:text-slate-950 font-extrabold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    log₂(Block Size in Bytes)
                  </div>
                </div>
              </div>
            </div>

            {/* Part B: 3Cs Cache Miss Diagnostic */}
            <div className="bg-slate-950 p-3 sm:p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-extrabold text-amber-300 uppercase">
                📋 PART B: DIAGNOSE THE CACHE MISS TYPE (THE 3Cs + COHERENCE)
              </div>
              <p className="text-xs md:text-sm text-white leading-relaxed">
                {bitChallenge.missScenarioQuestion}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  {
                    id: 'COMPULSORY',
                    label: 'Compulsory (Cold) Miss',
                    desc: 'First-ever reference to a memory block',
                  },
                  {
                    id: 'CONFLICT',
                    label: 'Conflict (Collision) Miss',
                    desc: 'Multiple blocks map to the same set/line & evict each other',
                  },
                  {
                    id: 'CAPACITY',
                    label: 'Capacity Miss',
                    desc: 'Working set exceeds total cache size across all lines',
                  },
                  {
                    id: 'COHERENCE',
                    label: 'Coherence Miss',
                    desc: 'Multiprocessor cache invalidation from another core writing shared data',
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMissType(m.id)}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      selectedMissType === m.id
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-emerald-300">
                      {m.label}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerifyBitSplit}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.35)] cursor-pointer"
            >
              VERIFY DECODER BIT-SPLIT &amp; COMPLETE MODULE 5 &rarr;
            </button>
          </div>
        )}

        {/* Status / Feedback Banner */}
        {banner && (
          <motion.div
            key={banner.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3.5 rounded-xl border text-xs font-bold ${
              banner.isError
                ? 'bg-rose-950/70 border-rose-500 text-rose-200'
                : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
            }`}
          >
            {banner.text}
          </motion.div>
        )}
      </div>
    </section>
  );
}