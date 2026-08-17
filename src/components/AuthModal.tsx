import React, { useState } from 'react';
import { X, User as UserIcon, Lock, Phone, KeyRound, CheckCircle2, ShieldCheck, ArrowRight, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { signInWithPhoneAndPassword, signUpWithPhoneAndPassword } from '../lib/supabaseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  usersList: User[];
  onOpenPartnerApply?: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  usersList,
  onOpenPartnerApply
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  // Login State
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  
  // Signup State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Error & Status
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetFormState = () => {
    setLoginPhone('');
    setLoginPass('');
    setName('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setPin('');
    setConfirmPin('');
    setError('');
    setSuccessMsg('');
  };

  React.useEffect(() => {
    if (isOpen) {
      resetFormState();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  if (!isOpen) return null;

  // Handle Real Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const trimmedPhone = loginPhone.trim();
      const trimmedPass = loginPass.trim();

      if (!trimmedPhone || !trimmedPass) {
        setError('يرجى إدخال رقم الهاتف وكلمة المرور.');
        return;
      }

      const { user, error: authErr } = await signInWithPhoneAndPassword(trimmedPhone, trimmedPass);

      if (authErr || !user) {
        setError(authErr || 'رقم الهاتف أو كلمة المرور غير صحيحة.');
        return;
      }

      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError('حدث خطأ غير متوقع أثناء تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Real Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');
    const trimmedPass = password.trim();
    const trimmedConfirmPass = confirmPassword.trim();
    const trimmedPin = pin.trim();
    const trimmedConfirmPin = confirmPin.trim();

    if (!trimmedName || !trimmedPhone || !trimmedPass || !trimmedConfirmPass || !trimmedPin || !trimmedConfirmPin) {
      setError('يرجى ملء كافة البيانات المطلوبة.');
      return;
    }

    // Validations
    if (!((trimmedPhone.length === 11 && trimmedPhone.startsWith('01')) || (trimmedPhone.length === 13 && trimmedPhone.startsWith('20')))) {
      setError('يرجى إدخال رقم هاتف محمول مصري صحيح يبدأ بـ 01 (11 رقم).');
      return;
    }

    if (trimmedPass.length < 6) {
      setError('كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.');
      return;
    }

    if (trimmedPass !== trimmedConfirmPass) {
      setError('كلمة المرور وتأكيد كلمة المرور غير متطابقين.');
      return;
    }

    if (trimmedPin.length !== 4) {
      setError('رمز PIN يجب أن يتكون من 4 أرقام بالضبط.');
      return;
    }

    if (trimmedPin !== trimmedConfirmPin) {
      setError('رمز PIN وتأكيد رمز PIN غير متطابقين.');
      return;
    }

    setIsLoading(true);

    try {
      const { user, error: signUpErr } = await signUpWithPhoneAndPassword(
        trimmedName,
        trimmedPhone.startsWith('20') ? '0' + trimmedPhone.slice(2) : trimmedPhone,
        trimmedPass,
        trimmedPin
      );

      if (signUpErr || !user) {
        setError(signUpErr || 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.');
        return;
      }

      onLoginSuccess(user);
      setSuccessMsg('تم إنشاء وتفعيل حسابك بنجاح مع التشفير الآمن!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError('حدث خطأ غير متوقع أثناء التسجيل.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 relative shrink-0">
            <button
              onClick={handleClose}
              className="absolute left-4 top-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-600 p-2 shadow-lg flex items-center justify-center">
                <img src="/favicon.svg" alt="طلبك دليفري" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">حسابي في "طلبك دليفري"</h3>
                <p className="text-xs text-slate-300">سجل الدخول أو أنشئ حساباً جديداً للطلب والمتابعة</p>
              </div>
            </div>

            {/* Toggle Mode Buttons */}
            <div className="flex bg-slate-800/80 p-1 rounded-2xl mt-4 border border-slate-700">
              <button
                onClick={() => { setMode('login'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'login' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                تسجيل الدخول
              </button>
              <button
                onClick={() => { setMode('signup'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'signup' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                حساب جديد
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-3 flex items-center gap-2">
                <X className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="01xxxxxxxxx"
                      value={loginPhone}
                      onChange={(e) => {
                        setLoginPhone(e.target.value);
                        setError('');
                      }}
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900 dir-ltr text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    <input
                      type={showLoginPass ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: عبد الله محمد"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الموبايل</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="01xxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))}
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900 dir-ltr text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pr-9 pl-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-2 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="تأكيد كلمة المرور"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pr-9 pl-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* PIN setup */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رمز PIN (4 أرقام)</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                      <input
                        type={showPin ? 'text' : 'password'}
                        maxLength={4}
                        required
                        placeholder="1234"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, ''))}
                        className="w-full pr-9 pl-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute left-2 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد رمز PIN</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                      <input
                        type={showPin ? 'text' : 'password'}
                        maxLength={4}
                        required
                        placeholder="1234"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, ''))}
                        className="w-full pr-9 pl-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-200 text-[11px] text-orange-900 flex items-center gap-2 mt-1">
                  <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>تشفير آمن للبيانات عبر Supabase Auth ورمز حماية شخصي.</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm mt-2 disabled:opacity-50"
                >
                  {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء وتفعيل الحساب الآن'}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Partner Apply Link */}
            {onOpenPartnerApply && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenPartnerApply();
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-orange-600 underline transition-colors"
                >
                  تريد الانضمام كـ كابتن توصيل أو صاحب متجر؟ إضغط هنا للتقديم
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
