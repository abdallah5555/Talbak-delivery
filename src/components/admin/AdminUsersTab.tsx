import React, { useState } from 'react';
import { Search, UserPlus, Phone, ShieldCheck, UserCheck, UserX, Trash2, Edit, Key, Shield, Upload, CheckSquare, Square, Eye, FileText, AlertTriangle, X, ZoomIn, Store as StoreIcon, Bike, Users } from 'lucide-react';
import { User, MerchantApplication, DriverApplication } from '../../types';

interface Props {
  usersList: User[];
  merchantApps?: MerchantApplication[];
  driverApps?: DriverApplication[];
  onToggleUserStatus: (userId: string) => void;
  onCreateUser: (user: User) => void;
  onUpdateUser?: (user: User) => void;
  onDeleteUser?: (userId: string) => void;
  currentUser?: User | null;
}

const ALL_PERMISSIONS = [
  { id: 'orders', label: 'إدارة وتحديث حالة الطلبات' },
  { id: 'stores', label: 'إدارة المتاجر والقوائم' },
  { id: 'users', label: 'إدارة الحسابات والمستخدمين' },
  { id: 'applications', label: 'مراجعة طلبات الانضمام (تجار/طيارين)' },
  { id: 'coupons', label: 'إدارة وشفرات كوبونات الخصم' },
  { id: 'settings', label: 'تغيير إعدادات الموقع والهوية' },
  { id: 'banners', label: 'إدارة وتفعيل بنرات الإعلانات' },
  { id: 'logs', label: 'سجل القرارات والشكاوى' }
];

export const AdminUsersTab: React.FC<Props> = ({
  usersList,
  merchantApps = [],
  driverApps = [],
  onToggleUserStatus,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'driver' | 'merchant' | 'admin'>('all');

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'customer' | 'driver' | 'merchant' | 'admin'>('customer');
  const [addIsMainAdmin, setAddIsMainAdmin] = useState(false);
  const [addPermissions, setAddPermissions] = useState<string[]>(['orders', 'stores', 'coupons']);
  const [addPhoto, setAddPhoto] = useState('');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'customer' | 'driver' | 'merchant' | 'admin'>('customer');
  const [editIsMainAdmin, setEditIsMainAdmin] = useState(false);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editPhoto, setEditPhoto] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // View User Papers/Details Modal State
  const [viewingUserPapers, setViewingUserPapers] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  const filteredUsers = usersList.filter(u => {
    const s = searchTerm.trim().toLowerCase();
    const nameMatch = (u.name || '').toLowerCase().includes(s);
    const phoneMatch = (u.phone || '').includes(s);
    const idMatch = (u.id || '').toLowerCase().includes(s);
    const matchesSearch = !s || nameMatch || phoneMatch || idMatch;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addPhone || !addPassword) return;
    const createdUser: User = {
      id: 'usr-' + Date.now(),
      name: addName,
      phone: addPhone,
      password: addPassword,
      pin: addPassword.slice(0, 4) || '1234',
      role: addRole,
      isAdminMain: addRole === 'admin' ? addIsMainAdmin : false,
      adminPermissions: addRole === 'admin' && !addIsMainAdmin ? addPermissions : undefined,
      adminPhotoUrl: addPhoto,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    onCreateUser(createdUser);
    setShowAddModal(false);
    resetAddForm();
  };

  const resetAddForm = () => {
    setAddName('');
    setAddPhone('');
    setAddPassword('');
    setAddRole('customer');
    setAddIsMainAdmin(false);
    setAddPermissions(['orders', 'stores', 'coupons']);
    setAddPhoto('');
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPhone(user.phone);
    setEditPassword(user.password || '88226464');
    setEditRole(user.role);
    setEditIsMainAdmin(user.isAdminMain || user.phone === '01501600192');
    setEditPermissions(user.adminPermissions || ['orders', 'stores', 'users', 'coupons']);
    setEditPhoto(user.adminPhotoUrl || '');
    setEditStatus(user.status);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !onUpdateUser) return;
    const updated: User = {
      ...editingUser,
      name: editName,
      phone: editPhone,
      password: editPassword,
      pin: editPassword.slice(0, 4) || '8822',
      role: editRole,
      isAdminMain: editRole === 'admin' ? editIsMainAdmin : false,
      adminPermissions: editRole === 'admin' && !editIsMainAdmin ? editPermissions : undefined,
      adminPhotoUrl: editPhoto,
      status: editStatus
    };
    onUpdateUser(updated);
    setEditingUser(null);
  };

  const togglePermissionInAdd = (permId: string) => {
    setAddPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const togglePermissionInEdit = (permId: string) => {
    setEditPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  // Category counts
  const totalCount = usersList.length;
  const customersCount = usersList.filter(u => u.role === 'customer').length;
  const driversCount = usersList.filter(u => u.role === 'driver').length;
  const merchantsCount = usersList.filter(u => u.role === 'merchant').length;
  const adminsCount = usersList.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-4">
      {/* Category Total Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between ${
            roleFilter === 'all'
              ? 'bg-slate-800 border-orange-500 shadow-lg ring-1 ring-orange-500/50'
              : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-300">جميع الحسابات</span>
            <Users className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-xl font-black text-white font-mono">{totalCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setRoleFilter('customer')}
          className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between ${
            roleFilter === 'customer'
              ? 'bg-slate-800 border-blue-500 shadow-lg ring-1 ring-blue-500/50'
              : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-300">العملاء</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-xl font-black text-blue-400 font-mono">{customersCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setRoleFilter('driver')}
          className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between ${
            roleFilter === 'driver'
              ? 'bg-slate-800 border-emerald-500 shadow-lg ring-1 ring-emerald-500/50'
              : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-300">الطيارين (كباتن)</span>
            <Bike className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xl font-black text-emerald-400 font-mono">{driversCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setRoleFilter('merchant')}
          className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between ${
            roleFilter === 'merchant'
              ? 'bg-slate-800 border-amber-500 shadow-lg ring-1 ring-amber-500/50'
              : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-300">التجار والأنشطة</span>
            <StoreIcon className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xl font-black text-amber-400 font-mono">{merchantsCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setRoleFilter('admin')}
          className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between col-span-2 sm:col-span-1 ${
            roleFilter === 'admin'
              ? 'bg-slate-800 border-purple-500 shadow-lg ring-1 ring-purple-500/50'
              : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-300">المدراء والأدمن</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-xl font-black text-purple-400 font-mono">{adminsCount}</span>
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث باسم المستخدم أو رقم الموبايل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-xs pr-9 pl-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-xs px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">جميع الحسابات ({totalCount})</option>
            <option value="customer">العملاء ({customersCount})</option>
            <option value="driver">الطيارين والكباتن ({driversCount})</option>
            <option value="merchant">التجار والأنشطة ({merchantsCount})</option>
            <option value="admin">المدراء والأدمن ({adminsCount})</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة حساب جديد</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3 font-bold">المستخدم</th>
              <th className="p-3 font-bold">رقم الهاتف</th>
              <th className="p-3 font-bold">الدور والصلاحيات</th>
              <th className="p-3 font-bold">كلمة المرور</th>
              <th className="p-3 font-bold">الحالة</th>
              <th className="p-3 font-bold text-center">التحكم الكامل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-700/40 transition-colors">
                <td className="p-3 font-bold text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden shrink-0 flex items-center justify-center text-slate-300 font-black text-xs">
                    {user.adminPhotoUrl ? (
                      <img src={user.adminPhotoUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.slice(0, 1)
                    )}
                  </div>
                  <div>
                    <span className="block font-bold">{user.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: #{user.id.slice(-6)}</span>
                  </div>
                </td>
                <td className="p-3 font-mono dir-ltr text-slate-300">{user.phone}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                      user.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                      user.role === 'driver' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      user.role === 'merchant' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {user.role === 'admin' ? (user.isAdminMain ? 'أدمن رئيسي' : 'أدمن فرعي') : user.role === 'driver' ? 'طيار توصيل' : user.role === 'merchant' ? 'صاحب متجر' : 'عميل'}
                    </span>
                    {user.role === 'admin' && !user.isAdminMain && user.adminPermissions && (
                      <span className="text-[9px] text-slate-400">
                        {user.adminPermissions.length} صلاحيات محددة
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 font-mono text-[11px] text-orange-400">{user.password || user.pin || '****'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    user.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {user.status === 'active' ? 'نشط' : 'موقف'}
                  </span>
                </td>
                <td className="p-3 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setViewingUserPapers(user)}
                    className="p-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-1 text-[11px] font-bold"
                    title="معاينة الأوراق والبيانات الكاملة"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">الأوراق</span>
                  </button>
                  <button
                    onClick={() => startEditUser(user)}
                    className="p-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-all"
                    title="تعديل الحساب والصلاحيات"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onToggleUserStatus(user.id)}
                    className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                      user.status === 'active'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                    title={user.status === 'active' ? 'تجميد الحساب' : 'تفعيل الحساب'}
                  >
                    {user.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                  {onDeleteUser && (
                    <button
                      onClick={() => setDeletingUser(user)}
                      className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1 text-[11px] font-bold"
                      title="حذف الحساب نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">حذف</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-orange-400">إضافة حساب مستخدم / أدمن فرعي جديد</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">الاسم بالكامل</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs p-2.5 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">رقم الموبايل</label>
                <input
                  type="tel"
                  required
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">كلمة المرور / الـ PIN</label>
                <input
                  type="text"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">نوع الدور والحساب</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-bold"
                >
                  <option value="customer">عميل</option>
                  <option value="driver">طيار توصيل</option>
                  <option value="merchant">صاحب متجر</option>
                  <option value="admin">مدير نظام / أدمن فرعي</option>
                </select>
              </div>

              {/* Sub-Admin Permissions Setup */}
              {addRole === 'admin' && (
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-orange-300">أدمن رئيسي (كامل الصلاحيات)</label>
                    <input
                      type="checkbox"
                      checked={addIsMainAdmin}
                      onChange={(e) => setAddIsMainAdmin(e.target.checked)}
                      className="w-4 h-4 accent-orange-600 rounded"
                    />
                  </div>

                  {!addIsMainAdmin && (
                    <div className="space-y-2 pt-2 border-t border-slate-700">
                      <span className="text-[11px] font-bold text-slate-300 block">حدد الصلاحيات المسموح بها للأدمن الفرعي:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ALL_PERMISSIONS.map(p => (
                          <label key={p.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/60 p-2 rounded-lg border border-slate-700/60 hover:bg-slate-900">
                            <input
                              type="checkbox"
                              checked={addPermissions.includes(p.id)}
                              onChange={() => togglePermissionInAdd(p.id)}
                              className="accent-orange-600 rounded"
                            />
                            <span>{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-500 font-bold py-2.5 rounded-xl text-xs"
                >
                  حفظ وتأكيد إضافة الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs text-slate-300"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-orange-400">تعديل بيانات الحساب والصلاحيات ({editingUser.name})</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">الاسم بالكامل</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs p-2.5 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">رقم الموبايل</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">كلمة المرور / الـ PIN</label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">صورة الشخصية / Avatar</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editPhoto}
                    onChange={(e) => setEditPhoto(e.target.value)}
                    placeholder="رابط الصورة"
                    className="w-full bg-slate-800 border border-slate-700 text-xs p-2 rounded-xl text-white dir-ltr text-right flex-1"
                  />
                  <label className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer shrink-0 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, (url) => setEditPhoto(url))}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">حالة الحساب</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-bold"
                >
                  <option value="active">نشط (مفعل)</option>
                  <option value="suspended">موقوف (مجمد)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">نوع الدور والحساب</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-bold"
                >
                  <option value="customer">عميل</option>
                  <option value="driver">طيار توصيل</option>
                  <option value="merchant">صاحب متجر</option>
                  <option value="admin">مدير نظام / أدمن فرعي</option>
                </select>
              </div>

              {/* Sub-Admin Permissions Checklist for Edit */}
              {editRole === 'admin' && (
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-orange-300">أدمن رئيسي (كامل الصلاحيات)</label>
                    <input
                      type="checkbox"
                      checked={editIsMainAdmin}
                      onChange={(e) => setEditIsMainAdmin(e.target.checked)}
                      className="w-4 h-4 accent-orange-600 rounded"
                    />
                  </div>

                  {!editIsMainAdmin && (
                    <div className="space-y-2 pt-2 border-t border-slate-700">
                      <span className="text-[11px] font-bold text-slate-300 block">حدد الصلاحيات المتاحة لهذا الأدمن:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ALL_PERMISSIONS.map(p => (
                          <label key={p.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/60 p-2 rounded-lg border border-slate-700/60 hover:bg-slate-900">
                            <input
                              type="checkbox"
                              checked={editPermissions.includes(p.id)}
                              onChange={() => togglePermissionInEdit(p.id)}
                              className="accent-orange-600 rounded"
                            />
                            <span>{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-500 font-bold py-2.5 rounded-xl text-xs"
                >
                  تحديث وحفظ الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs text-slate-300"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md text-white space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">تأكيد حذف الحساب نهائياً</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                هل أنت متاكد من حذف حساب <strong className="text-orange-400">{deletingUser.name}</strong> برقم الهاتف (<span className="font-mono text-white dir-ltr">{deletingUser.phone}</span>) ونوع الحساب (<span className="text-amber-300 font-bold">{deletingUser.role === 'admin' ? 'أدمن' : deletingUser.role === 'driver' ? 'طيار توصيل' : deletingUser.role === 'merchant' ? 'تاجر' : 'عميل'}</span>)؟
              </p>
              <p className="text-[11px] text-red-400 font-bold mt-2">
                ⚠️ سيتم إزالة هذا الحساب فوراً من النظام ولا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (onDeleteUser && deletingUser) {
                    onDeleteUser(deletingUser.id);
                  }
                  setDeletingUser(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow"
              >
                نعم، حذف الحساب نهائياً
              </button>
              <button
                onClick={() => setDeletingUser(null)}
                className="bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-xl text-xs text-slate-300 font-bold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW USER PAPERS / DETAILS MODAL */}
      {viewingUserPapers && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm text-white">تفاصيل الحساب والأوراق المرفقة: {viewingUserPapers.name}</h3>
              </div>
              <button 
                onClick={() => setViewingUserPapers(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Info Cards */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-xs">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-300 font-bold text-lg shadow">
                {viewingUserPapers.adminPhotoUrl ? (
                  <img src={viewingUserPapers.adminPhotoUrl} alt={viewingUserPapers.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{viewingUserPapers.name.slice(0, 1)}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
                <div>
                  <span className="text-slate-400 block text-[11px]">اسم المستخدم:</span>
                  <strong className="text-white text-sm">{viewingUserPapers.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">رقم الهاتف:</span>
                  <strong className="font-mono text-orange-400 text-sm dir-ltr block text-right">{viewingUserPapers.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">نوع الدور بالحساب:</span>
                  <span className="font-bold text-amber-300">
                    {viewingUserPapers.role === 'admin' ? (viewingUserPapers.isAdminMain ? 'أدمن رئيسي' : 'أدمن فرعي') : viewingUserPapers.role === 'driver' ? 'طيار توصيل' : viewingUserPapers.role === 'merchant' ? 'تاجر / صاحب متجر' : 'عميل'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">كلمة المرور المسجلة:</span>
                  <strong className="font-mono text-emerald-400 text-xs">{viewingUserPapers.password || viewingUserPapers.pin || '****'}</strong>
                </div>
              </div>
            </div>

            {/* Driver Papers (if driver or matched driver application) */}
            {(() => {
              const matchedDriver = driverApps.find(d => d.phone === viewingUserPapers.phone || d.fullName === viewingUserPapers.name) || (viewingUserPapers.role === 'driver' ? {
                fullName: viewingUserPapers.name,
                phone: viewingUserPapers.phone,
                vehicleType: viewingUserPapers.vehicleType || 'دراجة نارية / سكوتر',
                noLicense: false,
                status: 'approved',
                createdAt: viewingUserPapers.createdAt
              } as DriverApplication : null);

              if (!matchedDriver && viewingUserPapers.role !== 'driver') return null;

              return (
                <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                  <h4 className="font-bold text-xs text-orange-300 flex items-center gap-2">
                    <Bike className="w-4 h-4" />
                    بيانات وأوراق كابتن التوصيل
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400 text-[10px] block">نوع المركبة:</span>
                      <span className="font-bold text-white">{matchedDriver?.vehicleType || viewingUserPapers.vehicleType || 'غير محدد'}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400 text-[10px] block">رقم اللوحة المعدنية:</span>
                      <span className="font-mono text-amber-300 font-bold">{matchedDriver?.plateNumber || 'غير محدد'}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400 text-[10px] block">حالة الرخصة:</span>
                      <span className="font-bold text-emerald-400">{matchedDriver?.noLicense ? 'بدون رخصة' : 'يحمل رخصة'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {/* Personal Photo */}
                    <div 
                      onClick={() => matchedDriver?.personalPhotoUrl && setSelectedImage({ url: matchedDriver.personalPhotoUrl, title: `الصورة الشخصية - ${viewingUserPapers.name}` })}
                      className="bg-slate-900 p-2 rounded-xl border border-slate-700 cursor-pointer hover:border-orange-500/50 transition-all"
                    >
                      <span className="text-[10px] text-slate-300 font-bold block mb-1">الصورة الشخصية:</span>
                      {matchedDriver?.personalPhotoUrl ? (
                        <div className="h-24 rounded-lg overflow-hidden relative">
                          <img src={matchedDriver.personalPhotoUrl} alt="الصورة الشخصية" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-bold text-white opacity-0 hover:opacity-100 transition-opacity">
                            تكبير
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 text-[10px]">غير مرفقة</div>
                      )}
                    </div>

                    {/* Driver License */}
                    <div 
                      onClick={() => matchedDriver?.driverLicenseUrl && setSelectedImage({ url: matchedDriver.driverLicenseUrl, title: `رخصة القيادة - ${viewingUserPapers.name}` })}
                      className="bg-slate-900 p-2 rounded-xl border border-slate-700 cursor-pointer hover:border-orange-500/50 transition-all"
                    >
                      <span className="text-[10px] text-slate-300 font-bold block mb-1">رخصة القيادة:</span>
                      {matchedDriver?.driverLicenseUrl ? (
                        <div className="h-24 rounded-lg overflow-hidden relative">
                          <img src={matchedDriver.driverLicenseUrl} alt="رخصة القيادة" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-bold text-white opacity-0 hover:opacity-100 transition-opacity">
                            تكبير
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 text-[10px]">غير مرفقة</div>
                      )}
                    </div>

                    {/* Vehicle License */}
                    <div 
                      onClick={() => matchedDriver?.vehicleLicenseUrl && setSelectedImage({ url: matchedDriver.vehicleLicenseUrl, title: `رخصة المركبة - ${viewingUserPapers.name}` })}
                      className="bg-slate-900 p-2 rounded-xl border border-slate-700 cursor-pointer hover:border-orange-500/50 transition-all"
                    >
                      <span className="text-[10px] text-slate-300 font-bold block mb-1">رخصة المركبة:</span>
                      {matchedDriver?.vehicleLicenseUrl ? (
                        <div className="h-24 rounded-lg overflow-hidden relative">
                          <img src={matchedDriver.vehicleLicenseUrl} alt="رخصة المركبة" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-bold text-white opacity-0 hover:opacity-100 transition-opacity">
                            تكبير
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 text-[10px]">غير مرفقة</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Merchant Info (if merchant or matched merchant application) */}
            {(() => {
              const matchedMerchant = merchantApps.find(m => m.phone === viewingUserPapers.phone || m.ownerName === viewingUserPapers.name);

              if (!matchedMerchant && viewingUserPapers.role !== 'merchant') return null;

              return (
                <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                  <h4 className="font-bold text-xs text-amber-300 flex items-center gap-2">
                    <StoreIcon className="w-4 h-4" />
                    بيانات نشاط المتجر
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400 text-[10px] block">اسم المتجر:</span>
                      <strong className="text-white">{matchedMerchant?.storeName || 'متجر مسجل'}</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400 text-[10px] block">نوع النشاط:</span>
                      <strong className="text-amber-300">{matchedMerchant?.businessType || 'مطعم / سوبر ماركت'}</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400 text-[10px] block">المدينة:</span>
                      <span className="text-white">{matchedMerchant?.city || 'القاهرة / المحافظات'}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400 text-[10px] block">دعم الواتساب:</span>
                      <span className="text-emerald-400 font-bold">{matchedMerchant?.hasWhatsapp ? 'نعم' : 'غير محدد'}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Customer Verification Docs */}
            {viewingUserPapers.verificationDocs && (
              <div className="space-y-2 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700">
                <h4 className="font-bold text-xs text-blue-300">أوراق توثيق هوية العميل:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {viewingUserPapers.verificationDocs.idFrontUrl && (
                    <img src={viewingUserPapers.verificationDocs.idFrontUrl} alt="الهوية وجه أول" className="h-24 w-full object-cover rounded-lg border border-slate-700" />
                  )}
                  {viewingUserPapers.verificationDocs.idBackUrl && (
                    <img src={viewingUserPapers.verificationDocs.idBackUrl} alt="الهوية وجه ثاني" className="h-24 w-full object-cover rounded-lg border border-slate-700" />
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 text-left">
              <button
                onClick={() => setViewingUserPapers(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2 rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR IMAGE ZOOM */}
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
