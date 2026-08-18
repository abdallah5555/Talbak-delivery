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

export const AdminSettingsTab: React.FC<Props> = ({ siteSettings, onUpdateSiteSettings, currentUser, onUpdateUser, usersList = [], ordersList = [], storesList = [] }) => {
  const [activeSubSection, setActiveSubSection] = useState<'brand' | 'banners' | 'social' | 'profile' | 'telegram' | 'push'>('brand');
  const [pushAudience, setPushAudience] = useState<'all' | 'customer' | 'driver' | 'merchant' | 'admin'>('all');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('/');
  const [sendingPush, setSendingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [siteName, setSiteName] = useState(siteSettings.siteName);
  const [supportPhone, setSupportPhone] = useState(siteSettings.supportPhone);
  const [logoUrl, setLogoUrl] = useState(siteSettings.logoUrl);
  const [bannerOfferText, setBannerOfferText] = useState(siteSettings.bannerOfferText);
  const [deliveryBaseFee, setDeliveryBaseFee] = useState(siteSettings.deliveryBaseFee.toString());
  const [social, setSocial] = useState<SocialLinks>(siteSettings.socialLinks || { facebook:'', whatsapp:'', instagram:'', tiktok:'', youtube:'', telegram:'' });
  const [banners, setBanners] = useState<AdBanner[]>(siteSettings.adBanners || []);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerImage, setNewBannerImage] = useState('');
  const [newBannerBadge, setNewBannerBadge] = useState('إعلان مميز');
  const [newBannerLink, setNewBannerLink] = useState('');
  const [botToken, setBotToken] = useState(siteSettings.telegramSettings?.botToken || '');
  const [chatId, setChatId] = useState(siteSettings.telegramSettings?.chatId || '');
  const [notifyOrders, setNotifyOrders] = useState(siteSettings.telegramSettings?.notifyOrders ?? true);
  const [notifyDrivers, setNotifyDrivers] = useState(siteSettings.telegramSettings?.notifyDrivers ?? true);
  const [notifyBackups, setNotifyBackups] = useState(siteSettings.telegramSettings?.notifyBackups ?? true);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatusMsg, setTelegramStatusMsg] = useState<{ type:'success'|'error'; msg:string }|null>(null);
  const [sendingBackup, setSendingBackup] = useState(false);
  const [selectedAdminToEdit, setSelectedAdminToEdit] = useState<UserType | null>(null);
  const adminUserToModify = selectedAdminToEdit || currentUser;
  const [adminName, setAdminName] = useState(adminUserToModify?.name || '');
  const [adminPhone, setAdminPhone] = useState(adminUserToModify?.phone || '');
  const [adminPass, setAdminPass] = useState(adminUserToModify?.password || adminUserToModify?.pin || '');
  const [adminPhoto, setAdminPhoto] = useState(adminUserToModify?.adminPhotoUrl || '');
  const [savedMsg, setSavedMsg] = useState('');

  const triggerSaveMsg=(msg:string)=>{setSavedMsg(msg);setTimeout(()=>setSavedMsg(''),3000)};
  const handleBrandSubmit=(e:React.FormEvent)=>{e.preventDefault();onUpdateSiteSettings({siteName,supportPhone,logoUrl,bannerOfferText,deliveryBaseFee:parseFloat(deliveryBaseFee)||15});triggerSaveMsg('تم حفظ وتحديث إعدادات الهوية والتطبيق بنجاح!')};
  const handleSocialSubmit=(e:React.FormEvent)=>{e.preventDefault();onUpdateSiteSettings({socialLinks:social});triggerSaveMsg('تم حفظ روابط شبكات التواصل الاجتماعي بنجاح!')};
  const handleFileUpload=(e:React.ChangeEvent<HTMLInputElement>,callback:(url:string)=>void)=>{const file=e.target.files?.[0];if(file){const reader=new FileReader();reader.onloadend=()=>{if(reader.result)callback(reader.result as string)};reader.readAsDataURL(file)}};
  const handleAddBanner=(e:React.FormEvent)=>{e.preventDefault();if(!newBannerTitle||!newBannerImage)return;const newAd:AdBanner={id:'banner-'+Date.now(),title:newBannerTitle,imageUrl:newBannerImage,badge:newBannerBadge,targetUrl:newBannerLink,active:true};const updated=[...banners,newAd];setBanners(updated);onUpdateSiteSettings({adBanners:updated});setNewBannerTitle('');setNewBannerImage('');setNewBannerLink('');triggerSaveMsg('تم إضافة الإعلان بنجاح وتفعيله!')};
  const toggleBannerActive=(id:string)=>{const updated=banners.map(b=>b.id===id?{...b,active:!b.active}:b);setBanners(updated);onUpdateSiteSettings({adBanners:updated});triggerSaveMsg('تم تغيير حالة الإعلان!')};
  const deleteBanner=(id:string)=>{const updated=banners.filter(b=>b.id!==id);setBanners(updated);onUpdateSiteSettings({adBanners:updated});triggerSaveMsg('تم حذف الإعلان!')};
  const handleProfileSubmit=(e:React.FormEvent)=>{e.preventDefault();if(!adminUserToModify||!onUpdateUser)return;onUpdateUser({...adminUserToModify,name:adminName,phone:adminPhone,password:adminPass,pin:adminPass.slice(0,4)||'8822',adminPhotoUrl:adminPhoto});triggerSaveMsg(`تم تحديث بيانات حساب الأدمن (${adminName}) بنجاح!`)};
  const handleTelegramSubmit=(e:React.FormEvent)=>{e.preventDefault();const newTelegramSettings: TelegramSettings = { botToken: '', chatId: chatId.trim(), notifyOrders, notifyDrivers, notifyBackups };onUpdateSiteSettings({telegramSettings:newTelegramSettings});triggerSaveMsg('تم حفظ إعدادات الإشعارات؛ التوكن محفوظ آمنًا في Supabase Secrets.')};
  const handleTestTelegramConnection=async()=>{setTestingTelegram(true);setTelegramStatusMsg(null);const res=await sendTelegramMessage({chatId:chatId.trim()},`<b>✅ تم اختبار الاتصال بنجاح من منصة ${siteName||'طلبك دليفري'}</b>\n\nربط بوت التليجرام يعمل بنجاح. 🚀`);setTestingTelegram(false);setTelegramStatusMsg(res.success?{type:'success',msg:'تم إرسال رسالة الاختبار بنجاح إلى التليجرام!'}:{type:'error',msg:`فشل الاتصال: ${res.error}`})};
  const handleSendTelegramBackupNow=async()=>{setSendingBackup(true);setTelegramStatusMsg(null);const res=await sendTelegramDataBackup({chatId:chatId.trim()},{users:usersList,orders:ordersList,stores:storesList,siteSettings});setSendingBackup(false);setTelegramStatusMsg(res.success?{type:'success',msg:'تم إرسال التقرير إلى التليجرام بنجاح! 🎉'}:{type:'error',msg:`حدث خطأ أثناء إرسال التقرير: ${res.error}`})};
  const handleBroadcastPushSubmit=async(e:React.FormEvent)=>{e.preventDefault();if(!pushTitle.trim()||!pushBody.trim()){setPushStatusMsg({type:'error',msg:'يرجى إدخال عنوان الإشعار ونص الرسالة.'});return}setSendingPush(true);setPushStatusMsg(null);try{const res=await sendPushNotification({role:pushAudience==='all'?undefined:pushAudience,title:pushTitle.trim(),body:pushBody.trim(),url:pushUrl.trim()||'/',type:'system'});setSendingPush(false);if(res.success){setPushStatusMsg({type:'success',msg:`تم إرسال الإشعار الفوري بنجاح! (${res.sentCount} أجهزة)`});setPushTitle('');setPushBody('')}else setPushStatusMsg({type:'error',msg:`فشل الإرسال: ${res.error||'تعذر إرسال الإشعارات'}`})}catch(err:any){setSendingPush(false);setPushStatusMsg({type:'error',msg:`خطأ: ${err?.message||err}`})}};
  const isMainAdmin=currentUser?.isAdminMain!==false;
  const adminUsers=usersList.filter(u=>u.role==='admin');
  const handleSelectAdminToEdit=(user:UserType)=>{setSelectedAdminToEdit(user);setAdminName(user.name);setAdminPhone(user.phone);setAdminPass(user.password||user.pin||'');setAdminPhoto(user.adminPhotoUrl||'')};

  return <div className="space-y-5 max-w-3xl"><div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-2xl border border-slate-700 overflow-x-auto"><button onClick={()=>setActiveSubSection('brand')}>الهوية والتطبيق</button><button onClick={()=>setActiveSubSection('push')}>إشعارات Push</button><button onClick={()=>setActiveSubSection('banners')}>الإعلانات والبنرات ({banners.length})</button><button onClick={()=>setActiveSubSection('social')}>التواصل</button>{isMainAdmin&&<button onClick={()=>setActiveSubSection('telegram')}>Telegram</button>}<button onClick={()=>setActiveSubSection('profile')}>الملف الشخصي</button></div>
    {savedMsg&&<div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-300">{savedMsg}</div>}
    {activeSubSection==='brand'&&<form onSubmit={handleBrandSubmit} className="space-y-4"><input value={siteName} onChange={e=>setSiteName(e.target.value)} placeholder="اسم التطبيق"/><input value={supportPhone} onChange={e=>setSupportPhone(e.target.value)} placeholder="هاتف الدعم"/><input value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} placeholder="رابط الشعار"/><input value={bannerOfferText} onChange={e=>setBannerOfferText(e.target.value)} placeholder="نص العرض"/><input value={deliveryBaseFee} onChange={e=>setDeliveryBaseFee(e.target.value)} placeholder="رسوم التوصيل"/><button type="submit">حفظ</button></form>}
    {activeSubSection==='telegram'&&isMainAdmin&&<div className="space-y-4"><div className="p-4 rounded-xl bg-blue-500/10 text-blue-200">توكن البوت وChat ID يجب أن يبقيا على الخادم فقط. تم إزالة إدخال التوكن من واجهة التطبيق.</div><label className="flex gap-2"><input type="checkbox" checked={notifyOrders} onChange={e=>setNotifyOrders(e.target.checked)}/> طلبات</label><label className="flex gap-2"><input type="checkbox" checked={notifyDrivers} onChange={e=>setNotifyDrivers(e.target.checked)}/> سائقين</label><label className="flex gap-2"><input type="checkbox" checked={notifyBackups} onChange={e=>setNotifyBackups(e.target.checked)}/> نسخ احتياطية</label><input value={chatId} onChange={e=>setChatId(e.target.value)} placeholder="Chat ID (اختياري، الافتراضي من Secret)"/><div className="flex gap-2"><button onClick={handleTestTelegramConnection} disabled={testingTelegram}>{testingTelegram?'جاري الاختبار...':'اختبار Telegram'}</button><button onClick={handleSendTelegramBackupNow} disabled={sendingBackup}>{sendingBackup?'جاري الإرسال...':'إرسال تقرير Telegram'}</button><button onClick={handleTelegramSubmit}>حفظ الإعدادات</button></div>{telegramStatusMsg&&<div className={telegramStatusMsg.type==='success'?'text-emerald-400':'text-red-400'}>{telegramStatusMsg.msg}</div>}</div>}
    {activeSubSection==='banners'&&<div className="space-y-4"><form onSubmit={handleAddBanner} className="space-y-2"><input value={newBannerTitle} onChange={e=>setNewBannerTitle(e.target.value)} placeholder="عنوان الإعلان"/><input value={newBannerImage} onChange={e=>setNewBannerImage(e.target.value)} placeholder="رابط صورة الإعلان"/><input value={newBannerBadge} onChange={e=>setNewBannerBadge(e.target.value)} placeholder="الشارة"/><input value={newBannerLink} onChange={e=>setNewBannerLink(e.target.value)} placeholder="الرابط"/><button type="submit">إضافة إعلان</button></form>{banners.map(b=><div key={b.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-700"><img src={b.imageUrl} alt={b.title} className="w-16 h-10 object-cover rounded"/><span>{b.title}</span><button onClick={()=>toggleBannerActive(b.id)}>{b.active?'تعطيل':'تفعيل'}</button><button onClick={()=>deleteBanner(b.id)}>حذف</button></div>)}</div>}
    {activeSubSection==='social'&&<form onSubmit={handleSocialSubmit} className="space-y-2">{Object.entries(social).map(([k,v])=><input key={k} value={v||''} onChange={e=>setSocial({...social,[k]:e.target.value})} placeholder={k}/>) }<button type="submit">حفظ</button></form>}
    {activeSubSection==='profile'&&<form onSubmit={handleProfileSubmit} className="space-y-2"><input value={adminName} onChange={e=>setAdminName(e.target.value)} placeholder="الاسم"/><input value={adminPhone} onChange={e=>setAdminPhone(e.target.value)} placeholder="الهاتف"/><input value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="كلمة المرور"/><input value={adminPhoto} onChange={e=>setAdminPhoto(e.target.value)} placeholder="الصورة"/><button type="submit">حفظ</button>{adminUsers.map(u=><button type="button" key={u.id} onClick={()=>handleSelectAdminToEdit(u)}>{u.name}</button>)}</form>}
    {activeSubSection==='push'&&<form onSubmit={handleBroadcastPushSubmit} className="space-y-2"><select value={pushAudience} onChange={e=>setPushAudience(e.target.value as any)}><option value="all">الكل</option><option value="customer">عميل</option><option value="driver">سائق</option><option value="merchant">تاجر</option><option value="admin">أدمن</option></select><input value={pushTitle} onChange={e=>setPushTitle(e.target.value)} placeholder="عنوان الإشعار"/><textarea value={pushBody} onChange={e=>setPushBody(e.target.value)} placeholder="نص الإشعار"/><input value={pushUrl} onChange={e=>setPushUrl(e.target.value)} placeholder="الرابط"/><button type="submit" disabled={sendingPush}>{sendingPush?'جاري الإرسال...':'إرسال'}</button>{pushStatusMsg&&<div>{pushStatusMsg.msg}</div>}</form>}
  </div>;
};
