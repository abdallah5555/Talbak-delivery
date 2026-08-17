import React, { useState } from 'react';
import { KeyRound, ShieldAlert, ArrowRight, X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { verifyUserPinServer, registerTrustedDeviceServer } from '../lib/supabaseService';
import { getDeviceSignature } from '../lib/auth';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  userName?: string;
  userPhone?: string;
  title?: string;
  description?: string;
  isLogoutMode?: boolean;
}

export const PinVerificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  userName,
  userPhone,
  title,
  description,
  isLogoutMode = false
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSecs, setLockoutSecs] = useState(0);

  React.useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setAttempts(0);
      setIsLoading(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    let timer: any;
    if (lockoutSecs > 0) {
      timer = setInterval(() => {
        setLockoutSecs((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSecs]);

  if (!isOpen) return null;

  const handleSubmitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSecs > 0 || isLoading) return;

    if (pin.length !== 4) {
      setError('يرجى إدخال رمز PIN المكون من 4 أرقام.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const isVerified = await verifyUserPinServer(pin);

      if (isVerified) {
        if (!isLogoutMode) {
          // Register device as trusted only during normal security verification
          const deviceInfo = getDeviceSignature();
          await registerTrustedDeviceServer(
            deviceInfo.deviceId,
            deviceInfo.deviceName,
            deviceInfo.browser,
            deviceInfo.platform
          );
        }

        setPin('');
        setAttempts(0);
        setError('');
        onSuccess();
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setPin('');

        if (nextAttempts >= 3) {
          setLockoutSecs(30);
          setError('تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار 30 ثانية.');
        } else {
          setError(`رمز PIN غير صحيح. باقي ${3 - nextAttempts} محاولات.`);
        }
      }
    } catch (err) {
      setError('حدث خطأ أثناء التحقق من رمز PIN. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-6 flex flex-col items-center text-center"
        >
          {onClose && (
            <button
              onClick={onClose}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {title || 'التحقق من الهوية (PIN)'}
          </h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            {description ? (
              description
            ) : (
              <>
                {userName ? `مرحباً ${userName}` : 'حماية إضافية لحسابك'}
                <br />
                يرجى إدخال رمز الـ PIN المكون من 4 أرقام لتأكيد الدخول للجهاز.
              </>
            )}
          </p>

          {error && (
            <div className="w-full mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-2.5 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmitPin} className="w-full space-y-4">
            <div className="relative">
              <input
                type="password"
                maxLength={4}
                required
                disabled={lockoutSecs > 0 || isLoading}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, ''))}
                className="w-full text-center tracking-[1em] text-2xl font-mono py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900"
              />
            </div>

            {lockoutSecs > 0 ? (
              <div className="text-xs font-bold text-orange-600 flex items-center justify-center gap-1.5 bg-orange-50 py-2.5 rounded-xl border border-orange-200">
                <Lock className="w-4 h-4" />
                <span>إعادة المحاولة بعد {lockoutSecs} ثانية</span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={pin.length !== 4 || isLoading}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                {isLoading ? 'جاري التحقق...' : 'تأكيد الـ PIN'}
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
