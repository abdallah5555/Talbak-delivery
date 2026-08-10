import React from 'react';
import { Store as StoreIcon, Bike, CheckCircle2, XCircle, Phone, FileText } from 'lucide-react';
import { MerchantApplication, DriverApplication } from '../../types';

interface Props {
  type: 'merchants' | 'drivers';
  merchantApps: MerchantApplication[];
  driverApps: DriverApplication[];
  onApproveMerchant: (appId: string) => void;
  onRejectMerchant: (appId: string) => void;
  onApproveDriver: (appId: string) => void;
  onRejectDriver: (appId: string) => void;
}

export const AdminApplicationsTab: React.FC<Props> = ({
  type,
  merchantApps,
  driverApps,
  onApproveMerchant,
  onRejectMerchant,
  onApproveDriver,
  onRejectDriver
}) => {
  const handleWhatsApp = (phone: string) => {
    const formatted = phone.replace(/\D/g, '');
    const num = formatted.startsWith('0') ? '2' + formatted : formatted;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent('مرحباً بك من إدارة تطبيق طلبك دليفري!')}`, '_blank');
  };

  if (type === 'merchants') {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
          <StoreIcon className="w-4 h-4 text-orange-400" />
          طلبات انضمام المتاجر والمطاعم ({merchantApps.length})
        </h3>
        {merchantApps.length === 0 ? (
          <div className="bg-slate-800/50 p-6 rounded-2xl text-center text-slate-400 text-xs border border-slate-700/50">
            لا توجد طلبات متاجر معلقة حالياً.
          </div>
        ) : (
          merchantApps.map((app) => (
            <div key={app.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">{app.storeName}</h4>
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                    {app.businessType}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">المالك: {app.ownerName} • المدينة: {app.city}</p>
                {app.notes && <p className="text-[11px] text-slate-400 mt-0.5">ملاحظات: {app.notes}</p>}
                <p className="text-[10px] text-slate-500 font-mono mt-1">{new Date(app.createdAt).toLocaleString('ar-EG')}</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleWhatsApp(app.phone)}
                  className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 p-2 rounded-xl text-xs font-bold transition-all"
                  title="تواصل واتساب"
                >
                  <Phone className="w-4 h-4" />
                </button>
                {app.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onApproveMerchant(app.id)}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>قبول وتفعيل</span>
                    </button>
                    <button
                      onClick={() => onRejectMerchant(app.id)}
                      className="flex-1 sm:flex-none bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>رفض</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
        <Bike className="w-4 h-4 text-orange-400" />
        طلبات انضمام كباتن التوصيل ({driverApps.length})
      </h3>
      {driverApps.length === 0 ? (
        <div className="bg-slate-800/50 p-6 rounded-2xl text-center text-slate-400 text-xs border border-slate-700/50">
          لا توجد طلبات كباتن معلقة حالياً.
        </div>
      ) : (
        driverApps.map((app) => (
          <div key={app.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {app.photoUrl ? (
                <img src={app.photoUrl} alt={app.fullName} className="w-12 h-12 rounded-xl object-cover border border-slate-600" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-slate-400">
                  <Bike className="w-6 h-6" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-sm text-white">{app.fullName}</h4>
                <p className="text-xs text-slate-300 mt-0.5">المركبة: {app.vehicleType} ({app.vehicleModel || 'غير محدد'})</p>
                <p className="text-[11px] text-slate-400">رخصة القيادة: {app.drivingLicenseNumber || 'لا توجد'}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(app.createdAt).toLocaleString('ar-EG')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleWhatsApp(app.phone)}
                className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 p-2 rounded-xl text-xs font-bold transition-all"
                title="تواصل واتساب"
              >
                <Phone className="w-4 h-4" />
              </button>
              {app.status === 'pending' && (
                <>
                  <button
                    onClick={() => onApproveDriver(app.id)}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تفعيل الكابتن</span>
                  </button>
                  <button
                    onClick={() => onRejectDriver(app.id)}
                    className="flex-1 sm:flex-none bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
