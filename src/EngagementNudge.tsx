import {useEffect,useState} from "react";
import {supabase} from "./lib/supabase";

type Role="merchant"|"driver";
export default function EngagementNudge({role}:{role:Role}){
 const [show,setShow]=useState(false),[text,setText]=useState("");
 useEffect(()=>{let alive=true;async function check(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;if(role==='driver'){const {data}=await supabase.from('driver_status').select('is_online').eq('user_id',user.id).maybeSingle();if(alive&&!data?.is_online){setText('أنت أوفلاين دلوقتي — فعّل حالتك علشان تستقبل الطلبات القريبة.');setShow(true)}}else{const {data}=await supabase.from('stores').select('id,name,is_open').eq('owner_id',user.id).order('created_at').limit(3);const closed=(data||[]).filter((s:any)=>!s.is_open);if(alive&&closed.length){setText(closed.length===1?`متجرك «${closed[0].name}» مقفول — افتحه لو بدأت الشغل.`:'عندك فروع مقفولة — راجع حالة الفروع قبل الشغل.');setShow(true)}}}void check();const timer=window.setInterval(check,300000);return()=>{alive=false;window.clearInterval(timer)}},[role]);
 if(!show)return null;return <div className={`engagement-nudge ${role}`} dir="rtl"><div><b>{role==='driver'?'جاهز تستقبل شغل؟':'جاهز تستقبل طلبات؟'}</b><p>{text}</p></div><button onClick={()=>setShow(false)} aria-label="إغلاق">×</button></div>;
}
