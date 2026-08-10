import React from 'react';
import { Home, Flame, ShoppingBag, Clock, Download, Smartphone } from 'lucide-react';

interface Props {
  activeTab: 'home' | 'offers' | 'orders';
  setActiveTab: (tab: 'home' | 'offers' | 'orders') => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenInstallGuide: () => void;
  isInstalled: boolean;
}

export const BottomNav: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  cartCount,
  onOpenCart,
  onOpenInstallGuide,
  isInstalled
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 md:hidden pb-safe shadow-lg">
      <div className="flex items-center justify-around py-2 px-1">
        
        {/* Home Tab */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1 px-3 rounded-xl transition-all ${
            activeTab === 'home' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>الرئيسية</span>
        </button>

        {/* Offers Tab */}
        <button
          onClick={() => setActiveTab('offers')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1 px-3 rounded-xl transition-all ${
            activeTab === 'offers' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flame className="w-5 h-5" />
          <span>العروض</span>
        </button>

        {/* Cart Button */}
        <button
          onClick={onOpenCart}
          className="relative flex flex-col items-center gap-1 text-[11px] font-bold py-1 px-3 text-slate-500 hover:text-slate-800 transition-all"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-orange-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {cartCount}
              </span>
            )}
          </div>
          <span>السلة</span>
        </button>

        {/* Orders Tab */}
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1 px-3 rounded-xl transition-all ${
            activeTab === 'orders' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span>طلباتي</span>
        </button>

        {/* PWA Install Button */}
        <button
          onClick={onOpenInstallGuide}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1 px-3 rounded-xl transition-all ${
            isInstalled ? 'text-emerald-600' : 'text-orange-600 animate-pulse'
          }`}
        >
          {isInstalled ? (
            <>
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <span>مثّبت</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5 text-orange-600" />
              <span>تثبيت</span>
            </>
          )}
        </button>

      </div>
    </nav>
  );
};
