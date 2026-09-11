'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, AlertCircle, ShieldAlert, Crosshair, Volume2, VolumeX, Play, Square, ExternalLink, MapPin, Activity, Wifi } from 'lucide-react';
import { tacticalAudio } from '@/lib/tactical-audio';
import type { SigintIntercept, RadioStream, StrategicInstallation } from '@/app/api/sigint/route';

interface SigintPanelProps {
  onClose?: () => void;
  onFlyTo?: (coords: { lat: number; lng: number; zoom?: number }) => void;
  className?: string;
}

export default function SigintPanel({ onClose, onFlyTo, className = '' }: SigintPanelProps) {
  const [activeTab, setActiveTab] = useState<'intercepts' | 'radio' | 'installations'>('intercepts');
  const [loading, setLoading] = useState(true);
  const [intercepts, setIntercepts] = useState<SigintIntercept[]>([]);
  const [radioStreams, setRadioStreams] = useState<RadioStream[]>([]);
  const [installations, setInstallations] = useState<StrategicInstallation[]>([]);
  
  // Radio playback & visualizer state
  const [activeStream, setActiveStream] = useState<RadioStream | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/sigint')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setIntercepts(data.intercepts || []);
          setRadioStreams(data.radioStreams || []);
          setInstallations(data.installations || []);
          if (data.radioStreams?.length > 0) {
            setActiveStream(data.radioStreams[0]);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Synthetic frequency audio visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 32;
      const barWidth = canvas.width / bars - 1;

      for (let i = 0; i < bars; i++) {
        const h = isPlaying
          ? Math.max(3, (Math.sin(Date.now() / 150 + i * 0.4) * 0.5 + 0.5) * (canvas.height * 0.85) * (0.3 + Math.random() * 0.7))
          : 2;
        const x = i * (barWidth + 1);
        const y = canvas.height - h;

        ctx.fillStyle = isPlaying
          ? (i > 24 ? '#FF3D57' : i > 16 ? '#FFD600' : '#00E5FF')
          : 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, barWidth, h);
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  const togglePlayback = (stream: RadioStream) => {
    if (activeStream?.id === stream.id && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      tacticalAudio.playRadioSquelch();
    } else {
      setActiveStream(stream);
      setIsPlaying(true);
      tacticalAudio.playRadioSquelch();
      if (audioRef.current) {
        audioRef.current.src = stream.streamUrl;
        audioRef.current.play().catch(() => {
          // Stream error handling
        });
      }
    }
  };

  const handleTargetLock = (lat: number, lng: number, zoom = 9) => {
    tacticalAudio.playTargetLock();
    if (onFlyTo) {
      onFlyTo({ lat, lng, zoom });
    }
  };

  return (
    <div className={`flex flex-col bg-[#050B14]/95 backdrop-blur-xl border border-[#00E5FF]/30 rounded-xl overflow-hidden font-mono shadow-2xl text-white select-none ${className}`}>
      {/* Hidden audio element for LiveATC stream playback */}
      <audio ref={audioRef} preload="none" />

      {/* Header */}
      <div className="h-11 px-4 border-b border-[#00E5FF]/20 bg-[#02060C] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/30">
            <Radio className="w-4 h-4 text-[#00E5FF] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-[#00E5FF]">SIGINT / OSINT MONITOR</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676] font-bold">LIVE RF</span>
            </div>
            <span className="text-[9px] text-white/40 tracking-wider">ELECTRONIC WARFARE & SIGNALS INTERCEPT</span>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/[0.08] bg-black/40 text-[10px]">
        <button
          onClick={() => { setActiveTab('intercepts'); tacticalAudio.playUiClick(); }}
          className={`flex-1 py-2 px-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'intercepts'
              ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10 font-bold'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <Activity className="w-3 h-3" />
          <span>INTERCEPTS ({intercepts.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('radio'); tacticalAudio.playUiClick(); }}
          className={`flex-1 py-2 px-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'radio'
              ? 'border-[#FF9100] text-[#FF9100] bg-[#FF9100]/10 font-bold'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <Wifi className="w-3 h-3" />
          <span>ATC & RADIO ({radioStreams.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('installations'); tacticalAudio.playUiClick(); }}
          className={`flex-1 py-2 px-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'installations'
              ? 'border-[#00E676] text-[#00E676] bg-[#00E676]/10 font-bold'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          <span>STRATEGIC BASES ({installations.length})</span>
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 max-h-[420px] text-[11px]">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-white/40 gap-2">
            <Radio className="w-6 h-6 text-[#00E5FF] animate-spin" />
            <span className="text-[10px] tracking-widest">SCANNING RF SPECTRUM...</span>
          </div>
        ) : activeTab === 'intercepts' ? (
          /* ── TAB 1: INTERCEPTS ── */
          <div className="space-y-2">
            {intercepts.map(item => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg border border-white/[0.08] bg-black/50 hover:border-[#00E5FF]/40 transition-all group"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      item.urgency === 'CRITICAL'
                        ? 'bg-[#FF3D57]/20 border border-[#FF3D57]/40 text-[#FF3D57]'
                        : item.urgency === 'HIGH'
                        ? 'bg-[#FF9100]/20 border border-[#FF9100]/40 text-[#FF9100]'
                        : 'bg-[#00E5FF]/20 border border-[#00E5FF]/40 text-[#00E5FF]'
                    }`}>
                      {item.urgency}
                    </span>
                    <span className="text-[9px] text-white/40 font-semibold">{item.category}</span>
                  </div>

                  <span className="text-[9px] text-white/30">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>

                <div className="font-bold text-white/95 text-[11px] mb-1 group-hover:text-[#00E5FF] transition-colors">
                  {item.title}
                </div>

                <div className="text-[10px] text-white/60 mb-2 leading-relaxed">
                  {item.summary}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px]">
                  <span className="text-white/40 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 text-[#00E5FF]" />
                    {item.frequency || item.source}
                  </span>

                  <button
                    onClick={() => handleTargetLock(item.lat, item.lng)}
                    className="px-2 py-0.5 rounded bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF] flex items-center gap-1 transition-all cursor-pointer font-bold tracking-wider"
                  >
                    <Crosshair className="w-2.5 h-2.5" /> TARGET LOCK
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'radio' ? (
          /* ── TAB 2: RADIO & ATC ── */
          <div className="space-y-3">
            {/* Audio Spectrum Visualizer */}
            <div className="p-3 rounded-lg border border-[#FF9100]/30 bg-black/60">
              <div className="flex items-center justify-between text-[10px] mb-2">
                <span className="text-white/50 flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-[#FF9100]" />
                  RF SPECTRUM ANALYZER
                </span>
                <span className="text-[#FF9100] font-bold">
                  {activeStream ? activeStream.frequency : 'STANDBY'}
                </span>
              </div>
              <canvas
                ref={canvasRef}
                width={300}
                height={50}
                className="w-full h-12 bg-black/80 rounded border border-white/5"
              />
              <div className="mt-2 flex items-center justify-between text-[9px] text-white/40">
                <span>TUNER: {activeStream?.name || 'No Feed'}</span>
                <span className={isPlaying ? 'text-[#00E676] animate-pulse font-bold' : 'text-white/30'}>
                  {isPlaying ? '● LIVE CARRIER' : '○ MUTED'}
                </span>
              </div>
            </div>

            {/* Radio Station List */}
            <div className="space-y-1.5">
              {radioStreams.map(stream => {
                const isCurrent = activeStream?.id === stream.id;
                const active = isCurrent && isPlaying;

                return (
                  <div
                    key={stream.id}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                      active
                        ? 'border-[#FF9100]/60 bg-[#FF9100]/10'
                        : 'border-white/[0.08] bg-black/40 hover:border-white/20'
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-white/80 font-bold">
                          {stream.type}
                        </span>
                        <span className="font-bold text-[11px] text-white/90 truncate">{stream.name}</span>
                      </div>
                      <div className="text-[9px] text-white/40 flex items-center gap-2">
                        <span>{stream.location}</span>
                        <span>•</span>
                        <span className="text-[#00E5FF]">{stream.frequency}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => togglePlayback(stream)}
                      className={`p-2 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                        active
                          ? 'bg-[#FF3D57]/20 border-[#FF3D57]/50 text-[#FF3D57]'
                          : 'bg-[#FF9100]/20 border-[#FF9100]/50 text-[#FF9100] hover:bg-[#FF9100]/30'
                      }`}
                    >
                      {active ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── TAB 3: STRATEGIC BASES ── */
          <div className="space-y-2">
            {installations.map(base => (
              <div
                key={base.id}
                className="p-2.5 rounded-lg border border-white/[0.08] bg-black/50 hover:border-[#00E676]/40 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white/90 text-[11px]">{base.name}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                    base.status === 'DEFCON 3'
                      ? 'bg-[#FF3D57]/20 border border-[#FF3D57]/40 text-[#FF3D57]'
                      : 'bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676]'
                  }`}>
                    {base.status}
                  </span>
                </div>

                <div className="text-[9px] text-white/50 mb-1.5 flex items-center gap-2">
                  <span>{base.country}</span>
                  <span>•</span>
                  <span>Elev: {base.elevation}</span>
                </div>

                <div className="text-[10px] text-white/60 mb-2 leading-relaxed">
                  {base.description}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px]">
                  <span className="text-white/40 truncate max-w-[180px]">
                    Freq: {base.frequencies[0]}
                  </span>

                  <button
                    onClick={() => handleTargetLock(base.coordinates[0], base.coordinates[1], 11)}
                    className="px-2 py-0.5 rounded bg-[#00E676]/10 hover:bg-[#00E676]/20 border border-[#00E676]/30 text-[#00E676] flex items-center gap-1 transition-all cursor-pointer font-bold tracking-wider"
                  >
                    <MapPin className="w-2.5 h-2.5" /> FLY TO BASE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
