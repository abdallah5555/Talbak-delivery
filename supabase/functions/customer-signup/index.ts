import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizePhone(rawPhone: string): { local: string; e164: string } {
  let cleaned = (rawPhone || '').replace(/\D/g, '');
  if (cleaned.startsWith('0020')) cleaned = cleaned.substring(4);
  else if (cleaned.startsWith('20') && cleaned.length > 10) cleaned = cleaned.substring(2);
  if (!cleaned.startsWith('0') && cleaned.length === 10) cleaned = '0' + cleaned;
  const local = cleaned;
  const e164 = cleaned.startsWith('0') ? '+20' + cleaned.substring(1) : '+20' + cleaned;
  return { local, e164 };
}

function toInternalAuthEmail(phone: string): string {
  const { e164 } = normalizePhone(phone);
  return `u_${e164.replace(/\D/g, '')}@talabak.internal.net`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'الطلب غير صحيح.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !supabaseServiceKey) return json({ error: 'إعدادات الخادم غير مكتملة.' }, 500);

    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const password = typeof body?.password === 'string' ? body.password.trim() : '';
    const { local: localPhone } = normalizePhone(typeof body?.phone === 'string' ? body.phone : '');

    if (!name) return json({ error: 'يرجى إدخال الاسم بالكامل.' }, 400);
    if (!/^01\d{9}$/.test(localPhone)) return json({ error: 'يرجى إدخال رقم هاتف مصري صحيح.' }, 400);
    if (password.length < 6) return json({ error: 'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل.' }, 400);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', localPhone)
      .maybeSingle();
    if (lookupError) return json({ error: 'تعذر التحقق من بيانات الحساب.' }, 500);
    if (existingUser) return json({ error: 'ACCOUNT_EXISTS' }, 409);

    const internalEmail = toInternalAuthEmail(localPhone);
    const { data: authCreated, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: { name, phone: localPhone },
    });
    if (createAuthError || !authCreated.user) {
      const m = createAuthError?.message || '';
      if (/already registered|already exists|duplicate/i.test(m)) return json({ error: 'ACCOUNT_EXISTS' }, 409);
      return json({ error: 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.' }, 400);
    }

    const newUserId = authCreated.user.id;
    let pinHash: string | null = null;
    if (typeof body?.pin === 'string' && body.pin.trim()) {
      try { pinHash = await bcrypt.hash(body.pin.trim()); } catch (_) { pinHash = null; }
    }

    const { data: profile, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId,
        name,
        phone: localPhone,
        role: 'customer',
        status: 'active',
        pin_hash: pinHash,
        last_pin_verified_at: pinHash ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, name, phone, role, status, created_at')
      .single();

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return json({ error: 'تعذر إنشاء ملف المستخدم في قاعدة البيانات.' }, 500);
    }

    return json({
      success: true,
      user: {
        id: profile.id,
        name: profile.name,
        phone: profile.phone,
        role: profile.role,
        status: profile.status,
        createdAt: profile.created_at,
      },
    });
  } catch (_) {
    return json({ error: 'حدث خطأ غير متوقع أثناء معالجة الطلب.' }, 500);
  }
});
