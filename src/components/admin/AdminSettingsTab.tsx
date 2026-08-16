import React, { useState } from 'react';
import { Settings, CheckCircle2, Image, Plus, Trash2, ToggleLeft, ToggleRight, Share2, Upload, User, Key, Bot, Send, RefreshCw, ShieldCheck, AlertCircle, Shield, UserCheck, Bell, Database, Sparkles, Phone, Eye, Radio, Smartphone } from 'lucide-react';
import { SiteSettings, AdBanner, SocialLinks, User as UserType, TelegramSettings, Order, Store } from '../../types';
import { sendTelegramMessage, sendTelegramDataBackup } from '../../lib/telegramService';
import { sendPushNotification } from '../../lib/pushNotificationService';

interface Props {
  siteSettings: SiteSettings;
  onUpdateSiteSettings: (newSettings: Partial<SiteSettings>) => void;
  currentUser?: UserType | null;
  onUpdateUser?: (updatedUser: UserType) => void;
  usersList?: UserType[];
  ordersList?: Order[];
  storesList?: Store[];
}

export const AdminSettingsTab: React.FC<Props> = ({
  siteSettings,
  onUpdateSiteSettings,
  currentUser,
  onUpdateUser,
  usersList = [],
  ordersList = [],
  storesList = []
}) => {
  const [activeSubSection, setActiveSubSection] = useState<'brand' | 'banners' | 'social' | 'profile' | 'telegram' | 'push'>('brand');

  // Push Broadcast State
  const [pushAudience, setPushAudience] = useState<'all' | 'customer' | 'driver' | 'merchant' | 'admin'>('all');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('/');
  const [sendingPush, setSendingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

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

  // Telegram Settings State
  const [botToken, setBotToken] = useState(siteSettings.telegramSettings?.botToken || '');
  const [chatId, setChatId] = useState(siteSettings.telegramSettings?.chatId || '');
  const [notifyOrders, setNotifyOrders] = useState(siteSettings.telegramSettings?.notifyOrders ?? true);
  const [notifyDrivers, setNotifyDrivers] = useState(siteSettings.telegramSettings?.notifyDrivers ?? true);
  const [notifyBackups, setNotifyBackups] = useState(siteSettings.telegramSettings?.notifyBackups ?? true);
  
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatusMsg, setTelegramStatusMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [sendingBackup, setSendingBackup] = useState(false);

  // Admin Profile State
  const [selectedAdminToEdit, setSelectedAdminToEdit] = useState<UserType | null>(null);
  const adminUserToModify = selectedAdminToEdit || currentUser;

  const [adminName, setAdminName] = useState(adminUserToModify?.name || '');
  const [adminPhone, setAdminPhone] = useState(adminUserToModify?.phone || '');
  const [adminPass, setAdminPass] = useState(adminUserToModify?.password || adminUserToModify?.pin || '');
  const [adminPhoto, setAdminPhoto] = useState(adminUserToModify?.adminPhotoUrl || '');

  const [savedMsg, setSavedMsg] = useState('');

  // Switch admin user to edit
  const handleSelectAdminToEdit = (user: UserType) => {
    setSelectedAdminToEdit(user);
    setAdminName(user.name);
    setAdminPhone(user.phone);
    setAdminPass(user.password || user.pin || '');
    setAdminPhoto(user.adminPhotoUrl || '');
  };

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
    if (!adminUserToModify || !onUpdateUser) return;
    const updatedUser: UserType = {
      ...adminUserToModify,
      name: adminName,
      phone: adminPhone,
      password: adminPass,
      pin: adminPass.slice(0, 4) || '8822',
      adminPhotoUrl: adminPhoto
    };
    onUpdateUser(updatedUser);
    triggerSaveMsg(`تم تحديث بيانات حساب الأدمن (${adminName}) بنجاح!`);
  };

  // Telegram Handlers
  const handleTelegramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTelegramSettings: TelegramSettings = {
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      notifyOrders,
      notifyDrivers,
      notifyBackups
    };
    onUpdateSiteSettings({ telegramSettings: newTelegramSettings });
    triggerSaveMsg('تم حفظ وتحديث إعدادات بوت التليجرام بنجاح!');
  };

  const handleTestTelegramConnection = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setTelegramStatusMsg({ type: 'error', msg: 'يرجى إدخال توكن البوت ومعرف الشات (Chat ID) أولاً.' });
      return;
    }

    setTestingTelegram(true);
    setTelegramStatusMsg(null);

    const testText = `<b>✅ تم اختبار الاتصال بنجاح من منصة ${siteName || 'طلبك دليفري'}</b>\n\nربط بوت التليجرام يعمل بنجاح ويمكن استلام التقارير والنسخ الاحتياطية والإشعارات عليه الآن! 🚀`;

    const res = await sendTelegramMessage(botToken, chatId, testText);
    setTestingTelegram(false);

    if (res.success) {
      setTelegramStatusMsg({ type: 'success', msg: 'تم إرسال رسالة الاختبار بنجاح إلى التليجرام! تفقد قناتك أو البوت.' });
    } else {
      setTelegramStatusMsg({ type: 'error', msg: `فشل الاتصال: ${res.error}` });
    }
  };

  const handleSendTelegramBackupNow = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setTelegramStatusMsg({ type: 'error', msg: 'يرجى إدخال توكن البوت ومعرف الشات (Chat ID) أولاً.' });
      return;
    }

    setSendingBackup(true);
    setTelegramStatusMsg(null);

    const res = await sendTelegramDataBackup(
      { botToken, chatId, notifyOrders, notifyDrivers, notifyBackups },
      { users: usersList, orders: ordersList, stores: storesList, siteSettings }
    );
    setSendingBackup(false);

    if (res.success) {
      setTelegramStatusMsg({ type: 'success', msg: 'تم إرسال تقرير والنسخة الاحتياطية الكاملة إلى بوت التليجرام بنجاح! 🎉' });
    } else {
      setTelegramStatusMsg({ type: 'error', msg: `حدث خطأ أثناء إرسال النسخة الاحتياطية: ${res.error}` });
    }
  };

  // Push Broadcast Handler
  const handleBroadcastPushSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) {
      setPushStatusMsg({ type: 'error', msg: 'يرجى إدخال عنوان الإشعار ونص الرسالة.' });
      return;
    }

    setSendingPush(true);
    setPushStatusMsg(null);

    try {
      const res = await sendPushNotification({
        role: pushAudience === 'all' ? undefined : pushAudience,
        title: pushTitle.trim(),
        body: pushBody.trim(),
        url: pushUrl.trim() || '/',
        type: 'system'
      });

      setSendingPush(false);

      if (res.success) {
        setPushStatusMsg({
          type: 'success',
          msg: `تم إرسال الإشعار الفوري بنجاح! (${res.sentCount} أجهزة استلمت الإشعار بنجاح)`
        });
        setPushTitle('');
        setPushBody('');
      } else {
        setPushStatusMsg({
          type: 'error',
          msg: `فشل الإرسال: ${res.error || 'تعذر إرسال الإشعارات للأجهزة'}`
        });
      }
    } catch (err: any) {
      setSendingPush(false);
      setPushStatusMsg({
        type: 'error',
        msg: `خطأ أثناء الاتصال بخادم الإشعارات: ${err?.message || err}`
      });
    }
  };

  const isMainAdmin = currentUser?.isAdminMain !== false;
  const adminUsers = usersList.filter(u => u.role === 'admin');

  return (
    <div className="space-y-5 max-w-3xl">
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
          onClick={() => setActiveSubSection('push')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeSubSection === 'push'
              ? 'bg-amber-600 text-white shadow ring-1 ring-amber-400/50'
              : 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-300" />
          <span>إشعارات Push للأجهزة</span>
          <span className="bg-amber-500/30 text-amber-200 text-[9px] px-1.5 py-0.5 rounded-md font-extrabold">مباشر</span>
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
          <span>بروفايل وحسابات الأدمن ({adminUsers.length || 1})</span>
        </button>

        {isMainAdmin && (
          <button
            onClick={() => setActiveSubSection('telegram')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubSection === 'telegram'
                ? 'bg-blue-600 text-white shadow ring-1 ring-blue-400/50'
                : 'text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-blue-300" />
            <span>بوت التليجرام والتقارير</span>
            <span className="bg-blue-500/30 text-blue-200 text-[9px] px-1.5 py-0.5 rounded-md font-extrabold">الرئيسي</span>
          </button>
        )}
      </div>

      {savedMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* BRAND & DELIVERY SETTINGS */}
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

      {/* WEB PUSH NOTIFICATIONS BROADCAST */}
      {activeSubSection === 'push' && (
        <form onSubmit={handleBroadcastPushSubmit} className="bg-slate-800 p-5 rounded-2xl border border-amber-500/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">إرسال إشعار فوري للأجهزة (Web Push Broadcast)</h4>
                <p className="text-[11px] text-slate-400">يصل للمستخدمين على هواتف الأندرويد والكمبيوتر حتى لو كان التطبيق مغلقاً</p>
              </div>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              <span>مجاني بالكامل (VAPID)</span>
            </span>
          </div>

          {pushStatusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                pushStatusMsg.type === 'success'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/20 border border-red-500/40 text-red-300'
              }`}
            >
              {pushStatusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span className="leading-relaxed">{pushStatusMsg.msg}</span>
            </div>
          )}

          {/* Target Audience */}
          <div>
            <label className="text-xs text-slate-300 font-bold block mb-1.5">
              الفئة المستهدفة بالإشعار:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { key: 'all', label: 'الجميع 🌍' },
                { key: 'customer', label: 'العملاء 🛍️' },
                { key: 'driver', label: 'الكباتن 🛵' },
                { key: 'merchant', label: 'المتاجر 🏪' },
                { key: 'admin', label: 'المشرفين 🛡️' }
              ].map((aud) => (
                <button
                  key={aud.key}
                  type="button"
                  onClick={() => setPushAudience(aud.key as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                    pushAudience === aud.key
                      ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {aud.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-bold block mb-1">
              عنوان الإشعار
            </label>
            <input
              type="text"
              required
              placeholder="مثال: خصومات حصرية اليوم في طلبك دليفري 🔥"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-3 rounded-xl text-white font-bold"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-bold block mb-1">
              نص رسالة الإشعار
            </label>
            <textarea
              rows={3}
              required
              placeholder="اكتب نص الإشعار هنا الذي سيظهر على شاشة القفل ومركز إشعارات الهاتف..."
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-3 rounded-xl text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-bold block mb-1">
              رابط الانتقال عند النقر على الإشعار (اختياري)
            </label>
            <input
              type="text"
              placeholder="/"
              value={pushUrl}
              onChange={(e) => setPushUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-mono dir-ltr text-right"
            />
          </div>

          <button
            type="submit"
            disabled={sendingPush}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sendingPush ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>إرسال الإشعار الفوري لجميع الأجهزة المشتركة الآن</span>
          </button>
        </form>
      )}

      {/* AD BANNERS */}
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

      {/* SOCIAL LINKS */}
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

      {/* ADMIN PROFILES MANAGEMENT & EDITING */}
      {activeSubSection === 'profile' && (
        <div className="space-y-5">
          {/* List of Admin Profiles */}
          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-sm text-white">قائمة حسابات وتصاريح الأدمن والمشرفين ({adminUsers.length})</h4>
              </div>
              <span className="text-[11px] text-slate-400">الصورة والبيانات الظاهرة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {adminUsers.map((admin) => {
                const isCurrent = admin.id === currentUser?.id || admin.phone === currentUser?.phone;
                const isSelected = selectedAdminToEdit?.id === admin.id;

                return (
                  <div
                    key={admin.id}
                    onClick={() => handleSelectAdminToEdit(admin)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 relative ${
                      isSelected || isCurrent
                        ? 'bg-slate-900 border-purple-500/80 ring-1 ring-purple-500/40 shadow-lg'
                        : 'bg-slate-900/60 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {/* Admin Avatar Photo */}
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-600 overflow-hidden relative shrink-0 flex items-center justify-center text-purple-300 font-black text-sm shadow">
                      {admin.adminPhotoUrl ? (
                        <img src={admin.adminPhotoUrl} alt={admin.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{admin.name.slice(0, 1)}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white truncate">{admin.name}</span>
                        {admin.isAdminMain ? (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0">
                            أدمن رئيسي
                          </span>
                        ) : (
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                            أدمن فرعي
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-orange-400 dir-ltr text-right block mt-0.5">
                        {admin.phone}
                      </span>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span>كلمة المرور: <strong className="font-mono text-emerald-400">{admin.password || admin.pin}</strong></span>
                        <span>•</span>
                        <span className={admin.status === 'active' ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                          {admin.status === 'active' ? 'نشط' : 'موقف'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg text-[10px] font-bold border border-slate-700 shrink-0"
                    >
                      تعديل
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin Profile Edit Form */}
          <form onSubmit={handleProfileSubmit} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
            <h4 className="font-bold text-sm text-white border-b border-slate-700 pb-2 flex items-center justify-between">
              <span>تحديث بيانات وصورة البروفايل ({adminUserToModify?.name || 'الأدمن'})</span>
              {selectedAdminToEdit && (
                <button
                  type="button"
                  onClick={() => handleSelectAdminToEdit(currentUser || adminUsers[0])}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  الرجوع لحسابي الشخصي
                </button>
              )}
            </h4>

            {/* Photo Avatar Preview & Upload */}
            <div className="flex items-center gap-4 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-purple-500/50 overflow-hidden relative shrink-0 shadow-lg flex items-center justify-center text-slate-400">
                {adminPhoto ? (
                  <img src={adminPhoto} alt="Admin Photo" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-purple-400" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-slate-300 font-bold block">
                  صورة البروفايل الشخصية (تظهر بجانب اسمك ورسائلك)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="رابط الصورة المباشر أو ارفع صورة من الهاتف"
                    value={adminPhoto}
                    onChange={(e) => setAdminPhoto(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-xs p-2 rounded-xl text-white dir-ltr text-right flex-1"
                  />
                  <label className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer shrink-0 flex items-center justify-center gap-1.5 transition-all shadow">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة من الهاتف</span>
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
              <label className="text-xs text-slate-400 block mb-1">اسم الأدمن الكامل</label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">رقم الموبايل المسجل</label>
                <input
                  type="tel"
                  required
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white dir-ltr text-right font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">كلمة المرور الجديدة / رمز الـ PIN</label>
                <input
                  type="text"
                  required
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-mono text-emerald-400 font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>تحديث وحفظ بيانات حساب الأدمن</span>
            </button>
          </form>
        </div>
      )}

      {/* TELEGRAM BOT SETTINGS (MAIN ADMIN ONLY) */}
      {activeSubSection === 'telegram' && isMainAdmin && (
        <div className="space-y-4">
          <form onSubmit={handleTelegramSubmit} className="bg-slate-800 p-5 rounded-2xl border border-blue-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">إعدادات وتكامل بوت التليجرام (Telegram Bot)</h4>
                  <p className="text-[11px] text-slate-400">خاص بالأدمن الرئيسي لاستلام التقارير والنسخ الاحتياطي والإشعارات الفورية</p>
                </div>
              </div>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-1 rounded-lg">
                آمن ومشفر
              </span>
            </div>

            {telegramStatusMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  telegramStatusMsg.type === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-red-500/20 border border-red-500/40 text-red-300'
                }`}
              >
                {telegramStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <span className="leading-relaxed">{telegramStatusMsg.msg}</span>
              </div>
            )}

            {/* Bot Token & Chat ID Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  توكن بوت التليجرام (Telegram Bot Token)
                </label>
                <input
                  type="text"
                  placeholder="مثال: 7890123456:AAFx1234567890abcdefghijklm"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs p-3 rounded-xl text-white font-mono dir-ltr text-right focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 احصل على التوكن مجاناً عبر البحث عن بوت <code className="text-blue-400 font-bold">@BotFather</code> على تطبيق التليجرام وإنشاء بوت جديد.
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  معرف الشات أو القناة (Telegram Chat ID / Channel Username)
                </label>
                <input
                  type="text"
                  placeholder="مثال: 1234567890 أو @my_channel_name"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs p-3 rounded-xl text-white font-mono dir-ltr text-right focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 يمكنك الحصول على رقم الـ Chat ID الخاص بك بإرسال رسالة إلى بوت <code className="text-blue-400 font-bold">@userinfobot</code>.
                </p>
              </div>
            </div>

            {/* Telegram Options Toggles */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
              <h5 className="font-bold text-xs text-blue-300 flex items-center gap-1.5">
                <Bell className="w-4 h-4" />
                <span>خيارات الإشعارات والتقارير التلقائية:</span>
              </h5>

              <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300 hover:text-white">
                <span>إرسال إشعارات الطلبات الجديدة والشكاوى على التليجرام</span>
                <input
                  type="checkbox"
                  checked={notifyOrders}
                  onChange={(e) => setNotifyOrders(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300 hover:text-white">
                <span>إرسال إشعارات طلبات الانضمام الجدد (الكباتن والتجار)</span>
                <input
                  type="checkbox"
                  checked={notifyDrivers}
                  onChange={(e) => setNotifyDrivers(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300 hover:text-white">
                <span>تضمين ملخص النسخ الاحتياطي التلقائي للبيانات على التليجرام</span>
                <input
                  type="checkbox"
                  checked={notifyBackups}
                  onChange={(e) => setNotifyBackups(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded"
                />
              </label>
            </div>

            {/* Test & Actions Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleTestTelegramConnection}
                disabled={testingTelegram}
                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {testingTelegram ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>اختبار الاتصال بالبوت وتجربة الرسالة</span>
              </button>

              <button
                type="button"
                onClick={handleSendTelegramBackupNow}
                disabled={sendingBackup}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span>إرسال تقرير ونسخة احتياطية فورية الآن</span>
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4" />
              <span>حفظ إعدادات بوت التليجرام</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
