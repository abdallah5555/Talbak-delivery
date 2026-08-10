import React, { useState } from 'react';
import { Store as StoreIcon, Bike, CheckCircle2, XCircle, Phone, Eye, Trash2, X, ZoomIn, ShieldCheck, MapPin, FileText, User } from 'lucide-react';
import { MerchantApplication, DriverApplication } from '../../types';

interface Props {
  type: 'merchants' | 'drivers';
  merchantApps: MerchantApplication[];
  driverApps: DriverApplication[];
  onApproveMerchant: (appId: string) => void;
  onRejectMerchant: (appId: string) => void;
  onApproveDriver: (appId: string) => void;
  onRejectDriver: (appId: string) => void;
  onDeleteMerchantApp?: (appId: string) => void;
  onDeleteDriverApp?: (appId: string) => void;
}

export const AdminApplicationsTab: React.FC<Props> = ({
  type,
  merchantApps,
  driverApps,
  onApproveMerchant,
  onRejectMerchant,
  onApproveDriver,
  onRejectDriver,
  onDeleteMerchantApp,
  onDeleteDriverApp
}) => {
  // Lightbox Modal for documents
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  const handleWhatsApp = (phone: string) => {
    const formatted = phone.replace(/\D/g, '');
    const num = formatted.startsWith('0') ? '2' + formatted : formatted;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent('مرحباً بك من إدارة تطبيق طلبك دليفري!')}`, '_blank');
  };

  if (type === 'merchants') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <StoreIcon className="w-5 h-5 text-orange-400" />
            طلبات انضمام المتاجر والمطاعم ({merchantApps.length})
          </h3>
        </div>

        {merchantApps.length === 0 ? (
          <div className="bg-slate-800/50 p-8 rounded-2xl text-center text-slate-400 text-xs border border-slate-700/50">
            لا توجد طلبات متاجر معلقة أو مسجلة حالياً.
          </div>
        ) : (
          merchantApps.map((app) => (
            <div key={app.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base text-white">{app.storeName}</h4>
                    <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/30 font-bold">
                      {app.businessType} {app.customBusinessType ? `(${app.customBusinessType})` : ''}
                    </span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                      app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      app.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {app.status === 'approved' ? 'مقبول ومعتمد' : app.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>صاحب النشاط: <strong className="text-white">{app.ownerName}</strong></span>
                    <span>•</span>
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>المدينة: <strong className="text-white">{app.city}</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleWhatsApp(app.phone)}
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    title="تواصل عبر الواتساب"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{app.phone}</span>
                  </button>

                  {onDeleteMerchantApp && (
                    <button
                      onClick={() => {
                        if (confirm(`هل أنت متاكد من حذف طلب متجر "${app.storeName}"؟`)) {
                          onDeleteMerchantApp(app.id);
                        }
                      }}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 p-2 rounded-xl text-xs font-bold transition-all"
                      title="حذف الطلب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">رقم الهاتف والتواصل:</span>
                  <span className="font-mono text-white text-sm font-bold dir-ltr block text-right">{app.phone}</span>
                  {app.hasWhatsapp && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      ✓ يدعم الواتساب
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">تاريخ التقديم:</span>
                  <span className="text-slate-200 font-mono text-xs block">
                    {new Date(app.createdAt).toLocaleString('ar-EG')}
                  </span>
                </div>

                {app.notes && (
                  <div className="sm:col-span-2 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-orange-300 font-bold text-[11px] block mb-0.5">ملاحظات التاجر:</span>
                    <p className="text-slate-300 text-xs leading-relaxed">{app.notes}</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {app.status === 'pending' && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onApproveMerchant(app.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>قبول وتفعيل المتجر فوراً</span>
                  </button>
                  <button
                    onClick={() => onRejectMerchant(app.id)}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض الطلب</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // Drivers Tab
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Bike className="w-5 h-5 text-orange-400" />
          طلبات انضمام كباتن التوصيل والاوراق ({driverApps.length})
        </h3>
      </div>

      {driverApps.length === 0 ? (
        <div className="bg-slate-800/50 p-8 rounded-2xl text-center text-slate-400 text-xs border border-slate-700/50">
          لا توجد طلبات كباتن مسجلة حالياً.
        </div>
      ) : (
        driverApps.map((app) => (
          <div key={app.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4 shadow-lg">
            {/* Driver Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-3">
                <div 
                  onClick={() => app.personalPhotoUrl && setSelectedImage({ url: app.personalPhotoUrl, title: `الصورة الشخصية - ${app.fullName}` })}
                  className="w-14 h-14 rounded-2xl bg-slate-700 border-2 border-orange-500/40 overflow-hidden shrink-0 cursor-pointer relative group"
                >
                  {app.personalPhotoUrl ? (
                    <>
                      <img src={app.personalPhotoUrl} alt={app.fullName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Bike className="w-7 h-7" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base text-white">{app.fullName}</h4>
                    <span className="bg-orange-500/20 text-orange-300 text-xs px-2.5 py-0.5 rounded-full border border-orange-500/30 font-bold">
                      {app.vehicleType}
                    </span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                      app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      app.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {app.status === 'approved' ? 'كابتن معتمد' : app.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
                    <span>رقم الموبايل: <strong className="font-mono text-orange-400 text-sm dir-ltr">{app.phone}</strong></span>
                    <span>•</span>
                    <span>المركبة: <strong className="text-white">{app.vehicleBrand || 'مركبة جديدة'} - {app.vehicleModel || ''}</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleWhatsApp(app.phone)}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title="تواصل واتساب"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </button>

                {onDeleteDriverApp && (
                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متاكد من حذف طلب الكابتن "${app.fullName}"؟`)) {
                        onDeleteDriverApp(app.id);
                      }
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 p-2 rounded-xl text-xs font-bold transition-all"
                    title="حذف الطلب"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Vehicle & License Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">رقم اللوحة المعدنية:</span>
                <span className="font-mono text-amber-300 font-bold text-sm block">
                  {app.plateNumber || 'غير محدد'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">حالة الرخصة:</span>
                <span className={`font-bold text-xs ${app.noLicense ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {app.noLicense ? '⚠️ بدون رخصة قيادة' : '✓ يحمل رخصة قيادة معتمدة'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">تاريخ تقديم الطلب:</span>
                <span className="text-slate-300 font-mono text-xs block">
                  {new Date(app.createdAt).toLocaleString('ar-EG')}
                </span>
              </div>
            </div>

            {/* DRIVER PAPERS & DOCUMENTS SECTION */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>المستندات والأوراق المرفقة للكابتن (اضغط لمعاينة الصورة المكبرة):</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Personal Photo */}
                <div 
                  onClick={() => app.personalPhotoUrl && setSelectedImage({ url: app.personalPhotoUrl, title: `الصورة الشخصية - ${app.fullName}` })}
                  className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 hover:border-orange-500/50 transition-all cursor-pointer group"
                >
                  <span className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>1. الصورة الشخصية</span>
                    <Eye className="w-3.5 h-3.5 text-orange-400 group-hover:scale-110 transition-transform" />
                  </span>
                  {app.personalPhotoUrl ? (
                    <div className="h-28 rounded-lg overflow-hidden relative bg-black/40">
                      <img src={app.personalPhotoUrl} alt="الصورة الشخصية" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                        <ZoomIn className="w-4 h-4" />
                        <span>تكبير الصورة</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 text-xs">
                      غير مرفقة
                    </div>
                  )}
                </div>

                {/* Driver License */}
                <div 
                  onClick={() => app.driverLicenseUrl && setSelectedImage({ url: app.driverLicenseUrl, title: `رخصة القيادة - ${app.fullName}` })}
                  className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 hover:border-orange-500/50 transition-all cursor-pointer group"
                >
                  <span className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>2. رخصة القيادة</span>
                    <Eye className="w-3.5 h-3.5 text-orange-400 group-hover:scale-110 transition-transform" />
                  </span>
                  {app.noLicense ? (
                    <div className="h-28 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center p-2 text-center text-amber-300 text-xs font-bold">
                      <span>الكابتن سجل بدون رخصة قيادة</span>
                    </div>
                  ) : app.driverLicenseUrl ? (
                    <div className="h-28 rounded-lg overflow-hidden relative bg-black/40">
                      <img src={app.driverLicenseUrl} alt="رخصة القيادة" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                        <ZoomIn className="w-4 h-4" />
                        <span>معاينة الرخصة</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 text-xs">
                      غير مرفقة
                    </div>
                  )}
                </div>

                {/* Vehicle License */}
                <div 
                  onClick={() => app.vehicleLicenseUrl && setSelectedImage({ url: app.vehicleLicenseUrl, title: `رخصة المركبة - ${app.fullName}` })}
                  className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 hover:border-orange-500/50 transition-all cursor-pointer group"
                >
                  <span className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>3. رخصة المركبة</span>
                    <Eye className="w-3.5 h-3.5 text-orange-400 group-hover:scale-110 transition-transform" />
                  </span>
                  {app.vehicleLicenseUrl ? (
                    <div className="h-28 rounded-lg overflow-hidden relative bg-black/40">
                      <img src={app.vehicleLicenseUrl} alt="رخصة المركبة" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                        <ZoomIn className="w-4 h-4" />
                        <span>معاينة الرخصة</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 text-xs">
                      غير مرفقة
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {app.status === 'pending' && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onApproveDriver(app.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تفعيل الكابتن وتأكيد الأوراق</span>
                </button>
                <button
                  onClick={() => onRejectDriver(app.id)}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>رفض الطلب</span>
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {/* LIGHTBOX MODAL FOR FULL-SCREEN DOCUMENT PREVIEW */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
              <h4 className="font-bold text-sm text-orange-400">{selectedImage.title}</h4>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 flex items-center justify-center overflow-auto bg-black/60">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.title} 
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl border border-slate-700" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

