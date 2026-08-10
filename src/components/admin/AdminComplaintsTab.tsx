import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Complaint } from '../../types';

interface Props {
  complaints: Complaint[];
}

export const AdminComplaintsTab: React.FC<Props> = ({ complaints }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        قائمة بلاغات وشكاوى العملاء ({complaints.length})
      </h3>
      {complaints.length === 0 ? (
        <div className="bg-slate-800/50 p-6 rounded-2xl text-center text-slate-400 text-xs border border-slate-700/50">
          لا توجد شكاوى أو بلاغات مسجلة حالياً.
        </div>
      ) : (
        complaints.map((c) => (
          <div key={c.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex justify-between items-start text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{c.customerName}</span>
                <span className="text-slate-400 font-mono">({c.customerPhone})</span>
              </div>
              <p className="text-slate-300 mt-1">{c.description}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-1">{new Date(c.createdAt).toLocaleString('ar-EG')}</p>
            </div>
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
              c.status === 'open' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {c.status === 'open' ? 'قيد المتابعة' : 'تم الحل'}
            </span>
          </div>
        ))
      )}
    </div>
  );
};
