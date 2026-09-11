'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Radio, Video, ShieldAlert, Crosshair, RefreshCw, Volume2 } from 'lucide-react';
import { tacticalAudio } from '@/lib/tactical-audio';

interface CommandGridWallProps {
  onClose: () => void;
  mapComponent: React.ReactNode;
  sigintComponent?: React.ReactNode;
  cctvComponent?: React.ReactNode;
  telemetryComponent?: React.ReactNode;
}

export default function CommandGridWall({
  onClose,
  mapComponent,
  sigintComponent,
  cctvComponent,
  telemetryComponent
}: CommandGridWallProps) {
  const [focusedQuad, setFocusedQuad] = useState<number | null>(null);

  const toggleFocus = (quad: number) => {
    tacticalAudio.playUiClick();
    setFocusedQuad(prev => prev === quad ? null : quad);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-[#03070D] flex flex-col font-mono select-none overflow-hidden">
      {/* Top Command Wall Header */}
      <div className="h-10 border-b border-[#00E5FF]/20 bg-[#060D17]/90 backdrop-blur-md px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-ping" />
            <span className="text-[#00E5FF] font-bold text-xs tracking-widest uppercase">TRINETRA TACTICAL C4ISR — QUAD VIDEO WALL</span>
          </div>
          <span className="text-white/20">│</span>
          <span className="text-[10px] text-white/50 tracking-wider hidden sm:inline">MULTI-SENSOR COMBINED RECONNAISSANCE GRID</span>
        </div>

        <div className="flex items-center gap-2">
          {focusedQuad !== null && (
            <button
              onClick={() => toggleFocus(focusedQuad)}
              className="px-2.5 py-1 rounded bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Minimize2 className="w-3 h-3" /> RESTORE QUAD VIEW
            </button>
          )}

          <button
            onClick={() => {
              tacticalAudio.playRadarSweep();
            }}
            title="Radar Sweep Tone"
            className="p-1 rounded text-white/40 hover:text-[#00E5FF] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#FF3D57]/15 hover:bg-[#FF3D57]/25 border border-[#FF3D57]/40 text-[#FF3D57] text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            EXIT VIDEO WALL
          </button>
        </div>
      </div>

      {/* 4-Quadrant Grid Container */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-1 p-1 bg-black/80">
        {/* QUAD 1 (Top-Left): Tactical Map / Geographic Theatre */}
        <div
          className={`relative border border-[#00E5FF]/30 bg-[#02060C] rounded overflow-hidden transition-all duration-300 ${
            focusedQuad === 1
              ? 'col-span-2 row-span-2 z-30'
              : focusedQuad !== null
              ? 'hidden'
              : 'col-span-1 row-span-1'
          }`}
        >
          <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded border border-[#00E5FF]/40 text-[#00E5FF] text-[10px] tracking-wider font-bold">
            <Crosshair className="w-3 h-3 text-[#00E5FF] animate-spin" />
            QUAD 01: GEOSPATIAL MASTER THEATRE
          </div>
          <button
            onClick={() => toggleFocus(1)}
            className="absolute top-2 right-2 z-20 p-1.5 rounded bg-black/80 hover:bg-[#00E5FF]/20 border border-white/10 hover:border-[#00E5FF]/40 text-white/70 hover:text-[#00E5FF] transition-all cursor-pointer"
            title={focusedQuad === 1 ? "Restore Quad View" : "Maximize Quadrant"}
          >
            {focusedQuad === 1 ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <div className="w-full h-full relative">
            {mapComponent}
          </div>
        </div>

        {/* QUAD 2 (Top-Right): SIGINT & OSINT Feeds */}
        <div
          className={`relative border border-[#FF9100]/30 bg-[#050B14] rounded overflow-hidden transition-all duration-300 ${
            focusedQuad === 2
              ? 'col-span-2 row-span-2 z-30'
              : focusedQuad !== null
              ? 'hidden'
              : 'col-span-1 row-span-1'
          }`}
        >
          <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded border border-[#FF9100]/40 text-[#FF9100] text-[10px] tracking-wider font-bold">
            <Radio className="w-3 h-3 text-[#FF9100] animate-pulse" />
            QUAD 02: SIGINT / OSINT REAL-TIME INTERCEPT
          </div>
          <button
            onClick={() => toggleFocus(2)}
            className="absolute top-2 right-2 z-20 p-1.5 rounded bg-black/80 hover:bg-[#FF9100]/20 border border-white/10 hover:border-[#FF9100]/40 text-white/70 hover:text-[#FF9100] transition-all cursor-pointer"
            title={focusedQuad === 2 ? "Restore Quad View" : "Maximize Quadrant"}
          >
            {focusedQuad === 2 ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <div className="w-full h-full pt-10 px-2 pb-2 overflow-y-auto">
            {sigintComponent || (
              <div className="h-full flex flex-col items-center justify-center text-white/40 gap-2">
                <Radio className="w-8 h-8 text-[#FF9100]/50 animate-pulse" />
                <span className="text-xs">SIGINT STREAM ONLINE</span>
                <span className="text-[10px] text-white/20">Awaiting tactical intercepts...</span>
              </div>
            )}
          </div>
        </div>

        {/* QUAD 3 (Bottom-Left): CCTV / Drone Video Feeds */}
        <div
          className={`relative border border-[#00E676]/30 bg-[#040A12] rounded overflow-hidden transition-all duration-300 ${
            focusedQuad === 3
              ? 'col-span-2 row-span-2 z-30'
              : focusedQuad !== null
              ? 'hidden'
              : 'col-span-1 row-span-1'
          }`}
        >
          <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded border border-[#00E676]/40 text-[#00E676] text-[10px] tracking-wider font-bold">
            <Video className="w-3 h-3 text-[#00E676] animate-pulse" />
            QUAD 03: OPTICAL / CCTV SURVEILLANCE MATRIX
          </div>
          <button
            onClick={() => toggleFocus(3)}
            className="absolute top-2 right-2 z-20 p-1.5 rounded bg-black/80 hover:bg-[#00E676]/20 border border-white/10 hover:border-[#00E676]/40 text-white/70 hover:text-[#00E676] transition-all cursor-pointer"
            title={focusedQuad === 3 ? "Restore Quad View" : "Maximize Quadrant"}
          >
            {focusedQuad === 3 ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <div className="w-full h-full pt-10 px-2 pb-2 overflow-y-auto">
            {cctvComponent || (
              <div className="h-full flex flex-col items-center justify-center text-white/40 gap-2">
                <Video className="w-8 h-8 text-[#00E676]/50 animate-pulse" />
                <span className="text-xs">RECON OPTICS ONLINE</span>
                <span className="text-[10px] text-white/20">Scanning 4,800+ global traffic & perimeter cameras</span>
              </div>
            )}
          </div>
        </div>

        {/* QUAD 4 (Bottom-Right): Threat Telemetry & Intel Feed */}
        <div
          className={`relative border border-[#FF3D57]/30 bg-[#08050B] rounded overflow-hidden transition-all duration-300 ${
            focusedQuad === 4
              ? 'col-span-2 row-span-2 z-30'
              : focusedQuad !== null
              ? 'hidden'
              : 'col-span-1 row-span-1'
          }`}
        >
          <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded border border-[#FF3D57]/40 text-[#FF3D57] text-[10px] tracking-wider font-bold">
            <ShieldAlert className="w-3 h-3 text-[#FF3D57] animate-pulse" />
            QUAD 04: EARLY WARNING & THREAT TELEMETRY
          </div>
          <button
            onClick={() => toggleFocus(4)}
            className="absolute top-2 right-2 z-20 p-1.5 rounded bg-black/80 hover:bg-[#FF3D57]/20 border border-white/10 hover:border-[#FF3D57]/40 text-white/70 hover:text-[#FF3D57] transition-all cursor-pointer"
            title={focusedQuad === 4 ? "Restore Quad View" : "Maximize Quadrant"}
          >
            {focusedQuad === 4 ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <div className="w-full h-full pt-10 px-2 pb-2 overflow-y-auto">
            {telemetryComponent || (
              <div className="h-full flex flex-col items-center justify-center text-white/40 gap-2">
                <ShieldAlert className="w-8 h-8 text-[#FF3D57]/50 animate-pulse" />
                <span className="text-xs">THREAT RADAR ARMED</span>
                <span className="text-[10px] text-white/20">Real-time NASA FIRMS & USGS event integration</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
