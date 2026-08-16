// Supabase Edge Function: send-push-notification
// Implements Standard Web Push (RFC 8291 aes128gcm encryption + RFC 8292 VAPID)
// Uses native Web Crypto API in Deno. Zero paid external services.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// VAPID Configuration
const VAPID_PUBLIC_KEY = Deno.env.get("VITE_VAPID_PUBLIC_KEY") || 
  "BGLb16DpJq802C-UaVjoT7r-_3Jeh4X650BHFIM92D5Xgp8PM43HquIsBU-OZnKA0fVHPSPwE_qum45drBfqKMY";

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@talabak.app";

// Helper: Base64URL encode/decode
function base64UrlEncode(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

// Helper: Generate VAPID JWT
async function generateVapidJwt(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600, // 12 hours
    sub: VAPID_SUBJECT,
  };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import private key in JWK format
  const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY);
  const publicKeyBytes = base64UrlDecode(VAPID_PUBLIC_KEY);

  // Derive uncompressed x and y coordinates from 65-byte public key (starts with 0x04)
  const x = base64UrlEncode(publicKeyBytes.slice(1, 33));
  const y = base64UrlEncode(publicKeyBytes.slice(33, 65));
  const d = base64UrlEncode(privateKeyBytes);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d,
    ext: true,
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = base64UrlEncode(signature);
  return `${unsignedToken}.${encodedSignature}`;
}

// Helper: Encrypt Web Push payload (RFC 8291 aes128gcm)
async function encryptPayload(
  payloadText: string,
  userPublicKeyBase64: string,
  userAuthBase64: string
): Promise<Uint8Array> {
  const userPublicKeyBytes = base64UrlDecode(userPublicKeyBase64);
  const userAuthBytes = base64UrlDecode(userAuthBase64);

  // 1. Generate 16 bytes salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 2. Generate local ephemeral keypair
  const localKeypair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeypair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

  // 3. Import user public key
  const userPublicKey = await crypto.subtle.importKey(
    "raw",
    userPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // 4. Derive shared ECDH secret (32 bytes)
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: userPublicKey },
    localKeypair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // 5. Derive IKM using HKDF with userAuth as salt
  const ecdhInfo = new Uint8Array([
    ...new TextEncoder().encode("WebPush: info\0"),
    ...userPublicKeyBytes,
    ...localPublicKeyBytes,
  ]);

  const authKey = await crypto.subtle.importKey(
    "raw",
    userAuthBytes,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const ikmBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: sharedSecret,
      info: ecdhInfo,
    },
    authKey,
    256
  );
  const ikm = new Uint8Array(ikmBits);

  // 6. Derive CEK and Nonce using salt and IKM
  const prkKey = await crypto.subtle.importKey(
    "raw",
    ikm,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const cekBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: cekInfo,
    },
    prkKey,
    128 // 16 bytes for AES-128
  );

  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: nonceInfo,
    },
    prkKey,
    96 // 12 bytes for GCM nonce
  );

  const cek = await crypto.subtle.importKey(
    "raw",
    cekBits,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // 7. Pad plaintext with single 0x02 delimiter byte at end (RFC 8291)
  const plainBytes = new TextEncoder().encode(payloadText);
  const paddedPlaintext = new Uint8Array(plainBytes.length + 1);
  paddedPlaintext.set(plainBytes);
  paddedPlaintext[plainBytes.length] = 2;

  // 8. Encrypt plaintext
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBits), tagLength: 128 },
    cek,
    paddedPlaintext
  );

  // 9. Build standard aes128gcm body:
  // salt (16 bytes) + rs (4 bytes = 4096 = 0x00 0x00 0x10 0x00) + idlen (1 byte = 65) + localPublicKey (65 bytes) + ciphertext
  const recordSize = 4096;
  const rsBytes = new Uint8Array([
    (recordSize >> 24) & 0xff,
    (recordSize >> 16) & 0xff,
    (recordSize >> 8) & 0xff,
    recordSize & 0xff,
  ]);

  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyBytes.length);
  header.set(salt, 0);
  header.set(rsBytes, 16);
  header.set([localPublicKeyBytes.length], 20);
  header.set(localPublicKeyBytes, 21);

  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header, 0);
  result.set(new Uint8Array(encrypted), header.length);

  return result;
}

// Main HTTP Handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase server credentials." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing VAPID_PRIVATE_KEY secret on server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    const {
      userId,
      userIds,
      role,
      title = "طلبك دليفري 🛵",
      body: messageBody,
      message,
      url = "/",
      orderId,
      type = "general",
      isReligious = false,
    } = body;

    const finalMessage = messageBody || message || "لديك إشعار جديد في تطبيق طلبك دليفري";

    // 0. Authorization check: Broadcast / multi-user push is strictly restricted to admins
    const isBroadcast = role === "all" || (userIds && userIds.length > 1);
    if (isBroadcast) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Broadcast requires authenticated admin session." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "").trim();
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !user) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Invalid authentication token." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!userData || userData.role !== "admin") {
        return new Response(
          JSON.stringify({ success: false, error: "Forbidden: Broadcast requires admin role." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 1. Fetch target subscriptions from push_subscriptions table
    let query = supabaseAdmin.from("push_subscriptions").select("*");

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      query = query.in("user_id", userIds);
    } else if (role && role !== "all") {
      query = query.eq("role", role);
    }

    const { data: subscriptions, error: fetchErr } = await query;

    if (fetchErr) {
      console.error("[send-push] Fetch subscriptions error:", fetchErr);
    }

    const payloadObj = {
      title,
      body: finalMessage,
      message: finalMessage,
      url,
      orderId,
      type,
      isReligious,
      timestamp: Date.now(),
    };
    const payloadString = JSON.stringify(payloadObj);

    let sentCount = 0;
    let failedCount = 0;

    // 2. Iterate and send to each subscription endpoint
    if (subscriptions && subscriptions.length > 0) {
      const promises = subscriptions.map(async (sub) => {
        try {
          const endpointUrl = new URL(sub.endpoint);
          const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
          const vapidJwt = await generateVapidJwt(audience);

          const encryptedBody = await encryptPayload(
            payloadString,
            sub.p256dh,
            sub.auth
          );

          const res = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "TTL": "86400",
              "Urgency": "high",
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              "Authorization": `vapid t=${vapidJwt}, k=${VAPID_PUBLIC_KEY}`,
            },
            body: encryptedBody,
          });

          if (res.status === 201 || res.status === 200 || res.status === 202) {
            sentCount++;
          } else if (res.status === 404 || res.status === 410) {
            // Subscription expired or unregistered -> remove from database
            failedCount++;
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          } else {
            console.warn(`[send-push] Push endpoint returned status ${res.status}:`, await res.text());
            failedCount++;
          }
        } catch (subErr) {
          console.error("[send-push] Error sending to sub:", subErr);
          failedCount++;
        }
      });

      await Promise.all(promises);
    }

    // 3. Insert notification in public.notifications for in-app history
    if (userId) {
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title,
        message: finalMessage,
        type,
        is_read: false,
      });
    } else if (userIds && Array.isArray(userIds)) {
      const rows = userIds.map((uid) => ({
        user_id: uid,
        title,
        message: finalMessage,
        type,
        is_read: false,
      }));
      await supabaseAdmin.from("notifications").insert(rows);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: subscriptions?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[send-push] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Failed to process push request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
