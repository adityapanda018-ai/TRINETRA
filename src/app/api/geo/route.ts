import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy for IP geolocation & reverse geocoding — avoids mixed-content block on HTTPS pages
// Cascading fallback for maximum reliability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lng') || searchParams.get('lon');

    // Extract the real client IP from standard proxy headers
    const clientIp =
      request.headers.get('cf-connecting-ip') ||        // Cloudflare
      request.headers.get('x-real-ip') ||                // Nginx / generic
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      '';

    // Skip private/loopback IPs — let the API auto-detect
    const isPrivate = !clientIp || clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.') || clientIp.startsWith('172.');
    const ip = isPrivate ? '' : clientIp;

    const formatAsn = (asn: any, org?: string) => {
      if (!asn) return org || 'Unknown';
      let s = String(asn).trim();
      s = s.replace(/^(AS)+/i, 'AS');
      if (!s.startsWith('AS')) s = `AS${s}`;
      if (org && !s.includes(org)) return `${s} ${org}`;
      return s;
    };

    // If client supplied GPS/hardware coordinates, reverse-geocode them to get accurate physical location
    let reverseGeo: { city?: string; regionName?: string; country?: string } | null = null;
    if (latParam && lonParam) {
      const latNum = parseFloat(latParam);
      const lonNum = parseFloat(lonParam);
      if (!isNaN(latNum) && !isNaN(lonNum)) {
        try {
          const revRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lonNum}&format=json&zoom=10&addressdetails=1`,
            {
              signal: AbortSignal.timeout(4000),
              headers: { 'User-Agent': 'TRINETRA-OSINT/1.0 (+https://github.com/simplifaisoul/trinetra)', 'Accept-Language': 'en' },
            }
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            const addr = revData.address || {};
            let city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.state_district || addr.county || '';
            city = city.replace(/\s+Corporation$/i, '').trim();
            const regionName = addr.state || addr.province || addr.region || '';
            const country = addr.country || '';
            if (city || regionName || country) {
              reverseGeo = { city, regionName, country };
            }
          }
        } catch {
          // Graceful fallback to IP geo if reverse geocoding times out
        }
      }
    }

    // ── Provider 1: ipapi.co (HTTPS, free tier 1000/day) ──
    try {
      const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
        headers: { 'User-Agent': 'TRINETRA/4.2' },
      });
      if (res.ok) {
        const d = await res.json();
        if (!d.error && d.latitude) {
          return NextResponse.json({
            status: 'success',
            query: d.ip,
            lat: reverseGeo && latParam ? parseFloat(latParam) : d.latitude,
            lon: reverseGeo && lonParam ? parseFloat(lonParam) : d.longitude,
            city: reverseGeo?.city || d.city,
            regionName: reverseGeo?.regionName || d.region,
            country: reverseGeo?.country || d.country_name,
            isp: d.org || 'Unknown',
            org: d.org || 'Unknown',
            as: formatAsn(d.asn, d.org),
          });
        }
      }
    } catch { /* fall through */ }

    // ── Provider 2: freeipapi.com (HTTPS, no key needed) ──
    try {
      const url = ip ? `https://freeipapi.com/api/json/${ip}` : 'https://freeipapi.com/api/json';
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
      if (res.ok) {
        const d = await res.json();
        if (d.latitude) {
          return NextResponse.json({
            status: 'success',
            query: d.ipAddress || ip || 'auto',
            lat: reverseGeo && latParam ? parseFloat(latParam) : d.latitude,
            lon: reverseGeo && lonParam ? parseFloat(lonParam) : d.longitude,
            city: reverseGeo?.city || d.cityName || 'Unknown',
            regionName: reverseGeo?.regionName || d.regionName || 'Unknown',
            country: reverseGeo?.country || d.countryName || 'Unknown',
            isp: d.isp || 'Unknown',
            org: d.isp || 'Unknown',
            as: 'Unknown',
          });
        }
      }
    } catch { /* fall through */ }

    // ── Provider 3: ip-api.com (HTTP — safe here because this is server-to-server) ──
    try {
      const url = ip
        ? `http://ip-api.com/json/${ip}?fields=status,lat,lon,city,regionName,country,query,isp,org,as`
        : 'http://ip-api.com/json/?fields=status,lat,lon,city,regionName,country,query,isp,org,as';
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          return NextResponse.json({
            ...data,
            lat: reverseGeo && latParam ? parseFloat(latParam) : data.lat,
            lon: reverseGeo && lonParam ? parseFloat(lonParam) : data.lon,
            city: reverseGeo?.city || data.city,
            regionName: reverseGeo?.regionName || data.regionName,
            country: reverseGeo?.country || data.country,
            as: data.as ? formatAsn(data.as) : 'Unknown',
          });
        }
      }
    } catch { /* fall through */ }

    if (reverseGeo && latParam && lonParam) {
      return NextResponse.json({
        status: 'success',
        query: ip || 'GPS Hardware Fix',
        lat: parseFloat(latParam),
        lon: parseFloat(lonParam),
        city: reverseGeo.city,
        regionName: reverseGeo.regionName,
        country: reverseGeo.country,
        isp: 'Local Network',
        org: '',
        as: 'Unknown',
      });
    }

    return NextResponse.json({ error: 'All geolocation providers failed' }, { status: 502 });
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to reach geolocation service', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    );
  }
}
