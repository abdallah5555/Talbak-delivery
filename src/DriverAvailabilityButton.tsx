import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function errorMessage(error: any) {
  return error?.message || "حصلت مشكلة. جرّب تاني.";
}

export default function DriverAvailabilityButton() {
  const [userId, setUserId] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!alive || !uid) return;
      setUserId(uid);
      const { data: status } = await supabase.from("driver_status").select("is_online").eq("user_id", uid).maybeSingle();
      if (alive) setOnline(Boolean(status?.is_online));
    });
    return () => { alive = false; };
  }, []);

  async function toggle() {
    if (busy) return;
    setMessage(null);
    setBusy(true);
    try {
      let uid = userId;
      if (!uid) {
        const { data } = await supabase.auth.getUser();
        uid = data.user?.id || null;
        if (uid) setUserId(uid);
      }
      if (!uid) throw new Error("لازم تسجل دخول الأول");

      if (!online) {
        if (!navigator.geolocation) throw new Error("المتصفح مش داعم للموقع");
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(async position => {
            const { error } = await supabase.rpc("update_driver_location", {
              p_latitude: position.coords.latitude,
              p_longitude: position.coords.longitude,
              p_accuracy_meters: position.coords.accuracy,
            });
            if (error) reject(error); else resolve();
          }, error => reject(new Error(error.message || "اسمح بالموقع علشان نفعّل حالتك أونلاين")), {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000,
          });
        });
        setOnline(true);
        setMessage("أنت أونلاين ومستني طلبات ⚡");
      } else {
        const { error } = await supabase.from("driver_status").update({
          is_online: false,
          updated_at: new Date().toISOString(),
        }).eq("user_id", uid);
        if (error) throw error;
        setOnline(false);
        setMessage("تم إيقاف استقبال الطلبات");
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return <div className="driver-availability-quick" dir="rtl">
    <button className={`driver-availability-btn ${online ? "on" : ""}`} onClick={() => void toggle()} disabled={busy} aria-label={online ? "أونلاين" : "أوفلاين"}>
      <i />{busy ? "جاري التفعيل…" : online ? "أونلاين" : "أوفلاين"}
    </button>
    {message && <span className="driver-availability-message" role="status">{message}</span>}
  </div>;
}
