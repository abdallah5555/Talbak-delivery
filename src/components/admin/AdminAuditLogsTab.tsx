import React from 'react';
import { FileText, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuditLog } from '../../types';

interface Props {
  auditLogs: AuditLog[];
  onRevertAuditLog?: (logId: string) => void;
  isMainAdmin?: boolean;
}

export const AdminAuditLogsTab: React.FC<Props> = ({ auditLogs, onRevertAuditLog, isMainAdmin = true }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-400" />
          سجل العمليات والقرارات الإدارية (Audit Logs & Action History)
        </h3>
        <span className="text-[11px] text-slate-400">إجمالي {auditLogs.length} إجراء ممسوك</span>
      </div>

      <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3 font-bold">المسؤول (Actor)</th>
              <th className="p-3 font-bold">الإجراء (Action)</th>
              <th className="p-3 font-bold">الهدف (Target)</th>
              <th className="p-3 font-bold">التفاصيل</th>
              <th className="p-3 font-bold">التاريخ</th>
              <th className="p-3 font-bold text-center">التحكم والتراجع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  لا يوجد سجل عمليات مسجلة حالياً.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/40 transition-colors">
                  <td className="p-3 font-bold text-white">
                    {log.actorName} <span className="text-[10px] text-slate-400">({log.actorRole})</span>
                  </td>
                  <td className="p-3 text-orange-400 font-bold">{log.action}</td>
                  <td className="p-3 text-slate-200 font-mono">{log.target}</td>
                  <td className="p-3 text-slate-400 text-[11px]">{log.details || '-'}</td>
                  <td className="p-3 font-mono text-[10px] text-slate-500">
                    {new Date(log.createdAt).toLocaleString('ar-EG')}
                  </td>
                  <td className="p-3 text-center">
                    {log.reverted ? (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-amber-400" />
                        تم التراجع عن هذا القرار
                      </span>
                    ) : log.canRevert !== false && isMainAdmin && onRevertAuditLog ? (
                      <button
                        onClick={() => onRevertAuditLog(log.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold px-2.5 py-1 rounded-xl text-[11px] transition-all inline-flex items-center gap-1"
                        title="تراجع عن القرار المتخذ"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>تراجع عن القرار</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[10px]">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
