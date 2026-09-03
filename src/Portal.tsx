import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import "./portal.css";

type Role = "merchant" | "driver" | "admin";
type Order = {
  id: string; store_id: string; customer_id: string; driver_id: string | null;
  status: string; subtotal: number; delivery_fee: number; total: number;
  delivery_address: string; created_at: string; estimated_minutes: number | null;
  stores?: { name: string } | null;
};
const labels: Record<string,string> = { pending:"جديد", accepted:"مقبول", preparing:"جاري التجهيز", ready:"جاهز للسائق", assigned:"مع السائق", picked_up:"تم الاستلام", on_the_way:"في الطريق", delivered:"تم التسليم", cancelled:"ملغي", rejected:"مرفوض" };
const merchantNext: Record<string,string> = { pending:"accepted", accepted:"preparing", preparing:"ready" };
const driverNext: Record<string,string> = { assigned:"picked_up", picked_up:"on_the_way", on_the_way:"delivered" };
const money = (n:number) => `${new Intl.NumberFormat("ar-EG").format(Math.round(n))} ج.م`;

export default function Portal({ role }: { role: Role }) {
  const [session,setSession] = useState<any>(null);
  const [profile,setProfile] = useState<any>(null);
  const [stores,setStores] = useState<any[]>([]);
  const [orders,setOrders] = useState<Order[]>([]);
  const [menus,setMenus] = useState<any[]>([]);
  const [online,setOnline] = useState(false);
  const [loading,setLoading] = useState(true);
  const [toast,setToast] = useState<string | null>(null);
  const [tab,setTab] = useState(role === "admin" ? "overview" : "orders");

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session) void load(data.session.user.id);
    });
    return () => { alive = false; };
  }, [role]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function load(uid: string) {
    setLoading(true);
    const p = await supabase.from("profiles").select("*").eq("id",uid).maybeSingle();
    if (p.data) setProfile(p.data);
    if (role === "merchant") {
      const s = await supabase.from("stores").select("*").eq("owner_id",uid).order("created_at");
      const mine = s.data || [];
      setStores(mine);
      const ids = mine.map((x:any)=>x.id);
      if (ids.length) {
        const [o,m] = await Promise.all([
          supabase.from("orders").select("*,stores(name)").in("store_id",ids).order("created_at",{ascending:false}).limit(80),
          supabase.from("menu_items").select("*").in("store_id",ids).order("category")
        ]);
        setOrders(o.data || []); setMenus(m.data || []);
      }
    } else if (role === "driver") {
      const st = await supabase.from("driver_status").select("*").eq("user_id",uid).maybeSingle();
      setOnline(Boolean(st.data?.is_online));
      const o = await supabase.from("orders").select("*,stores(name)").or(`status.eq.ready,driver_id.eq.${uid}`).order("created_at",{ascending:false}).limit(80);
      setOrders(o.data || []);
    } else {
      const [o,s,d] = await Promise.all([
        supabase.from("orders").select("*,stores(name)").order("created_at",{ascending:false}).limit(100),
        supabase.from("stores").select("id,name,category,is_open,rating").order("name"),
        supabase.from("driver_status").select("user_id,is_online")
      ]);
      setOrders(o.data || []); setStores(s.data || []);
      setMenus([{ count: (d.data || []).filter((x:any)=>x.is_online).length }]);
    }
    setLoading(false);
  }

  async function moveMerchant(o: Order) {
    const next = merchantNext[o.status]; if (!next) return;
    const { error } = await supabase.rpc("merchant_update_order", { p_order_id:o.id, p_status:next, p_estimated_minutes:o.estimated_minutes || 30 });
    if (error) return setToast(error.message);
    setOrders(xs=>xs.map(x=>x.id===o.id ? {...x,status:next} : x)); setToast(`تم: ${labels[next]}`);
  }

  async function acceptDriver(o: Order) {
    const { data,error } = await supabase.rpc("driver_accept_order", { p_order_id:o.id });
    if (error) return setToast(error.message);
    setOrders(xs=>xs.map(x=>x.id===o.id ? data : x)); setToast("الطلب بقى معاك ✓");
  }

  async function moveDriver(o: Order) {
    const next = driverNext[o.status]; if (!next) return;
    const { data,error } = await supabase.rpc("driver_update_order", { p_order_id:o.id,p_status:next });
    if (error) return setToast(error.message);
    setOrders(xs=>xs.map(x=>x.id===o.id ? data : x)); setToast(`تم: ${labels[next]}`);
  }

  async function toggleOnline() {
    if (!session) return;
    const next = !online;
    const { error } = await supabase.from("driver_status").upsert({ user_id:session.user.id,is_online:next,updated_at:new Date().toISOString() });
    if (error) return setToast(error.message);
    setOnline(next); setToast(next ? "أنت أونلاين ⚡" : "تم إيقاف استقبال الطلبات");
  }

  const revenue = useMemo(() => orders.filter(o=>o.status==="delivered").reduce((a,o)=>a+Number(o.total),0),[orders]);
  const active = orders.filter(o=>!["delivered","cancelled","rejected"].includes(o.status));
  const available = orders.filter(o=>o.status==="ready" && !o.driver_id);

  if (loading) return <div className="portal-loading">جاري تجهيز مركزك…</div>;

  const title = role === "merchant" ? "مركز التاجر" : role === "driver" ? "مركز السائق" : "لوحة الإدارة";
  const tabs = role === "admin" ? [["overview","نظرة عامة"],["orders","الطلبات"],["stores","المتاجر"],["applications","الانضمام"]] : role === "merchant" ? [["orders","الطلبات"],["menu","المنيو"],["stores","المتاجر"]] : [["orders","طلباتي"],["available","المتاح"],["earnings","الأرباح"]];

  return (
    <div className="portal" dir="rtl">
      <header className="phead">
        <div><span className="pkicker">طلبك • {role}</span><h1>{title}</h1><p>{profile?.full_name || session?.user?.email || "حساب موثوق"}</p></div>
        <div className="phead-actions">
          {role === "driver" && <button className={`online ${online ? "on" : ""}`} onClick={toggleOnline}><i />{online ? "أونلاين" : "أوفلاين"}</button>}
          <button onClick={()=>{ void supabase.auth.signOut(); location.reload(); }}>خروج</button>
          <a href="/?customer=1">واجهة العميل</a>
        </div>
      </header>

      <div className="pstats">
        {role === "admin" ? <><Stat n={orders.length} t="كل الطلبات"/><Stat n={stores.length} t="المتاجر"/><Stat n={menus[0]?.count || 0} t="سائقين أونلاين"/><Stat n={money(revenue)} t="مبيعات مسجلة"/></> : null}
        {role === "merchant" ? <><Stat n={orders.filter(o=>o.status==="pending").length} t="طلبات جديدة"/><Stat n={active.length} t="قيد التشغيل"/><Stat n={money(revenue)} t="مبيعات مكتملة"/><Stat n={stores.length} t="فروعك"/></> : null}
        {role === "driver" ? <><Stat n={available.length} t="طلبات متاحة"/><Stat n={orders.filter(o=>o.driver_id===session?.user?.id && o.status!=="delivered").length} t="معاك الآن"/><Stat n={orders.filter(o=>o.driver_id===session?.user?.id && o.status==="delivered").length} t="تم توصيلها"/><Stat n={online?"نشط":"متوقف"} t="الحالة"/></> : null}
      </div>

      <nav className="ptabs">{tabs.map(([key,text])=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{text}</button>)}</nav>

      <main className="pcontent">
        {(tab === "orders" || tab === "available") && (
          <section><div className="psection"><div><span className="pkicker">تشغيل لحظي</span><h2>{tab === "available" ? "طلبات جاهزة للاستلام" : "الطلبات"}</h2></div><button className="refresh" onClick={()=>session && void load(session.user.id)}>تحديث ↻</button></div>
            <div className="orderlist">
              {(tab === "available" ? available : orders).map(o=><article className={tab==="available"?"offer":"porder"} key={o.id}>
                <div><small>#{o.id.slice(0,7).toUpperCase()} • {new Date(o.created_at).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}</small><h3>{o.stores?.name || stores.find(s=>s.id===o.store_id)?.name || "متجر"}</h3><p>{o.delivery_address}</p></div>
                <div className="porder-right"><span className={`badge ${o.status}`}>{labels[o.status] || o.status}</span><b>{money(Number(o.total))}</b>
                  {role === "merchant" && merchantNext[o.status] && <button onClick={()=>void moveMerchant(o)}>{o.status==="pending"?"قبول الطلب":"تحديث الحالة"}</button>}
                  {role === "driver" && o.status==="ready" && !o.driver_id && <button onClick={()=>void acceptDriver(o)}>استلام الطلب</button>}
                  {role === "driver" && o.driver_id===session?.user?.id && driverNext[o.status] && <button onClick={()=>void moveDriver(o)}>{driverNext[o.status]==="delivered"?"تم التسليم":"تحديث"}</button>}
                </div>
              </article>)}
            </div>
            {!(tab === "available" ? available : orders).length && <div className="pempty">مفيش طلبات هنا حاليًا.</div>}
          </section>
        )}

        {tab === "menu" && role === "merchant" && <section><div className="psection"><div><span className="pkicker">كتالوجك</span><h2>المنيو والأصناف</h2></div></div><div className="menu-table">{menus.map(m=><div key={m.id}><div><b>{m.name}</b><small>{m.category} • {m.is_available?"متاح":"متوقف"}</small></div><strong>{money(Number(m.price))}</strong></div>)}</div>{!menus.length&&<div className="pempty">مفيش أصناف مضافة لحد دلوقتي.</div>}</section>}
        {tab === "stores" && <section><div className="psection"><div><span className="pkicker">الفروع</span><h2>{role==="admin"?"كل المتاجر":"متاجرك"}</h2></div></div><div className="store-list">{stores.map(s=><div className="pstore" key={s.id}><div><b>{s.name}</b><small>{s.category} • ★ {Number(s.rating||0).toFixed(1)}</small></div><span className={s.is_open?"open":"closed"}>{s.is_open?"مفتوح":"مغلق"}</span></div>)}</div></section>}
        {tab === "applications" && role === "admin" && <section><div className="psection"><div><span className="pkicker">العمليات</span><h2>طلبات الانضمام</h2></div></div><div className="pempty">طلبات التجار والسائقين موجودة في قاعدة البيانات ويمكن مراجعتها واعتمادها من لوحة الإدارة.</div></section>}
        {tab === "earnings" && role === "driver" && <section><div className="big-earning"><span className="pkicker">أرباحك المسجلة</span><strong>{money(orders.filter(o=>o.driver_id===session?.user?.id&&o.status==="delivered").reduce((a,o)=>a+Number(o.total)*.15,0))}</strong><p>الحساب الحالي يعرض نسبة تشغيل 15% كقيمة أولية.</p></div></section>}
        {tab === "overview" && role === "admin" && <section><div className="admin-grid"><div className="big-card"><span className="pkicker">الطلبات النشطة</span><strong>{active.length}</strong><p>طلب قيد التنفيذ حاليًا.</p></div><div className="big-card"><span className="pkicker">آخر الطلبات</span>{orders.slice(0,6).map(o=><div className="mini-row" key={o.id}><span>#{o.id.slice(0,5)}</span><b>{labels[o.status]}</b><strong>{money(Number(o.total))}</strong></div>)}</div></div></section>}
      </main>
      {toast && <div className="ptoast">{toast}</div>}
    </div>
  );
}
function Stat({n,t}:{n:any;t:string}){return <div className="stat"><b>{n}</b><span>{t}</span></div>;}
