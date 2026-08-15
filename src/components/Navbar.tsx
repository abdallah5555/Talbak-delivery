import React from 'react';
import { Search, Download, ShoppingBag, User as UserIcon, ShieldCheck, LogOut, Sparkles, Bell } from 'lucide-react';
import { User } from '../types';

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

export const Navbar: React.FC<Props> = ({
  cartCount,
  onOpenCart,
  onOpenInstallGuide,
  onOpenShare,
  onOpenVercelGuide,
  onOpenAuth,
  onOpenPartnerApply,
  onOpenAdminDashboard,
  onOpenWassalni,
  currentUser,
  onLogout,
  isInstalled,
  searchQuery,
  setSearchQuery,
  activeAddress,
  onChangeAddress,
  siteName = 'طلبك دليفري',
  slogan = 'أسرع دليفري يوصلك لحد باب البيت ⚡',
  logoUrl = '/favicon.svg',
  unreadNotificationsCount = 0,
  onOpenNotifications
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 max-w-full">
          
          {/* Logo & App Title + Slogan */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 p-1 sm:p-1.5 shadow-md shadow-orange-500/20 flex items-center justify-center shrink-0">
              <img src={logoUrl} alt={siteName} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-xs sm:text-lg tracking-tight text-slate-900 leading-none truncate">
                {siteName}
              </h1>
              <div className="hidden sm:flex items-center gap-1 text-orange-600 text-[11px] sm:text-xs mt-0.5 font-bold">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate max-w-[280px]">
                  {slogan}
                </span>
              </div>
            </div>
          </div>

          {/* Search Input (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مطعم، أكلة، سوبرماركت أو منتج..."
              className="w-full bg-slate-100/80 focus:bg-white text-xs font-medium pr-10 pl-4 py-2.5 rounded-2xl border border-transparent focus:border-orange-500 focus:outline-hidden transition-all shadow-inner text-slate-900"
            />
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Wassalni Quick Service Button */}
            {onOpenWassalni && (
              <button
                onClick={onOpenWassalni}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 animate-pulse shrink-0"
              >
                <span>وصّلي ⚡</span>
              </button>
            )}
            {/* Admin Dashboard button if logged in as Admin */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={onOpenAdminDashboard}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 text-[11px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow transition-all active:scale-95 shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden sm:inline">لوحة التحكم</span>
                <span className="sm:hidden">أدمن</span>
              </button>
            )}

            {/* Notification Bell (Authenticated Users) */}
            {currentUser && onOpenNotifications && (
              <button
                id="navbar-notification-bell-btn"
                onClick={onOpenNotifications}
                aria-label={unreadNotificationsCount > 0 ? `الإشعارات (${unreadNotificationsCount} غير مقروء)` : 'الإشعارات'}
                title="الإشعارات"
                className="relative bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 p-2 sm:px-2.5 sm:py-2 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 border border-slate-200"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span
                    id="navbar-unread-notifications-badge"
                    className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center shadow-xs animate-pulse"
                  >
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* User Auth */}
            {currentUser ? (
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-1.5 sm:px-2.5 py-1 sm:py-1.5 shrink min-w-0">
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate max-w-[65px] sm:max-w-[110px]">
                  {currentUser.name}
                </span>
                <button
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="text-slate-400 hover:text-red-600 p-0.5 transition-colors shrink-0"
                >
                  <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1 bg-orange-600 hover:bg-orange-500 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">دخول / حساب</span>
                <span className="xs:hidden">دخول</span>
              </button>
            )}

            {!isInstalled && (
              <button
                onClick={onOpenInstallGuide}
                className="hidden sm:flex items-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold px-2.5 py-2 rounded-xl transition-all active:scale-95 shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-orange-600" />
                <span>تثبيت</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
              <span className="hidden sm:inline">السلة</span>
              {cartCount > 0 && (
                <span className="bg-orange-600 text-white text-[10px] sm:text-[11px] font-extrabold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مطعم، سوبرماركت، وجبة أو منتج..."
            className="w-full bg-slate-100 focus:bg-white text-xs font-medium pr-10 pl-4 py-2 rounded-xl border border-slate-200/80 focus:border-orange-500 focus:outline-hidden transition-all shadow-inner text-slate-900"
          />
        </div>
      </div>
    </header>
  );
};

