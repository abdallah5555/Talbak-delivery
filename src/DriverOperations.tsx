import {useEffect,useMemo,useState} from "react";
import {supabase} from "./lib/supabase";

type Order={id:string;status:string;total:number;delivery_fee:number;driver_id:string|null;stores?:{name:string;latitude:number|null;longitude:number|null}|null};
const active=(s:string)=>!['delivered','cancelled','rejected'].includes(s);
const validPoint=(lat:any,lon:any)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lon))<=180;

export default function DriverOperations(){
 const [orders,setOrders]=useState<Order[]>([]),[point,setPoint]=useState<{lat:number;lon:number}|null>(null),[toast,setToast]=useState<string|null>(null),[loading,setLoading]=useState(false);
 useEffect(()=>{let alive=true;async function load(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data,error}=await supabase.from('orders').select('id,status,total,delivery_fee,driver_id,stores(name,latitude,longitude)').eq('driver_id',user.id).order('created_at',{ascending:false}).limit(100);if(alive){if(error)setToast(error.message);else setOrders((data||[]) as Order[])}}void load();return()=>{alive=false}},[]);
 const done=orders.filter(o=>o.status==='delivered'),running=orders.filter(o=>active(o.status)),fees=done.reduce((sum,o)=>sum+Number(o.delivery_fee||0),0);
 const locate=()=>{if(!navigator.geolocation)return setToast('المتصفح مش بيدعم الموقع');setLoading(true);navigator.geolocation.getCurrentPosition(p=>{setPoint({lat:p.coords.latitude,lon:p.coords.longitude});setLoading(false)},()=>{setToast('اسمح للموقع علشان نحدد موقعك');setLoading(false)},{enableHighAccuracy:true,timeout:15000,maximumAge:10000})};
 const mapsUrl=point?`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=16/${point.lat}/${point.lon}`:'';
 const nearest=useMemo(()=>orders.find(o=>validPoint(o.stores?.latitude,o.stores?.longitude)),[orders]);
 return <section className="driver-ops" dir="rtl"><div className="psection"><div><span className="pkicker">تشغيل السائق</span><h2>مركز الرحلات</h2></div></div><div className="driver-metrics"><div><b>{running.length}</b><span>رحلات نشطة</span></div><div><b>{done.length}</b><span>تم توصيلها</span></div><div><b>{Math.round(fees).toLocaleString('ar-EG')} ج.م</b><span>رسوم توصيل مكتملة</span></div></div><div className="driver-location"><div><b>موقعك الحالي</b><small>{point?`${point.lat.toFixed(5)} • ${point.lon.toFixed(5)}`:'لم يتم تحديد الموقع في هذه اللوحة'}</small></div><div><button onClick={locate} disabled={loading}>{loading?'جاري التحديد…':'📍 تحديد موقعي'}</button>{point&&<a href={mapsUrl} target="_blank" rel="noreferrer">فتح على OpenStreetMap ↗</a>}</div></div>{nearest?.stores&&validPoint(nearest.stores.latitude,nearest.stores.longitude)&&<div className="driver-next"><div><small>موقع متجر في رحلاتك</small><b>{nearest.stores.name}</b></div><a href={`https://www.openstreetmap.org/?mlat=${nearest.stores.latitude}&mlon=${nearest.stores.longitude}#map=16/${nearest.stores.latitude}/${nearest.stores.longitude}`} target="_blank" rel="noreferrer">فتح موقع المتجر ↗</a></div>}{toast&&<div className="toast">{toast}</div>}</section>;
}
