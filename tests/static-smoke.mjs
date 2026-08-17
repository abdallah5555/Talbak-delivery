import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = process.cwd();
const required = ['src/lib/pushNotificationService.ts','src/hooks/useNotifications.ts','src/components/NotificationSettingsModal.tsx','src/components/DriverDashboard.tsx','src/components/MerchantDashboard.tsx','src/main.tsx','public/sw.js','supabase/migrations/20260817173000_phase4_server_order_totals_and_store_ownership.sql','supabase/migrations/20260817173500_phase5_driver_location_tracking.sql'];
for (const file of required) { try { await readFile(join(root,file),'utf8'); } catch { throw new Error(`Missing required file: ${file}`); } }
const push = await readFile(join(root,'src/lib/pushNotificationService.ts'),'utf8');
const settings = await readFile(join(root,'src/components/NotificationSettingsModal.tsx'),'utf8');
const sw = await readFile(join(root,'public/sw.js'),'utf8');
const driver = await readFile(join(root,'src/components/DriverDashboard.tsx'),'utf8');
const orderMigration = await readFile(join(root,'supabase/migrations/20260817173000_phase4_server_order_totals_and_store_ownership.sql'),'utf8');
const assertions = [
  [!push.includes('vapidVersion'),'legacy vapidVersion injection must be absent'],
  [push.includes('send-push-notification'),'client push service must use send-push-notification edge function'],
  [!push.includes('تم تفعيل الإشعارات'),'push activation must not emit an activation message'],
  [settings.includes('value={5}') && settings.includes('value={15}') && settings.includes('value={30}') && settings.includes('value={60}'),'religious reminder UI must offer 5/15/30/60 minutes'],
  [sw.includes('self.skipWaiting()') && sw.includes('self.clients.claim()'),'service worker must update immediately'],
  [driver.includes('update_driver_location') && driver.includes('getCurrentPosition'),'driver must update secure GPS location'],
  [orderMigration.includes('CREATE OR REPLACE FUNCTION public.create_order_secure') && orderMigration.includes('v_subtotal'),'order totals must be server calculated'],
  [orderMigration.includes('orders (customer_id, store_id'),'orders must persist store ownership']
];
for (const [ok,message] of assertions) if (!ok) throw new Error(`Static smoke failed: ${message}`);
console.log(`Static smoke checks passed: ${assertions.length}`);
