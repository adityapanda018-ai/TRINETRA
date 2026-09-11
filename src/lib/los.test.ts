import { describe, it, expect } from 'vitest';
import { calculateRadarHorizonKm, generateRadarDome } from './los';

describe('Radar Line-of-Sight (LOS) Engine', () => {
  it('accurately calculates radar horizon with 4/3 refraction', () => {
    // 25m radar mast (4.124 * 5 = 20.62 km)
    // 100m target altitude (4.124 * 10 = 41.24 km)
    // Total ≈ 61.9 km
    const res = calculateRadarHorizonKm(25, 100);
    expect(res.radarHorizonKm).toBeCloseTo(20.6, 1);
    expect(res.targetHorizonKm).toBeCloseTo(41.2, 1);
    expect(res.totalRangeKm).toBeCloseTo(61.9, 1);
  });

  it('handles AWACS high-altitude radar calculations', () => {
    // AWACS at 9,000m altitude vs sea-skimming cruise missile at 25m
    const res = calculateRadarHorizonKm(9000, 25);
    expect(res.radarHorizonKm).toBeGreaterThan(380);
    expect(res.totalRangeKm).toBeGreaterThan(400);
  });

  it('generates closed 360-degree radar dome polygon', () => {
    const dome = generateRadarDome({
      center: [80.177, 13.032], // Chennai
      radarHeightM: 30,
      targetAltitudeM: 1000,
      maxRangeKm: 300,
      steps: 36
    });

    expect(dome.geometry.type).toBe('Polygon');
    expect(dome.geometry.coordinates[0].length).toBeGreaterThan(30);

    // Verify closed ring
    const ring = dome.geometry.coordinates[0];
    const first = ring[0];
    const last = ring[ring.length - 1];
    expect(first[0]).toBeCloseTo(last[0], 5);
    expect(first[1]).toBeCloseTo(last[1], 5);

    expect(dome.effectiveRangeKm).toBeGreaterThan(100);
    expect(dome.coverageAreaKm2).toBeGreaterThan(30000);
  });

  it('respects sector scan azimuth boundaries', () => {
    const sector = generateRadarDome({
      center: [80.177, 13.032],
      radarHeightM: 30,
      targetAltitudeM: 500,
      azimuthStartDeg: 45,
      azimuthEndDeg: 135,
      maxRangeKm: 150
    });

    expect(sector.geometry.type).toBe('Polygon');
    const ring = sector.geometry.coordinates[0];
    // First and last points should originate at center for sector scan
    expect(ring[0][0]).toBeCloseTo(80.177, 3);
    expect(ring[0][1]).toBeCloseTo(13.032, 3);
    expect(ring[ring.length - 1][0]).toBeCloseTo(80.177, 3);
  });
});
