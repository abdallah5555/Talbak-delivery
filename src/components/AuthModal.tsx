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

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, onLoginSuccess, onOpenPartnerApply }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetFormState = () => {
    setLoginPhone(''); setLoginPass(''); setName(''); setPhone('');
    setPassword(''); setConfirmPassword(''); setPin(''); setConfirmPin('');
    setError(''); setSuccessMsg('');
  };

  React.useEffect(() => { if (isOpen) resetFormState(); }, [isOpen]);

  const handleClose = () => { resetFormState(); onClose(); };
  const normalizeDigits = (value: string) => value.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      const trimmedPhone = normalizeDigits(loginPhone).trim();
      const trimmedPass = loginPass.trim();
      if (!trimmedPhone || !trimmedPass) { setError('يرجى إدخال رقم الهاتف وكلمة المرور.'); return; }
      const { user, error: authErr } = await signInWithPhoneAndPassword(trimmedPhone, trimmedPass);
      if (authErr || !user) { setError(authErr || 'رقم الهاتف أو كلمة المرور غير صحيحة.'); return; }
      onLoginSuccess(user); onClose();
    } catch { setError('حدث خطأ غير متوقع أثناء تسجيل الدخول.'); }
    finally { setIsLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const trimmedName = name.trim();
    const trimmedPhone = normalizeDigits(phone).trim().replace(/\D/g, '');
    const trimmedPass = password.trim();
    const trimmedConfirmPass = confirmPassword.trim();
    const trimmedPin = normalizeDigits(pin).trim().replace(/\D/g, '');
    const trimmedConfirmPin = normalizeDigits(confirmPin).trim().replace(/\D/g, '');

    if (!trimmedName || !trimmedPhone || !trimmedPass || !trimmedConfirmPass || !trimmedPin || !trimmedConfirmPin) {
      setError('يرجى ملء كافة البيانات المطلوبة.'); return;
    }
    if (!((trimmedPhone.length === 11 && trimmedPhone.startsWith('01')) || (trimmedPhone.length === 13 && trimmedPhone.startsWith('20')))) {
      setError('يرجى إدخال رقم هاتف محمول مصري صحيح يبدأ بـ 01 (11 رقم).'); return;
    }
    if (trimmedPass.length < 6) { setError('كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.'); return; }
    if (trimmedPass !== trimmedConfirmPass) { setError('كلمة المرور وتأكيد كلمة المرور غير متطابقين.'); return; }
    if (trimmedPin.length !== 4) { setError('رمز PIN يجب أن يتكون من 4 أرقام بالضبط.'); return; }
    if (trimmedPin !== trimmedConfirmPin) { setError('رمز PIN وتأكيد رمز PIN غير متطابقين.'); return; }

    setIsLoading(true);
    try {
      const { user, error: signUpErr } = await signUpWithPhoneAndPassword(
        trimmedName,
        trimmedPhone.startsWith('20') ? '0' + trimmedPhone.slice(2) : trimmedPhone,
        trimmedPass,
        trimmedPin
      );
      if (signUpErr || !user) { setError(signUpErr || 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.'); return; }
      onLoginSuccess(user);
      setSuccessMsg('تم إنشاء وتفعيل حسابك بنجاح!');
      setTimeout(onClose, 1000);
    } catch { setError('حدث خطأ غير متوقع أثناء التسجيل.'); }
    finally { setIsLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: .96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96, y: 18 }} className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[92vh]">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-5 sm:p-6 relative shrink-0">
            <button aria-label="إغلاق" onClick={handleClose} className="absolute left-4 top-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 pr-1">
              <div className="w-12 h-12 rounded-2xl bg-orange-600 p-2 shadow-lg flex items-center justify-center"><img src="/favicon.svg" alt="طلبك دليفري" className="w-full h-full object-contain" /></div>
              <div><h3 className="text-lg font-bold">أهلاً بيك في طلبك دليفري 👋</h3><p className="text-xs text-slate-300 mt-1">سجّل حسابك وابدأ طلبك بسهولة.</p></div>
            </div>

            <div className="mt-5 rounded-2xl bg-white/10 border border-white/10 p-3 text-center">
              <p className="text-sm font-bold">أول مرة تستخدم طلبك دليفري؟</p>
              <button type="button" onClick={() => { setMode('signup'); setError(''); }} className="mt-2 w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold shadow-lg active:scale-[.98] transition-all flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" /> إنشاء حساب جديد
              </button>
              <p className="text-[11px] text-slate-300 mt-2">مش هتحتاج تدور على زر التسجيل — اضغط هنا وابدأ.</p>
            </div>

            <div className="flex bg-slate-800/80 p-1 rounded-2xl mt-4 border border-slate-700">
              <button type="button" onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${mode === 'login' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'}`}><LogIn className="w-4 h-4" /> تسجيل الدخول</button>
              <button type="button" onClick={() => { setMode('signup'); setError(''); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${mode === 'signup' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}><UserPlus className="w-4 h-4" /> حساب جديد</button>
            </div>
          </div>

          <div className="p-5 sm:p-6 overflow-y-auto">
            {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-3 flex items-center gap-2"><X className="w-4 h-4 shrink-0 text-red-500" /><span>{error}</span></div>}
            {successMsg && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl p-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="rounded-2xl bg-orange-50 border border-orange-100 p-3"><p className="text-sm font-bold text-slate-900">عندك حساب بالفعل؟</p><p className="text-xs text-slate-600 mt-1">اكتب رقم موبايلك وكلمة المرور للدخول.</p></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الهاتف</label><div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" /><input type="tel" required inputMode="numeric" placeholder="01xxxxxxxxx" value={loginPhone} onChange={e => { setLoginPhone(e.target.value); setError(''); }} className="w-full pr-10 pl-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900 dir-ltr text-right" /></div></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور</label><div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" /><input type={showLoginPass ? 'text' : 'password'} required placeholder="كلمة المرور" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full pr-10 pl-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900" /><button type="button" onClick={() => setShowLoginPass(v => !v)} className="absolute left-3 top-3 text-slate-400">{showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                <button type="submit" disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all active:scale-[.98] flex items-center justify-center gap-2 disabled:opacity-50">{isLoading ? 'جاري التحقق...' : 'دخول إلى حسابي'}<ArrowRight className="w-4 h-4 rotate-180" /></button>
                <button type="button" onClick={() => { setMode('signup'); setError(''); }} className="w-full border-2 border-slate-200 hover:border-orange-300 text-slate-800 font-bold py-3 rounded-2xl transition-colors">أنا جديد — إنشاء حساب</button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3"><p className="text-sm font-extrabold text-slate-900">إنشاء حسابك في خطوات بسيطة ✨</p><p className="text-xs text-slate-600 mt-1">اكتب بياناتك مرة واحدة وبعدها تقدر تطلب بسهولة.</p></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل</label><div className="relative"><UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" /><input required type="text" placeholder="مثال: عبدالله عمرو" value={name} onChange={e => setName(e.target.value)} className="w-full pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900" /></div></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">رقم الموبايل</label><div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" /><input required type="tel" inputMode="numeric" placeholder="01xxxxxxxxx" value={phone} onChange={e => setPhone(normalizeDigits(e.target.value))} className="w-full pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900 dir-ltr text-right" /></div></div>
                <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label><div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" /><input required type={showPassword ? 'text' : 'password'} placeholder="6 أحرف على الأقل" value={password} onChange={e => setPassword(e.target.value)} className="w-full pr-9 pl-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-2 top-3 text-slate-400">{showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div><div><label className="block text-xs font-bold text-slate-700 mb-1">تأكيدها</label><input required type={showPassword ? 'text' : 'password'} placeholder="كررها" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900" /></div></div>
                <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-bold text-slate-700 mb-1">PIN (4 أرقام)</label><div className="relative"><KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" /><input required maxLength={4} inputMode="numeric" type={showPin ? 'text' : 'password'} placeholder="1234" value={pin} onChange={e => setPin(normalizeDigits(e.target.value).replace(/\D/g, ''))} className="w-full pr-9 pl-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900" /><button type="button" onClick={() => setShowPin(v => !v)} className="absolute left-2 top-3 text-slate-400">{showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div><div><label className="block text-xs font-bold text-slate-700 mb-1">تأكيد PIN</label><input required maxLength={4} inputMode="numeric" type={showPin ? 'text' : 'password'} placeholder="1234" value={confirmPin} onChange={e => setConfirmPin(normalizeDigits(e.target.value).replace(/\D/g, ''))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900" /></div></div>
                <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-200 text-[11px] text-orange-900 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" /><span>بياناتك محمية عبر Supabase Auth ورمز حماية شخصي.</span></div>
                <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all active:scale-[.98] flex items-center justify-center gap-2 disabled:opacity-50">{isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء حسابي الآن'}<CheckCircle2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => { setMode('login'); setError(''); }} className="w-full border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-2xl">عندي حساب بالفعل — تسجيل الدخول</button>
              </form>
            )}

            {onOpenPartnerApply && <div className="mt-4 pt-4 border-t border-slate-100 text-center"><button type="button" onClick={() => { handleClose(); onOpenPartnerApply(); }} className="text-xs font-bold text-slate-600 hover:text-orange-600 underline">تريد الانضمام ككابتن توصيل أو صاحب متجر؟ إضغط هنا للتقديم</button></div>}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
