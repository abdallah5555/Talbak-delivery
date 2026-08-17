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
    const targetUserId = body.userId as string | undefined;
    const targetRole = body.role as string | undefined;
    const { data: roleRows, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', authData.user.id);
    if (roleError) throw roleError;
    const callerRoles = (roleRows || []).map((r: { role: string }) => r.role);
    const isAdmin = callerRoles.includes('admin');
    const isOwnTarget = !targetUserId || targetUserId === authData.user.id;
    const canSendByTargetRole = !targetUserId && !!targetRole && (isAdmin || callerRoles.includes(targetRole));
    if (!isOwnTarget && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!targetUserId && targetRole && !canSendByTargetRole) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: privateKey, error: secretError } = await admin.rpc('get_vapid_private_key');
    if (secretError || !privateKey) throw new Error('Web Push VAPID private key is not configured securely');
    webpush.setVapidDetails(subject, publicKey, privateKey);

    let query = admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth,role');
    if (targetUserId) query = query.eq('user_id', targetUserId);
    else if (targetRole) query = query.eq('role', targetRole);
    else query = query.eq('user_id', authData.user.id);
    const { data: subscriptions, error: subError } = await query;
    if (subError) throw subError;

    const notificationId = body.id || crypto.randomUUID();
    const title = body.title || 'طلبك دليفري 🛵';
    const message = body.body || body.message || '';
    const type = body.type || 'system';
    const payload = JSON.stringify({ id: notificationId, userId: targetUserId || authData.user.id, title, body: message, message, type, url: body.url || '/', orderId: body.orderId || null, isReligious: Boolean(body.isReligious), requireInteraction: Boolean(body.requireInteraction) });
    let sent = 0;
    let lastError = '';
    for (const sub of subscriptions || []) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 86400, urgency: type === 'order' ? 'high' : 'normal' });
        sent++;
      } catch (e) {
        const status = (e as any)?.statusCode;
        lastError = `${status || 'unknown'}: ${e instanceof Error ? e.message : String(e)}`;
        if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }

    if (targetUserId && body.persistInApp !== false) {
      await admin.from('notifications').upsert({ id: notificationId, user_id: targetUserId, title, message, type, is_read: false }, { onConflict: 'id' });
    }

    return new Response(JSON.stringify({ success: true, sent, attempted: (subscriptions || []).length, lastError: sent === 0 ? lastError : null }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[send-push]', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Push failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
