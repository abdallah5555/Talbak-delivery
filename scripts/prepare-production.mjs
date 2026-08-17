import fs from 'node:fs';

const arabicDigits = "[٠-٩]";
const digitMap = "String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))";

function patch(path, replacements) {
  let source = fs.readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!source.includes(from)) continue;
    source = source.replace(from, to);
  }
  fs.writeFileSync(path, source);
}

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

patch('src/lib/pushNotificationService.ts', [
  ["    let sub = await reg.pushManager.getSubscription();", `    let sub = await reg.pushManager.getSubscription();\n    const vapidVersion = VAPID_PUBLIC_KEY;\n    const storedVapidVersion = localStorage.getItem('talabak_vapid_public_key');\n    if (sub && storedVapidVersion !== vapidVersion) {\n      try {\n        await sub.unsubscribe();\n        await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);\n      } catch (migrationError) {\n        console.warn('[PushService] VAPID key migration cleanup failed:', migrationError);\n      }\n      sub = null;\n    }`],
  ["    saveNotificationPreferences({ pushEnabled: true });", "    localStorage.setItem('talabak_vapid_public_key', vapidVersion);\n    saveNotificationPreferences({ pushEnabled: true });"]
]);

patch('src/lib/supabaseService.ts', [
  ["    // Direct check via stored pin_hash first\n    const { data: userRow } = await supabase\n      .from('users')\n      .select('pin_hash')\n      .eq('id', session.user.id)\n      .maybeSingle();\n\n    if (userRow?.pin_hash) {\n      const isValid = await verifyHash(trimmed, userRow.pin_hash);\n      if (isValid) {\n        await supabase\n          .from('users')\n          .update({ last_pin_verified_at: new Date().toISOString() })\n          .eq('id', session.user.id);\n        return true;\n      }\n    }\n\n    // Try RPC as fallback\n    const hashed = await hashValue(trimmed);\n    const { data, error } = await supabase.rpc('verify_user_pin', { p_pin: trimmed, p_hash: hashed });", "    // Verify only inside PostgreSQL against the stored hash; never expose pin_hash to the browser.\n    const { data, error } = await supabase.rpc('verify_user_pin', { p_pin: trimmed, p_hash: null });"],
  ["      .from('trusted_devices')\n      .select('id')\n      .eq('user_id', session.user.id)\n      .eq('device_id', deviceId)\n      .is('revoked_at', null)\n      .maybeSingle();", "      .from('trusted_devices')\n      .select('id')\n      .eq('user_id', session.user.id)\n      .eq('device_id', deviceId)\n      .maybeSingle();"],
  ["      last_seen: new Date().toISOString()", "      last_active: new Date().toISOString()"]
]);

patch('src/App.tsx', [
  ["  isSupabaseConfigured, checkTrustedDevice, fetchUserProfileById\n", "  isSupabaseConfigured, checkTrustedDevice, fetchUserProfileById, getCurrentUserSessionProfile\n"],
  ["  const handleLogoutRequest = () => {\n    // PIN verification temporarily disabled - execute logout directly\n    executeLogout();\n  };\n\n  // Security check for Trusted Devices & 48h PIN expiry (Temporarily disabled)\n  useEffect(() => {\n    // PIN verification temporarily disabled\n    return;\n  }, [currentUser?.id]);", `  const handleLogoutRequest = () => {\n    if (!currentUser) return executeLogout();\n    setPinModalMode('logout');\n    setIsPinModalOpen(true);\n  };\n\n  // Security check for Trusted Devices & 48h PIN expiry\n  useEffect(() => {\n    if (!currentUser?.id || authStatus === 'unauthenticated') return;\n    let cancelled = false;\n    (async () => {\n      const device = getDeviceSignature();\n      const trusted = await checkTrustedDevice(device.deviceId);\n      if (cancelled) return;\n      if (!trusted) {\n        setPinModalMode('security');\n        setIsPinModalOpen(true);\n        return;\n      }\n      const sessionProfile = await getCurrentUserSessionProfile();\n      if (cancelled || !sessionProfile.user) return;\n      if (sessionProfile.needsPin) {\n        setPinModalMode('security');\n        setIsPinModalOpen(true);\n      }\n    })().catch((error) => console.warn('[Security] PIN check failed:', error));\n    return () => { cancelled = true; };\n  }, [currentUser?.id, authStatus]);`]
]);
