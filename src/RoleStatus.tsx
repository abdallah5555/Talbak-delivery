import {useEffect,useState} from "react";
import {supabase} from "./lib/supabase";

type Role="customer"|"merchant"|"driver"|"admin";
const roleMeta:Record<Role,{label:string;icon:string}>={customer:{label:"عميل",icon:"🛍️"},merchant:{label:"تاجر",icon:"🏪"},driver:{label:"سائق",icon:"🛵"},admin:{label:"إدارة",icon:"🛡️"}};

type Application={id:string;status:string;created_at:string};
export default function RoleStatus(){
 const [roles,setRoles]=useState<Role[]>([]),[merchant,setMerchant]=useState<Application[]>([]),[driver,setDriver]=useState<Application[]>([]),[open,setOpen]=useState(false);
 useEffect(()=>{let alive=true;void (async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user||!alive)return;const [r,m,d]=await Promise.all([supabase.from("user_roles").select("role").eq("user_id",user.id),supabase.from("merchant_applications").select("id,status,created_at").eq("applicant_id",user.id).order("created_at",{ascending:false}).limit(5),supabase.from("driver_applications").select("id,status,created_at").eq("applicant_id",user.id).order("created_at",{ascending:false}).limit(5)]);if(!alive)return;setRoles(((r.data||[]).map((x:any)=>x.role).filter((x:any)=>x in roleMeta)) as Role[]);setMerchant((m.data||[]) as Application[]);setDriver((d.data||[]) as Application[])})();return()=>{alive=false}},[]);
 if(!roles.length)return null;
 const status=(s:string)=>s==="approved"?"معتمد":s==="rejected"?"مرفوض":"قيد المراجعة";
 return <div className="role-status" dir="rtl"><button className="role-status-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>👤 <b>أدواري</b><span>{roles.length}</span></button>{open&&<div className="role-status-menu"><div className="role-status-roles">{roles.map(r=><span key={r}>{roleMeta[r].icon} {roleMeta[r].label}</span>)}</div>{merchant.length>0&&<div className="role-application"><b>طلب التاجر</b><span>{status(merchant[0].status)}</span></div>}{driver.length>0&&<div className="role-application"><b>طلب السائق</b><span>{status(driver[0].status)}</span></div>}<small>تغيير الواجهة لا يغير أدوارك أو صلاحياتك في قاعدة البيانات.</small></div>}</div>;
}
