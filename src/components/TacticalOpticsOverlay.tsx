'use client';

import { useState, useEffect } from 'react';
import { Eye, Shield, Crosshair, Radio, Battery, Activity } from 'lucide-react';

export type TacticalOpticsMode = 'normal' | 'nvg' | 'flir' | 'crt';

interface TacticalOpticsOverlayProps {
  mode: TacticalOpticsMode;
  onModeChange: (mode: TacticalOpticsMode) => void;
  cursorCoords?: { lat: number; lng: number } | null;
}

export default function TacticalOpticsOverlay({
  mode,
  onModeChange,
  cursorCoords,
}: TacticalOpticsOverlayProps) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toISOString().slice(11, 19) + ' ZULU');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (mode === 'normal') return null;

  const modeConfig = {
    nvg: {
      label: 'NVG GEN-3 PHOSPHOR',
      color: '#00FF66',
      spectrum: '500-550 nm (P43)',
      filterClass: 'tactical-nvg',
      glowColor: 'rgba(0, 255, 102, 0.4)',
    },
    flir: {
      label: 'FLIR THERMAL INFRARED',
      color: '#00E5FF',
      spectrum: '8-14 µm (LWIR)',
      filterClass: 'tactical-flir',
      glowColor: 'rgba(0, 229, 255, 0.4)',
    },
    crt: {
      label: 'NORAD 1983 CRT VECTOR',
      color: '#FFB300',
      spectrum: '550 nm (P22 AMBER)',
      filterClass: 'tactical-crt',
      glowColor: 'rgba(255, 179, 0, 0.4)',
    },
  }[mode];

  return (
    <div className="fixed inset-0 pointer-events-none z-[190] overflow-hidden select-none">
      {/* ── SCANLINES & VIGNETTE OVERLAY ── */}
      <div className="absolute inset-0 tactical-scanlines opacity-75" />
      <div className="absolute inset-0 tactical-vignette opacity-90" />

      {/* ── TOP-LEFT TELEMETRY ── */}
      <div
        className="absolute top-4 left-4 font-mono text-[10px] tracking-widest space-y-0.5 bg-black/60 p-2.5 rounded-lg border backdrop-blur-sm"
        style={{ color: modeConfig.color, borderColor: `${modeConfig.color}40`, textShadow: `0 0 8px ${modeConfig.glowColor}` }}
      >
        <div className="flex items-center gap-1.5 font-bold">
          <Eye className="w-3.5 h-3.5 animate-pulse" />
          <span>{modeConfig.label}</span>
        </div>
        <div className="opacity-80">BAND: {modeConfig.spectrum}</div>
        <div className="opacity-80">GAIN: +18 dB (AGC AUTO)</div>
        <div className="opacity-80">FOV: WIDE TACTICAL · 60 FPS</div>
      </div>

      {/* ── TOP-RIGHT MILITARY CLOCK & BATTERY ── */}
      <div
        className="absolute top-4 right-20 font-mono text-[10px] tracking-widest text-right bg-black/60 p-2.5 rounded-lg border backdrop-blur-sm hidden md:block"
        style={{ color: modeConfig.color, borderColor: `${modeConfig.color}40`, textShadow: `0 0 8px ${modeConfig.glowColor}` }}
      >
        <div className="flex items-center justify-end gap-1.5 font-bold">
          <span>{timeStr}</span>
          <Activity className="w-3.5 h-3.5" />
        </div>
        <div className="opacity-80">SYS: SECURE-LINK-16</div>
        <div className="opacity-80">
          POS: {cursorCoords ? `${cursorCoords.lat.toFixed(4)}°, ${cursorCoords.lng.toFixed(4)}°` : 'TRACKING…'}
        </div>
      </div>

      {/* ── CENTER TACTICAL RETICLE ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="relative w-64 h-64 border rounded-full" style={{ borderColor: modeConfig.color }}>
          {/* Mil-dot ticks */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3" style={{ backgroundColor: modeConfig.color }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-3" style={{ backgroundColor: modeConfig.color }} />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-3" style={{ backgroundColor: modeConfig.color }} />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-3" style={{ backgroundColor: modeConfig.color }} />
          {/* Crosshair Center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border border-dashed rounded-full" style={{ borderColor: modeConfig.color }} />
          </div>
        </div>
      </div>

      {/* ── BOTTOM QUICK SWITCHER (POINTER EVENTS ENABLED) ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 p-1 rounded-xl bg-black/80 border backdrop-blur-xl shadow-2xl" style={{ borderColor: `${modeConfig.color}60` }}>
        {(['normal', 'nvg', 'flir', 'crt'] as TacticalOpticsMode[]).map((m) => {
          const isActive = mode === m;
          const label = m === 'normal' ? 'OFF' : m.toUpperCase();
          return (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold tracking-widest transition-all ${
                isActive
                  ? 'border shadow-[0_0_12px_currentColor]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: `${modeConfig.color}20`,
                      color: modeConfig.color,
                      borderColor: modeConfig.color,
                    }
                  : undefined
              }
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
