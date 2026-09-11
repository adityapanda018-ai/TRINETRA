/**
 * TRINETRA — Line-of-Sight (LOS) & Radar Horizon Engine
 *
 * Implements standard radar line-of-sight propagation accounting for atmospheric
 * 4/3 effective earth radius refraction. Computes radar horizons, instrumented
 * cutoff ranges, blind zones, and generates GeoJSON polygon dome geometries.
 */

import { destination, haversine, EARTH_RADIUS_KM, type LngLat } from './geo';

export interface RadarConfig {
  center: LngLat; // [lng, lat]
  radarHeightM: number; // Height of radar antenna above ground in meters (e.g. 30m tower, 9000m AWACS)
  targetAltitudeM: number; // Target flight altitude in meters (e.g. 50m cruise missile, 10000m fighter)
  maxRangeKm?: number; // Instrumented maximum range limit of radar hardware (km)
  azimuthStartDeg?: number; // Starting azimuth (0 = North, default 0)
  azimuthEndDeg?: number; // Ending azimuth (default 360)
  steps?: number; // Number of vertex points along the circumference
}

export interface RadarCoverageResult {
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  radarHorizonKm: number;
  targetHorizonKm: number;
  totalLosRangeKm: number;
  effectiveRangeKm: number;
  blindZoneRadiusKm: number; // Cone of silence directly overhead (based on typical 60° max antenna elevation)
  coverageAreaKm2: number;
}

/**
 * Calculates standard radar line-of-sight horizon distance in kilometers
 * using 4/3 effective earth radius model for atmospheric refraction:
 * d ≈ 4.124 * (sqrt(h_radar) + sqrt(h_target))
 */
export function calculateRadarHorizonKm(hRadarMeters: number, hTargetMeters: number): {
  radarHorizonKm: number;
  targetHorizonKm: number;
  totalRangeKm: number;
} {
  const hr = Math.max(0, hRadarMeters);
  const ht = Math.max(0, hTargetMeters);
  const radarHorizonKm = 4.124 * Math.sqrt(hr);
  const targetHorizonKm = 4.124 * Math.sqrt(ht);
  const totalRangeKm = radarHorizonKm + targetHorizonKm;

  return {
    radarHorizonKm: Number(radarHorizonKm.toFixed(1)),
    targetHorizonKm: Number(targetHorizonKm.toFixed(1)),
    totalRangeKm: Number(totalRangeKm.toFixed(1)),
  };
}

/**
 * Computes radar coverage polygon and area for a given radar station and target altitude
 */
export function generateRadarDome(config: RadarConfig): RadarCoverageResult {
  const {
    center,
    radarHeightM,
    targetAltitudeM,
    maxRangeKm = 350,
    azimuthStartDeg = 0,
    azimuthEndDeg = 360,
    steps = 72
  } = config;

  const { radarHorizonKm, targetHorizonKm, totalRangeKm } = calculateRadarHorizonKm(radarHeightM, targetAltitudeM);
  const effectiveRangeKm = Math.min(totalRangeKm, maxRangeKm);

  // Blind zone directly above radar: cone of silence (typically > 60° antenna elevation limit)
  // r_blind = (h_target - h_radar) / tan(60°)
  const deltaAltKm = Math.max(0, targetAltitudeM - radarHeightM) / 1000;
  const blindZoneRadiusKm = Number((deltaAltKm / Math.tan((60 * Math.PI) / 180)).toFixed(2));

  const isFullCircle = Math.abs(azimuthEndDeg - azimuthStartDeg) >= 360;
  const ring: [number, number][] = [];

  const span = azimuthEndDeg - azimuthStartDeg;
  const numSegments = Math.max(12, steps);

  if (!isFullCircle) {
    // Sector scan: starts at the center radar point
    ring.push([center[0], center[1]]);
  }

  for (let i = 0; i <= numSegments; i++) {
    const frac = i / numSegments;
    const bearing = (azimuthStartDeg + frac * span + 360) % 360;
    const pt = destination(center, effectiveRangeKm, bearing);
    ring.push(pt);
  }

  if (!isFullCircle) {
    // Close back to center point
    ring.push([center[0], center[1]]);
  } else {
    // Ensure loop closure
    if (ring.length > 0) {
      ring.push([ring[0][0], ring[0][1]]);
    }
  }

  // Calculate approximate coverage area in km² (accounting for sector fraction)
  const sectorFraction = Math.min(1, Math.abs(span) / 360);
  const coverageAreaKm2 = Math.round(Math.PI * Math.pow(effectiveRangeKm, 2) * sectorFraction);

  return {
    geometry: {
      type: 'Polygon',
      coordinates: [ring]
    },
    radarHorizonKm,
    targetHorizonKm,
    totalLosRangeKm: totalRangeKm,
    effectiveRangeKm,
    blindZoneRadiusKm,
    coverageAreaKm2
  };
}
