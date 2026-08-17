import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const DHIKR = [
  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ 🤍',
  'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ 🤍',
  'لَا إِلَهَ إِلَّا اللَّهُ 🤍',
  'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّد ﷺ 🤍',
  'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ 🤍',
  'اللَّهُ أَكْبَرُ 🤍'
];

Deno.serve(async () => {
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(url, serviceKey);
    const now = new Date();

    const publicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY') || Deno.env.get('VAPID_PUBLIC_KEY') || 'BIejGMHIAav6PK4uslnIGG_yvTOxpVktINdgdPWBosnCifH_ZpNfsREwKnj4ps5V0hSOl2KiCdJ6Ek9Jn58EsKM';
    const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@talabak.app';
    const { data: privateKey, error: secretError } = await db.rpc('get_vapid_private_key');
    if (secretError || !privateKey) throw new Error('Web Push VAPID private key is not configured securely');
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const { data: schedules, error } = await db
      .from('religious_reminder_schedules')
      .select('user_id,interval_minutes')
      .eq('enabled', true)
      .lte('next_due_at', now.toISOString())
      .limit(100);
    if (error) throw error;

    let processed = 0;
    let queued = 0;
    let sent = 0;

    for (const schedule of schedules || []) {
      const message = DHIKR[Math.floor(Math.random() * DHIKR.length)];
      const notificationId = crypto.randomUUID();

      const { error: insertError } = await db.from('notifications').insert({
        id: notificationId,
        user_id: schedule.user_id,
        title: 'تذكير إيماني 🤍',
        message,
        type: 'religious',
        is_read: false
      });
      if (!insertError) queued++;

      const { data: subscriptions, error: subError } = await db
        .from('push_subscriptions')
        .select('id,endpoint,p256dh,auth')
        .eq('user_id', schedule.user_id);

      if (!subError) {
        const payload = JSON.stringify({
          id: notificationId,
          title: 'تذكير إيماني 🤍',
          body: message,
          message,
          type: 'religious',
          url: '/',
          isReligious: true,
          requireInteraction: false
        });

        for (const sub of subscriptions || []) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              { TTL: 86400, urgency: 'normal' }
            );
            sent++;
          } catch (pushError) {
            const status = (pushError as { statusCode?: number })?.statusCode;
            if (status === 404 || status === 410) {
              await db.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        }
      }

      const minutes = [5, 15, 30, 60].includes(schedule.interval_minutes) ? schedule.interval_minutes : 5;
      await db.from('religious_reminder_schedules').update({
        last_sent_at: now.toISOString(),
        next_due_at: new Date(now.getTime() + minutes * 60000).toISOString(),
        updated_at: now.toISOString()
      }).eq('user_id', schedule.user_id);

      processed++;
    }

    return new Response(JSON.stringify({ success: true, processed, queued, sent, checkedAt: now.toISOString() }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Dispatcher failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
