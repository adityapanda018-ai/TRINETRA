'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Radar, Compass, ArrowUpRight, Shield, Crosshair, RefreshCw, Layers, Sliders } from 'lucide-react';
import { calculateRadarHorizonKm, generateRadarDome, type RadarCoverageResult } from '@/lib/los';
import { tacticalAudio } from '@/lib/tactical-audio';

interface RadarDomeToolProps {
  mapCenter?: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number } | null;
  onDeployDome: (dome: RadarCoverageResult & { center: [number, number]; label: string; radarHeightM: number; targetAltitudeM: number }) => void;
  onClearDome: () => void;
  onClose: () => void;
  className?: string;
}

export default function RadarDomeTool({
  mapCenter = { lat: 13.032, lng: 80.177 },
  userLocation,
  onDeployDome,
  onClearDome,
  onClose,
  className = ''
}: RadarDomeToolProps) {
  const [selectedLocation, setSelectedLocation] = useState<[number, number]>([
    userLocation?.lng ?? mapCenter.lng,
    userLocation?.lat ?? mapCenter.lat
  ]);

  const [radarHeightM, setRadarHeightM] = useState<number>(30); // 30m tower
  const [targetAltitudeM, setTargetAltitudeM] = useState<number>(300); // 300m low altitude threat
  const [maxRangeKm, setMaxRangeKm] = useState<number>(350); // 350km radar hardware limit
  const [scanMode, setScanMode] = useState<'360' | 'sector'>('360');
  const [sectorHeading, setSectorHeading] = useState<number>(0);
  const [sectorSpan, setSectorSpan] = useState<number>(120);

  // Dynamic calculations
  const domeData = useMemo(() => {
    const azimuthStartDeg = scanMode === '360' ? 0 : (sectorHeading - sectorSpan / 2 + 360) % 360;
    const azimuthEndDeg = scanMode === '360' ? 360 : (sectorHeading + sectorSpan / 2);

    return generateRadarDome({
      center: selectedLocation,
      radarHeightM,
      targetAltitudeM,
      maxRangeKm,
      azimuthStartDeg,
      azimuthEndDeg
    });
  }, [selectedLocation, radarHeightM, targetAltitudeM, maxRangeKm, scanMode, sectorHeading, sectorSpan]);

  const handleDeploy = () => {
    tacticalAudio.playRadarSweep();
    onDeployDome({
      ...domeData,
      center: selectedLocation,
      label: `RADAR-SITE (${domeData.effectiveRangeKm} km LOS)`,
      radarHeightM,
      targetAltitudeM
    });
  };

  const handleClear = () => {
    tacticalAudio.playUiClick();
    onClearDome();
  };

  return (
    <div className={`flex flex-col bg-[#040912]/95 backdrop-blur-xl border border-[#00E5FF]/40 rounded-xl overflow-hidden font-mono shadow-2xl text-white select-none ${className}`}>
      {/* Header */}
      <div className="h-10 px-4 border-b border-[#00E5FF]/20 bg-[#02060C] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#00E5FF]/15 border border-[#00E5FF]/40">
            <Radar className="w-3.5 h-3.5 text-[#00E5FF] animate-spin" />
          </div>
          <span className="text-xs font-bold tracking-wider text-[#00E5FF]">RADAR HORIZON & LINE-OF-SIGHT DOME</span>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors text-xs cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Main Controls Body */}
      <div className="p-3.5 space-y-3.5 text-[11px] overflow-y-auto max-h-[480px]">
        {/* Origin Coordinates Picker */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/50 flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-[#00E5FF]" /> TRANSMITTER COORDINATES
            </span>
            <span className="text-[#00E5FF] font-bold">
              {selectedLocation[1].toFixed(4)}°N, {selectedLocation[0].toFixed(4)}°E
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                tacticalAudio.playUiClick();
                setSelectedLocation([mapCenter.lng, mapCenter.lat]);
              }}
              className="flex-1 py-1 px-2 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 text-[10px] transition-all cursor-pointer font-semibold"
            >
              MAP CENTER
            </button>
            {userLocation && (
              <button
                onClick={() => {
                  tacticalAudio.playUiClick();
                  setSelectedLocation([userLocation.lng, userLocation.lat]);
                }}
                className="flex-1 py-1 px-2 rounded border border-[#00E676]/30 bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676] text-[10px] transition-all cursor-pointer font-semibold"
              >
                USER GPS FIX
              </button>
            )}
          </div>
        </div>

        {/* Radar Mast Height Slider */}
        <div className="space-y-1.5 p-2.5 rounded-lg border border-white/[0.08] bg-black/40">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/60">TRANSMITTER ANTENNA HEIGHT:</span>
            <span className="text-[#00E5FF] font-bold text-xs">{radarHeightM >= 1000 ? `${(radarHeightM / 1000).toFixed(1)} km` : `${radarHeightM} m`} MSL</span>
          </div>
          <input
            type="range"
            min="5"
            max="10000"
            step="5"
            value={radarHeightM}
            onChange={(e) => setRadarHeightM(Number(e.target.value))}
            className="w-full accent-[#00E5FF] cursor-pointer"
          />
          <div className="flex gap-1.5 pt-1">
            {[
              { label: 'TOWER (25m)', val: 25 },
              { label: 'HILL (300m)', val: 300 },
              { label: 'MOUNTAIN (1500m)', val: 1500 },
              { label: 'AWACS (9000m)', val: 9000 },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => { tacticalAudio.playUiClick(); setRadarHeightM(preset.val); }}
                className={`flex-1 py-0.5 text-[8px] rounded border transition-all cursor-pointer ${
                  radarHeightM === preset.val
                    ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/20 font-bold'
                    : 'border-white/10 text-white/50 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Threat Altitude Slider */}
        <div className="space-y-1.5 p-2.5 rounded-lg border border-white/[0.08] bg-black/40">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/60">TARGET THREAT ALTITUDE:</span>
            <span className="text-[#FF9100] font-bold text-xs">{targetAltitudeM >= 1000 ? `${(targetAltitudeM / 1000).toFixed(1)} km` : `${targetAltitudeM} m`} AGL</span>
          </div>
          <input
            type="range"
            min="10"
            max="15000"
            step="10"
            value={targetAltitudeM}
            onChange={(e) => setTargetAltitudeM(Number(e.target.value))}
            className="w-full accent-[#FF9100] cursor-pointer"
          />
          <div className="flex gap-1.5 pt-1">
            {[
              { label: 'CRUISE (30m)', val: 30 },
              { label: 'HELO (250m)', val: 250 },
              { label: 'TRANSPORT (3km)', val: 3000 },
              { label: 'FIGHTER (10km)', val: 10000 },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => { tacticalAudio.playUiClick(); setTargetAltitudeM(preset.val); }}
                className={`flex-1 py-0.5 text-[8px] rounded border transition-all cursor-pointer ${
                  targetAltitudeM === preset.val
                    ? 'border-[#FF9100] text-[#FF9100] bg-[#FF9100]/20 font-bold'
                    : 'border-white/10 text-white/50 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scan Pattern: 360 vs Sector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/60">COVERAGE PATTERN:</span>
            <div className="flex rounded border border-white/10 overflow-hidden">
              <button
                onClick={() => { tacticalAudio.playUiClick(); setScanMode('360'); }}
                className={`px-2 py-0.5 text-[9px] font-bold cursor-pointer transition-all ${
                  scanMode === '360' ? 'bg-[#00E5FF] text-black' : 'text-white/50 hover:text-white'
                }`}
              >
                360° DOME
              </button>
              <button
                onClick={() => { tacticalAudio.playUiClick(); setScanMode('sector'); }}
                className={`px-2 py-0.5 text-[9px] font-bold cursor-pointer transition-all ${
                  scanMode === 'sector' ? 'bg-[#00E5FF] text-black' : 'text-white/50 hover:text-white'
                }`}
              >
                SECTOR SCAN
              </button>
            </div>
          </div>

          {scanMode === 'sector' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[9px] text-white/40">BEARING: {sectorHeading}°</span>
                <input
                  type="range"
                  min="0"
                  max="355"
                  step="5"
                  value={sectorHeading}
                  onChange={(e) => setSectorHeading(Number(e.target.value))}
                  className="w-full accent-[#00E5FF] cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[9px] text-white/40">ARC: {sectorSpan}°</span>
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="10"
                  value={sectorSpan}
                  onChange={(e) => setSectorSpan(Number(e.target.value))}
                  className="w-full accent-[#00E5FF] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 rounded bg-black/60 border border-[#00E5FF]/30">
            <span className="text-[9px] text-white/40 block">RADAR HORIZON</span>
            <span className="text-sm font-bold text-[#00E5FF]">{domeData.effectiveRangeKm} km</span>
            <span className="text-[9px] text-white/30 block">({(domeData.effectiveRangeKm * 0.539957).toFixed(1)} NM)</span>
          </div>
          <div className="p-2 rounded bg-black/60 border border-[#00E676]/30">
            <span className="text-[9px] text-white/40 block">COVERAGE AREA</span>
            <span className="text-sm font-bold text-[#00E676]">{domeData.coverageAreaKm2.toLocaleString()} km²</span>
            <span className="text-[9px] text-white/30 block">Blind Cone: {domeData.blindZoneRadiusKm} km</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex gap-2">
          <button
            onClick={handleDeploy}
            className="flex-1 py-2 rounded-lg bg-[#00E5FF]/15 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/50 text-[#00E5FF] font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.15)]"
          >
            <Radar className="w-3.5 h-3.5" /> DEPLOY RADAR DOME
          </button>
          <button
            onClick={handleClear}
            className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs tracking-wider transition-all cursor-pointer font-semibold"
          >
            CLEAR
          </button>
        </div>
      </div>
    </div>
  );
}
