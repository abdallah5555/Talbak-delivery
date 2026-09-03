import {useEffect,useState} from "react";
import {supabase} from "./lib/supabase";

type Role="customer"|"merchant"|"driver"|"admin";
type Props={role:Role};
const roleTitle:Record<Role,string>={customer:"أدوات العميل",merchant:"أدوات التاجر",driver:"أدوات السائق",admin:"أدوات الإدارة"};

export default function WorkspaceQuickActions({role}:Props){
 const [open,setOpen]=useState(false),[online,setOnline]=useState(false);
 useEffect(()=>{if(role!=="driver")return;let active=true;void supabase.auth.getUser().then(async({data})=>{if(!active||!data.user)return;const {data:st}=await supabase.from("driver_status").select("is_online").eq("user_id",data.user.id).maybeSingle();if(active)setOnline(Boolean(st?.is_online))});return()=>{active=false}},[role]);
 const go=(path:string)=>{setOpen(false);window.location.href=path};
 return <div className="workspace-tools" dir="rtl">
   <button className="workspace-tools-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-haspopup="menu">☰ <span>{roleTitle[role]}</span></button>
   {open&&<div className="workspace-tools-menu" role="menu">
     {role==="customer"&&<>
       <button onClick={()=>go("/?customer=1")} role="menuitem">🛍️ <span>واجهة العميل</span></button>
       <button onClick={()=>go("/?support=1")} role="menuitem">🛟 <span>الدعم والشكاوى</span></button>
     </>}
     {role==="merchant"&&<>
       <button onClick={()=>go("/?role=merchant")} role="menuitem">🏪 <span>مركز التاجر</span></button>
       <button onClick={()=>go("/?support=1")} role="menuitem">🛟 <span>دعم التاجر</span></button>
     </>}
     {role==="driver"&&<>
       <button onClick={()=>go("/?role=driver")} role="menuitem">🛵 <span>مركز السائق</span></button>
       <button onClick={()=>go("/?support=1")} role="menuitem">🛟 <span>دعم السائق</span></button>
       <div className="workspace-tools-status">{online?"🟢 أنت أونلاين":"⚪ أنت أوفلاين"}</div>
     </>}
     {role==="admin"&&<>
       <button onClick={()=>go("/?role=admin")} role="menuitem">🛡️ <span>لوحة الإدارة</span></button>
       <button onClick={()=>go("/?support=1")} role="menuitem">🛟 <span>إدارة الشكاوى</span></button>
     </>}
   </div>}
 </div>;
}
