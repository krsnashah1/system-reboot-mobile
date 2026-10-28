// src/components/ui/HintTooltip.tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

export default function HintTooltip() {
  const { activeHint, clearHint } = useGameStore();

  return (
    <AnimatePresence>
      {activeHint && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed left-3 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:left-auto md:right-6 md:bottom-6 md:max-w-md md:w-full z-40 font-mono"
        >
          <div
            className={`p-3 md:p-4 rounded-xl border-2 backdrop-blur-md shadow-2xl max-h-[45dvh] overflow-y-auto ${
              activeHint.type === 'ERROR'
                ? 'bg-rose-950/90 border-rose-500/70 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
                : 'bg-amber-950/90 border-amber-400/70 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.25)]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                    activeHint.type === 'ERROR'
                      ? 'bg-rose-500 text-slate-950'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {activeHint.type === 'ERROR' ? 'FAULT' : 'HINT'}
                </span>
                <h4 className="text-xs font-bold tracking-wider uppercase">
                  {activeHint.title}
                </h4>
              </div>
              <button
                onClick={clearHint}
                className="text-xs opacity-70 hover:opacity-100 font-bold cursor-pointer px-2 py-1 -m-1 shrink-0"
              >
                [X]
              </button>
            </div>

            <p className="text-xs mt-2 leading-relaxed opacity-90">
              {activeHint.message}
            </p>

            {activeHint.formula && (
              <div className="mt-3 p-2 rounded bg-slate-950/80 border border-white/10 text-center text-xs font-bold text-emerald-300">
                {activeHint.formula}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}