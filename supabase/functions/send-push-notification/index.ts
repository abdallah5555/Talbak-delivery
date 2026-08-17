import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const publicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY') || Deno.env.get('VAPID_PUBLIC_KEY') || 'BIejGMHIAav6PK4uslnIGG_yvTOxpVktINdgdPWBosnCifH_ZpNfsREwKnj4ps5V0hSOl2KiCdJ6Ek9Jn58EsKM';
    const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@talabak.app';
    const admin = createClient(url, serviceKey);
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: authData } = await caller.auth.getUser();
    if (!authData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const body = await req.json();
    const targetUserId = body.userId;
    const role = body.role;
    const { data: callerProfile } = await admin.from('users').select('role').eq('id', authData.user.id).maybeSingle();
    const isAdmin = callerProfile?.role === 'admin';
    if (targetUserId && targetUserId !== authData.user.id && !isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!targetUserId && role && role !== callerProfile?.role && !isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: privateKey, error: secretError } = await admin.rpc('get_vapid_private_key');
    if (secretError || !privateKey) throw new Error('Web Push VAPID private key is not configured securely');
    webpush.setVapidDetails(subject, publicKey, privateKey);
    let query = admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth,role');
    if (targetUserId) query = query.eq('user_id', targetUserId); else if (role) query = query.eq('role', role); else query = query.eq('user_id', authData.user.id);
    const { data: subscriptions, error: subError } = await query;
    if (subError) throw subError;
    const notificationId = body.id || crypto.randomUUID();
    const title = body.title || 'طلبك دليفري 🛵';
    const message = body.body || body.message || '';
    const payload = JSON.stringify({ id: notificationId, title, body: message, message, type: body.type || 'system', url: body.url || '/', orderId: body.orderId || null, isReligious: Boolean(body.isReligious), requireInteraction: Boolean(body.requireInteraction) });
    let sent = 0;
    for (const sub of subscriptions || []) {
      try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 86400, urgency: 'high' }); sent++; }
      catch (e) { const status=(e as any)?.statusCode; if(status===404||status===410) await admin.from('push_subscriptions').delete().eq('id',sub.id); }
    }
    if (targetUserId) await admin.from('notifications').upsert({ id: notificationId, user_id: targetUserId, title, message, type: body.type || 'system', is_read: false }, { onConflict: 'id' });
    return new Response(JSON.stringify({ success: true, sent, attempted: (subscriptions || []).length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[send-push]', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Push failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
