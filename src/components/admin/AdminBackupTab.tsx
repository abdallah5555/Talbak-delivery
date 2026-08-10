import React from 'react';
import { Download, Database, FileSpreadsheet } from 'lucide-react';

interface Props {
  onExportData: (format: 'json' | 'csv') => void;
}

export const AdminBackupTab: React.FC<Props> = ({ onExportData }) => {
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
      </div>
    </div>
  );
};
