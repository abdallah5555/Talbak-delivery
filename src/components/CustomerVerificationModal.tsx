import React, { useState } from 'react';
import { X, ShieldCheck, Upload, CheckCircle2, AlertTriangle, FileText, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUserDocs: (idFrontUrl: string, idBackUrl: string) => void;
}

export const CustomerVerificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUserDocs
}) => {
  const [idFront, setIdFront] = useState(currentUser.verificationDocs?.idFrontUrl || '');
  const [idBack, setIdBack] = useState(currentUser.verificationDocs?.idBackUrl || '');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFront || !idBack) return;

    onUpdateUserDocs(idFront, idBack);
    setIsSubmitted(true);
  };

  const status = currentUser.verificationDocs?.status || 'none';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute left-4 top-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-blue-700 p-2.5 shadow-lg flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">توثيق الهوية للحساب</h3>
                <p className="text-blue-100 text-xs mt-0.5">احصل على الشارة الزرقاء والأولوية المطلقة في تنفيذ الطلبات</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {status === 'approved' ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-bold text-slate-900">حسابك موثّق بالكامل!</h4>
                <p className="text-xs text-slate-600">
                  تمت مراجعة بطاقة الرقم القومي واعتماد حسابك بنجاح من قبل إدارة "طلبك دليفري".
                </p>
                <button
                  onClick={onClose}
                  className="bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl text-xs"
                >
                  إغلاق
                </button>
              </div>
            ) : status === 'pending' || isSubmitted ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full mx-auto flex items-center justify-center">
                  <FileText className="w-10 h-10 animate-pulse" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">مستنداتك قيد المراجعة الفورية</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  تم تسليم أوراق بطاقة الرقم القومي للإدارة. سيتم إشعارك فور تغيير حالة التوثيق.
                </p>
                <button
                  onClick={onClose}
                  className="bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl text-xs"
                >
                  حسناً
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {status === 'rejected' && (
                  <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>تم رفض التوثيق السابق: {currentUser.verificationDocs?.rejectReason || 'الصورة غير واضحة. يرجى إعادة رفعها.'}</span>
                  </div>
                )}

                {/* ID Front Upload */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>صورة البطاقة - الوجه الأمامي (وجه الصورة) *</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required={!idFront}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setIdFront(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  />
                  {idFront && (
                    <img src={idFront} alt="وجه البطاقة" className="w-full h-24 object-cover rounded-xl border border-slate-300" />
                  )}
                </div>

                {/* ID Back Upload */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>صورة البطاقة - الوجه الخلفي (الظهر) *</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required={!idBack}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setIdBack(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  />
                  {idBack && (
                    <img src={idBack} alt="ظهر البطاقة" className="w-full h-24 object-cover rounded-xl border border-slate-300" />
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  إرسال وثائق الرقم القومي للتأكيد
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
