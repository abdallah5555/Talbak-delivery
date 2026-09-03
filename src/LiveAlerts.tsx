import {useEffect,useRef,useState} from "react";
import {supabase} from "./lib/supabase";

type AlertRow={id:string;title:string;body:string;kind?:string;created_at:string};

function beep(){try{const C=window.AudioContext||((window as any).webkitAudioContext as typeof AudioContext);if(!C)return;const ctx=new C();if(ctx.state==='suspended')void ctx.resume();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type='sine';osc.frequency.value=880;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.01);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.22);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.23);window.setTimeout(()=>void ctx.close(),400)}catch{}}

export default function LiveAlerts(){
 const [alert,setAlert]=useState<AlertRow|null>(null);const unlocked=useRef(false);const shown=useRef(new Set<string>());
 useEffect(()=>{const unlock=()=>{unlocked.current=true;beep();window.removeEventListener('pointerdown',unlock)};window.addEventListener('pointerdown',unlock,{once:true});return()=>window.removeEventListener('pointerdown',unlock)},[]);
 useEffect(()=>{let alive=true;let channel:any;void (async()=>{const {data:{user}}=await supabase.auth.getUser();if(!alive||!user)return;channel=supabase.channel(`alerts-${user.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${user.id}`},payload=>{const row=payload.new as AlertRow;if(shown.current.has(row.id))return;shown.current.add(row.id);setAlert(row);if(unlocked.current)beep();if('Notification' in window&&Notification.permission==='granted')void new Notification(row.title,{body:row.body});window.setTimeout(()=>setAlert(x=>x?.id===row.id?null:x),5000)}).subscribe()})();return()=>{alive=false;if(channel)void supabase.removeChannel(channel)}},[]);
 return alert?<div className="live-alert" dir="rtl" role="status" aria-live="polite"><div className="live-alert-icon">🔔</div><div><b>{alert.title}</b><p>{alert.body}</p></div><button aria-label="إغلاق التنبيه" onClick={()=>setAlert(null)}>×</button></div>:null;
}
