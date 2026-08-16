import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_ROLES = ['customer', 'driver', 'merchant', 'admin'] as const;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'إعدادات الخادم غير مكتملة.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify caller authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'لا تملك صلاحية الوصول (غير مسجل).' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client with caller's JWT to verify identity
    const clientCaller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: callerUser }, error: callerError } = await clientCaller.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'رمز الدخول غير صالح أو منتهي الصلاحية.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin Supabase Client with service-role privileges (server-side only)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is an active Admin in public.users
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, role, status, is_admin_main')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (profileError || !callerProfile || callerProfile.role !== 'admin' || callerProfile.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'لا تملك صلاحية إنشاء مستخدم (مخصصة للمدراء فقط).' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request payload
    const body = await req.json();
    const { 
      name, 
      phone, 
      password, 
      role = 'customer', 
      vehicleType, 
      storeId, 
      isAdminMain = false, 
      adminPermissions = [], 
      adminPhotoUrl = '' 
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(
        JSON.stringify({ error: 'يرجى إدخال اسم المستخدم بالكامل.' }),
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

    // Role validation & privilege escalation prevention
    let targetRole: 'customer' | 'driver' | 'merchant' | 'admin' = 'customer';
    if (ALLOWED_ROLES.includes(role)) {
      targetRole = role;
    }

    // Only main admin can create another admin account
    if (targetRole === 'admin' && !callerProfile.is_admin_main) {
      return new Response(
        JSON.stringify({ error: 'عفواً، إنشاء حسابات الإدارة متاح فقط للأدمن الرئيسي.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Standardize phone
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: 'يرجى إدخال رقم هاتف صحيح.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let cleanPhoneE164 = '';
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhoneE164 = '+2' + cleanPhone;
    } else if (cleanPhone.startsWith('201') && cleanPhone.length === 12) {
      cleanPhoneE164 = '+' + cleanPhone;
    } else {
      cleanPhoneE164 = '+20' + cleanPhone;
    }

    // 3. Check if phone already exists in public.users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'رقم الهاتف مستخدم بالفعل.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Create user in Supabase Auth securely
    const { data: authCreated, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      phone: cleanPhoneE164,
      password: password.trim(),
      phone_confirm: true,
      user_metadata: {
        name: name.trim(),
        phone: cleanPhone
      }
    });

    if (createAuthError || !authCreated.user) {
      const errorMsg = createAuthError?.message || '';
      let userFriendlyError = 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.';
      if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
        userFriendlyError = 'رقم الهاتف مستخدم بالفعل.';
      }
      return new Response(
        JSON.stringify({ error: userFriendlyError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authCreated.user.id;

    // 5. Create matching public.users row with the exact same UUID
    const { data: userProfileData, error: insertProfileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId,
        name: name.trim(),
        phone: cleanPhone,
        role: targetRole,
        status: 'active',
        is_admin_main: targetRole === 'admin' ? Boolean(isAdminMain) : false,
        admin_permissions: targetRole === 'admin' && !isAdminMain ? adminPermissions : null,
        admin_photo_url: adminPhotoUrl || null,
        vehicle_type: targetRole === 'driver' ? (vehicleType || null) : null,
        store_id: targetRole === 'merchant' ? (storeId || null) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, name, phone, role, status, is_admin_main, admin_permissions, admin_photo_url, vehicle_type, store_id, created_at')
      .single();

    if (insertProfileError) {
      // Rollback auth user if profile insert failed to prevent orphan account
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: 'تعذر إنشاء ملف المستخدم في قاعدة البيانات.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return safe user representation (no passwords, no secrets)
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userProfileData.id,
          name: userProfileData.name,
          phone: userProfileData.phone,
          role: userProfileData.role,
          status: userProfileData.status,
          isAdminMain: userProfileData.is_admin_main,
          adminPermissions: userProfileData.admin_permissions,
          adminPhotoUrl: userProfileData.admin_photo_url,
          vehicleType: userProfileData.vehicle_type,
          storeId: userProfileData.store_id,
          createdAt: userProfileData.created_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع أثناء معالجة الطلب.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
