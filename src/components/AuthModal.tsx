import React, { useState } from 'react';
import { X, User as UserIcon, Lock, Phone, KeyRound, CheckCircle2, ShieldCheck, ArrowRight, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { hashValue, verifyHash } from '../lib/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  usersList: User[];
  onRegisterUser: (newUser: User) => void;
  onOpenPartnerApply?: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  usersList,
  onRegisterUser,
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

  // Handle Login for all roles (Admin, Driver, Merchant, Customer)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const trimmedPhone = loginPhone.trim();
      const trimmedPass = loginPass.trim();

      // Check in registered users list from DB/State
      const foundUser = usersList.find(u => u.phone === trimmedPhone);

      // Special check for primary Admin account (01501600192) with default passwords (88226464 or 8822)
      if (trimmedPhone === '01501600192' && (trimmedPass === '88226464' || trimmedPass === '8822')) {
        const passHash = await hashValue('88226464');
        const pinHash = await hashValue('8822');
        const adminUser: User = {
          id: foundUser?.id || 'admin-1',
          name: foundUser?.name || 'مدير النظام (Admin)',
          phone: '01501600192',
          pin: '8822',
          passwordHash: passHash,
          pinHash: pinHash,
          lastPinVerifiedMs: Date.now(),
          role: 'admin',
          status: 'active',
          createdAt: foundUser?.createdAt || new Date().toISOString()
        };
        onLoginSuccess(adminUser);
        onClose();
        return;
      }

      if (foundUser) {
        if (foundUser.status === 'suspended') {
          setError('عفواً، تم إيقاف هذا الحساب مؤقتاً بواسطة الإدارة. يرجى التواصل مع خدمة العملاء.');
          return;
        }

        let isMatch = false;
        if (foundUser.passwordHash) {
          isMatch = await verifyHash(trimmedPass, foundUser.passwordHash);
        }
        if (!isMatch && foundUser.pinHash) {
          isMatch = await verifyHash(trimmedPass, foundUser.pinHash);
        }
        if (!isMatch && foundUser.password) {
          isMatch = foundUser.password === trimmedPass;
        }
        if (!isMatch && foundUser.pin) {
          isMatch = foundUser.pin === trimmedPass;
        }

        if (isMatch) {
          onLoginSuccess({
            ...foundUser,
            lastPinVerifiedMs: Date.now()
          });
          onClose();
          return;
        }
      }

      setError('رقم الهاتف أو كلمة المرور غير صحيحة. يرجى التأكد أو إنشاء حساب جديد.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !phone.trim() || !password.trim() || !pin.trim()) {
      setError('يرجى ملء كافة البيانات المطلوبة.');
      return;
    }

    if (pin.length !== 4) {
      setError('رمز الـ PIN يجب أن يتكون من 4 أرقام بالضبط.');
      return;
    }

    if (pin !== confirmPin) {
      setError('رمز PIN وConfirm PIN غير متطابقين. يرجى إعادة إدخالهما بشكل صحيح.');
      return;
    }

    // Check if phone already registered
    if (usersList.some(u => u.phone === phone.trim())) {
      setError('هذا الرقم مسجل بالفعل! يمكنك تسجيل الدخول مباشرة.');
      return;
    }

    setIsLoading(true);

    try {
      const passHash = await hashValue(password.trim());
      const pinH = await hashValue(pin.trim());

      const newUser: User = {
        id: 'usr-' + Date.now(),
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim(),
        pin: pin.trim(),
        passwordHash: passHash,
        pinHash: pinH,
        lastPinVerifiedMs: Date.now(),
        role: 'customer',
        status: 'active',
        createdAt: new Date().toISOString()
      };

      onRegisterUser(newUser);
      onLoginSuccess(newUser);
      setSuccessMsg('تم إنشاء وتفعيل حسابك بنجاح مع التشفير الآمن!');
      setTimeout(() => {
        onClose();
      }, 1200);
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
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 relative">
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
          <div className="p-6">
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
                        setLoginPass('');
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
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  تسجيل الدخول
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>


              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3.5">
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
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900 dir-ltr text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="اختر كلمة مرور قوية"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* PIN setup */}
                <div className="grid grid-cols-2 gap-3 pt-1">
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
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full pr-9 pl-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-center focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900"
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
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full pr-9 pl-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-center focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 text-[11px] text-orange-900 flex items-center gap-2 mt-1">
                  <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>سيتم تفعيل حسابك فوراً وبشكل تلقائي للبدء في الطلب والاستمتاع بالخصومات!</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm mt-2"
                >
                  إنشاء وتفعيل الحساب الآن
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
