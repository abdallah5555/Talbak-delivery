import React, { useState } from 'react';
import { Search, UserPlus, Phone, ShieldCheck, UserCheck, UserX, Trash2, Edit, Key, Shield, Upload, CheckSquare, Square } from 'lucide-react';
import { User } from '../../types';

interface Props {
  usersList: User[];
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

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.includes(searchTerm) || u.phone.includes(searchTerm);
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

  return (
    <div className="space-y-4">
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
            <option value="all">كل الأدوار ({usersList.length})</option>
            <option value="customer">عملاء</option>
            <option value="driver">طيارين</option>
            <option value="merchant">تجار</option>
            <option value="admin">مدراء وأدمن فرعي</option>
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
                        ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                    title={user.status === 'active' ? 'تجميد الحساب' : 'تفعيل الحساب'}
                  >
                    {user.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                  {onDeleteUser && (
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      title="حذف الحساب نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
