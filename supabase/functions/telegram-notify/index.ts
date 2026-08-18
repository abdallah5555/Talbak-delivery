import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const defaultChatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!url || !anonKey || !serviceRoleKey) return json({ error: "Server configuration missing" }, 500);
  if (!botToken) return json({ error: "Telegram bot is not configured on the server" }, 503);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

  const { data: adminRole } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  const { data: activeUser } = await adminClient
    .from("users")
    .select("status")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!adminRole || activeUser?.status !== "active") return json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  const payload = body?.payload || {};
  if (!['test', 'backup'].includes(action)) return json({ error: "Invalid action" }, 400);

  const chatId = String(payload.chatId || defaultChatId || "").trim();
  if (!chatId) return json({ error: "Telegram chat ID is not configured on the server" }, 503);

  let text = "";
  if (action === "test") {
    text = "✅ <b>طلبك دليفري</b> — اختبار اتصال تيليجرام ناجح.";
  } else {
    const usersCount = Number(payload.usersCount || 0);
    const ordersCount = Number(payload.ordersCount || 0);
    const storesCount = Number(payload.storesCount || 0);
    const totalSales = Number(payload.totalSales || 0);
    const siteName = String(payload.siteName || "طلبك دليفري");
    const dateStr = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
    text = [
      `<b>📦 تقرير ${siteName}</b>`,
      `📅 ${dateStr}`,
      `👥 المستخدمون: <b>${usersCount}</b>`,
      `🏪 المتاجر: <b>${storesCount}</b>`,
      `🛍️ الطلبات: <b>${ordersCount}</b>`,
      `💰 المبيعات المكتملة: <b>${totalSales.toLocaleString("ar-EG")} ج.م</b>`,
      "🔐 تم الإرسال من الخادم بعد التحقق من صلاحية الأدمن."
    ].join("\n");
  }

  const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });

  const telegramData = await telegramResponse.json().catch(() => ({}));
  if (!telegramResponse.ok || !telegramData.ok) {
    return json({ error: telegramData?.description || "Telegram send failed" }, 502);
  }

  return json({ success: true });
});
