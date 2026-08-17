import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-dispatcher-token' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const publicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY') || Deno.env.get('VAPID_PUBLIC_KEY') || 'BIejGMHIAav6PK4uslnIGG_yvTOxpVktINdgdPWBosnCifH_ZpNfsREwKnj4ps5V0hSOl2KiCdJ6Ek9Jn58EsKM';
    const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@talabak.app';
    const db = createClient(url, serviceKey);
    const supplied = req.headers.get('x-dispatcher-token') || '';
    const { data: expected, error: secretError } = await db.rpc('get_notification_dispatcher_secret');
    if (secretError || !expected || supplied !== expected) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: privateKey, error: vapidError } = await db.rpc('get_vapid_private_key');
    if (vapidError || !privateKey) throw new Error('Web Push VAPID private key is not configured securely');
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const { data: notifications, error } = await db.from('notifications').select('id,user_id,title,message,type,push_attempts').in('type', ['religious', 'role_approved']).is('push_sent_at', null).order('created_at', { ascending: true }).limit(50);
    if (error) throw error;
    let processed = 0, sent = 0, noSubscription = 0;
    for (const notification of notifications || []) {
      await db.from('notifications').update({ push_attempts: Number(notification.push_attempts || 0) + 1, push_last_error: null }).eq('id', notification.id);
      const { data: subs } = await db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', notification.user_id);
      if (!subs?.length) { noSubscription++; continue; }
      let delivered = 0, lastError = '';
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              id: notification.id,
              userId: notification.user_id,
              title: notification.title,
              body: notification.message,
              message: notification.message,
              type: notification.type,
              isReligious: notification.type === 'religious',
              url: notification.type === 'role_approved' ? '/?role=driver' : '/',
              requireInteraction: notification.type === 'role_approved'
            }),
            { TTL: 86400, urgency: 'high' }
          );
          delivered++; sent++;
        } catch (e) {
          const status = (e as any)?.statusCode;
          lastError = `${status || 'unknown'}: ${e instanceof Error ? e.message : String(e)}`;
          if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
      if (delivered > 0) await db.from('notifications').update({ push_sent_at: new Date().toISOString(), push_last_error: null }).eq('id', notification.id);
      else await db.from('notifications').update({ push_last_error: lastError || 'No active push subscription' }).eq('id', notification.id);
      processed++;
    }
    return new Response(JSON.stringify({ success: true, processed, sent, noSubscription, checkedAt: new Date().toISOString() }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[notification-push-dispatcher]', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Dispatcher failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
