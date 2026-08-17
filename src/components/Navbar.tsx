import React, { useEffect, useState } from 'react';
import { Search, Download, ShoppingBag, User as UserIcon, ShieldCheck, LogOut, Sparkles, Bell, ChevronDown, ArrowLeft, CheckCircle2, Repeat2 } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface Props {
  cartCount: number;
  onOpenCart: () => void;
  onOpenInstallGuide: () => void;
  onOpenShare: () => void;
  onOpenVercelGuide: () => void;
  onOpenAuth: () => void;
  onOpenPartnerApply: () => void;
  onOpenAdminDashboard: () => void;
  onOpenWassalni?: () => void;
  currentUser: User | null;
  onRoleChange?: (role: Role) => void;
  onLogout: () => void;
  isInstalled: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeAddress: string;
  onChangeAddress: () => void;
  siteName?: string;
  slogan?: string;
  logoUrl?: string;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
}

type Role = User['role'];
const roleLabels: Record<Role, string> = { customer: 'عميل', driver: 'طيار', merchant: 'تاجر', admin: 'إدارة' };
const roleDescriptions: Record<Role, string> = { customer: 'تصفح واطلب من المتاجر', driver: 'استقبل الطلبات ووصلها', merchant: 'أدر متجرك وطلباتك', admin: 'إدارة وتشغيل المنصة' };

export const Navbar: React.FC<Props> = ({
  cartCount, onOpenCart, onOpenInstallGuide, onOpenShare, onOpenVercelGuide, onOpenAuth, onOpenPartnerApply,
  onOpenAdminDashboard, onOpenWassalni, currentUser, onRoleChange, onLogout, isInstalled, searchQuery, setSearchQuery,
  activeAddress, onChangeAddress, siteName = 'طلبك دليفري', slogan = 'أسرع دليفري يوصلك لحد باب البيت ⚡',
  logoUrl = '/favicon.svg', unreadNotificationsCount = 0, onOpenNotifications
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadRoles() {
      if (!currentUser?.id || !supabase) { setRoles([]); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', currentUser.id);
      if (cancelled) return;
      const next = (data || []).map((row: { role: string }) => row.role as Role).filter((r) => ['customer', 'driver', 'merchant', 'admin'].includes(r));
      if (!next.includes(currentUser.role)) next.push(currentUser.role);
      setRoles(Array.from(new Set(next)));
    }
    loadRoles().catch(() => setRoles([currentUser?.role].filter(Boolean) as Role[]));
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.role]);

  const switchRole = (role: Role) => {
    if (!currentUser || !roles.includes(role) || role === currentUser.role) return;
    localStorage.setItem('talabak_active_role', role);
    onRoleChange?.(role);
    setRoleMenuOpen(false);
  };

  const isDriverMode = currentUser?.role === 'driver';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs max-w-full overflow-visible">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 max-w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 p-1 sm:p-1.5 shadow-md shadow-orange-500/20 flex items-center justify-center shrink-0"><img src={logoUrl} alt={siteName} className="w-full h-full object-contain" /></div>
            <div className="min-w-0"><h1 className="font-extrabold text-xs sm:text-lg tracking-tight text-slate-900 leading-none truncate">{siteName}</h1><div className="hidden sm:flex items-center gap-1 text-orange-600 text-[11px] sm:text-xs mt-0.5 font-bold"><Sparkles className="w-3 h-3 text-amber-500 shrink-0" /><span className="truncate max-w-[280px]">{slogan}</span></div></div>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-2 relative"><Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث عن مطعم، أكلة، سوبرماركت أو منتج..." className="w-full bg-slate-100/80 focus:bg-white text-xs font-medium pr-10 pl-4 py-2.5 rounded-2xl border border-transparent focus:border-orange-500 focus:outline-hidden transition-all shadow-inner text-slate-900" /></div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!isDriverMode && onOpenWassalni && <button onClick={onOpenWassalni} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 animate-pulse shrink-0"><span>وصّلي ⚡</span></button>}
            {currentUser?.role === 'admin' && <button onClick={onOpenAdminDashboard} className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 text-[11px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow transition-all active:scale-95 shrink-0"><ShieldCheck className="w-3.5 h-3.5 text-orange-500" /><span className="hidden sm:inline">لوحة التحكم</span><span className="sm:hidden">أدمن</span></button>}
            {currentUser && onOpenNotifications && <button id="navbar-notification-bell-btn" onClick={onOpenNotifications} aria-label={unreadNotificationsCount > 0 ? `الإشعارات (${unreadNotificationsCount} غير مقروء)` : 'الإشعارات'} title="الإشعارات" className="relative bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 p-2 sm:px-2.5 sm:py-2 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 border border-slate-200"><Bell className="w-4 h-4" />{unreadNotificationsCount > 0 && <span id="navbar-unread-notifications-badge" className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center shadow-xs animate-pulse">{unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}</span>}</button>}

            {currentUser ? (
              <div className="relative flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-1.5 sm:px-2.5 py-1 sm:py-1.5 shrink min-w-0">
                {roles.length > 1 && (
                  <div className="relative">
                    <button type="button" onClick={() => setRoleMenuOpen(v => !v)} aria-expanded={roleMenuOpen} className="flex items-center gap-1.5 bg-white border-2 border-orange-200 hover:border-orange-400 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-extrabold text-slate-800 shadow-sm transition-all" title="تبديل وضع الحساب">
                      <Repeat2 className="w-3.5 h-3.5 text-orange-600" /><span>الوضع: {roleLabels[currentUser.role]}</span><ChevronDown className={`w-3.5 h-3.5 transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {roleMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 z-[100] w-[230px] max-w-[calc(100vw-16px)] bg-white border border-slate-200 rounded-2xl shadow-2xl p-2">
                        <div className="px-2 py-1.5 mb-1 border-b border-slate-100"><div className="text-xs font-extrabold text-slate-900">اختار وضع الحساب</div><div className="text-[10px] font-semibold text-slate-500 mt-0.5">التبديل يتم فورًا بدون تسجيل خروج</div></div>
                        {roles.map(role => {
                          const active = role === currentUser.role;
                          return <button key={role} type="button" disabled={active} onClick={() => switchRole(role)} className={`w-full text-right px-2.5 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${active ? 'bg-orange-50 text-orange-700 cursor-default' : 'text-slate-700 hover:bg-slate-50 hover:border-orange-200'}`}>
                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{active ? <CheckCircle2 className="w-4 h-4" /> : <Repeat2 className="w-4 h-4" />}</span>
                            <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold">{roleLabels[role]}{active ? ' (الوضع الحالي)' : ''}</span><span className="block text-[10px] font-semibold text-slate-500 mt-0.5">{roleDescriptions[role]}</span></span>
                          </button>;
                        })}
                      </div>
                    )}
                  </div>
                )}
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate max-w-[65px] sm:max-w-[110px]">{currentUser.name}</span>
                <button onClick={onLogout} title="تسجيل الخروج" className="text-slate-400 hover:text-red-600 p-0.5 transition-colors shrink-0"><LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></button>
              </div>
            ) : <button onClick={onOpenAuth} className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white text-[11px] sm:text-sm font-extrabold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-95 shrink-0 border border-orange-500"><UserIcon className="w-4 h-4" /><span className="hidden xs:inline">دخول / تسجيل</span><span className="xs:hidden">دخول</span></button>}
            {!isDriverMode && !isInstalled && <button onClick={onOpenInstallGuide} className="hidden sm:flex items-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold px-2.5 py-2 rounded-xl transition-all active:scale-95 shrink-0"><Download className="w-3.5 h-3.5 text-orange-600" /><span>تثبيت</span></button>}
            {!isDriverMode && <button onClick={onOpenCart} className="relative bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 shrink-0"><ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" /><span className="hidden sm:inline">السلة</span>{cartCount > 0 && <span className="bg-orange-600 text-white text-[10px] sm:text-[11px] font-extrabold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-xs">{cartCount}</span>}</button>}
          </div>
        </div>
        {!currentUser && <div className="mt-2.5 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm"><button onClick={onOpenAuth} className="w-full flex items-center justify-between gap-3 text-right group"><div className="flex items-center gap-2.5 min-w-0"><div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20"><UserIcon className="w-4.5 h-4.5" /></div><div className="min-w-0"><div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">أول مرة معانا؟ ابدأ من هنا 👋</div><div className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-0.5 truncate">سجّل حسابك أو ادخل لحسابك في ثواني وابدأ طلبك</div></div></div><div className="flex items-center gap-1.5 bg-orange-600 group-hover:bg-orange-500 text-white text-xs sm:text-sm font-extrabold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-md shrink-0 transition-all group-active:scale-95"><span>ابدأ الآن</span><ArrowLeft className="w-4 h-4" /></div></button></div>}
        {!isDriverMode && <div className="md:hidden mt-2 relative"><Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث عن مطعم، سوبرماركت، وجبة أو منتج..." className="w-full bg-slate-100 focus:bg-white text-xs font-medium pr-10 pl-4 py-2 rounded-xl border border-slate-200/80 focus:border-orange-500 focus:outline-hidden transition-all shadow-inner text-slate-900" /></div>}
      </div>
    </header>
  );
};
