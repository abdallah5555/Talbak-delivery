import {useEffect,useMemo,useState} from "react";
import {supabase} from "./lib/supabase";

type Role="customer"|"merchant"|"driver"|"admin";
type Point={label:string;lat:number;lon:number};

const valid=(lat:any,lon:any)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lon))<=180;
const bbox=(lat:number,lon:number)=>{const d=.015;return `${lon-d},${lat-d},${lon+d},${lat+d}`};

export default function WorkspaceMap({role}:{role:Role}){
 const [points,setPoints]=useState<Point[]>([]),[selected,setSelected]=useState<Point|null>(null),[open,setOpen]=useState(false),[loading,setLoading]=useState(false);
 useEffect(()=>{let alive=true;async function load(){setLoading(true);try{if(role==="driver"){if(!navigator.geolocation)return; navigator.geolocation.getCurrentPosition(p=>{if(alive)setPoints([{label:"موقعي الحالي",lat:p.coords.latitude,lon:p.coords.longitude}])},()=>{}, {enableHighAccuracy:true,timeout:12000,maximumAge:15000});return}
   if(role==="customer"){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data}=await supabase.from("addresses").select("label,latitude,longitude").eq("user_id",user.id).order("is_default",{ascending:false});if(alive)setPoints((data||[]).filter((x:any)=>valid(x.latitude,x.longitude)).slice(0,10).map((x:any)=>({label:x.label||"العنوان",lat:Number(x.latitude),lon:Number(x.longitude)})));return}
   const query=role==="merchant"?supabase.from("stores").select("name,latitude,longitude").eq("owner_id",(await supabase.auth.getUser()).data.user?.id||""):supabase.from("stores").select("name,latitude,longitude").limit(50);const {data}=await query;if(alive)setPoints((data||[]).filter((x:any)=>valid(x.latitude,x.longitude)).map((x:any)=>({label:x.name||"متجر",lat:Number(x.latitude),lon:Number(x.longitude)})));
 }finally{if(alive)setLoading(false)}}void load();return()=>{alive=false}},[role]);
 const map=useMemo(()=>selected?`https://www.openstreetmap.org/export/embed.html?bbox=${bbox(selected.lat,selected.lon)}&layer=mapnik&marker=${selected.lat},${selected.lon}`:null,[selected]);
 if(!points.length)return <button className="map-tool-empty" onClick={()=>{if(role==="driver")window.alert("اسمح للموقع علشان نحدد موقعك على الخريطة.")}} disabled={loading}>🗺️ {loading?"جاري تحديد الموقع…":"الخريطة تحتاج إحداثيات"}</button>;
 return <div className="workspace-map" dir="rtl"><button className="workspace-map-trigger" onClick={()=>{setSelected(points[0]);setOpen(true)}}>🗺️ <span>{role==="driver"?"موقعي على الخريطة":role==="customer"?"عناويني على الخريطة":"خريطة المتاجر"}</span></button>{open&&selected&&map&&<div className="workspace-map-overlay" onClick={()=>setOpen(false)}><div className="workspace-map-modal" onClick={e=>e.stopPropagation()}><div className="workspace-map-head"><div><small>OpenStreetMap</small><h3>{selected.label}</h3></div><button onClick={()=>setOpen(false)} aria-label="إغلاق">×</button></div>{points.length>1&&<div className="workspace-map-points">{points.map((p,i)=><button key={`${p.label}-${i}`} className={p===selected?"selected":""} onClick={()=>setSelected(p)}>{p.label}</button>)}</div>}<iframe title="OpenStreetMap" src={map} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><div className="workspace-map-foot"><span>© OpenStreetMap contributors</span><a href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lon}#map=16/${selected.lat}/${selected.lon}`} target="_blank" rel="noreferrer">فتح الخريطة كاملة ↗</a></div></div></div>}</div>;
}
