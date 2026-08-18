import { TelegramSettings, User, Order, Store, SiteSettings } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

export async function sendTelegramMessage(
  settings: Pick<TelegramSettings, 'chatId'>,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'قاعدة البيانات غير متصلة.' };
  }
  if (!settings.chatId) {
    return { success: false, error: 'رقم الشات أو القناة غير مُعد.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('telegram-notify', {
      body: {
        action: 'test',
        payload: { chatId: settings.chatId, text }
      }
    });
    if (error || !data?.success) {
      return { success: false, error: data?.error || error?.message || 'فشل إرسال الرسالة.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'حدث خطأ أثناء الاتصال بخدمة تيليجرام.' };
  }
}

export async function sendTelegramDataBackup(
  settings: TelegramSettings,
  data: {
    users?: User[];
    orders?: Order[];
    stores?: Store[];
    siteSettings?: SiteSettings;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'قاعدة البيانات غير متصلة.' };
  }
  if (!settings.chatId) {
    return { success: false, error: 'رقم الشات أو القناة غير مُعد.' };
  }

  const usersCount = data.users?.length || 0;
  const ordersCount = data.orders?.length || 0;
  const storesCount = data.stores?.length || 0;
  const totalSales = (data.orders || [])
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  try {
    const { data: result, error } = await supabase.functions.invoke('telegram-notify', {
      body: {
        action: 'backup',
        payload: {
          chatId: settings.chatId,
          usersCount,
          ordersCount,
          storesCount,
          totalSales,
          siteName: data.siteSettings?.siteName || 'طلبك دليفري'
        }
      }
    });
    if (error || !result?.success) {
      return { success: false, error: result?.error || error?.message || 'فشل إرسال تقرير تيليجرام.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'حدث خطأ أثناء إرسال تقرير تيليجرام.' };
  }
}
