import { useMemo,useState } from "react";
import { supabase } from "./lib/supabase";
import "./auth.css";

type Mode="login"|"signup";
type Join="customer"|"merchant"|"driver";

type Form={fullName:string;phone:string;email:string;password:string;confirm:string;businessName:string;category:string;address:string;vehicleType:string};
const initial:Form={fullName:"",phone:"",email:"",password:"",confirm:"",businessName:"",category:"مطاعم",address:"",vehicleType:"موتوسيكل"};
const cleanPhone=(v:string)=>v.replace(/[^0-9+]/g,"");
const err=(message:string)=>{const m=message.toLowerCase();if(m.includes("invalid login credentials"))return "الإيميل أو كلمة المرور غير صحيحة.";if(m.includes("user already registered"))return "الإيميل ده مستخدم بالفعل. جرّب تسجيل الدخول.";if(m.includes("password"))return "كلمة المرور لازم تكون 6 أحرف على الأقل.";if(m.includes("email"))return "راجع الإيميل واكتبه بشكل صحيح.";return message||"حصلت مشكلة. جرّب تاني."};

export default function AuthOnboarding(){
 const [mode,setMode]=useState<Mode>("login"),[join,setJoin]=useState<Join>("customer"),[form,setForm]=useState<Form>(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState<{kind:"error"|"success";text:string}|null>(null),[needsConfirm,setNeedsConfirm]=useState(false),[showPassword,setShowPassword]=useState(false);
 const title=mode==="login"?"أهلاً بيك في طلبك":"ابدأ رحلتك مع طلبك";
 const roleCopy=useMemo(()=>({customer:{icon:"🛍️",title:"عميل",desc:"اطلب أكل، بقالة، مخبوزات وخدمات من مكان واحد."},merchant:{icon:"🏪",title:"تاجر",desc:"افتح متجرك، أضف المنيو واستقبل الطلبات من العملاء."},driver:{icon:"🛵",title:"سائق",desc:"اشتغل بمرونة واستقبل الطلبات القريبة منك."}}),[]);
 function set<K extends keyof Form>(key:K,value:Form[K]){setForm(x=>({...x,[key]:value}));setMessage(null)}
 function chooseRole(r:Join){setJoin(r);setMessage(null);if(mode==="login")setMode("signup")}
 async function submit(){
  setMessage(null);
  if(!form.email.trim()||!form.email.includes("@"))return setMessage({kind:"error",text:"اكتب إيميل صحيح."});
  if(form.password.length<6)return setMessage({kind:"error",text:"كلمة المرور لازم تكون 6 أحرف على الأقل."});
  if(mode==="signup"){
   if(!form.fullName.trim())return setMessage({kind:"error",text:"اكتب الاسم بالكامل."});
   if(!cleanPhone(form.phone))return setMessage({kind:"error",text:"اكتب رقم الموبايل."});
   if(form.password!==form.confirm)return setMessage({kind:"error",text:"كلمتا المرور مش متطابقين."});
   if(join==="merchant"&&(!form.businessName.trim()||!form.address.trim()))return setMessage({kind:"error",text:"للتاجر لازم اسم النشاط والعنوان."});
  }
  setBusy(true);
  try{
   if(mode==="login"){
    const {error}=await supabase.auth.signInWithPassword({email:form.email.trim(),password:form.password});
    if(error)throw new Error(err(error.message));
    window.location.reload();
    return;
   }
   const {data,error:signupError}=await supabase.auth.signUp({email:form.email.trim(),password:form.password,options:{emailRedirectTo:window.location.origin,data:{full_name:form.fullName.trim(),phone:cleanPhone(form.phone),role:"customer"}}});
   if(signupError)throw new Error(err(signupError.message));
   localStorage.setItem("talabak_pending_join",JSON.stringify({join,fullName:form.fullName.trim(),phone:cleanPhone(form.phone),businessName:form.businessName.trim(),address:form.address.trim(),category:form.category,vehicleType:form.vehicleType,email:form.email.trim()}));
   if(!data.session){setNeedsConfirm(true);setMessage({kind:"success",text:"الحساب اتعمل. افتح رسالة التأكيد في الإيميل، وبعدها ارجع وسجّل الدخول."});return}
   if(join==="merchant"){
    const {error}=await supabase.rpc("apply_as_merchant",{p_business_name:form.businessName.trim(),p_phone:cleanPhone(form.phone),p_address:form.address.trim(),p_category:form.category});
    if(error)throw new Error(err(error.message));
   }else if(join==="driver"){
    const {error}=await supabase.rpc("apply_as_driver",{p_full_name:form.fullName.trim(),p_phone:cleanPhone(form.phone),p_vehicle_type:form.vehicleType});
    if(error)throw new Error(err(error.message));
   }
   localStorage.removeItem("talabak_pending_join");
   setMessage({kind:"success",text:join==="customer"?"الحساب اتعمل وهنبدأ نجهزلك التطبيق.":"طلب الانضمام اتبعت للإدارة للمراجعة.");
   window.setTimeout(()=>window.location.reload(),800);
  }catch(e:any){setMessage({kind:"error",text:e?.message||"حصلت مشكلة."})}finally{setBusy(false)}
 }
 async function resend(){
  setBusy(true);setMessage(null);
  const {error}=await supabase.auth.resend({type:"signup",email:form.email.trim(),options:{emailRedirectTo:window.location.origin}});
  setBusy(false);setMessage(error?{kind:"error",text:err(error.message)}:{kind:"success",text:"اتبعَت رسالة تأكيد جديدة على الإيميل."});
 }
 return <div className="auth-page" dir="rtl">
  <div className="auth-shell">
   <aside className="auth-side">
    <div className="brand"><span>ط</span><div><b>طلبك</b><small>دليفري لكل احتياجاتك</small></div></div>
    <div className="hero-copy"><span className="eyebrow">منصة واحدة • 3 تجارب</span><h1>اطلب بسهولة،<br/>اشتغل بذكاء،<br/><em>وكبّر شغلك.</em></h1><p>تجربة مصممة للعميل والتاجر والسائق، من إنشاء الحساب لحد التشغيل الحقيقي.</p></div>
    <div className="side-points"><div>✓ تسجيل آمن بجلسة Supabase حقيقية</div><div>✓ طلبات وتحديثات لحظية</div><div>✓ تقديم تاجر أو سائق ومراجعة الإدارة</div></div>
   </aside>
   <main className="auth-main">
    <div className="auth-top"><button className="back-btn" onClick={()=>{if(mode==="signup"){setMode("login");setJoin("customer");setMessage(null)}else window.location.href="/"}}>← الرئيسية</button><span>حسابك على طلبك</span></div>
    {!needsConfirm&&mode==="signup"&&<section className="role-picker"><div className="section-head"><div><span className="mini">اختار طريقك</span><h2>إنت داخل طلبك بصفتك إيه؟</h2></div><small>تقدر تعمل حساب عميل، أو تقدم للتاجر/السائق.</small></div><div className="role-grid">{(Object.keys(roleCopy) as Join[]).map(r=><button key={r} className={`role-card ${join===r?"selected":""}`} onClick={()=>chooseRole(r)}><span className="role-icon">{roleCopy[r].icon}</span><span><b>{roleCopy[r].title}</b><small>{roleCopy[r].desc}</small></span><i>›</i></button>)}</div></section>}
    <section className="auth-card">
     <div className="auth-card-head"><span className="mini">{mode==="login"?"دخول آمن":"حساب جديد"}</span><h2>{title}</h2><p>{mode==="login"?"ادخل ببيانات حسابك علشان تكمل طلباتك وإدارتك.":join==="customer"?"بياناتك الأساسية كفاية علشان تبدأ كعميل.":join==="merchant"?"خلّي نشاطك جاهز للانضمام واستقبال الطلبات.":"قدّم بياناتك الأساسية وابدأ إجراءات الانضمام كسائق."}</p></div>
     {message&&<div className={`auth-alert ${message.kind}`}>{message.text}</div>}
     <div className="form-grid">
      {mode==="signup"&&<><label><span>الاسم بالكامل</span><input value={form.fullName} onChange={e=>set("fullName",e.target.value)} placeholder="مثال: عبدالله عمرو" autoComplete="name"/></label><label><span>رقم الموبايل</span><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="01xxxxxxxxx" inputMode="tel" autoComplete="tel"/></label></>}
      <label className={mode==="signup"?"full":""}><span>البريد الإلكتروني</span><input value={form.email} onChange={e=>set("email",e.target.value)} placeholder="name@example.com" inputMode="email" autoComplete="email" dir="ltr"/></label>
      <label><span>كلمة المرور</span><div className="password-wrap"><input type={showPassword?"text":"password"} value={form.password} onChange={e=>set("password",e.target.value)} placeholder="6 أحرف على الأقل" autoComplete={mode==="login"?"current-password":"new-password"} dir="ltr"/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?"إخفاء":"إظهار"}</button></div></label>
      {mode==="signup"&&<label><span>تأكيد كلمة المرور</span><input type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="كرر كلمة المرور" autoComplete="new-password" dir="ltr"/></label>}
      {mode==="signup"&&join==="merchant"&&<><label><span>اسم النشاط / المتجر</span><input value={form.businessName} onChange={e=>set("businessName",e.target.value)} placeholder="مثال: مطعم وكافيه النيل"/></label><label><span>نوع النشاط</span><select value={form.category} onChange={e=>set("category",e.target.value)}><option>مطاعم</option><option>بقالة</option><option>مخبوزات</option><option>صيدلية</option><option>مشروبات</option><option>حلويات</option><option>عناية</option><option>خدمات</option></select></label><label className="full"><span>عنوان النشاط</span><input value={form.address} onChange={e=>set("address",e.target.value)} placeholder="المنطقة، الشارع، رقم المحل"/></label><div className="form-info full">بعد الإرسال، الإدارة تراجع بيانات النشاط قبل تفعيله. ده بيحمي العملاء ويحافظ على جودة المنصة.</div></>}
      {mode==="signup"&&join==="driver"&&<><label><span>نوع المركبة</span><select value={form.vehicleType} onChange={e=>set("vehicleType",e.target.value)}><option>موتوسيكل</option><option>عجلة</option><option>سيارة</option><option>سكوتر</option><option>أخرى</option></select></label><div className="driver-note"><b>مسار الانضمام للسائق</b><span>بعد التقديم، الإدارة تراجع الطلب قبل تفعيل استقبال الطلبات.</span></div><div className="form-info full">هنطلب مستندات التحقق في مرحلة المراجعة عند الحاجة، مش داخل نموذج البداية.</div></>}
     </div>
     <button className="primary-btn" disabled={busy} onClick={()=>void submit()}>{busy?"جاري المعالجة…":mode==="login"?"تسجيل الدخول ←":join==="customer"?"إنشاء حساب عميل ←":join==="merchant"?"تقديم طلب تاجر ←":"تقديم طلب سائق ←"}</button>
     {needsConfirm&&<button className="secondary-btn" disabled={busy} onClick={()=>void resend()}>إعادة إرسال رسالة التأكيد</button>}
     <div className="auth-switch">{mode==="login"?<>لسه جديد؟ <button onClick={()=>{setMode("signup");setMessage(null)}}>أنشئ حسابك</button></>:<>عندك حساب بالفعل؟ <button onClick={()=>{setMode("login");setJoin("customer");setMessage(null)}}>تسجيل الدخول</button></>}</div>
     {mode==="signup"&&<small className="legal">بإنشاء الحساب أنت موافق على شروط الاستخدام وسياسة الخصوصية الخاصة بطلبك.</small>}
    </section>
   </main>
  </div>
 </div>
}
