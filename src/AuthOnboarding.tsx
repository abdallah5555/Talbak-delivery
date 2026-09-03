import { useMemo,useState } from "react";
import { supabase } from "./lib/supabase";
import "./auth.css";

type Mode="login"|"signup";
type Join="customer"|"merchant"|"driver";
type Form={fullName:string;phone:string;password:string;confirm:string;businessName:string;category:string;customCategory:string;address:string;vehicleType:string};
const initial:Form={fullName:"",phone:"",password:"",confirm:"",businessName:"",category:"مطاعم",customCategory:"",address:"",vehicleType:"موتسيكل"};
const normalizePhone=(v:string)=>{const digits=v.replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g,"");if(digits.startsWith("20")&&digits.length===12)return `+${digits}`;if(digits.startsWith("01")&&digits.length===11)return `+20${digits.slice(1)}`;if(digits.startsWith("1")&&digits.length===10)return `+20${digits}`;return v.trim().startsWith("+")?`+${digits}`:`+${digits}`};
const err=(message:string)=>{const m=message.toLowerCase();if(m.includes("invalid login credentials"))return "رقم الموبايل أو كلمة المرور غير صحيحة.";if(m.includes("user already registered")||m.includes("already registered"))return "الرقم ده مسجل بالفعل. جرّب تسجيل الدخول.";if(m.includes("phone")&&m.includes("not enabled"))return "تسجيل الدخول بالرقم غير مفعّل في إعدادات Supabase حاليًا.";if(m.includes("password"))return "كلمة المرور لازم تكون 6 أحرف على الأقل.";if(m.includes("rate limit"))return "استنى شوية وحاول تاني.";return message||"حصلت مشكلة. جرّب تاني."};

export default function AuthOnboarding(){
 const [mode,setMode]=useState<Mode>("login"),[join,setJoin]=useState<Join>("customer"),[form,setForm]=useState<Form>(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState<{kind:"error"|"success";text:string}|null>(null),[needsOtp,setNeedsOtp]=useState(false),[otp,setOtp]=useState(""),[showPassword,setShowPassword]=useState(false);
 const title=mode==="login"?"أهلاً بيك في طلبك":"ابدأ رحلتك مع طلبك";
 const roleCopy=useMemo(()=>({customer:{icon:"🛍️",title:"عميل",desc:"اطلب أكل، بقالة، مخبوزات وخدمات من مكان واحد."},merchant:{icon:"🏪",title:"تاجر",desc:"قدّم نشاطك، جهّز متجرك واستقبل الطلبات بعد الاعتماد."},driver:{icon:"🛵",title:"سائق",desc:"اشتغل بمرونة واستقبل الطلبات القريبة منك."}}),[]);
 function set<K extends keyof Form>(key:K,value:Form[K]){setForm(x=>({...x,[key]:value}));setMessage(null)}
 function chooseRole(r:Join){setJoin(r);setMessage(null);if(mode==="login")setMode("signup")}
 async function finishJoin(){
  const pending=localStorage.getItem("talabak_pending_join");
  if(!pending)return;
  let p:any;try{p=JSON.parse(pending)}catch{return}
  if(p.join==="merchant"){
   const {error}=await supabase.rpc("apply_as_merchant",{p_business_name:String(p.businessName||""),p_phone:normalizePhone(String(p.phone||"")),p_address:String(p.address||""),p_category:String(p.category||"مطاعم")});
   if(error)throw new Error(err(error.message));
  }else if(p.join==="driver"){
   const {error}=await supabase.rpc("apply_as_driver",{p_full_name:String(p.fullName||""),p_phone:normalizePhone(String(p.phone||"")),p_vehicle_type:String(p.vehicleType||"موتسيكل")});
   if(error)throw new Error(err(error.message));
  }
  localStorage.removeItem("talabak_pending_join");
 }
 async function submit(){
  setMessage(null);
  const phone=normalizePhone(form.phone);
  if(phone.length<12||!phone.startsWith("+20"))return setMessage({kind:"error",text:"اكتب رقم موبايل مصري صحيح، مثال: 01012345678"});
  if(form.password.length<6)return setMessage({kind:"error",text:"كلمة المرور لازم تكون 6 أحرف على الأقل."});
  if(mode==="signup"){
   if(!form.fullName.trim())return setMessage({kind:"error",text:"اكتب الاسم بالكامل."});
   if(form.password!==form.confirm)return setMessage({kind:"error",text:"كلمتا المرور مش متطابقين."});
   if(join==="merchant"&&(!form.businessName.trim()||!form.address.trim()))return setMessage({kind:"error",text:"للتاجر لازم اسم النشاط والعنوان."});
   if(join==="merchant"&&form.category==="أخرى"&&!form.customCategory.trim())return setMessage({kind:"error",text:"اكتب نوع النشاط في خانة أخرى."});
  }
  setBusy(true);
  try{
   if(mode==="login"){
    const {error}=await supabase.auth.signInWithPassword({phone,password:form.password});
    if(error)throw new Error(err(error.message));
    window.location.reload();return;
   }
   const {data,error:signupError}=await supabase.auth.signUp({phone,password:form.password,options:{data:{full_name:form.fullName.trim(),phone,role:"customer"}}});
   if(signupError)throw new Error(err(signupError.message));
   localStorage.setItem("talabak_pending_join",JSON.stringify({join,fullName:form.fullName.trim(),phone,businessName:form.businessName.trim(),address:form.address.trim(),category:form.category==="أخرى"?form.customCategory.trim():form.category,vehicleType:form.vehicleType}));
   if(!data.session){setNeedsOtp(true);setMessage({kind:"success",text:"الحساب اتعمل. لو التحقق بالرسالة مفعّل، اكتب الكود اللي وصلك على الموبايل."});return}
   await finishJoin();
   setMessage({kind:"success",text:join==="customer"?"الحساب اتعمل بنجاح 🎉":join==="merchant"?"طلب التاجر اتبعت للإدارة للمراجعة.":"طلب السائق اتبعت للإدارة للمراجعة."});
   window.setTimeout(()=>window.location.reload(),700);
  }catch(e:any){setMessage({kind:"error",text:e?.message||"حصلت مشكلة."})}finally{setBusy(false)}
 }
 async function verify(){
  const phone=normalizePhone(form.phone);if(!/^\+20\d{10}$/.test(phone)||!/^\d{6}$/.test(otp))return setMessage({kind:"error",text:"اكتب كود التحقق المكوّن من 6 أرقام."});
  setBusy(true);setMessage(null);
  try{const {data,error}=await supabase.auth.verifyOtp({phone,token:otp,type:"sms"});if(error)throw new Error(err(error.message));if(!data.session)throw new Error("تم التحقق لكن لم يتم فتح الجلسة. جرّب تسجيل الدخول بالرقم وكلمة المرور.");await finishJoin();setNeedsOtp(false);setMessage({kind:"success",text:"تم تأكيد الرقم وتسجيل الدخول بنجاح 🎉"});window.setTimeout(()=>window.location.reload(),700)}catch(e:any){setMessage({kind:"error",text:e?.message||"كود التحقق غير صحيح."})}finally{setBusy(false)}
 }
 async function resend(){const phone=normalizePhone(form.phone);setBusy(true);setMessage(null);const {error}=await supabase.auth.resend({type:"sms",phone});setBusy(false);setMessage(error?{kind:"error",text:err(error.message)}:{kind:"success",text:"اتبعَت رسالة تحقق جديدة على الرقم."})}
 return <div className="auth-page" dir="rtl">
  <div className="auth-shell">
   <aside className="auth-side"><div className="brand"><span>ط</span><div><b>طلبك</b><small>دليفري لكل احتياجاتك</small></div></div><div className="hero-copy"><span className="eyebrow">رقم واحد • تجربة واحدة • كل طلباتك</span><h1>اطلب بسهولة،<br/>اشتغل بذكاء،<br/><em>وكبّر شغلك.</em></h1><p>حساب واحد مرتبط برقم موبايلك. عميل أو تاجر أو سائق — وكل فئة لها رحلة تشغيل واضحة.</p></div><div className="side-points"><div>✓ تسجيل ودخول برقم الموبايل</div><div>✓ رقم واحد لا يتكرر بين الفئات</div><div>✓ مراجعة حقيقية لطلبات التاجر والسائق</div></div></aside>
   <main className="auth-main">
    <div className="auth-top"><button className="back-btn" onClick={()=>{if(mode==="signup"&&!needsOtp){setMode("login");setJoin("customer");setMessage(null)}else window.location.href="/"}}>← الرئيسية</button><span>حسابك على طلبك</span></div>
    {!needsOtp&&mode==="signup"&&<section className="role-picker"><div className="section-head"><div><span className="mini">اختار طريقك</span><h2>إنت داخل طلبك بصفتك إيه؟</h2></div><small>رقم الموبايل لا ينفع يتسجل في فئتين مختلفتين.</small></div><div className="role-grid">{(Object.keys(roleCopy) as Join[]).map(r=><button key={r} className={`role-card ${join===r?"selected":""}`} onClick={()=>chooseRole(r)}><span className="role-icon">{roleCopy[r].icon}</span><span><b>{roleCopy[r].title}</b><small>{roleCopy[r].desc}</small></span><i>›</i></button>)}</div></section>}
    <section className="auth-card">
     <div className="auth-card-head"><span className="mini">{needsOtp?"تأكيد رقم الموبايل":mode==="login"?"دخول آمن":"حساب جديد"}</span><h2>{needsOtp?"أكد رقمك ونكمّل":title}</h2><p>{needsOtp?"اكتب كود التحقق المكوّن من 6 أرقام اللي وصلك على موبايلك.":mode==="login"?"ادخل برقم الموبايل وكلمة المرور علشان تكمل.":join==="customer"?"بياناتك الأساسية كفاية علشان تبدأ كعميل.":join==="merchant"?"خلّي نشاطك جاهز للانضمام واستقبال الطلبات.":"قدّم بياناتك الأساسية وابدأ إجراءات الانضمام كسائق."}</p></div>
     {message&&<div className={`auth-alert ${message.kind}`}>{message.text}</div>}
     {needsOtp?<div className="otp-box"><label><span>كود التحقق</span><input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr"/></label><button className="primary-btn" disabled={busy} onClick={()=>void verify()}>{busy?"جاري التحقق…":"تأكيد الرقم وتسجيل الدخول ←"}</button><button className="secondary-btn" disabled={busy} onClick={()=>void resend()}>إعادة إرسال الكود</button></div>:<>
     <div className="form-grid">
      {mode==="signup"&&<><label><span>الاسم بالكامل</span><input value={form.fullName} onChange={e=>set("fullName",e.target.value)} placeholder="مثال: عبدالله عمرو" autoComplete="name"/></label><label><span>رقم الموبايل</span><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="01012345678" inputMode="tel" autoComplete="tel"/></label></>}
      <label className={mode==="signup"?"full":""}><span>رقم الموبايل</span><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="01012345678" inputMode="tel" autoComplete="tel" dir="ltr"/></label>
      <label><span>كلمة المرور</span><div className="password-wrap"><input type={showPassword?"text":"password"} value={form.password} onChange={e=>set("password",e.target.value)} placeholder="6 أحرف على الأقل" autoComplete={mode==="login"?"current-password":"new-password"} dir="ltr"/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?"إخفاء":"إظهار"}</button></div></label>
      {mode==="signup"&&<label><span>تأكيد كلمة المرور</span><input type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="كرر كلمة المرور" autoComplete="new-password" dir="ltr"/></label>}
      {mode==="signup"&&join==="merchant"&&<><label><span>اسم النشاط / المتجر</span><input value={form.businessName} onChange={e=>set("businessName",e.target.value)} placeholder="مثال: مطعم وكافيه النيل"/></label><label><span>نوع النشاط</span><select value={form.category} onChange={e=>set("category",e.target.value)}><option>مطاعم</option><option>بقالة</option><option>مخبوزات</option><option>صيدلية</option><option>مشروبات</option><option>حلويات</option><option>عناية</option><option>خدمات</option><option>أخرى</option></select></label>{form.category==="أخرى"&&<label className="full"><span>اكتب نوع النشاط</span><input value={form.customCategory} onChange={e=>set("customCategory",e.target.value)} placeholder="مثال: محل ورد، قطع غيار، مغسلة..."/></label>}<label className="full"><span>عنوان النشاط</span><input value={form.address} onChange={e=>set("address",e.target.value)} placeholder="المنطقة، الشارع، رقم المحل"/></label><div className="form-info full">بيانات النشاط بتدخل للمراجعة قبل التفعيل. النوع المخصص في «أخرى» بيتحفظ كما كتبته.</div></>}
      {mode==="signup"&&join==="driver"&&<><label><span>نوع المركبة</span><select value={form.vehicleType} onChange={e=>set("vehicleType",e.target.value)}><option>سكوتر</option><option>موتسيكل</option><option>عجلة</option></select></label><div className="driver-note"><b>اختيارات المركبات الحالية</b><span>سكوتر • موتسيكل • عجلة فقط. مفيش سيارة أو «أخرى» في التسجيل.</span></div><div className="form-info full">بعد التقديم، الإدارة تراجع الطلب قبل تفعيل استقبال الطلبات.</div></>}
     </div><button className="primary-btn" disabled={busy} onClick={()=>void submit()}>{busy?"جاري المعالجة…":mode==="login"?"تسجيل الدخول بالرقم ←":join==="customer"?"إنشاء حساب عميل ←":join==="merchant"?"تقديم طلب تاجر ←":"تقديم طلب سائق ←"}</button></>}
     <div className="auth-switch">{mode==="login"?<>لسه جديد؟ <button onClick={()=>{setMode("signup");setMessage(null)}}>أنشئ حسابك</button></>:<>عندك حساب بالفعل؟ <button onClick={()=>{setMode("login");setJoin("customer");setMessage(null)}}>تسجيل الدخول</button></>}</div>
     {mode==="signup"&&!needsOtp&&<small className="legal">بإنشاء الحساب أنت موافق على شروط الاستخدام وسياسة الخصوصية الخاصة بطلبك.</small>}
    </section>
   </main>
  </div>
 </div>
}
