import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const DHIKR = ['سُبْحَانَ اللَّهِ وَبِحَمْدِهِ 🤍','سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ 🤍','لَا إِلَهَ إِلَّا اللَّهُ 🤍','اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّد ﷺ 🤍','أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ 🤍','اللَّهُ أَكْبَرُ 🤍'];

Deno.serve(async () => {
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const now = new Date();
    const { data: schedules, error } = await db.from('religious_reminder_schedules').select('user_id,interval_minutes').eq('enabled', true).lte('next_due_at', now.toISOString()).limit(100);
    if (error) throw error;
    let processed = 0, queued = 0;
    for (const schedule of schedules || []) {
      const message = DHIKR[Math.floor(Math.random() * DHIKR.length)];
      const { error: insertError } = await db.from('notifications').insert({ id: crypto.randomUUID(), user_id: schedule.user_id, title: 'تذكير إيماني 🤍', message, type: 'religious', is_read: false });
      if (!insertError) queued++;
      const minutes = [5,15,30,60].includes(schedule.interval_minutes) ? schedule.interval_minutes : 5;
      await db.from('religious_reminder_schedules').update({ last_sent_at: now.toISOString(), next_due_at: new Date(now.getTime() + minutes * 60000).toISOString(), updated_at: now.toISOString() }).eq('user_id', schedule.user_id);
      processed++;
    }
    return new Response(JSON.stringify({ success: true, processed, queued, checkedAt: now.toISOString() }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Dispatcher failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
