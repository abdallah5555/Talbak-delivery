import React,{useEffect,useState} from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Portal from "./Portal";
import "./index.css";
import { supabase } from "./lib/supabase";

type Role="merchant"|"driver"|"admin";
function Root(){const [role,setRole]=useState<Role|null>(null);const [checked,setChecked]=useState(false);useEffect(()=>{let alive=true;(async()=>{const {data}=await supabase.auth.getSession();if(!alive){return}if(data.session&&new URLSearchParams(location.search).get("customer")!=="1"){const {data:roles}=await supabase.from("user_roles").select("role").eq("user_id",data.session.user.id);const ordered=(roles||[]).map((r:any)=>r.role);const found=(ordered.includes("admin")?"admin":ordered.includes("merchant")?"merchant":ordered.includes("driver")?"driver":null) as Role|null;setRole(found)}setChecked(true)})();return()=>{alive=false}},[]);if(!checked)return <div className="boot">جاري تشغيل طلبك…</div>;return role?<Portal role={role}/>:<App/>}
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><Root/></React.StrictMode>);
