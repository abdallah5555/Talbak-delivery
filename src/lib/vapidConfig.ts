/**
 * VAPID public configuration for "طلبك دليفري" Web Push.
 * The private key is stored only in Supabase Vault and is never shipped to the browser.
 */
export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BHG3RUZgulQ2eTB1B5GoWPzE-xMIfddM6QW11tDWHfzX_CAQ-24bslEQlr5_KFHJzp7OrmFcA69HAWk5QjGn6_o';

export const VAPID_SUBJECT = 'mailto:support@talabak.app';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
