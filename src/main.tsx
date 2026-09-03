import React,{useEffect,useState} from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Portal from "./Portal";
import AuthOnboarding from "./AuthOnboarding";
import "./index.css";
import { supabase } from "./lib/supabase";

type Role="merchant"|"driver"|"admin";
function Root(){
 const [role,setRole]=useState<Role|null>(null),[session,setSession]=useState<any>(null),[checked,setChecked]=useState(false);
 useEffect(()=>{let alive=true;(async()=>{const {data}=await supabase.auth.getSession();if(!alive)return;setSession(data.session);if(data.session&&new URLSearchParams(location.search).get("customer")!=="1"){const {data:r}=await supabase.from("user_roles").select("role").eq("user_id",data.session.user.id);const roles=(r||[]).map((x:any)=>x.role);setRole((roles.includes("admin")?"admin":roles.includes("merchant")?"merchant":roles.includes("driver")?"driver":null) as Role|null)}setChecked(true)})();const {data}=supabase.auth.onAuthStateChange((_e,s)=>{if(!alive)return;setSession(s)});return()=>{alive=false;data.subscription.unsubscribe()};},[]);
 useEffect(()=>{if("serviceWorker" in navigator)void navigator.serviceWorker.register("/sw.js")},[]);
 if(!checked)return <div className="boot">جاري تشغيل طلبك…</div>;
 if(!session)return <AuthOnboarding/>;
 return role?<Portal role={role}/>:<App/>;
}
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><Root/></React.StrictMode>);
