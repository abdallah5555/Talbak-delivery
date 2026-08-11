import { TelegramSettings, User, Order, Store, SiteSettings } from '../types';

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return { success: false, error: 'يرجى إدخال توكن البوت ورقم الشات (Chat ID) أولاً.' };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: text,
        parse_mode: 'HTML',
      }),
    });

    const resData = await response.json();
    if (resData.ok) {
      return { success: true };
    } else {
      return { success: false, error: resData.description || 'فشل إرسال الرسالة من بوت التليجرام.' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'حدث خطأ في الاتصال بسيرفرات تليجرام.' };
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
  if (!settings.botToken || !settings.chatId) {
    return { success: false, error: 'إعدادات تليجرام غير مكتملة (التوكن أو الشات ID مفقود).' };
  }

  const dateStr = new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
  const usersCount = data.users?.length || 0;
  const ordersCount = data.orders?.length || 0;
  const storesCount = data.stores?.length || 0;
  const totalSales = (data.orders || [])
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const backupText = `
<b>📦 تقرير والنسخة الاحتياطية - منصة ${data.siteSettings?.siteName || 'طلبك دليفري'}</b>

<b>📅 التاريخ والوقت:</b> ${dateStr}

<b>📊 ملخص إحصائيات النظام:</b>
• 👥 إجمالي المستخدمين: <b>${usersCount}</b>
• 🏪 إجمالي المتاجر والأنشطة: <b>${storesCount}</b>
• 🛍️ إجمالي الطلبات المسجلة: <b>${ordersCount}</b>
• 💰 إجمالي المبيعات المكتملة: <b>${totalSales.toLocaleString('ar-EG')} ج.م</b>

<b>⚡ تم توليد هذا التقرير التلقائي بنجاح من لوحة تحكم الأدمن الرئيسي.</b>
  `.trim();

  return await sendTelegramMessage(settings.botToken, settings.chatId, backupText);
}
