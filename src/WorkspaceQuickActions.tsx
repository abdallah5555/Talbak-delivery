import {useEffect,useState} from "react";
import {supabase} from "./lib/supabase";

type Role="customer"|"merchant"|"driver"|"admin";

type Props={role:Role};

const roleTitle:Record<Role,string>={customer:"أدوات العميل",merchant:"أدوات التاجر",driver:"أدوات السائق",admin:"أدوات الإدارة"};

export default function WorkspaceQuickActions({role}:Props){
 const [open,setOpen]=useState(false);const [online,setOnline]=useState(false);
 useEffect(()=>{if(role!=="driver")return;void supabase.auth.getUser().then(async({data})=>{if(!data.user)return;const {data:st}=await supabase.from("driver_status").select("is_online").eq("user_id",data.user.id).maybeSingle();setOnline(Boolean(st?.is_online))})},[role]);
 const go=(path:string)=>{setOpen(false);window.location.href=path};
 return <div className="workspace-tools" dir="rtl">
   <button className="workspace-tools-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open} title={roleTitle[role]}>☰ <span>{roleTitle[role]}</span></button>
   {open&&<div className="workspace-tools-menu" role="menu">
     {role==="customer"&&<>
       <button onClick={()=>go("/?customer=1#orders")} role="menuitem">📦 <span>طلباتي</span></button>
       <button onClick={()=>go("/?customer=1#profile")} role="menuitem">📍 <span>العناوين والحساب</span></button>
       <button onClick={()=>go("/?support=1")} role="menuitem">🛟 <span>الدعم والشكاوى</span></button>
     </>}
     {role==="merchant"&&<>
       <button onClick={()=>go("/?role=merchant")} role="menuitem">🧾 <span>الطلبات والتشغيل</span></button>
       <button onClick={()=>go("/?role=merchant&tab=menu")} role="menuitem">🍽️ <span>إدارة المنيو</span></button>
       <button onClick={()=>go("/?role=merchant&tab=stores")} role="menuitem">🏪 <span>إدارة المتجر</span></button>
       <button onClick={()=>go("/?support=1")} role="menuitem">🛟 <span>الدعم</span></button>
     </>}
     {role==="driver"&&<>
       <button onClick={()=>go("/?role=driver&tab=available")} role="menuitem">⚡ <span>الطلبات المتاحة</span></button>
       <button onClick={()=>go("/?role=driver")} role="menuitem">🛵 <span>رحلاتي</span></button>
       <button onClick={()=>go("/?role=driver&tab=earnings")} role="menuitem">💰 <span>الأرباح</span></button>
       <button onClick={()=>go("/?support=1")} role="menuitem">🛟 <span>الدعم</span></button>
       <div className="workspace-tools-status">{online?"🟢 أنت أونلاين":"⚪ أنت أوفلاين"}</div>
     </>}
     {role==="admin"&&<>
       <button onClick={()=>go("/?role=admin&tab=overview")} role="menuitem">📊 <span>نظرة عامة</span></button>
       <button onClick={()=>go("/?role=admin&tab=orders")} role="menuitem">📦 <span>الطلبات</span></button>
       <button onClick={()=>go("/?role=admin&tab=applications")} role="menuitem">🤝 <span>طلبات الانضمام</span></button>
       <button onClick={()=>go("/?role=admin&tab=notifications")} role="menuitem">🔔 <span>الإشعارات</span></button>
       <button onClick={()=>go("/?support=1")} role="menuitem">🛟 <span>الشكاوى</span></button>
     </>}
   </div>}
 </div>;
}
