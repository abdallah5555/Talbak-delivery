import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  const digits = e164.replace(/\D/g, '');
  return `u_${digits}@talabak.internal.net`;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'إعدادات الخادم غير مكتملة.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { name, phone, password, pin } = body;

    // 1. Input Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(
        JSON.stringify({ error: 'يرجى إدخال الاسم بالكامل.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone || typeof phone !== 'string') {
      return new Response(
        JSON.stringify({ error: 'يرجى إدخال رقم الهاتف.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      return new Response(
        JSON.stringify({ error: 'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { local: localPhone } = normalizePhone(phone);
    if (!localPhone || localPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: 'يرجى إدخال رقم هاتف صحيح.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Derive deterministic internal auth email
    const internalEmail = toInternalAuthEmail(phone);

    // 3. Admin Supabase Client with service_role (server-side only)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Duplicate check in public.users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('phone', localPhone)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'رقم الهاتف مستخدم بالفعل.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Create user in Supabase Auth via Admin API with email_confirm = true
    const { data: authCreated, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        phone: localPhone
      }
    });

    if (createAuthError || !authCreated.user) {
      const errorMsg = createAuthError?.message || '';
      let userFriendlyError = 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.';
      if (errorMsg.includes('already registered') || errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
        userFriendlyError = 'رقم الهاتف مستخدم بالفعل.';
      }
      return new Response(
        JSON.stringify({ error: userFriendlyError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authCreated.user.id;

    // Optional PIN Hash
    let pinHash: string | null = null;
    if (pin && typeof pin === 'string' && pin.trim()) {
      try {
        pinHash = await bcrypt.hash(pin.trim());
      } catch (_e) {
        // Fallback if pin hash fails
      }
    }

    // 6. Create matching public.users row with exact same UUID
    // Enforce role = 'customer' and status = 'active'
    const { data: userProfileData, error: insertProfileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId,
        name: name.trim(),
        phone: localPhone,
        role: 'customer',
        status: 'active',
        pin_hash: pinHash,
        last_pin_verified_at: pinHash ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, name, phone, role, status, created_at')
      .single();

    if (insertProfileError) {
      // Rollback newly-created auth user to prevent orphaned account
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: 'تعذر إنشاء ملف المستخدم في قاعدة البيانات.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return safe user payload (no secrets, no internal email)
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userProfileData.id,
          name: userProfileData.name,
          phone: userProfileData.phone,
          role: userProfileData.role,
          status: userProfileData.status,
          createdAt: userProfileData.created_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (_err: any) {
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع أثناء معالجة الطلب.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
