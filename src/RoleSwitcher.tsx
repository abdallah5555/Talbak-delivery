import {useEffect,useState} from "react";
import {supabase} from "./lib/supabase";

type Role="customer"|"merchant"|"driver"|"admin";
const labels:Record<Role,string>={customer:"العميل",merchant:"التاجر",driver:"السائق",admin:"الإدارة"};
const icons:Record<Role,string>={customer:"🛍️",merchant:"🏪",driver:"🛵",admin:"🛡️"};
const remember=(role:Role)=>{try{localStorage.setItem("talabak_active_role",role)}catch{}};

export default function RoleSwitcher({current}:{current:Role}){
 const [roles,setRoles]=useState<Role[]>([]),[open,setOpen]=useState(false);
 useEffect(()=>{let active=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user||!active)return;const {data}=await supabase.from("user_roles").select("role").eq("user_id",user.id);const next=((data||[]).map((x:any)=>x.role).filter((r:any)=>r in labels) as Role[]);setRoles(next)})();return()=>{active=false}},[]);
 if(roles.length<2)return null;
 const go=(role:Role)=>{remember(role);setOpen(false);window.location.href=role==="customer"?"/?customer=1":`/?role=${role}`};
 return <div className="role-switcher" dir="rtl"><button className="role-switcher-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-haspopup="menu"><span>{icons[current]}</span><b>{labels[current]}</b><span className="role-chevron">⌄</span></button>{open&&<div className="role-switcher-menu" role="menu">{roles.map(r=><button key={r} role="menuitem" className={r===current?"current":""} onClick={()=>go(r)} disabled={r===current}><span>{icons[r]}</span><span>{labels[r]}</span>{r===current&&<small>أنت هنا</small>}</button>)}</div>}</div>;
}
