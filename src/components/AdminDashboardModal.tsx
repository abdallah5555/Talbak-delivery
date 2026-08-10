import React, { useState } from 'react';
import { 
  X, LayoutDashboard, Store as StoreIcon, Bike, Users, ShoppingBag, 
  ExternalLink, Settings, FileText, Download, Tag, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MerchantApplication, DriverApplication, User, Order, Store, SiteSettings, Coupon, Complaint, AuditLog } from '../types';

import { AdminOverviewTab } from './admin/AdminOverviewTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminApplicationsTab } from './admin/AdminApplicationsTab';
import { AdminOrdersTab } from './admin/AdminOrdersTab';
import { AdminCouponsTab } from './admin/AdminCouponsTab';
import { AdminComplaintsTab } from './admin/AdminComplaintsTab';
import { AdminAuditLogsTab } from './admin/AdminAuditLogsTab';
import { AdminBackupTab } from './admin/AdminBackupTab';
import { AdminSettingsTab } from './admin/AdminSettingsTab';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  merchantApps: MerchantApplication[];
  driverApps: DriverApplication[];
  usersList: User[];
  ordersList: Order[];
  storesList: Store[];
  siteSettings: SiteSettings;
  onUpdateSiteSettings: (newSettings: Partial<SiteSettings>) => void;
  onApproveMerchant: (appId: string) => void;
  onRejectMerchant: (appId: string) => void;
  onApproveDriver: (appId: string) => void;
  onRejectDriver: (appId: string) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
  onToggleUserStatus: (userId: string) => void;
  onCreateUser: (user: User) => void;
  onUpdateUser?: (user: User) => void;
  onDeleteUser?: (userId: string) => void;
  onDeleteStore?: (storeId: string) => void;
  onUpdateUserDocsStatus?: (userId: string, status: 'approved' | 'rejected', reason?: string) => void;
  onSwitchToCustomerApp?: () => void;
  couponsList?: Coupon[];
  onUpdateCoupons?: (coupons: Coupon[]) => void;
  currentUser?: User | null;
}

export const AdminDashboardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  merchantApps,
  driverApps,
  usersList,
  ordersList,
  storesList,
  siteSettings,
  onUpdateSiteSettings,
  onApproveMerchant,
  onRejectMerchant,
  onApproveDriver,
  onRejectDriver,
  onUpdateOrderStatus,
  onToggleUserStatus,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchToCustomerApp,
  couponsList,
  onUpdateCoupons,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'drivers' | 'users' | 'orders' | 'coupons' | 'complaints' | 'audit_logs' | 'backup' | 'settings'>('overview');

  // Local Coupons fallback state
  const [localCoupons, setLocalCoupons] = useState<Coupon[]>([
    { id: 'c-1', code: 'TALABAK10', discountType: 'percentage', discountValue: 10, isActive: true, usageLimit: 100, usedCount: 12, createdAt: new Date().toISOString() },
    { id: 'c-2', code: 'FREE20', discountType: 'fixed', discountValue: 20, isActive: true, usageLimit: 50, usedCount: 5, createdAt: new Date().toISOString() }
  ]);

  const coupons = couponsList || localCoupons;
  const updateCouponsList = (updated: Coupon[]) => {
    if (onUpdateCoupons) {
      onUpdateCoupons(updated);
    } else {
      setLocalCoupons(updated);
    }
  };

  // Complaints & Audit logs state
  const [complaints] = useState<Complaint[]>([
    { id: 'cmp-1', customerName: 'أحمد محمود', customerPhone: '01012345678', category: 'delay', description: 'تأخر التوصيل أكثر من 45 دقيقة', status: 'open', createdAt: new Date().toISOString() }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: 'log-1', actorName: 'مدير النظام (Admin)', actorRole: 'admin', action: 'تغيير إعدادات الموقع', target: 'SiteSettings', details: 'تحديث رسوم التوصيل وإعلانات البنرات', canRevert: true, reverted: false, createdAt: new Date().toISOString() },
    { id: 'log-2', actorName: 'كابتن محمود علي', actorRole: 'driver', action: 'قبول الطلب', target: 'Order #1024', canRevert: true, reverted: false, createdAt: new Date().toISOString() }
  ]);

  const handleRevertAuditLog = (logId: string) => {
    setAuditLogs(prev => prev.map(log => {
      if (log.id === logId) {
        return { ...log, reverted: true };
      }
      return log;
    }));

    const targetLog = auditLogs.find(l => l.id === logId);
    if (targetLog) {
      const revertLog: AuditLog = {
        id: 'log-revert-' + Date.now(),
        actorName: currentUser?.name || 'مدير النظام الرئيسي',
        actorRole: 'admin',
        action: 'تراجع عن قرار سابق',
        target: targetLog.target,
        details: `تم إلغاء قرار "${targetLog.action}" بنجاح والتراجع عنه`,
        canRevert: false,
        reverted: false,
        createdAt: new Date().toISOString()
      };
      setAuditLogs(prev => [revertLog, ...prev]);
    }
  };

  if (!isOpen) return null;

  const pendingMerchants = merchantApps.filter(m => m.status === 'pending');
  const pendingDrivers = driverApps.filter(d => d.status === 'pending');

  const handleExportData = (format: 'json' | 'csv') => {
    const data = { users: usersList, stores: storesList, orders: ordersList, merchantApps, driverApps, coupons, complaints, siteSettings };
    if (format === 'json') {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `talabak_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } else {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'Type,ID,Name/Title,Phone/Details,Status,Created\n';
      ordersList.forEach(o => {
        csvContent += `Order,${o.id},${o.customerName || 'Customer'},${o.total} EGP,${o.status},${o.createdAt}\n`;
      });
      usersList.forEach(u => {
        csvContent += `User,${u.id},${u.name},${u.phone},${u.status},${u.createdAt}\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `talabak_summary_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900 text-slate-100 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-slate-800 flex flex-col h-[92vh]"
        >
          {/* Top Bar Header */}
          <div className="bg-slate-950 p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 p-2 flex items-center justify-center font-bold text-white shadow-md">
                لوحة
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white">لوحة تحكم إدارة النظام (Admin)</h2>
                  <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                    نشط
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">إدارة كاملة للمستخدمين، البنرات، السوشيال ميديا، الصلاحيات والقرارات</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {onSwitchToCustomerApp && (
                <button
                  onClick={onSwitchToCustomerApp}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>معاينة كعميل</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>إغلاق</span>
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="bg-slate-900 border-b border-slate-800 p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              الإحصائيات
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'users' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              الحسابات والصلاحيات ({usersList.length})
            </button>

            <button
              onClick={() => setActiveTab('merchants')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap relative ${
                activeTab === 'merchants' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <StoreIcon className="w-4 h-4" />
              طلبات المتاجر
              {pendingMerchants.length > 0 && (
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingMerchants.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('drivers')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap relative ${
                activeTab === 'drivers' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Bike className="w-4 h-4" />
              طلبات الطيارين
              {pendingDrivers.length > 0 && (
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingDrivers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'orders' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              الطلبات ({ordersList.length})
            </button>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'coupons' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4" />
              الكوبونات ({coupons.length})
            </button>

            <button
              onClick={() => setActiveTab('complaints')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'complaints' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              الشكاوى
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'audit_logs' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              سجل القرارات
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'backup' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              تصدير البيانات
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'settings' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              الإعدادات والبنرات
            </button>
          </div>

          {/* Main Tab Content View */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {activeTab === 'overview' && (
              <AdminOverviewTab
                ordersList={ordersList}
                usersList={usersList}
                storesList={storesList}
                merchantApps={merchantApps}
                driverApps={driverApps}
              />
            )}

            {activeTab === 'users' && (
              <AdminUsersTab
                usersList={usersList}
                merchantApps={merchantApps}
                driverApps={driverApps}
                onToggleUserStatus={onToggleUserStatus}
                onCreateUser={onCreateUser}
                onUpdateUser={onUpdateUser}
                onDeleteUser={onDeleteUser}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'merchants' && (
              <AdminApplicationsTab
                type="merchants"
                merchantApps={merchantApps}
                driverApps={driverApps}
                onApproveMerchant={onApproveMerchant}
                onRejectMerchant={onRejectMerchant}
                onApproveDriver={onApproveDriver}
                onRejectDriver={onRejectDriver}
              />
            )}

            {activeTab === 'drivers' && (
              <AdminApplicationsTab
                type="drivers"
                merchantApps={merchantApps}
                driverApps={driverApps}
                onApproveMerchant={onApproveMerchant}
                onRejectMerchant={onRejectMerchant}
                onApproveDriver={onApproveDriver}
                onRejectDriver={onRejectDriver}
              />
            )}

            {activeTab === 'orders' && (
              <AdminOrdersTab
                ordersList={ordersList}
                onUpdateOrderStatus={onUpdateOrderStatus}
              />
            )}

            {activeTab === 'coupons' && (
              <AdminCouponsTab
                coupons={coupons}
                onUpdateCoupons={updateCouponsList}
              />
            )}

            {activeTab === 'complaints' && (
              <AdminComplaintsTab complaints={complaints} />
            )}

            {activeTab === 'audit_logs' && (
              <AdminAuditLogsTab
                auditLogs={auditLogs}
                onRevertAuditLog={handleRevertAuditLog}
                isMainAdmin={currentUser?.isAdminMain !== false}
              />
            )}

            {activeTab === 'backup' && (
              <AdminBackupTab onExportData={handleExportData} />
            )}

            {activeTab === 'settings' && (
              <AdminSettingsTab
                siteSettings={siteSettings}
                onUpdateSiteSettings={onUpdateSiteSettings}
                currentUser={currentUser}
                onUpdateUser={onUpdateUser}
              />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
