// src/components/pipeline/PipelineGame.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { sound } from '@/lib/sound';

interface DiagramQuestion {
  kind: 'DIAGRAM';
  id: number;
  executionMode: 'NON_PIPELINED' | 'PIPELINED';
  title: string;
  badge: string;
  methodBanner: string;
  instructionsText: string;
  ifCycles: number;
  dCycles: number;
  eCycles: number;
  totalInstructions: number;
  fmcGHz: number;
  flushInterval?: number;
  expectedShift: number;
  expectedTotalCycles: number;
  expectedSecondMetricLabel: string;
  expectedSecondMetricValue: string;
  cycleChoices: number[];
  secondMetricChoices: string[];
  formulaNote: string;
}

interface McqQuestion {
  kind: 'MCQ';
  id: number;
  title: string;
  badge: string;
  instructions: {
    id: string;
    asm: string;
    stages: string[];
    highlight?: boolean;
  }[];
  problemStatement: string;
  coaConceptNote: string;
  options: {
    label: string;
    subtext: string;
    isOptimal: boolean;
    cpiImpact: number;
    scoreDelta: number;
    feedback: string;
    formula: string;
  }[];
}

type PipelineChallenge = DiagramQuestion | McqQuestion;

function buildChoices(correct: number, step: number): number[] {
  const set = new Set<number>([correct]);
  const offsets = [-2 * step, -step, step, 2 * step, 3 * step];
  for (const off of offsets) {
    if (set.size < 4 && correct + off > 0) {
      set.add(correct + off);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

function generateRandomizedPipelineQuestions(): PipelineChallenge[] {
  const randPick = <T,>(arr: T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];

  // =========================================================================
  // QUESTION 1: NON-PIPELINED METHOD (NON-OVERLAPPING SEQUENTIAL EXECUTION)
  // =========================================================================
  const q1If = randPick([1, 2]);
  const q1D = 1;
  const q1E = randPick([2, 3]);
  const q1N = randPick([10, 15, 20, 25]);
  const q1C1 = q1If + q1D + q1E; // Total cycles for 1 instruction (4 or 5)
  // In Non-Pipelined mode, I2 cannot start until I1 completely finishes all C1 cycles!
  const q1Shift = q1C1;
  const q1Total = q1N * q1C1;

  // =========================================================================
  // QUESTION 2: PIPELINED METHOD (OVERLAPPING EXECUTION)
  // =========================================================================
  const q2If = randPick([1, 2]);
  const q2D = 1;
  const q2E = randPick([2, 3, 4]);
  const q2N = randPick([10, 20, 50, 100]);
  const q2Fmc = randPick([1, 2, 4]);
  const q2C1 = q2If + q2D + q2E;
  const q2Diff = Math.max(q2If, q2D, q2E);
  const q2Total = q2C1 + (q2N - 1) * q2Diff;
  const q2Fmax = `${(q2Fmc / q2Diff).toFixed(2)} GHz`;

  // =========================================================================
  // QUESTION 3: PIPELINED METHOD WITH FLUSH INTERVAL
  // =========================================================================
  const q3If = 1;
  const q3D = 1;
  const q3E = randPick([3, 4]);
  const q3FlushK = randPick([5, 10]);
  const q3Batches = randPick([3, 4]);
  const q3N = q3FlushK * q3Batches;
  const q3Fmc = randPick([2, 4]);
  const q3C1 = q3If + q3D + q3E;
  const q3Diff = Math.max(q3If, q3D, q3E);
  const cyclesPerBatch = q3C1 + (q3FlushK - 1) * q3Diff;
  const q3Total = cyclesPerBatch * q3Batches;
  const q3Fmax = `${(q3Fmc / q3Diff).toFixed(2)} GHz`;

  const randHex = randPick(['[2050H]', '[4000H]', '[8A00H]', '[3F10H]']);
  const randReg = randPick(['BL', 'CL', 'DL']);

  return [
    {
      kind: 'DIAGRAM',
      id: 1,
      executionMode: 'NON_PIPELINED',
      title: 'QUESTION 01 // NON-PIPELINED METHOD (NON-OVERLAPPING)',
      badge: 'DIAGRAM BUILDER (1 OF 5) // NON-PIPELINED MODE',
      methodBanner:
        '🚫 REQUIRED METHOD: NON-PIPELINED (NON-OVERLAPPING SEQUENTIAL EXECUTION)',
      instructionsText: `Use the NON-PIPELINED (Non-Overlapping) Method! Given: Fetch (IF) = ${q1If} cycle(s), Decode (D) = ${q1D} cycle, Execute (E) = ${q1E} cycles, and N = ${q1N} instructions. Each instruction must completely finish Execution (E) before the next instruction starts Fetching (F)!`,
      ifCycles: q1If,
      dCycles: q1D,
      eCycles: q1E,
      totalInstructions: q1N,
      fmcGHz: 1,
      expectedShift: q1Shift,
      expectedTotalCycles: q1Total,
      expectedSecondMetricLabel: '2B. Cycles Required Per Single Instruction (C1 = IF + D + E)',
      expectedSecondMetricValue: `${q1C1} Cycles / Instruction`,
      cycleChoices: buildChoices(q1Total, q1C1),
      secondMetricChoices: Array.from(
        new Set([
          `${q1C1} Cycles / Instruction`,
          `${q1C1 + 1} Cycles / Instruction`,
          `${Math.max(1, q1C1 - 1)} Cycles / Instruction`,
          `${q1E} Cycles / Instruction`,
        ])
      ),
      formulaNote: `Non-Pipelined Total Cycles = N × (IF + D + E) = ${q1N} × ${q1C1} = ${q1Total} Clock Cycles (Zero Stage Overlap)`,
    },
    {
      kind: 'DIAGRAM',
      id: 2,
      executionMode: 'PIPELINED',
      title: 'QUESTION 02 // PIPELINED METHOD (OVERLAPPING STAGES)',
      badge: 'DIAGRAM BUILDER (2 OF 5) // PIPELINED MODE',
      methodBanner:
        '⚡ REQUIRED METHOD: PIPELINED (OVERLAPPING INSTRUCTION EXECUTION)',
      instructionsText: `Use the PIPELINED (Overlapping) Method! Given: Fetch (IF) = ${q2If} cycle(s), Decode (D) = ${q2D} cycle, Execute (E) = ${q2E} cycles, Clock f_mc = ${q2Fmc} GHz, and N = ${q2N} instructions. Overlap stages as tightly as possible without same-stage collisions!`,
      ifCycles: q2If,
      dCycles: q2D,
      eCycles: q2E,
      totalInstructions: q2N,
      fmcGHz: q2Fmc,
      expectedShift: q2Diff,
      expectedTotalCycles: q2Total,
      expectedSecondMetricLabel: `2B. Select Max Operating Frequency (f_max = f_mc / Δ)`,
      expectedSecondMetricValue: q2Fmax,
      cycleChoices: buildChoices(q2Total, q2Diff * 2),
      secondMetricChoices: Array.from(
        new Set([
          q2Fmax,
          `${(q2Fmc / (q2Diff + 1)).toFixed(2)} GHz`,
          `${(q2Fmc / q2C1).toFixed(2)} GHz`,
          `${q2Fmc.toFixed(2)} GHz`,
        ])
      ),
      formulaNote: `Pipelined Total Cycles = C1 + (N - 1) × Δ = ${q2C1} + (${q2N} - 1) × ${q2Diff} = ${q2Total} Cycles | f_max = ${q2Fmc} GHz / ${q2Diff} = ${q2Fmax}`,
    },
    {
      kind: 'DIAGRAM',
      id: 3,
      executionMode: 'PIPELINED',
      title: `QUESTION 03 // PIPELINED METHOD WITH FLUSH EVERY ${q3FlushK} INSTR`,
      badge: 'DIAGRAM BUILDER (3 OF 5) // PIPELINED FLUSH MODE',
      methodBanner:
        '⚡ REQUIRED METHOD: PIPELINED (OVERLAPPING) WITH PERIODIC PIPELINE FLUSH',
      instructionsText: `Use the PIPELINED (Overlapping) Method! Given: IF = ${q3If} cycle, D = ${q3D} cycle, E = ${q3E} cycles, f_mc = ${q3Fmc} GHz. The pipeline is FLUSHED after every ${q3FlushK} instructions! Find total cycles for N = ${q3N} instructions (${q3Batches} batches of ${q3FlushK}).`,
      ifCycles: q3If,
      dCycles: q3D,
      eCycles: q3E,
      totalInstructions: q3N,
      fmcGHz: q3Fmc,
      flushInterval: q3FlushK,
      expectedShift: q3Diff,
      expectedTotalCycles: q3Total,
      expectedSecondMetricLabel: `2B. Select Max Operating Frequency (f_max = f_mc / Δ)`,
      expectedSecondMetricValue: q3Fmax,
      cycleChoices: buildChoices(q3Total, q3C1),
      secondMetricChoices: Array.from(
        new Set([
          q3Fmax,
          `${(q3Fmc / 2).toFixed(2)} GHz`,
          `${(q3Fmc / (q3Diff + 1)).toFixed(2)} GHz`,
          `${q3Fmc.toFixed(2)} GHz`,
        ])
      ),
      formulaNote: `1 Pipelined Batch (${q3FlushK} instr) = ${q3C1} + (${q3FlushK} - 1) × ${q3Diff} = ${cyclesPerBatch} Cycles. For ${q3Batches} batches: ${q3Batches} × ${cyclesPerBatch} = ${q3Total} Cycles!`,
    },
    {
      kind: 'MCQ',
      id: 4,
      title: 'QUESTION 04 // DATA DEPENDENCY HAZARD (RAW)',
      badge: 'HAZARD SCENARIO MCQ (4 OF 5)',
      instructions: [
        {
          id: 'I1',
          asm: `INC ${randHex}`,
          stages: ['IF', 'ID', 'AG', 'OF', 'EX', 'WR'],
          highlight: true,
        },
        {
          id: 'I2',
          asm: `MOV ${randReg}, ${randHex}`,
          stages: ['  ', 'IF', 'ID', 'AG', 'OF ⚠️', 'EX', 'WR'],
          highlight: true,
        },
        {
          id: 'I3',
          asm: `ADD AL, ${randReg}`,
          stages: ['  ', '  ', 'IF', 'ID', 'AG', 'OF', 'EX', 'WR'],
        },
      ],
      problemStatement: `In an overlapping pipeline, Instruction I2 (MOV ${randReg}, ${randHex}) reaches Operand Fetch (OF) at Cycle 5 before I1 (INC ${randHex}) finishes Writing Back (WR) the updated value to ${randHex} at Cycle 6! What must the pipeline controller do?`,
      coaConceptNote:
        'A Read-After-Write (RAW) Data Dependency Hazard occurs when the destination of I1 is the source operand of I2.',
      options: [
        {
          label: 'INSERT NOP BUBBLE / ENGAGE OPERAND FORWARDING',
          subtext: `Delay or forward the updated result of ${randHex} from I1 before I2 executes`,
          isOptimal: true,
          cpiImpact: 0.0,
          scoreDelta: 250,
          feedback: `CORRECT! Forwarding/NOP prevents I2 from reading an un-incremented stale value from ${randHex}.`,
          formula: `RAW Hazard Resolved: WR(I1) -> OF(I2) Synchronized`,
        },
        {
          label: 'READ MEMORY IMMEDIATELY WITHOUT STALLING',
          subtext: `Allow I2 to fetch ${randHex} at Cycle 5 before I1 writes back at Cycle 6`,
          isOptimal: false,
          cpiImpact: 0.45,
          scoreDelta: -50,
          feedback: `DATA HAZARD FAULT! ${randReg} loaded the old, stale value of ${randHex} before I1 finished writing!`,
          formula: `Fault: OF(I2) executed before WR(I1)`,
        },
      ],
    },
    {
      kind: 'MCQ',
      id: 5,
      title: 'QUESTION 05 // CONTROL / BRANCH HAZARD RESOLUTION',
      badge: 'HAZARD SCENARIO MCQ (5 OF 5)',
      instructions: [
        {
          id: 'I1',
          asm: 'JMP Down',
          stages: ['IF', 'ID', 'EX (Branch Taken!)'],
          highlight: true,
        },
        {
          id: 'I2',
          asm: `INC ${randReg} (Sequential)`,
          stages: ['  ', 'IF ⚠️', 'ID ⚠️', 'FLUSH'],
          highlight: true,
        },
        {
          id: 'I3',
          asm: 'MOV CL, DL (Sequential)',
          stages: ['  ', '  ', 'IF ⚠️', 'FLUSH'],
        },
        {
          id: 'I4',
          asm: 'Down: DEC CH (Target)',
          stages: ['  ', '  ', '  ', 'IF', 'ID', 'EX', 'WR'],
          highlight: true,
        },
      ],
      problemStatement:
        'JMP Down jumps to "Down: DEC CH". However, while JMP Down was being decoded, the overlapping pipeline already fetched sequential instructions I2 and I3! How do you resolve this Control Hazard?',
      coaConceptNote:
        'Unconditional/conditional branches break sequential instruction flow, requiring wrong-path instructions to be flushed and Branch Prediction to be used.',
      options: [
        {
          label: 'FLUSH WRONG-PATH INSTRUCTIONS & USE BRANCH PREDICTION',
          subtext: `Discard prefetched I2 (INC ${randReg}) & I3, and fetch from target "Down: DEC CH"`,
          isOptimal: true,
          cpiImpact: 0.05,
          scoreDelta: 250,
          feedback:
            'EXCELLENT! Flushing the wrong-path instructions and engaging the Branch Target Buffer prevents illegal register updates.',
          formula: 'Control Hazard Resolved via Pipeline Flush + Branch Prediction',
        },
        {
          label: 'LET SEQUENTIAL INSTRUCTIONS FINISH EXECUTION BEFORE JUMPING',
          subtext: `Commit INC ${randReg} and MOV CL, DL to registers before branching to Down`,
          isOptimal: false,
          cpiImpact: 0.6,
          scoreDelta: -50,
          feedback:
            'CONTROL FAULT! Instructions after an unconditional jump must never be committed to architectural registers!',
          formula: 'Fault: Wrong-Path Instructions Committed',
        },
      ],
    },
  ];
}

function buildStageArray(ifC: number, dC: number, eC: number): string[] {
  return [
    ...Array(ifC).fill('F'),
    ...Array(dC).fill('D'),
    ...Array(eC).fill('E'),
  ];
}

export default function PipelineGame() {
  const {
    updateCPI,
    addScore,
    recordMiss,
    setPhase,
    isPipelineCompleted,
    completePipelinePhase,
  } = useGameStore();

  const [isMounted, setIsMounted] = useState(false);
  const [questions, setQuestions] = useState<PipelineChallenge[]>([]);
  const [qIdx, setQIdx] = useState(0);

  const [i2Start, setI2Start] = useState<number>(1);
  const [i3Start, setI3Start] = useState<number>(2);
  const [selectedCycles, setSelectedCycles] = useState<number | null>(null);
  const [selectedSecondMetric, setSelectedSecondMetric] = useState<string | null>(
    null
  );

  const [feedbackBanner, setFeedbackBanner] = useState<{
    text: string;
    formula: string;
    good: boolean;
  } | null>(null);

  useEffect(() => {
    setQuestions(generateRandomizedPipelineQuestions());
    setIsMounted(true);
  }, []);

  const currentQ = questions[qIdx];

  const diagramValidation = useMemo(() => {
    if (!currentQ || currentQ.kind !== 'DIAGRAM') return null;
    const stages = buildStageArray(
      currentQ.ifCycles,
      currentQ.dCycles,
      currentQ.eCycles
    );

    const rowStarts = [0, i2Start, i3Start];
    const collisionCols = new Set<number>();

    for (let col = 0; col < 18; col++) {
      const activeStagesInCol: string[] = [];
      for (let r = 0; r < 3; r++) {
        const idxInInstr = col - rowStarts[r];
        if (idxInInstr >= 0 && idxInInstr < stages.length) {
          const st = stages[idxInInstr];
          if (currentQ.executionMode === 'NON_PIPELINED') {
            // In Non-Pipelined mode, ANY two instructions active in the same clock cycle is a violation!
            if (activeStagesInCol.length > 0) {
              collisionCols.add(col);
            }
          } else {
            // In Pipelined mode, only SAME-STAGE overlap (F&F, D&D, E&E) is a collision!
            if (activeStagesInCol.includes(st)) {
              collisionCols.add(col);
            }
          }
          activeStagesInCol.push(st);
        }
      }
    }

    const isExactCompactAlignment =
      i2Start === currentQ.expectedShift &&
      i3Start === currentQ.expectedShift * 2 &&
      collisionCols.size === 0;

    return {
      stages,
      collisionCols,
      isExactCompactAlignment,
    };
  }, [currentQ, i2Start, i3Start]);

  if (!isMounted || questions.length === 0 || !currentQ) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-emerald-400 animate-pulse text-xs uppercase tracking-widest">
        INITIALIZING PIPELINE OVERDRIVE...
      </div>
    );
  }

  const handleVerifyDiagramQuestion = () => {
    if (currentQ.kind !== 'DIAGRAM' || !diagramValidation) return;

    if (!diagramValidation.isExactCompactAlignment) {
      sound.playFault();
      const modeExplanation =
        currentQ.executionMode === 'NON_PIPELINED'
          ? `Non-Pipelined (Non-Overlapping) Fault! I2 cannot start until I1 completely finishes all ${currentQ.expectedShift} cycles of IF+D+E!`
          : `Pipelined Alignment Fault! Shift each instruction by Δ = ${currentQ.expectedShift} clock cycle(s) so hardware stages overlap without colliding!`;

      recordMiss(
        modeExplanation,
        `Set I2 Start = Cycle ${1 + currentQ.expectedShift} & I3 Start = Cycle ${
          1 + currentQ.expectedShift * 2
        }`
      );
      setFeedbackBanner({
        text: `❌ DIAGRAM ALIGNMENT FAULT: ${modeExplanation} (Set I2 to start at C${
          1 + currentQ.expectedShift
        } and I3 at C${1 + currentQ.expectedShift * 2})`,
        formula:
          currentQ.executionMode === 'NON_PIPELINED'
            ? `Non-Pipelined Shift = IF + D + E = ${currentQ.expectedShift} Cycles`
            : `Pipelined Shift Δ = max(${currentQ.ifCycles}, ${currentQ.dCycles}, ${currentQ.eCycles}) = ${currentQ.expectedShift} Cycles`,
        good: false,
      });
      return;
    }

    if (
      selectedCycles !== currentQ.expectedTotalCycles ||
      selectedSecondMetric !== currentQ.expectedSecondMetricValue
    ) {
      sound.playFault();
      recordMiss(
        'Calculation Mismatch! Check the formula for the active mode (Non-Pipelined vs. Pipelined).',
        currentQ.formulaNote
      );
      setFeedbackBanner({
        text: '❌ MATH MISMATCH (-50 PTS): Your diagram is aligned, but one of your selected calculations below is incorrect!',
        formula: currentQ.formulaNote,
        good: false,
      });
      return;
    }

    sound.playHit();
    addScore(300);
    setFeedbackBanner({
      text: '✅ PERFECT DIAGRAM ALIGNMENT & TELEMETRY CALCULATION (+300 PTS)!',
      formula: currentQ.formulaNote,
      good: true,
    });
  };

  const handleMcqSelect = (option: McqQuestion['options'][0]) => {
    updateCPI(option.cpiImpact);
    if (option.isOptimal) {
      sound.playHit();
      addScore(option.scoreDelta);
      setFeedbackBanner({
        text: option.feedback,
        formula: option.formula,
        good: true,
      });
    } else {
      sound.playFault();
      recordMiss(option.feedback, option.formula);
      setFeedbackBanner({
        text: option.feedback,
        formula: option.formula,
        good: false,
      });
    }
  };

  const handleNextQuestion = () => {
    setFeedbackBanner(null);
    setI2Start(1);
    setI3Start(2);
    setSelectedCycles(null);
    setSelectedSecondMetric(null);

    if (qIdx + 1 < questions.length) {
      setQIdx(qIdx + 1);
    } else {
      completePipelinePhase();
      setPhase('LEADERBOARD');
    }
  };

  return (
    <section className="relative max-w-6xl mx-auto w-full px-3 sm:px-4 py-4 md:py-6 font-mono flex flex-col gap-4 md:gap-6">
      {isPipelineCompleted && (
        <div className="fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-8 bg-slate-900 border-2 border-amber-400 rounded-2xl text-center shadow-[0_0_60px_rgba(251,191,36,0.35)]"
          >
            <div className="inline-block px-3 py-1 rounded bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-extrabold uppercase mb-3">
              🔒 PHASE 2 LOCKED &amp; COMPLETED
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              PIPELINE OVERDRIVE STABILIZED
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mb-6 leading-relaxed">
              Your stopwatch has stopped and your final system efficiency rating is locked in. Proceed to the Live
              Classroom Leaderboard!
            </p>
            <button
              onClick={() => setPhase('LEADERBOARD')}
              className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-extrabold tracking-wider shadow-[0_0_25px_rgba(251,191,36,0.5)] cursor-pointer transition-all"
            >
              VIEW LIVE LEADERBOARD &rarr;
            </button>
          </motion.div>
        </div>
      )}

      <div
        className={`flex flex-col gap-4 md:gap-6 transition-all ${
          isPipelineCompleted ? 'opacity-25 pointer-events-none grayscale' : ''
        }`}
      >
        {/* Top Progress Bar */}
        <div className="bg-slate-900/90 border border-emerald-500/40 p-3 sm:p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-emerald-500 text-slate-950 uppercase">
              {currentQ.badge}
            </span>
            <h1 className="text-lg md:text-xl font-extrabold text-white mt-1">
              {currentQ.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className={`px-3 py-1.5 rounded text-xs font-bold border ${
                  idx === qIdx
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : idx < qIdx
                    ? 'bg-slate-900 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                {idx < qIdx ? '✓' : `Q${idx + 1}`}
              </div>
            ))}
          </div>
        </div>

        {/* QUESTIONS 1–3: DIAGRAM BUILDER (NON-PIPELINED & PIPELINED) */}
        {currentQ.kind === 'DIAGRAM' && diagramValidation && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-5 space-y-5 sm:space-y-6">
            {/* Explicit Method Banner (Non-Pipelined vs. Pipelined) */}
            <div
              className={`p-3 rounded-xl border-2 text-xs md:text-sm font-extrabold tracking-wide text-center ${
                currentQ.executionMode === 'NON_PIPELINED'
                  ? 'bg-amber-950/50 border-amber-400 text-amber-200'
                  : 'bg-cyan-950/50 border-cyan-400 text-cyan-200'
              }`}
            >
              {currentQ.methodBanner}
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
              <div className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                📋 WHAT YOU NEED TO DO (2 STEPS):
              </div>
              <p className="text-xs md:text-sm text-white font-bold">
                {currentQ.instructionsText}
              </p>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                <li>
                  <strong>Step 1 (Align Diagram):</strong> Use the{' '}
                  <span className="text-emerald-300 font-bold">[◀] / [▶]</span>{' '}
                  buttons (or click a cycle column) to position <strong>I2</strong> and <strong>I3</strong> according to
                  the{' '}
                  <strong className="text-amber-300">
                    {currentQ.executionMode === 'NON_PIPELINED'
                      ? 'NON-PIPELINED (Non-Overlapping)'
                      : 'PIPELINED (Overlapping)'}
                  </strong>{' '}
                  rule until the status badge turns green!
                </li>
                <li>
                  <strong>Step 2 (Calculate):</strong> Select the correct answers in <strong>2A</strong> and{' '}
                  <strong>2B</strong> below, then click <strong>VERIFY</strong>.
                </li>
              </ol>
            </div>

            {/* Interactive 16-Cycle Timing Grid */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 md:min-w-[740px]">
                <span className="text-xs font-bold text-emerald-400 uppercase">
                  // INTERACTIVE TIMING DIAGRAM ({currentQ.executionMode} METHOD)
                </span>
                <span
                  className={`text-xs font-extrabold px-2.5 py-1 rounded ${
                    diagramValidation.isExactCompactAlignment
                      ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                      : 'bg-rose-500/20 border border-rose-500 text-rose-300'
                  }`}
                >
                  {diagramValidation.isExactCompactAlignment
                    ? `✓ VALID ${currentQ.executionMode} ALIGNMENT`
                    : currentQ.executionMode === 'NON_PIPELINED'
                    ? '⚠️ NON-PIPELINED MODE: SHIFT I2 & I3 SO NO INSTRUCTIONS OVERLAP!'
                    : '⚠️ PIPELINED MODE: SHIFT I2 & I3 SO SAME STAGES DO NOT COLLIDE!'}
                </span>
              </div>

              <p className="md:hidden text-[10px] text-slate-500 mb-2">↔ Swipe the diagram sideways to see all 16 cycles. Tap a cell or use ◀ ▶ to shift.</p>
              <div className="min-w-[640px] md:min-w-[740px] space-y-2">
                <div className="grid grid-cols-20 gap-1 text-[10px] text-slate-400 font-bold text-center">
                  <div className="col-span-4 text-left pl-2 sticky left-0 z-10 bg-slate-950">INSTRUCTION</div>
                  {Array.from({ length: 16 }, (_, c) => (
                    <div
                      key={c}
                      className={`py-1 rounded ${
                        diagramValidation.collisionCols.has(c)
                          ? 'bg-rose-500 text-slate-950 font-extrabold'
                          : 'bg-slate-900'
                      }`}
                    >
                      C{c + 1}
                    </div>
                  ))}
                </div>

                {[
                  { label: 'I1 (Fixed)', start: 0, setStart: null },
                  { label: 'I2 (Shiftable)', start: i2Start, setStart: setI2Start },
                  { label: 'I3 (Shiftable)', start: i3Start, setStart: setI3Start },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-20 gap-1 items-center">
                    <div className="col-span-4 sticky left-0 z-10 flex items-center justify-between gap-1 bg-slate-900 px-1.5 sm:px-2.5 py-1.5 rounded border border-slate-800 text-xs">
                      <span className="font-bold text-white"><span className="md:hidden">{row.label.split(' ')[0]}</span><span className="hidden md:inline">{row.label}</span></span>
                      {row.setStart ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => row.setStart!(Math.max(1, row.start - 1))}
                            className="px-2.5 py-1.5 md:px-1.5 md:py-0.5 rounded bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 font-extrabold text-[10px] cursor-pointer"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            onClick={() => row.setStart!(Math.min(12, row.start + 1))}
                            className="px-2.5 py-1.5 md:px-1.5 md:py-0.5 rounded bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 font-extrabold text-[10px] cursor-pointer"
                          >
                            ▶
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-400">Start: C1</span>
                      )}
                    </div>

                    {Array.from({ length: 16 }, (_, col) => {
                      const stageOffset = col - row.start;
                      const stageLetter =
                        stageOffset >= 0 &&
                        stageOffset < diagramValidation.stages.length
                          ? diagramValidation.stages[stageOffset]
                          : null;
                      const isCollision =
                        stageLetter !== null &&
                        diagramValidation.collisionCols.has(col);

                      return (
                        <div
                          key={col}
                          onClick={() => {
                            if (row.setStart && col >= 1 && col <= 12) row.setStart(col);
                          }}
                          className={`h-9 rounded flex items-center justify-center text-xs font-extrabold border transition-all ${
                            row.setStart ? 'cursor-pointer' : ''
                          } ${
                            stageLetter === null
                              ? 'bg-slate-950/60 border-slate-900 text-slate-700 hover:border-slate-700'
                              : isCollision
                              ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                              : stageLetter === 'F'
                              ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
                              : stageLetter === 'D'
                              ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                              : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                          }`}
                        >
                          {stageLetter || '·'}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-2">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-emerald-400 uppercase mb-1">
                  2A. Select Total Clock Cycles ({currentQ.executionMode} Method)
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  {currentQ.executionMode === 'NON_PIPELINED'
                    ? `Non-Pipelined Formula: Total Cycles = N (${currentQ.totalInstructions}) × (IF + D + E)`
                    : 'Pipelined Formula: Total Cycles = C1 + (N - 1) × Δ'}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {currentQ.cycleChoices.map((cyc) => (
                    <button
                      key={cyc}
                      type="button"
                      onClick={() => setSelectedCycles(cyc)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                        selectedCycles === cyc
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50'
                      }`}
                    >
                      {cyc} Clock Cycles
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-amber-300 uppercase mb-1">
                  {currentQ.expectedSecondMetricLabel}
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  {currentQ.executionMode === 'NON_PIPELINED'
                    ? 'Sum the Fetch, Decode, and Execute clock cycles for a single instruction.'
                    : `Divide Microcontroller Clock (${currentQ.fmcGHz} GHz) by max stage cycles Δ.`}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {currentQ.secondMetricChoices.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSelectedSecondMetric(val)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                        selectedSecondMetric === val
                          ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-400/50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!feedbackBanner?.good && (
              <button
                type="button"
                onClick={handleVerifyDiagramQuestion}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.35)] cursor-pointer"
              >
                VERIFY DIAGRAM ALIGNMENT &amp; CALCULATIONS &rarr;
              </button>
            )}
          </div>
        )}

        {/* QUESTIONS 4–5: HAZARD MCQs */}
        {currentQ.kind === 'MCQ' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-5 space-y-4 sm:space-y-5">
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-200">
              <strong>📋 WHAT YOU NEED TO DO:</strong> Inspect the overlapping pipeline diagram below, identify the red{' '}
              <span className="text-rose-400 font-bold">⚠️ HAZARD</span>, and select the correct architectural solution!
            </div>

            <div className="space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
              {currentQ.instructions.map((inst) => (
                <div key={inst.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 sm:min-w-[460px]">
                  <div
                    className={`w-full sm:w-48 shrink-0 px-2.5 py-1.5 rounded text-xs font-bold border truncate ${
                      inst.highlight
                        ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-emerald-400 mr-1.5">{inst.id}:</span>
                    {inst.asm}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {inst.stages.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        className={`px-2.5 py-1.5 rounded text-xs font-extrabold border text-center min-w-[44px] ${
                          st.trim() === ''
                            ? 'border-transparent text-transparent'
                            : st.includes('⚠️') || st === 'FLUSH'
                            ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                            : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {st}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-lg bg-rose-950/25 border border-rose-500/40 text-xs text-rose-100 leading-relaxed">
              <strong className="text-rose-400 uppercase block mb-1">
                ⚠️ ACTIVE PIPELINE HAZARD DETECTED:
              </strong>
              {currentQ.problemStatement}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {currentQ.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMcqSelect(opt)}
                  className="text-left p-4 rounded-xl bg-slate-950 hover:bg-emerald-950/40 border-2 border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm font-extrabold text-emerald-300 group-hover:text-white">
                      [{idx + 1}] {opt.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                      EXECUTE &rarr;
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{opt.subtext}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Next Question Banner */}
        {feedbackBanner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border-2 ${
              feedbackBanner.good
                ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100'
                : 'bg-rose-950/70 border-rose-500 text-rose-100'
            }`}
          >
            <div className="text-xs font-bold leading-relaxed">{feedbackBanner.text}</div>
            <div className="mt-2 p-2 rounded bg-slate-950 text-center text-xs font-extrabold text-amber-300">
              {feedbackBanner.formula}
            </div>
            {feedbackBanner.good && (
              <button
                onClick={handleNextQuestion}
                className="mt-3 w-full py-3 rounded-lg bg-emerald-400 text-slate-950 font-extrabold text-xs hover:bg-emerald-300 cursor-pointer"
              >
                {qIdx + 1 < questions.length
                  ? `PROCEED TO QUESTION ${qIdx + 2} OF ${questions.length} →`
                  : 'COMPLETE SYSTEM REBOOT & VIEW LIVE LEADERBOARD →'}
              </button>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}