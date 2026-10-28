// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import TopSystemHUD from '@/components/ui/TopSystemHUD';
import TutorialOverlay from '@/components/ui/TutorialOverlay';
import HintTooltip from '@/components/ui/HintTooltip';
import GlitchOverlay from '@/components/ui/GlitchOverlay';

export const metadata: Metadata = {
  title: 'SYSTEM REBOOT // COA Interactive Simulation',
  description: 'Interactive Cache Mapping and Instruction Pipeline Simulator',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-emerald-400 font-mono min-h-dvh overflow-x-hidden selection:bg-emerald-500 selection:text-slate-950">
        {/* Global HUD, Walkthrough Modal & Smart Hints */}
        <TopSystemHUD />
        <TutorialOverlay />
        <HintTooltip />
        <GlitchOverlay />

        {/* Main Viewport shifted down by the HUD height (taller 2-row HUD on phones) */}
        <main className="pt-[calc(var(--hud-h)+env(safe-area-inset-top))] min-h-dvh flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}