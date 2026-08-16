/**
 * VAPID Keys & Push Notification Configuration for "طلبك دليفري"
 * Standard Web Push (RFC 8291 / RFC 8292)
 */

export const VAPID_PUBLIC_KEY = 
  import.meta.env.VITE_VAPID_PUBLIC_KEY || 
  'BGLb16DpJq802C-UaVjoT7r-_3Jeh4X650BHFIM92D5Xgp8PM43HquIsBU-OZnKA0fVHPSPwE_qum45drBfqKMY';

export const VAPID_SUBJECT = 'mailto:support@talabak.app';

/**
 * Utility: Convert a base64 / base64url string to Uint8Array for PushManager
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
