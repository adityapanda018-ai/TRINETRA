'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Radar, Crosshair, Plane, Satellite, Activity,
  Flame, Camera, Volume2, VolumeX, Eye, Radio, Compass,
  ChevronRight, AlertTriangle, ExternalLink, X, RefreshCw
} from 'lucide-react';
import { haversine, bearing, circleToRing, type LngLat } from '@/lib/geo';

interface PerimeterSentryProps {
  userLocation?: { lat: number; lng: number; accuracy?: number; heading?: number | null } | null;
  data: any;
  onLocate: (lat: number, lng: number, zoom?: number) => void;
  onSelectCamera?: (camera: any) => void;
  onClose?: () => void;
}

// Synthesize an authentic tactical radar/sonar ping using Web Audio API
function playSonarPing(frequency = 880, duration = 0.25) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.4, ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

// Cardinal direction string from bearing degrees
function getCardinal(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return directions[index];
}

export default function PerimeterSentry({
  userLocation,
  data,
  onLocate,
  onSelectCamera,
  onClose,
}: PerimeterSentryProps) {
  const [activeTab, setActiveTab] = useState<'air' | 'space' | 'hazards' | 'cctv'>('air');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [rangeKm, setRangeKm] = useState<number>(75);
  const [extraSats, setExtraSats] = useState<any[]>([]);

  // Default coordinate if userLocation is null (e.g. Center of active viewport or fallback)
  const center: LngLat = useMemo(() => {
    if (userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
      return [userLocation.lng, userLocation.lat];
    }
    return [0, 20];
  }, [userLocation]);

  const hasLocation = Boolean(userLocation && Number.isFinite(userLocation.lat));

  // If satellites aren't pre-loaded in `data`, fetch a sample from /api/satellites
  useEffect(() => {
    if (!data?.satellites || data.satellites.length === 0) {
      fetch('/api/satellites')
        .then(r => r.ok ? r.json() : null)
        .then(res => {
          if (res?.satellites) setExtraSats(res.satellites);
        })
        .catch(() => {});
    }
  }, [data?.satellites]);

  // ── 1. PROXIMITY FLIGHTS ──
  const nearbyFlights = useMemo(() => {
    if (!hasLocation) return [];
    const allFlights = [
      ...(data?.commercial_flights || []),
      ...(data?.private_flights || []),
      ...(data?.private_jets || []),
      ...(data?.military_flights || []),
    ];

    const results: Array<{
      flight: any;
      distKm: number;
      bearingDeg: number;
      cardinal: string;
      incursion: 'defense' | 'advisory' | 'horizon';
    }> = [];

    for (const f of allFlights) {
      if (!Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
      const dist = haversine(center, [f.lng, f.lat]);
      if (dist <= rangeKm) {
        const b = bearing(center, [f.lng, f.lat]);
        results.push({
          flight: f,
          distKm: dist,
          bearingDeg: Math.round(b),
          cardinal: getCardinal(b),
          incursion: dist <= 5 ? 'defense' : dist <= 25 ? 'advisory' : 'horizon',
        });
      }
    }

    return results.sort((a, b) => a.distKm - b.distKm);
  }, [center, hasLocation, data, rangeKm]);

  // ── 2. SKY SENTINEL (OVERHEAD SATELLITES) ──
  const overheadSats = useMemo(() => {
    if (!hasLocation) return [];
    const pool = data?.satellites?.length ? data.satellites : extraSats;
    const results: Array<{
      sat: any;
      distKm: number;
      bearingDeg: number;
      cardinal: string;
      elevationDeg: number;
    }> = [];

    for (const s of pool) {
      const lat = s.lat ?? s.latitude;
      const lng = s.lng ?? s.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const groundDist = haversine(center, [lng, lat]);
      const altKm = s.alt ?? s.altitude ?? 550;

      // Line of sight horizon limit ~ sqrt(2 * R * h)
      if (groundDist < 1600) {
        const b = bearing(center, [lng, lat]);
        // Approximate geometric elevation angle
        const elev = Math.atan2(altKm, Math.max(groundDist, 1)) * (180 / Math.PI);
        if (elev >= 10) {
          results.push({
            sat: s,
            distKm: groundDist,
            bearingDeg: Math.round(b),
            cardinal: getCardinal(b),
            elevationDeg: Math.round(elev),
          });
        }
      }
    }

    return results.sort((a, b) => b.elevationDeg - a.elevationDeg).slice(0, 15);
  }, [center, hasLocation, data?.satellites, extraSats]);

  // ── 3. GROUND HAZARDS (EARTHQUAKES & FIRES) ──
  const nearbyHazards = useMemo(() => {
    if (!hasLocation) return { earthquakes: [], fires: [] };

    const earthquakes = (data?.earthquakes || [])
      .map((eq: any) => {
        const dist = haversine(center, [eq.lng, eq.lat]);
        const b = bearing(center, [eq.lng, eq.lat]);
        return { ...eq, distKm: dist, bearingDeg: Math.round(b), cardinal: getCardinal(b) };
      })
      .filter((eq: any) => eq.distKm <= 350)
      .sort((a: any, b: any) => a.distKm - b.distKm)
      .slice(0, 10);

    const fires = (data?.fires || [])
      .map((f: any) => {
        const dist = haversine(center, [f.lng, f.lat]);
        const b = bearing(center, [f.lng, f.lat]);
        return { ...f, distKm: dist, bearingDeg: Math.round(b), cardinal: getCardinal(b) };
      })
      .filter((f: any) => f.distKm <= 100)
      .sort((a: any, b: any) => a.distKm - b.distKm)
      .slice(0, 10);

    return { earthquakes, fires };
  }, [center, hasLocation, data?.earthquakes, data?.fires]);

  // ── 4. NEAREST CCTV SURVEILLANCE ──
  const nearbyCctv = useMemo(() => {
    if (!hasLocation || !data?.cctv) return [];
    return (data.cctv as any[])
      .map((cam) => {
        const dist = haversine(center, [cam.lng, cam.lat]);
        const b = bearing(center, [cam.lng, cam.lat]);
        return { ...cam, distKm: dist, bearingDeg: Math.round(b), cardinal: getCardinal(b) };
      })
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 8);
  }, [center, hasLocation, data?.cctv]);

  // Sound alert when incursions breach point defense (5 km)
  const prevBreachRef = useRef(0);
  useEffect(() => {
    if (!soundEnabled) return;
    const immediateBreaches = nearbyFlights.filter(f => f.incursion === 'defense').length;
    if (immediateBreaches > prevBreachRef.current) {
      playSonarPing(1200, 0.4);
    }
    prevBreachRef.current = immediateBreaches;
  }, [nearbyFlights, soundEnabled]);

  // Overall Threat Level Status
  const threatLevel = useMemo(() => {
    const hasImmediate = nearbyFlights.some(f => f.incursion === 'defense') || nearbyHazards.fires.some((f: any) => f.distKm < 15);
    const hasAdvisory = nearbyFlights.some(f => f.incursion === 'advisory') || nearbyHazards.earthquakes.some((eq: any) => eq.distKm < 100 && eq.magnitude >= 4.5);

    if (hasImmediate) return { code: 'DEFCON 2', label: 'ELEVATED INTRUSION', color: '#FF3D3D' };
    if (hasAdvisory) return { code: 'DEFCON 3', label: 'TACTICAL ADVISORY', color: '#FFD700' };
    return { code: 'DEFCON 4', label: 'PERIMETER SECURE', color: '#00E676' };
  }, [nearbyFlights, nearbyHazards]);

  return (
    <div className="glass-panel flex flex-col overflow-hidden pointer-events-auto shadow-2xl border border-[var(--border-primary)] rounded-xl bg-[#080a14]/95 backdrop-blur-2xl max-h-[85vh]">
      {/* ── HEADER ── */}
      <div className="px-4 py-3 border-b border-[var(--border-secondary)] flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <Radar className="w-5 h-5 text-[#00E676] animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#00E676] animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[12px] tracking-widest text-[var(--text-primary)]">
                360° SENTRY RADAR
              </span>
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border"
                style={{ color: threatLevel.color, borderColor: `${threatLevel.color}40`, backgroundColor: `${threatLevel.color}15` }}
              >
                {threatLevel.code}
              </span>
            </div>
            <div className="text-[9px] font-mono text-[var(--text-muted)] truncate">
              {hasLocation ? `${center[1].toFixed(4)}°, ${center[0].toFixed(4)}° · ${threatLevel.label}` : 'GPS OFFLINE — ACTIVATE SELF TRACK'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playSonarPing(880, 0.2);
            }}
            className={`p-1.5 rounded hover:bg-white/10 transition-colors ${soundEnabled ? 'text-[#00E676]' : 'text-[var(--text-muted)]'}`}
            title={soundEnabled ? 'Mute Sonar Pings' : 'Enable Sonar Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── TACTICAL RADAR SWEEP DISPLAY ── */}
      <div className="p-3 bg-black/60 border-b border-[var(--border-secondary)] flex flex-col items-center">
        <div className="relative w-44 h-44 rounded-full border border-[#00E676]/30 flex items-center justify-center overflow-hidden bg-[#001408]/60 shadow-[inset_0_0_25px_rgba(0,230,118,0.15)]">
          {/* Compass labels */}
          <span className="absolute top-1 text-[8px] font-mono text-[#00E676]/70 font-bold">N</span>
          <span className="absolute bottom-1 text-[8px] font-mono text-[#00E676]/70 font-bold">S</span>
          <span className="absolute left-1 text-[8px] font-mono text-[#00E676]/70 font-bold">W</span>
          <span className="absolute right-1 text-[8px] font-mono text-[#00E676]/70 font-bold">E</span>

          {/* Range rings */}
          <div className="absolute w-32 h-32 rounded-full border border-dashed border-[#00E676]/20" />
          <div className="absolute w-16 h-16 rounded-full border border-dashed border-[#FFD700]/30" />
          <div className="absolute w-6 h-6 rounded-full border border-[#FF3D3D]/50" />

          {/* Crosshairs */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-px bg-[#00E676]/20" />
            <div className="h-full w-px bg-[#00E676]/20 absolute" />
          </div>

          {/* Rotating Radar Sweep Needle */}
          <div className="absolute inset-0 pointer-events-none animate-radar-sweep">
            <div
              className="w-1/2 h-1/2 origin-bottom-right"
              style={{
                background: 'conic-gradient(from 0deg, rgba(0, 230, 118, 0.35) 0deg, rgba(0, 230, 118, 0) 60deg)',
              }}
            />
          </div>

          {/* Center User Blip */}
          <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF] z-10" />

          {/* Render Aircraft & Satellite Blips on the Radar */}
          {nearbyFlights.slice(0, 10).map((f, i) => {
            const normalizedDist = (f.distKm / rangeKm) * 75; // max radius ~75px
            const rad = (f.bearingDeg - 90) * (Math.PI / 180);
            const x = Math.cos(rad) * normalizedDist;
            const y = Math.sin(rad) * normalizedDist;
            const isRed = f.incursion === 'defense';
            return (
              <button
                key={`flight-${i}`}
                onClick={() => onLocate(f.flight.lat, f.flight.lng, 13)}
                className="absolute z-20 group hover:scale-150 transition-transform"
                style={{ transform: `translate(${x}px, ${y}px)` }}
                title={`${f.flight.callsign || 'FLIGHT'} (${f.distKm.toFixed(1)} km, ${f.flight.alt || 0} ft)`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${isRed ? 'bg-[#FF3D3D] shadow-[0_0_8px_#FF3D3D] animate-ping' : 'bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]'}`}
                />
              </button>
            );
          })}
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[9px] font-mono text-[var(--text-muted)]">RANGE:</span>
          {[25, 50, 75, 150].map((km) => (
            <button
              key={km}
              onClick={() => setRangeKm(km)}
              className={`px-2 py-0.5 rounded text-[9px] font-mono transition-colors ${
                rangeKm === km
                  ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 font-bold'
                  : 'text-[var(--text-muted)] hover:bg-white/5 border border-transparent'
              }`}
            >
              {km} KM
            </button>
          ))}
        </div>
      </div>

      {/* ── SENSORS TAB BAR ── */}
      <div className="grid grid-cols-4 border-b border-[var(--border-secondary)] bg-black/30">
        {[
          { id: 'air', label: 'AIRSPACE', icon: Plane, count: nearbyFlights.length, color: '#00E5FF' },
          { id: 'space', label: 'SKY ORBIT', icon: Satellite, count: overheadSats.length, color: '#E040FB' },
          { id: 'hazards', label: 'HAZARDS', icon: Flame, count: nearbyHazards.earthquakes.length + nearbyHazards.fires.length, color: '#FF9500' },
          { id: 'cctv', label: 'CCTV', icon: Camera, count: nearbyCctv.length, color: '#00E676' },
        ].map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-2 px-1 flex flex-col items-center gap-1 transition-all border-b-2 ${
                active
                  ? 'border-current bg-white/[0.04]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.02]'
              }`}
              style={{ color: active ? t.color : undefined }}
            >
              <div className="flex items-center gap-1">
                <t.icon className="w-3.5 h-3.5" />
                <span className="text-[9px] font-mono font-bold tracking-wider">{t.count}</span>
              </div>
              <span className="text-[8px] font-mono tracking-widest uppercase">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── CONTENT FEED ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 styled-scrollbar min-h-[180px] max-h-[320px]">
        {/* TAB 1: AIRSPACE */}
        {activeTab === 'air' && (
          <div className="space-y-1.5">
            {nearbyFlights.length === 0 ? (
              <div className="text-center py-6 text-[10px] font-mono text-[var(--text-muted)]">
                No aircraft detected within {rangeKm} km perimeter.
              </div>
            ) : (
              nearbyFlights.map(({ flight, distKm, bearingDeg, cardinal, incursion }, idx) => (
                <div
                  key={idx}
                  onClick={() => onLocate(flight.lat, flight.lng, 13)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 hover:bg-white/[0.04] ${
                    incursion === 'defense'
                      ? 'border-red-500/40 bg-red-500/10'
                      : incursion === 'advisory'
                      ? 'border-yellow-500/30 bg-yellow-500/5'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Plane className={`w-4 h-4 flex-shrink-0 ${incursion === 'defense' ? 'text-red-400' : 'text-[#00E5FF]'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] truncate">
                          {flight.callsign || flight.icao24 || 'UNKNOWN'}
                        </span>
                        {incursion === 'defense' && (
                          <span className="text-[8px] font-mono font-bold px-1 rounded bg-red-500/30 text-red-300">
                            POINT DEFENSE
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono text-[var(--text-muted)]">
                        ALT: {flight.alt ? `${flight.alt.toLocaleString()} FT` : 'GND'} · SPD: {flight.speed ? `${Math.round(flight.speed)} KTS` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-[11px] font-mono font-bold text-[#00E676]">{distKm.toFixed(1)} KM</div>
                    <div className="text-[9px] font-mono text-[var(--text-muted)]">
                      {bearingDeg}° {cardinal}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: SKY SENTINEL (SATELLITES OVERHEAD) */}
        {activeTab === 'space' && (
          <div className="space-y-1.5">
            {overheadSats.length === 0 ? (
              <div className="text-center py-6 text-[10px] font-mono text-[var(--text-muted)]">
                Scanning orbital horizon... No satellites currently with elevation &gt; 10°.
              </div>
            ) : (
              overheadSats.map(({ sat, distKm, bearingDeg, cardinal, elevationDeg }, idx) => (
                <div
                  key={idx}
                  onClick={() => onLocate(sat.lat ?? sat.latitude, sat.lng ?? sat.longitude, 6)}
                  className="p-2 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Satellite className="w-4 h-4 text-[#E040FB] flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] truncate block">
                        {sat.name || sat.norad_id || 'SATELLITE'}
                      </span>
                      <span className="text-[9px] font-mono text-purple-300">
                        ELEV: {elevationDeg}° HIGH OVERHEAD
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-[11px] font-mono font-bold text-[#E040FB]">{distKm.toFixed(0)} KM</div>
                    <div className="text-[9px] font-mono text-[var(--text-muted)]">
                      AZ: {bearingDeg}° {cardinal}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: HAZARDS (EARTHQUAKES & FIRES) */}
        {activeTab === 'hazards' && (
          <div className="space-y-2">
            <div>
              <div className="text-[9px] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-orange-400" /> SEISMIC ACTIVITY (350 KM)
              </div>
              {nearbyHazards.earthquakes.length === 0 ? (
                <div className="text-[10px] font-mono text-[var(--text-muted)] p-2">No seismic tremors detected in range.</div>
              ) : (
                nearbyHazards.earthquakes.map((eq: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => onLocate(eq.lat, eq.lng, 9)}
                    className="p-2 mb-1 rounded border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[10px] font-mono font-bold text-orange-400">M{eq.magnitude} · {eq.place || 'Unknown'}</div>
                      <div className="text-[9px] font-mono text-[var(--text-muted)]">DEPTH: {eq.depth} KM</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-orange-300 font-bold">{eq.distKm.toFixed(0)} KM</div>
                      <div className="text-[9px] font-mono text-[var(--text-muted)]">{eq.bearingDeg}° {eq.cardinal}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {nearbyHazards.fires.length > 0 && (
              <div>
                <div className="text-[9px] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-500" /> THERMAL HOTSPOTS (100 KM)
                </div>
                {nearbyHazards.fires.map((f: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => onLocate(f.lat, f.lng, 12)}
                    className="p-1.5 mb-1 rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 cursor-pointer flex items-center justify-between"
                  >
                    <span className="text-[10px] font-mono text-red-400">HOTSPOT ({f.frp ? `${f.frp} MW` : 'FIRMS'})</span>
                    <span className="text-[10px] font-mono text-red-300">{f.distKm.toFixed(1)} KM · {f.cardinal}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: NEAREST CCTV SURVEILLANCE */}
        {activeTab === 'cctv' && (
          <div className="space-y-1.5">
            {nearbyCctv.length === 0 ? (
              <div className="text-center py-6 text-[10px] font-mono text-[var(--text-muted)]">
                No public CCTV streams indexed near this location.
              </div>
            ) : (
              nearbyCctv.map((cam, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg border border-[#00E676]/20 bg-[#00E676]/5 hover:bg-[#00E676]/10 transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#00E676] flex-shrink-0" />
                      <span className="text-[10px] font-mono font-bold text-[var(--text-primary)] truncate">
                        {cam.name || cam.title || cam.id || 'CCTV UNIT'}
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-[var(--text-muted)] truncate">
                      {cam.road || cam.city || 'TRAFFIC FEED'} · {cam.distKm.toFixed(1)} KM {cam.cardinal}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onSelectCamera && (
                      <button
                        onClick={() => onSelectCamera(cam)}
                        className="px-2 py-1 rounded bg-[#00E676]/20 hover:bg-[#00E676]/30 text-[#00E676] text-[9px] font-mono font-bold transition-colors"
                      >
                        FEED
                      </button>
                    )}
                    <button
                      onClick={() => onLocate(cam.lat, cam.lng, 16)}
                      className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white"
                      title="Fly to Camera"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div className="px-3 py-2 border-t border-[var(--border-secondary)] bg-black/40 flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-ping" />
          ACTIVE DEFENSE RADAR
        </span>
        <button
          onClick={() => hasLocation && onLocate(center[1], center[0], 14)}
          disabled={!hasLocation}
          className="text-[#00E676] hover:underline font-bold disabled:opacity-30"
        >
          CENTER PERIMETER
        </button>
      </div>
    </div>
  );
}
