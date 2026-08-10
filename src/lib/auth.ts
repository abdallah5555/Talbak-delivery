import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 8;
const PIN_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 Hours

export async function hashValue(plain: string): Promise<string> {
  if (!plain) return '';
  return await bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyHash(plain: string, hashed: string): Promise<boolean> {
  if (!plain || !hashed) return false;
  // If hash starts with bcrypt prefix, verify using bcrypt.
  if (hashed.startsWith('$2a$') || hashed.startsWith('$2b$')) {
    return await bcrypt.compare(plain, hashed);
  }
  // If not a bcrypt hash string, reject verification for security
  return false;
}

export function isPinPromptRequired(lastVerifiedMs?: number): boolean {
  if (!lastVerifiedMs) return true;
  return Date.now() - lastVerifiedMs > PIN_EXPIRY_MS;
}

export function getDeviceSignature() {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let platform = 'Unknown OS';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Internet';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  else if (ua.includes('Trident')) browser = 'Internet Explorer';
  else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  if (ua.includes('Android')) platform = 'Android Mobile';
  else if (ua.includes('iPhone') || ua.includes('iPad')) platform = 'iOS Mobile';
  else if (ua.includes('Windows')) platform = 'Windows PC';
  else if (ua.includes('Macintosh')) platform = 'Mac OS';
  else if (ua.includes('Linux')) platform = 'Linux PC';

  let deviceId = localStorage.getItem('talabak_device_id');
  if (!deviceId) {
    deviceId = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
    localStorage.setItem('talabak_device_id', deviceId);
  }

  return {
    deviceId,
    deviceName: `${platform} (${browser})`,
    browser,
    platform,
    lastActive: new Date().toISOString()
  };
}
