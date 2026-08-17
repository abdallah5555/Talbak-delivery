const REMINDERS = [
  ['تذكير بالصلاة على النبي 🤍','اللهم صلِّ وسلِّم وبارك على سيدنا ونبينا محمد ﷺ'],
  ['تذكير بالتسبيح 🌿','سبحان الله وبحمده، سبحان الله العظيم ✨'],
  ['كنز من كنوز الجنة 💫','لا حول ولا قوة إلا بالله العلي العظيم'],
  ['تذكير بالاستغفار 🤲','أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه'],
  ['دعاء ذي النون 🕊️','لا إله إلا أنت سبحانك إني كنت من الظالمين'],
  ['دعاء طيب ومبارك 🌸','اللهم إنا نسألك من الخير كله عاجله وآجله ما علمنا منه وما لم نعلم'],
  ['رضا بالدين والرسول 🤍','رضيت بالله رباً، وبالإسلام ديناً، وبمحمد ﷺ نبياً ورسولاً'],
  ['استغاثة برحمة الله ✨','يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين'],
  ['الباقيات الصالحات 🍃','سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر'],
  ['تذكير بالشكر والحمد 🤲','الحمد لله حمداً كثيراً طيباً مباركاً فيه ملء السماوات والأرض']
];

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return new Response(JSON.stringify({ error: 'server configuration missing' }), { status: 500 });
  const db = (await import('https://esm.sh/@supabase/supabase-js@2.39.8')).createClient(url, serviceKey);
  const now = new Date();
  const { data: due, error } = await db.from('religious_reminder_schedules')
    .select('user_id, interval_minutes, next_due_at')
    .eq('enabled', true)
    .lte('next_due_at', now.toISOString())
    .limit(100);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0;
  for (const schedule of due || []) {
    const next = new Date(now.getTime() + schedule.interval_minutes * 60000).toISOString();
    const claim = await db.from('religious_reminder_schedules')
      .update({ next_due_at: next, last_sent_at: now.toISOString(), updated_at: now.toISOString() })
      .eq('user_id', schedule.user_id)
      .eq('enabled', true)
      .lte('next_due_at', now.toISOString());
    if (claim.error) continue;

    const seed = [...schedule.user_id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const idx = Math.floor(Date.now() / 60000 + seed) % REMINDERS.length;
    const [title, message] = REMINDERS[idx];
    try {
      const response = await fetch(`${url}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
        body: JSON.stringify({ userId: schedule.user_id, title: `طلبك دليفري 🤍 • ${title}`, body: message, type: 'religious_reminder', isReligious: true, url: '/' })
      });
      if (response.ok) sent++;
    } catch (_) {}
  }
  return new Response(JSON.stringify({ success: true, due: due?.length || 0, sent }), { headers: { 'Content-Type': 'application/json' } });
});
