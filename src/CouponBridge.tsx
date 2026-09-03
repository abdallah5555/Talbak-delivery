import {useEffect,useState} from "react";
import {supabase} from "./lib/supabase";

const KEY="talabak_coupon_code";
export default function CouponBridge(){
 const [code,setCode]=useState(""),[saved,setSaved]=useState(""),[open,setOpen]=useState(false),[message,setMessage]=useState<string|null>(null);
 useEffect(()=>{try{setSaved(localStorage.getItem(KEY)||"")}catch{}},[]);
 const save=async()=>{const next=code.trim().toUpperCase();if(!next)return setMessage("اكتب كود الخصم");const {error}=await supabase.rpc("validate_coupon",{p_code:next,p_subtotal:0});if(error)return setMessage("الكود غير صالح أو غير متاح حاليًا");try{localStorage.setItem(KEY,next)}catch{}setSaved(next);setCode("");setMessage("الكود اتأكد واتحفظ ✓");window.setTimeout(()=>setMessage(null),2400)};
 const clear=()=>{try{localStorage.removeItem(KEY)}catch{}setSaved("");setMessage("تم إزالة الكود");window.setTimeout(()=>setMessage(null),1800)};
 return <div className="coupon-bridge" dir="rtl"><button className={`coupon-bridge-trigger ${saved?"has":""}`} onClick={()=>setOpen(v=>!v)} aria-expanded={open}>🏷️ <span>{saved?`كود: ${saved}`:"عندك كود خصم؟"}</span></button>{open&&<div className="coupon-bridge-card"><div><b>كود الخصم</b><small>هنتحقق منه مرة تانية وقت تأكيد الطلب.</small></div>{saved?<div className="coupon-saved"><span>{saved}</span><button onClick={clear}>إزالة</button></div>:<div className="coupon-input-row"><input value={code} onChange={e=>setCode(e.target.value)} placeholder="مثال: TALBAK10" autoComplete="off"/><button onClick={()=>void save()}>تطبيق</button></div>}{message&&<p className="coupon-message">{message}</p>}</div>}</div>;
}
