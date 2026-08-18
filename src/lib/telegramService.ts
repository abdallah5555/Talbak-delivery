import { TelegramSettings, User, Order, Store, SiteSettings } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

async function invokeTelegram(body: unknown): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: 'قاعدة البيانات غير متصلة.' };

  try {
    const { data, error } = await supabase.functions.invoke('telegram-notify', { body });
    if (data?.success) return { success: true };

    // Supabase may only expose a generic "non-2xx" message. Read the response
    // body when available so the admin sees the actual server-side reason.
    let serverError = data?.error as string | undefined;
    const context = (error as any)?.context;
    if (!serverError && context) {
      try {
        const payload = typeof context?.json === 'function' ? await context.json() : null;
        serverError = payload?.error || payload?.message;
      } catch {
        // Keep the generic error below.
      }
    }
    return { success: false, error: serverError || error?.message || 'فشل إرسال رسالة تيليجرام.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'حدث خطأ أثناء الاتصال بخدمة تيليجرام.' };
  }
}

export async function sendTelegramMessage(
  _settings: Partial<TelegramSettings> | string | undefined,
  text?: string,
  legacyText?: string
): Promise<{ success: boolean; error?: string }> {
  const message = legacyText ?? text ?? 'اختبار اتصال تيليجرام من طلبك دليفري.';
  return invokeTelegram({ action: 'test', payload: { text: message } });
}

export async function sendTelegramDataBackup(
  _settings: Partial<TelegramSettings> | undefined,
  data: { users?: User[]; orders?: Order[]; stores?: Store[]; siteSettings?: SiteSettings }
): Promise<{ success: boolean; error?: string }> {
  const usersCount = data.users?.length || 0;
  const ordersCount = data.orders?.length || 0;
  const storesCount = data.stores?.length || 0;
  const totalSales = (data.orders || [])
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return invokeTelegram({
    action: 'backup',
    payload: {
      usersCount,
      ordersCount,
      storesCount,
      totalSales,
      siteName: data.siteSettings?.siteName || 'طلبك دليفري'
    }
  });
}
