import { NextResponse } from 'next/server';

export interface SigintIntercept {
  id: string;
  timestamp: string;
  category: 'AIRSPACE' | 'NAVAL' | 'CONFLICT' | 'SIGINT' | 'CYBER';
  urgency: 'CRITICAL' | 'HIGH' | 'ADVISORY';
  title: string;
  summary: string;
  source: string;
  frequency?: string;
  lat: number;
  lng: number;
  tags: string[];
}

export interface RadioStream {
  id: string;
  name: string;
  location: string;
  country: string;
  type: 'ATC' | 'MARINE' | 'WEBSDR' | 'EMERGENCY';
  streamUrl: string;
  frequency: string;
  description: string;
}

export interface StrategicInstallation {
  id: string;
  name: string;
  type: 'AIRBASE' | 'NAVAL_PORT' | 'RADAR_ARRAY' | 'SPACE_TRACKING';
  country: string;
  coordinates: [number, number]; // [lat, lng]
  elevation: string;
  frequencies: string[];
  status: 'ELEVATED' | 'NOMINAL' | 'DEFCON 3';
  description: string;
}

export async function GET() {
  const now = new Date();

  // Curated live flashpoint intercepts
  const intercepts: SigintIntercept[] = [
    {
      id: 'sig-001',
      timestamp: new Date(now.getTime() - 4 * 60000).toISOString(),
      category: 'AIRSPACE',
      urgency: 'CRITICAL',
      title: 'USAF RC-135V Rivet Joint Reconnaissance Track Active',
      summary: 'Electronic reconnaissance aircraft operating over the Black Sea international corridor collecting SIGINT emissions with active transponder pinging.',
      source: 'TRINETRA ADS-B COMBINED SIGINT',
      frequency: '243.00 MHz (Military Air Guard)',
      lat: 44.1500,
      lng: 31.8500,
      tags: ['BLACK_SEA', 'RC-135', 'ELINT', 'NATO']
    },
    {
      id: 'sig-002',
      timestamp: new Date(now.getTime() - 12 * 60000).toISOString(),
      category: 'NAVAL',
      urgency: 'HIGH',
      title: 'Carrier Strike Group Escort Surface Flotilla Picket',
      summary: 'Guided-missile destroyers operating in defensive box formation escorting commercial maritime transit corridor.',
      source: 'AIS NAVAREA IX / SENTINEL SATELLITE RADAR',
      frequency: 'VHF CH 16 (156.800 MHz)',
      lat: 12.5800,
      lng: 43.4200,
      tags: ['BAB_EL_MANDEB', 'RED_SEA', 'MARITIME_DEFENSE']
    },
    {
      id: 'sig-003',
      timestamp: new Date(now.getTime() - 22 * 60000).toISOString(),
      category: 'AIRSPACE',
      urgency: 'HIGH',
      title: 'ADIZ Incursion Patrol Detected — Taiwan Strait Median Line',
      summary: 'Multiple J-16 strike aircraft and KJ-500 AEW&C radar picket orbiting northern sector boundary.',
      source: 'TAIPEI AIR SURVEILLANCE RADAR',
      frequency: '121.50 MHz (International VHF Guard)',
      lat: 24.3000,
      lng: 119.8500,
      tags: ['TAIWAN_STRAIT', 'ADIZ', 'AIR_SUPERIORITY']
    },
    {
      id: 'sig-004',
      timestamp: new Date(now.getTime() - 35 * 60000).toISOString(),
      category: 'SIGINT',
      urgency: 'ADVISORY',
      title: 'High-Frequency Over-The-Horizon (OTH) Radar Pulse Detected',
      summary: 'Containerized radar array transmitting pulse repetition interval sweep between 14.15 MHz and 18.25 MHz in Baltic littoral zone.',
      source: 'KIWISDR NORDIC RF SENSOR GRID',
      frequency: '14.285 MHz HF',
      lat: 54.7104,
      lng: 20.4522,
      tags: ['KALININGRAD', 'OTH_RADAR', 'RF_INTERCEPT']
    },
    {
      id: 'sig-005',
      timestamp: new Date(now.getTime() - 48 * 60000).toISOString(),
      category: 'NAVAL',
      urgency: 'CRITICAL',
      title: 'Subsea Optical Cable Chokepoint Anomaly Detection',
      summary: 'Research and survey vessel lingering with disabled AIS transponder within 2 nautical miles of trans-Atlantic landing station.',
      source: 'TRINETRA CABLE SENTRY / SATELLITE SAR',
      frequency: '406.025 MHz EPIRB Standby',
      lat: 51.8200,
      lng: -10.5000,
      tags: ['SUBSEA_CABLES', 'DARK_VESSEL', 'INFRASTRUCTURE']
    },
    {
      id: 'sig-006',
      timestamp: new Date(now.getTime() - 65 * 60000).toISOString(),
      category: 'CYBER',
      urgency: 'HIGH',
      title: 'BGP Routing Hijack Attempt Against Financial Telemetry Nodes',
      summary: 'Autonomous System AS20857 announced 42 unauthorized /24 prefixes targeting major European clearing infrastructure.',
      source: 'CLOUDFLARE RADAR & BGP MON',
      lat: 50.1109,
      lng: 8.6821,
      tags: ['BGP_HIJACK', 'ROUTING_ATTACK', 'FRANKFURT']
    }
  ];

  // Public tactical / ATC & marine streams
  const radioStreams: RadioStream[] = [
    {
      id: 'rad-jfk',
      name: 'New York JFK International Tower & Approach',
      location: 'New York, USA',
      country: 'United States',
      type: 'ATC',
      streamUrl: 'https://s1-fmt2.liveatc.net/kjfk_twr',
      frequency: '119.100 MHz',
      description: 'Major international airspace hub tower and departure control.'
    },
    {
      id: 'rad-lhr',
      name: 'London Heathrow Approach / UK Sector Radar',
      location: 'London, UK',
      country: 'United Kingdom',
      type: 'ATC',
      streamUrl: 'https://s1-fmt2.liveatc.net/egll_app',
      frequency: '120.400 MHz',
      description: 'Western Europe high-density approach radar & tactical holding stacks.'
    },
    {
      id: 'rad-hnd',
      name: 'Tokyo Haneda International Radar',
      location: 'Tokyo, Japan',
      country: 'Japan',
      type: 'ATC',
      streamUrl: 'https://s1-fmt2.liveatc.net/rjtt_twr',
      frequency: '118.100 MHz',
      description: 'Pacific rim airspace management & emergency response channel.'
    },
    {
      id: 'rad-mar16',
      name: 'International Maritime VHF Distress Channel 16',
      location: 'Global / Coastal Guard',
      country: 'International',
      type: 'MARINE',
      streamUrl: 'https://stream.broadcastify.com/live', // fallback feed
      frequency: '156.800 MHz (Ch 16)',
      description: 'Continuous maritime distress, safety, and calling frequency.'
    }
  ];

  // Strategic military bases & intelligence hubs
  const installations: StrategicInstallation[] = [
    {
      id: 'inst-diego',
      name: 'Diego Garcia Naval Support Facility',
      type: 'NAVAL_PORT',
      country: 'British Indian Ocean Territory (BIOT)',
      coordinates: [-7.3195, 72.4229],
      elevation: '3m MSL',
      frequencies: ['126.200 MHz Tower', '344.600 MHz Mil UHF'],
      status: 'DEFCON 3',
      description: 'Key Indian Ocean strategic bomber forward operating base and deep-water naval anchorage with satellite ground relays.'
    },
    {
      id: 'inst-ramstein',
      name: 'Ramstein Air Base (USAF / NATO HQ)',
      type: 'AIRBASE',
      country: 'Germany',
      coordinates: [49.4369, 7.6003],
      elevation: '237m MSL',
      frequencies: ['118.700 MHz Tower', '257.800 MHz Approach', '385.400 MHz Command'],
      status: 'ELEVATED',
      description: 'Headquarters Allied Air Command (AIRCOM) and principal European airlift transport and aerial reconnaissance center.'
    },
    {
      id: 'inst-kadena',
      name: 'Kadena Air Base (18th Wing USAF)',
      type: 'AIRBASE',
      country: 'Japan (Okinawa)',
      coordinates: [26.3556, 127.7675],
      elevation: '44m MSL',
      frequencies: ['126.200 MHz Tower', '317.500 MHz Guard'],
      status: 'ELEVATED',
      description: 'Largest US Air Force installation in the Asia-Pacific region, housing F-15, RC-135, and KC-135 tanker wings.'
    },
    {
      id: 'inst-sevastopol',
      name: 'Sevastopol Naval Base (Black Sea Fleet)',
      type: 'NAVAL_PORT',
      country: 'Crimea / Black Sea',
      coordinates: [44.6167, 33.5254],
      elevation: '12m MSL',
      frequencies: ['156.800 MHz VHF', '8290 kHz HF'],
      status: 'ELEVATED',
      description: 'Principal deep-water naval harbor with submarine drydocks, hardened ammunition tunnels, and S-400 air defense batteries.'
    },
    {
      id: 'inst-udeid',
      name: 'Al Udeid Air Base (CENTCOM Forward HQ)',
      type: 'AIRBASE',
      country: 'Qatar',
      coordinates: [25.1174, 51.3150],
      elevation: '40m MSL',
      frequencies: ['118.300 MHz Tower', '269.000 MHz Mil'],
      status: 'NOMINAL',
      description: 'Combined Air Operations Center (CAOC) coordinating regional airspace corridors, ISR drones, and heavy air tankers.'
    },
    {
      id: 'inst-yulin',
      name: 'Yulin Naval Base (Submarine Underground Pen)',
      type: 'NAVAL_PORT',
      country: 'China (Hainan Island)',
      coordinates: [18.2190, 109.5694],
      elevation: '5m MSL',
      frequencies: ['VHF CH 16', 'Ch 70 DSC'],
      status: 'DEFCON 3',
      description: 'Hardened underground subterranean tunnels capable of concealing SSBN nuclear ballistic missile submarines.'
    }
  ];

  return NextResponse.json({
    status: 'success',
    updatedAt: now.toISOString(),
    intercepts,
    radioStreams,
    installations
  });
}
