/**
 * Location and IP Capture Utilities
 * Provides comprehensive candidate location tracking for interview security
 */

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number;
  address?: {
    country?: string;
    region?: string;
    city?: string;
    postalCode?: string;
    street?: string;
  };
  source: 'gps' | 'network' | 'ip' | 'manual';
  error?: string;
}

export interface IPData {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  source: string;
  timestamp: number;
}

export interface CandidateLocationInfo {
  ip: IPData;
  gps?: LocationData;
  network?: LocationData;
  userAgent: string;
  timezone: string;
  language: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  browser: {
    name: string;
    version: string;
    platform: string;
  };
  permissions: {
    location: 'granted' | 'denied' | 'prompt' | 'unknown';
    camera: 'granted' | 'denied' | 'prompt' | 'unknown';
    microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  };
  timestamp: number;
}

/**
 * Get current GPS location from browser
 */
export async function getCurrentLocation(options: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
} = {}): Promise<LocationData> {
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 300000, // 5 minutes
    ...options,
  };

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        latitude: null,
        longitude: null,
        accuracy: null,
        timestamp: Date.now(),
        source: 'gps',
        error: 'Geolocation not supported',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          source: 'gps',
        });
      },
      (error) => {
        let errorMessage = 'Unknown location error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timeout';
            break;
        }

        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          timestamp: Date.now(),
          source: 'gps',
          error: errorMessage,
        });
      },
      defaultOptions
    );
  });
}

/**
 * Get location from IP address using multiple services
 */
export async function getLocationFromIP(): Promise<IPData> {
  const timestamp = Date.now();

  // Try multiple IP geolocation services
  const services = [
    {
      name: 'ipapi.co',
      url: 'https://ipapi.co/json/',
      parse: (data: any) => ({
        ip: data.ip,
        country: data.country_name,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org,
        org: data.org,
        as: data.asn,
      }),
    },
    {
      name: 'ip-api.com',
      url: 'http://ip-api.com/json/',
      parse: (data: any) => ({
        ip: data.query,
        country: data.country,
        region: data.regionName,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        org: data.org,
        as: data.as,
      }),
    },
  ];

  for (const service of services) {
    try {
      const response = await fetch(service.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const parsed = service.parse(data);

      return {
        ...parsed,
        source: service.name,
        timestamp,
      };
    } catch (error) {
      console.warn(`IP location service ${service.name} failed:`, error);
      continue;
    }
  }

  // Fallback: get basic IP only
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    
    return {
      ip: data.ip,
      source: 'ipify.org',
      timestamp,
    };
  } catch (error) {
    console.error('All IP services failed:', error);
    
    return {
      ip: 'unknown',
      source: 'fallback',
      timestamp,
    };
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<LocationData['address']> {
  try {
    // Using Nominatim (OpenStreetMap) as it's free and doesn't require API key
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'GradiiAI-Interview-Platform/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    const address = data.address || {};

    return {
      country: address.country,
      region: address.state || address.region,
      city: address.city || address.town || address.village,
      postalCode: address.postcode,
      street: `${address.house_number || ''} ${address.road || ''}`.trim() || undefined,
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return undefined;
  }
}

/**
 * Get browser information
 */
export function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let platform = navigator.platform || 'Unknown';

  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/([0-9.]+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/([0-9.]+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Edg')) {
    browserName = 'Edge';
    const match = userAgent.match(/Edg\/([0-9.]+)/);
    if (match) browserVersion = match[1];
  }

  return {
    name: browserName,
    version: browserVersion,
    platform,
  };
}

/**
 * Check permissions status
 */
export async function checkPermissions(): Promise<CandidateLocationInfo['permissions']> {
  const permissions: CandidateLocationInfo['permissions'] = {
    location: 'unknown',
    camera: 'unknown',
    microphone: 'unknown',
  };

  if ('permissions' in navigator) {
    try {
      // Check location permission
      const locationPermission = await navigator.permissions.query({ name: 'geolocation' });
      permissions.location = locationPermission.state;

      // Check camera permission
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      permissions.camera = cameraPermission.state;

      // Check microphone permission
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      permissions.microphone = microphonePermission.state;
    } catch (error) {
      console.warn('Permission check failed:', error);
    }
  }

  return permissions;
}

/**
 * Get comprehensive candidate location information
 */
export async function getCandidateLocationInfo(): Promise<CandidateLocationInfo> {
  const timestamp = Date.now();

  // Get all information in parallel
  const [ipData, gpsLocation, permissions] = await Promise.all([
    getLocationFromIP(),
    getCurrentLocation(),
    checkPermissions(),
  ]);

  // Add address to GPS location if available
  let gpsWithAddress = gpsLocation;
  if (gpsLocation.latitude && gpsLocation.longitude) {
    const address = await reverseGeocode(gpsLocation.latitude, gpsLocation.longitude);
    gpsWithAddress = { ...gpsLocation, address };
  }

  const browserInfo = getBrowserInfo();

  return {
    ip: ipData,
    gps: gpsLocation.latitude ? gpsWithAddress : undefined,
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
    },
    browser: browserInfo,
    permissions,
    timestamp,
  };
}

/**
 * Watch location changes (for monitoring during interview)
 */
export class LocationWatcher {
  private watchId: number | null = null;
  private onLocationChange: (location: LocationData) => void;
  private onError: (error: string) => void;
  private options: PositionOptions;

  constructor(
    onLocationChange: (location: LocationData) => void,
    onError: (error: string) => void,
    options: PositionOptions = {}
  ) {
    this.onLocationChange = onLocationChange;
    this.onError = onError;
    this.options = {
      enableHighAccuracy: true,
      maximumAge: 60000, // 1 minute
      timeout: 30000, // 30 seconds
      ...options,
    };
  }

  start(): void {
    if (!navigator.geolocation) {
      this.onError('Geolocation not supported');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.onLocationChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          source: 'gps',
        });
      },
      (error) => {
        let errorMessage = 'Location tracking error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location timeout';
            break;
        }
        this.onError(errorMessage);
      },
      this.options
    );
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

/**
 * Calculate distance between two coordinates (in kilometers)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validate if candidate location is within expected bounds
 */
export function validateCandidateLocation(
  candidateLocation: LocationData,
  expectedLocation?: { lat: number; lng: number; radiusKm: number }
): { valid: boolean; distance?: number; message: string } {
  if (!candidateLocation.latitude || !candidateLocation.longitude) {
    return {
      valid: false,
      message: 'Unable to determine candidate location',
    };
  }

  if (!expectedLocation) {
    return {
      valid: true,
      message: 'Location captured successfully',
    };
  }

  const distance = calculateDistance(
    candidateLocation.latitude,
    candidateLocation.longitude,
    expectedLocation.lat,
    expectedLocation.lng
  );

  const valid = distance <= expectedLocation.radiusKm;

  return {
    valid,
    distance,
    message: valid
      ? `Location verified (${distance.toFixed(2)}km from expected)`
      : `Location outside expected area (${distance.toFixed(2)}km away)`,
  };
}