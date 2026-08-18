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

// Production-only deterministic hardening. Keep application UI and catalog
// state untouched during build; those belong to the actual source files.
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

// Never add a browser-side signup/password fallback when the secure signup
// Edge Function is unavailable.
{
  const path = 'src/lib/supabaseService.ts';
  let source = fs.readFileSync(path, 'utf8');
  source = source.replace(/\n\s*\/\/ If Edge Function is not yet deployed remotely \(HTTP 404\), attempt client-side signup fallback[\s\S]*?\n\s*return \{ user: null, error: errorMsg \|\| 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.' \};/, "\n\n      return { user: null, error: errorMsg || 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.' };");
  fs.writeFileSync(path, source);
}
