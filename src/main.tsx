import React,{useEffect,useState} from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Portal from "./Portal";
import AuthOnboarding from "./AuthOnboarding";
import "./index.css";
import { supabase } from "./lib/supabase";

type Role="merchant"|"driver"|"admin";
async function completePendingJoin(){
 const raw=localStorage.getItem("talabak_pending_join");
 if(!raw)return;
 let pending:any;try{pending=JSON.parse(raw)}catch{return}
 if(pending.join!=="merchant"&&pending.join!=="driver")return;
 if(pending.join==="merchant"){
  const {error}=await supabase.rpc("apply_as_merchant",{p_business_name:String(pending.businessName||""),p_phone:String(pending.phone||""),p_address:String(pending.address||""),p_category:String(pending.category||"مطاعم")});
  if(!error)localStorage.removeItem("talabak_pending_join");
 }else{
  const {error}=await supabase.rpc("apply_as_driver",{p_full_name:String(pending.fullName||""),p_phone:String(pending.phone||""),p_vehicle_type:String(pending.vehicleType||"موتوسيكل")});
  if(!error)localStorage.removeItem("talabak_pending_join");
 }
}
function Root(){
 const [role,setRole]=useState<Role|null>(null),[session,setSession]=useState<any>(null),[checked,setChecked]=useState(false);
 useEffect(()=>{let alive=true;(async()=>{const {data}=await supabase.auth.getSession();if(!alive)return;setSession(data.session);if(data.session){await completePendingJoin();if(new URLSearchParams(location.search).get("customer")!=="1"){const {data:r}=await supabase.from("user_roles").select("role").eq("user_id",data.session.user.id);const roles=(r||[]).map((x:any)=>x.role);setRole((roles.includes("admin")?"admin":roles.includes("merchant")?"merchant":roles.includes("driver")?"driver":null) as Role|null)}}setChecked(true)})();const {data}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s)});return()=>{alive=false;data.subscription.unsubscribe()};},[]);
 useEffect(()=>{if("serviceWorker" in navigator)void navigator.serviceWorker.register("/sw.js")},[]);
 if(!checked)return <div className="boot">جاري تشغيل طلبك…</div>;
 if(!session)return <AuthOnboarding/>;
 return role?<Portal role={role}/>:<App/>;
}
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><Root/></React.StrictMode>);
