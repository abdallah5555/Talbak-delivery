import React, { useState } from 'react';
import { Download, Database, FileSpreadsheet, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { SiteSettings, User, Order, Store } from '../../types';
import { sendTelegramDataBackup } from '../../lib/telegramService';

interface Props {
  onExportData: (format: 'json' | 'csv') => void;
  siteSettings?: SiteSettings;
  usersList?: User[];
  ordersList?: Order[];
  storesList?: Store[];
}

export const AdminBackupTab: React.FC<Props> = ({
  onExportData,
  siteSettings,
  usersList = [],
  ordersList = [],
  storesList = []
}) => {
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramResult, setTelegramResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const telegramConfigured = !!(siteSettings?.telegramSettings?.botToken && siteSettings?.telegramSettings?.chatId);

  const handleSendTelegramBackup = async () => {
    if (!siteSettings?.telegramSettings?.botToken || !siteSettings?.telegramSettings?.chatId) {
      setTelegramResult({ type: 'error', msg: 'إعدادات بوت التليجرام غير مكتملة. يرجى إدخال التوكن والشات ID من قسم الإعدادات أولاً.' });
      return;
    }

    setSendingTelegram(true);
    setTelegramResult(null);

    const res = await sendTelegramDataBackup(
      siteSettings.telegramSettings,
      { users: usersList, orders: ordersList, stores: storesList, siteSettings }
    );

    setSendingTelegram(false);

    if (res.success) {
      setTelegramResult({ type: 'success', msg: 'تم إرسال النسخة الاحتياطية بنجاح إلى قناتك/شات التليجرام! 🚀' });
    } else {
      setTelegramResult({ type: 'error', msg: `فشل الإرسال: ${res.error}` });
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
        <Download className="w-4 h-4 text-orange-400" />
        تصدير واسترجاع النسخ الاحتياطية للبيانات
      </h3>

      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
        <p className="text-xs text-slate-300 leading-relaxed">
          يمكنك تصدير كلاً من سجلات المستخدمين، المتاجر، والطلبات بصيغة JSON أو CSV للنسخ الاحتياطي أو للربط مع أنظمة التحليل والمحاسبة الخارجية.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => onExportData('json')}
            className="bg-slate-900 hover:bg-slate-950 border border-slate-700 hover:border-orange-500 text-white font-bold p-4 rounded-xl text-xs transition-all flex items-center gap-3 text-right"
          >
            <Database className="w-6 h-6 text-orange-400 shrink-0" />
            <div>
              <span className="block font-bold">تصدير كامل البيانات (JSON)</span>
              <span className="text-[10px] text-slate-400">تحتوي كافة الحقول والجداول</span>
            </div>
          </button>

          <button
            onClick={() => onExportData('csv')}
            className="bg-slate-900 hover:bg-slate-950 border border-slate-700 hover:border-emerald-500 text-white font-bold p-4 rounded-xl text-xs transition-all flex items-center gap-3 text-right"
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <span className="block font-bold">ملخص جدول اكسل (CSV)</span>
              <span className="text-[10px] text-slate-400">مناسب لفتح البرامج وحساب الأرقام</span>
            </div>
          </button>
        </div>

        {/* Telegram Backup Quick Button */}
        <div className="border-t border-slate-700 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <Send className="w-4 h-4" />
              <span>إرسال النسخة الاحتياطية إلى التليجرام:</span>
            </span>
            {telegramConfigured ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                البوت متصل ✅
              </span>
            ) : (
              <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                غير متصل
              </span>
            )}
          </div>

          {telegramResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                telegramResult.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {telegramResult.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{telegramResult.msg}</span>
            </div>
          )}

          <button
            onClick={handleSendTelegramBackup}
            disabled={sendingTelegram}
            className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold p-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sendingTelegram ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>إرسال تقرير النسخة الاحتياطية فوراً لرقم/قناة التليجرام</span>
          </button>
        </div>
      </div>
    </div>
  );
};
