import React, { useState } from 'react';
import { Settings, CheckCircle2, Image, Plus, Trash2, ToggleLeft, ToggleRight, Share2, Upload, User, Key } from 'lucide-react';
import { SiteSettings, AdBanner, SocialLinks, User as UserType } from '../../types';

interface Props {
  siteSettings: SiteSettings;
  onUpdateSiteSettings: (newSettings: Partial<SiteSettings>) => void;
  currentUser?: UserType | null;
  onUpdateUser?: (updatedUser: UserType) => void;
}

export const AdminSettingsTab: React.FC<Props> = ({
  siteSettings,
  onUpdateSiteSettings,
  currentUser,
  onUpdateUser
}) => {
  const [activeSubSection, setActiveSubSection] = useState<'brand' | 'banners' | 'social' | 'profile'>('brand');

  // Brand State
  const [siteName, setSiteName] = useState(siteSettings.siteName);
  const [supportPhone, setSupportPhone] = useState(siteSettings.supportPhone);
  const [logoUrl, setLogoUrl] = useState(siteSettings.logoUrl);
  const [bannerOfferText, setBannerOfferText] = useState(siteSettings.bannerOfferText);
  const [deliveryBaseFee, setDeliveryBaseFee] = useState(siteSettings.deliveryBaseFee.toString());

  // Social State
  const [social, setSocial] = useState<SocialLinks>(siteSettings.socialLinks || {
    facebook: '',
    whatsapp: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    telegram: ''
  });

  // Banners State
  const [banners, setBanners] = useState<AdBanner[]>(siteSettings.adBanners || [
    {
      id: 'b-1',
      title: 'خصم 30% على وجبات المطاعم المميزة',
      imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
      badge: 'عرض خاص',
      active: true
    }
  ]);

  // New Banner Form State
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerImage, setNewBannerImage] = useState('');
  const [newBannerBadge, setNewBannerBadge] = useState('إعلان مميز');
  const [newBannerLink, setNewBannerLink] = useState('');

  // Admin Profile State
  const [adminName, setAdminName] = useState(currentUser?.name || '');
  const [adminPhone, setAdminPhone] = useState(currentUser?.phone || '');
  const [adminPass, setAdminPass] = useState(currentUser?.password || '');
  const [adminPhoto, setAdminPhoto] = useState(currentUser?.adminPhotoUrl || '');

  const [savedMsg, setSavedMsg] = useState('');

  const triggerSaveMsg = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSiteSettings({
      siteName,
      supportPhone,
      logoUrl,
      bannerOfferText,
      deliveryBaseFee: parseFloat(deliveryBaseFee) || 15
    });
    triggerSaveMsg('تم حفظ وتحديث إعدادات الهوية والتطبيق بنجاح!');
  };

  const handleSocialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSiteSettings({
      socialLinks: social
    });
    triggerSaveMsg('تم حفظ روابط شبكات التواصل الاجتماعي بنجاح!');
  };

  // Image / GIF Upload Helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          callback(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerTitle || !newBannerImage) return;

    const newAd: AdBanner = {
      id: 'banner-' + Date.now(),
      title: newBannerTitle,
      imageUrl: newBannerImage,
      badge: newBannerBadge,
      targetUrl: newBannerLink,
      active: true
    };

    const updated = [...banners, newAd];
    setBanners(updated);
    onUpdateSiteSettings({ adBanners: updated });

    setNewBannerTitle('');
    setNewBannerImage('');
    setNewBannerLink('');
    triggerSaveMsg('تم إضافة الإعلان بنجاح وتفعيله!');
  };

  const toggleBannerActive = (id: string) => {
    const updated = banners.map(b => b.id === id ? { ...b, active: !b.active } : b);
    setBanners(updated);
    onUpdateSiteSettings({ adBanners: updated });
    triggerSaveMsg('تم تغيير حالة الإعلان!');
  };

  const deleteBanner = (id: string) => {
    const updated = banners.filter(b => b.id !== id);
    setBanners(updated);
    onUpdateSiteSettings({ adBanners: updated });
    triggerSaveMsg('تم حذف الإعلان!');
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !onUpdateUser) return;
    const updatedUser: UserType = {
      ...currentUser,
      name: adminName,
      phone: adminPhone,
      password: adminPass,
      pin: adminPass.slice(0, 4) || '8822',
      adminPhotoUrl: adminPhoto
    };
    onUpdateUser(updatedUser);
    triggerSaveMsg('تم تحديث البيانات الشخصية للأدمن بنجاح!');
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Sub-section Switcher */}
      <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-2xl border border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveSubSection('brand')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeSubSection === 'brand' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>الهوية والتطبيقات</span>
        </button>

        <button
          onClick={() => setActiveSubSection('banners')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeSubSection === 'banners' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          <span>إعلانات وبنرات المستقبل ({banners.length})</span>
        </button>

        <button
          onClick={() => setActiveSubSection('social')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeSubSection === 'social' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>السوشيال ميديا</span>
        </button>

        <button
          onClick={() => setActiveSubSection('profile')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeSubSection === 'profile' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>بروفايل الأدمن</span>
        </button>
      </div>

      {savedMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Brand & Delivery Form */}
      {activeSubSection === 'brand' && (
        <form onSubmit={handleBrandSubmit} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
          <h4 className="font-bold text-sm text-white border-b border-slate-700 pb-2">بيانات التطبيق والهوية</h4>

          <div>
            <label className="text-xs text-slate-400 block mb-1">اسم التطبيق / العلامة التجارية</label>
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رقم هاتف الدعم والواتساب</label>
            <input
              type="tel"
              required
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رابط الشعار (Logo URL)</label>
            <input
              type="text"
              required
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رسوم التوصيل الأساسية (ج.م)</label>
            <input
              type="number"
              required
              value={deliveryBaseFee}
              onChange={(e) => setDeliveryBaseFee(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">نص بنر العروض الشريطي العلوي</label>
            <textarea
              rows={2}
              value={bannerOfferText}
              onChange={(e) => setBannerOfferText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow"
          >
            حفظ وتطبيق الإعدادات
          </button>
        </form>
      )}

      {/* Future Ad Banners Management */}
      {activeSubSection === 'banners' && (
        <div className="space-y-4">
          <form onSubmit={handleAddBanner} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center justify-between">
              <span>إضافة بنر إعلاني جديد (دعم الصور و GIF المتحركة)</span>
              <span className="text-[10px] text-orange-400">تفاعلي بالكامل</span>
            </h4>

            <div>
              <label className="text-xs text-slate-400 block mb-1">عنوان الإعلان الرئيسي</label>
              <input
                type="text"
                required
                placeholder="مثال: خصم 50% على جميع وجبات الويك إند"
                value={newBannerTitle}
                onChange={(e) => setNewBannerTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">نص الشارة العلوية (Badge)</label>
                <input
                  type="text"
                  placeholder="مثال: عرض لفترة محدودة"
                  value={newBannerBadge}
                  onChange={(e) => setNewBannerBadge(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">رابط النقل عند الضغط (اختياري)</label>
                <input
                  type="url"
                  placeholder="https://wa.me/... أو رابط صفحة"
                  value={newBannerLink}
                  onChange={(e) => setNewBannerLink(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">صورة الإعلان أو GIF المتحركة</label>
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <input
                  type="text"
                  placeholder="أدخل رابط صورة / GIF مباشر أو ارفع ملف من الهاتف"
                  value={newBannerImage}
                  onChange={(e) => setNewBannerImage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right flex-1"
                />

                <label className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2.5 rounded-xl cursor-pointer shrink-0 flex items-center gap-1">
                  <Upload className="w-4 h-4" />
                  <span>رفع صورة / GIF من الهاتف</span>
                  <input
                    type="file"
                    accept="image/*,.gif"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, (url) => setNewBannerImage(url))}
                  />
                </label>
              </div>

              {newBannerImage && (
                <div className="mt-2 h-24 w-full rounded-xl overflow-hidden border border-slate-700 relative bg-black">
                  <img src={newBannerImage} alt="معاينة الإعلان" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة الإعلان للموقع</span>
            </button>
          </form>

          {/* Current Banners List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300">البنرات الإعلانية الحالية ({banners.length})</h4>
            {banners.length === 0 ? (
              <div className="bg-slate-800/60 p-4 rounded-xl text-center text-xs text-slate-400 border border-slate-700">
                لا يوجد بنرات إعلانية حالياً. يمكنك إضافة بنر إعلاني جديد بأعلى.
              </div>
            ) : (
              banners.map((b) => (
                <div key={b.id} className="bg-slate-800 p-3 rounded-2xl border border-slate-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img src={b.imageUrl} alt={b.title} className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-900" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white truncate">{b.title}</span>
                        {b.badge && (
                          <span className="bg-orange-500/20 text-orange-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            {b.badge}
                          </span>
                        )}
                      </div>
                      {b.targetUrl && (
                        <span className="text-[10px] text-slate-400 font-mono block truncate dir-ltr text-right">{b.targetUrl}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleBannerActive(b.id)}
                      className={`p-1.5 rounded-xl text-xs flex items-center gap-1 font-bold ${
                        b.active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'
                      }`}
                      title={b.active ? 'تعطيل الإعلان' : 'تفعيل الإعلان'}
                    >
                      {b.active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                      <span>{b.active ? 'مفعل' : 'معطل'}</span>
                    </button>

                    <button
                      onClick={() => deleteBanner(b.id)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                      title="حذف الإعلان"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Social Links Management */}
      {activeSubSection === 'social' && (
        <form onSubmit={handleSocialSubmit} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
          <h4 className="font-bold text-sm text-white border-b border-slate-700 pb-2">
            إدارة روابط وسائل التواصل الاجتماعي (تظهر في الفوتر والقائمة)
          </h4>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رابط صفحة الفيسبوك (Facebook)</label>
            <input
              type="url"
              placeholder="https://facebook.com/yourpage"
              value={social.facebook || ''}
              onChange={(e) => setSocial({ ...social, facebook: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رابط الواتساب أو رقم الهاتف (WhatsApp)</label>
            <input
              type="text"
              placeholder="https://wa.me/201501600192"
              value={social.whatsapp || ''}
              onChange={(e) => setSocial({ ...social, whatsapp: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رابط الإنستغرام (Instagram)</label>
            <input
              type="url"
              placeholder="https://instagram.com/yourprofile"
              value={social.instagram || ''}
              onChange={(e) => setSocial({ ...social, instagram: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رابط التيك توك (TikTok)</label>
            <input
              type="url"
              placeholder="https://tiktok.com/@yourprofile"
              value={social.tiktok || ''}
              onChange={(e) => setSocial({ ...social, tiktok: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رابط اليوتيوب (YouTube)</label>
            <input
              type="url"
              placeholder="https://youtube.com/@yourchannel"
              value={social.youtube || ''}
              onChange={(e) => setSocial({ ...social, youtube: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رابط التليجرام (Telegram)</label>
            <input
              type="url"
              placeholder="https://t.me/yourchannel"
              value={social.telegram || ''}
              onChange={(e) => setSocial({ ...social, telegram: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow"
          >
            حفظ وتحديث روابط السوشيال ميديا
          </button>
        </form>
      )}

      {/* Admin Profile Settings */}
      {activeSubSection === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
          <h4 className="font-bold text-sm text-white border-b border-slate-700 pb-2">
            تحديث صورة واسم وكلمة مرور حساب الأدمن
          </h4>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden relative shrink-0">
              {adminPhoto ? (
                <img src={adminPhoto} alt="Admin Photo" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-500 m-auto mt-4" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <label className="text-xs text-slate-400 block">صورة البروفايل (رفع من الهاتف أو رابط)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="رابط الصورة المباشر"
                  value={adminPhoto}
                  onChange={(e) => setAdminPhoto(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs p-2 rounded-xl text-white dir-ltr text-right"
                />
                <label className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer shrink-0 flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, (url) => setAdminPhoto(url))}
                  />
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">اسم الأدمن الحالي</label>
            <input
              type="text"
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رقم الموبايل</label>
            <input
              type="tel"
              required
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">كلمة المرور الجديدة / PIN</label>
            <input
              type="text"
              required
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow"
          >
            تحديث بيانات حساب الأدمن
          </button>
        </form>
      )}
    </div>
  );
};
