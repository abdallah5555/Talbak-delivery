import fs from 'node:fs';

const digitMap = "String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))";

function patch(path, replacements) {
  let source = fs.readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!source.includes(from)) continue;
    source = source.replace(from, to);
  }
  fs.writeFileSync(path, source);
}

// Production-only deterministic hardening. Supabase remains the source of truth
// for users, stores, orders, partner applications and coupons. Local storage is
// intentionally retained only for client preferences/cart UX, never as a fallback
// database for business records.
patch('src/components/AuthModal.tsx', [
  ["const trimmedPhone = phone.trim().replace(/\\D/g, '');", `const trimmedPhone = phone.trim().replace(/[٠-٩]/g, (d) => ${digitMap}).replace(/\\D/g, '');`],
  ["if (trimmedPhone.length < 10 || !trimmedPhone.startsWith('01')) {", "if (!((trimmedPhone.length === 11 && trimmedPhone.startsWith('01')) || (trimmedPhone.length === 13 && trimmedPhone.startsWith('20')))) {"],
  ["        trimmedPhone,\n        trimmedPass,", "        trimmedPhone.startsWith('20') ? '0' + trimmedPhone.slice(2) : trimmedPhone,\n        trimmedPass,"],
  ["onChange={(e) => setPhone(e.target.value)}", `onChange={(e) => setPhone(e.target.value.replace(/[٠-٩]/g, (d) => ${digitMap}))}`],
  ["onChange={(e) => setPin(e.target.value.replace(/\\D/g, ''))}", `onChange={(e) => setPin(e.target.value.replace(/[٠-٩]/g, (d) => ${digitMap}).replace(/\\D/g, ''))}`],
  ["onChange={(e) => setConfirmPin(e.target.value.replace(/\\D/g, ''))}", `onChange={(e) => setConfirmPin(e.target.value.replace(/[٠-٩]/g, (d) => ${digitMap}).replace(/\\D/g, ''))}`]
]);

patch('src/components/PinVerificationModal.tsx', [
  ["onChange={(e) => setPin(e.target.value.replace(/\\D/g, ''))}", `onChange={(e) => setPin(e.target.value.replace(/[٠-٩]/g, (d) => ${digitMap}).replace(/\\D/g, ''))}`]
]);

patch('src/lib/supabaseService.ts', [
  ["import { hashValue, verifyHash } from './auth';", "import { hashValue } from './auth';"],
  ["    // Direct check via stored pin_hash first\n    const { data: userRow } = await supabase\n      .from('users')\n      .select('pin_hash')\n      .eq('id', session.user.id)\n      .maybeSingle();\n\n    if (userRow?.pin_hash) {\n      const isValid = await verifyHash(trimmed, userRow.pin_hash);\n      if (isValid) {\n        await supabase\n          .from('users')\n          .update({ last_pin_verified_at: new Date().toISOString() })\n          .eq('id', session.user.id);\n        return true;\n      }\n    }\n\n    // Try RPC as fallback\n    const hashed = await hashValue(trimmed);\n    const { data, error } = await supabase.rpc('verify_user_pin', { p_pin: trimmed, p_hash: hashed });", "    const { data, error } = await supabase.rpc('verify_user_pin', { p_pin: trimmed });"],
  ["      .from('trusted_devices')\n      .select('id')\n      .eq('user_id', session.user.id)\n      .eq('device_id', deviceId)\n      .is('revoked_at', null)\n      .maybeSingle();", "      .from('trusted_devices')\n      .select('id')\n      .eq('user_id', session.user.id)\n      .eq('device_id', deviceId)\n      .maybeSingle();"],
  ["      last_seen: new Date().toISOString()", "      last_active: new Date().toISOString()"]
]);

// Remove the obsolete browser-side signup fallback. The deployed customer-signup
// Edge Function is the only supported account-creation path; this prevents PIN
// hashing/storage in the browser if the function is temporarily unreachable.
{
  const path = 'src/lib/supabaseService.ts';
  let source = fs.readFileSync(path, 'utf8');
  source = source.replace(/\n\s*\/\/ If Edge Function is not yet deployed remotely \(HTTP 404\), attempt client-side signup fallback[\\s\\S]*?\n\s*return \{ user: null, error: errorMsg \|\| 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.' \};/, "\n\n      return { user: null, error: errorMsg || 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.' };");
  fs.writeFileSync(path, source);
}

patch('src/App.tsx', [
  ["  isSupabaseConfigured, checkTrustedDevice, fetchUserProfileById\n", "  isSupabaseConfigured, checkTrustedDevice, fetchUserProfileById, getCurrentUserSessionProfile\n"],
  ["  const handleLogoutRequest = () => {\n    // PIN verification temporarily disabled - execute logout directly\n    executeLogout();\n  };\n\n  // Security check for Trusted Devices & 48h PIN expiry (Temporarily disabled)\n  useEffect(() => {\n    // PIN verification temporarily disabled\n    return;\n  }, [currentUser?.id]);", `  const handleLogoutRequest = () => {\n    if (!currentUser) return executeLogout();\n    setPinModalMode('logout');\n    setIsPinModalOpen(true);\n  };\n\n  // Security check for Trusted Devices & PIN expiry\n  useEffect(() => {\n    if (!currentUser?.id || authStatus === 'unauthenticated') return;\n    let cancelled = false;\n    (async () => {\n      const device = getDeviceSignature();\n      const trusted = await checkTrustedDevice(device.deviceId);\n      if (cancelled) return;\n      if (!trusted) {\n        setPinModalMode('security');\n        setIsPinModalOpen(true);\n        return;\n      }\n      const sessionProfile = await getCurrentUserSessionProfile();\n      if (cancelled || !sessionProfile.user) return;\n      if (sessionProfile.needsPin) {\n        setPinModalMode('security');\n        setIsPinModalOpen(true);\n      }\n    })().catch((error) => console.warn('[Security] PIN check failed:', error));\n    return () => { cancelled = true; };\n  }, [currentUser?.id, authStatus]);`],
  ["      return saved ? JSON.parse(saved) : initialStores;", "      return [];"],
  ["      return saved ? JSON.parse(saved) : [\n        {\n          id: 'merch-demo-1',\n          storeName: 'كافيه ومشويات السلطان',\n          businessType: 'مطعم',\n          ownerName: 'محمد أحمد',\n          phone: '01020304050',\n          city: 'القاهرة - الدقي',\n          notes: 'مطعم وجبات مشويات وطواجن شرقية',\n          status: 'pending',\n          createdAt: new Date().toISOString()\n        }\n      ];", "      return [];"],
  ["      return saved ? JSON.parse(saved) : [\n        {\n          id: 'driver-demo-1',\n          fullName: 'كابتن ياسر محمود',\n          phone: '01122334455',\n          vehicleType: 'موتوسيكل',\n          vehicleModel: 'دايون 4 - 2023',\n          noLicense: false,\n          drivingLicenseNumber: 'EG-98214',\n          vehicleLicenseNumber: 'M-10293',\n          photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',\n          status: 'pending',\n          createdAt: new Date().toISOString()\n        }\n      ];", "      return [];"],
  ["      return saved ? JSON.parse(saved) : [\n        { id: 'c-1', code: 'TALABAK10', discountType: 'percentage', discountValue: 10, isActive: false, usageLimit: 100, usedCount: 12, createdAt: new Date().toISOString() },\n        { id: 'c-2', code: 'FREE20', discountType: 'fixed', discountValue: 20, isActive: false, usageLimit: 50, usedCount: 5, createdAt: new Date().toISOString() }\n      ];", "      return [];"],
  ["      return saved ? JSON.parse(saved) : [\n        {\n          id: '10928',", "      return [];\n/* production demo order intentionally removed */\n/*"],
  ["        }\n      ];\n    } catch {\n      return [];\n    }\n  });\n\n  const [checkoutDiscount", "        }\n      ]; */\n    } catch {\n      return [];\n    }\n  });\n\n  const [checkoutDiscount"],
  ["  // Auto-clear order history at the start of every month\n  useEffect(() => {\n    try {\n      const currentMonthKey = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;\n      const lastClearedMonth = localStorage.getItem('talabak_last_cleared_month');\n      if (lastClearedMonth !== currentMonthKey) {\n        setOrders([]);\n        localStorage.setItem('talabak_last_cleared_month', currentMonthKey);\n      }\n    } catch (e) {\n      console.error(e);\n    }\n  }, []);\n\n", ""]
]);
