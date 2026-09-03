import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
if (!url || !key) throw new Error("Talbak Supabase configuration is missing");
const client = createClient(url, key, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
export const supabase = new Proxy(client,{get(target,prop,receiver){if(prop!=="rpc")return Reflect.get(target,prop,receiver);return (fn:string,args?:Record<string,unknown>,options?:unknown)=>{let nextArgs=args; if(fn==="create_order_secure" && args && !args.p_coupon_code){try{const saved=window.localStorage.getItem("talabak_coupon_code");if(saved)nextArgs={...args,p_coupon_code:saved}}catch{}} return target.rpc(fn as any,nextArgs as any,options as any)}}}) as typeof client;
