import React, { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Search, Loader2, AlertCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  value: string;
  onAddressChange: (address: string) => void;
  autoLocate?: boolean;
}

const DEFAULT_CENTER: L.LatLngExpression = [30.0444, 31.2357];

export const LocationPicker: React.FC<Props> = ({ value, onAddressChange, autoLocate = true }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const autoLocatedRef = useRef(false);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [manualAddress, setManualAddress] = useState(value);

  const reverseGeocode = async (lat: number, lng: number) => {
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=ar`,
        { headers: { Accept: 'application/json' } }
      );
      if (!response.ok) throw new Error('reverse geocoding failed');
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setManualAddress(address);
      onAddressChange(address);
      setLocationMessage('تم تحديد العنوان من الخريطة. يمكنك تعديله يدويًا إذا أردت.');
    } catch {
      const fallback = `موقع على الخريطة: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setManualAddress(fallback);
      onAddressChange(fallback);
      setLocationMessage('تم تحديد الموقع، ولم نتمكن من تحويل الإحداثيات إلى عنوان نصي.');
    } finally {
      setSearching(false);
    }
  };

  const placeMarker = (lat: number, lng: number, zoom = 16) => {
    if (!mapRef.current) return;
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { title: 'موقع التوصيل' }).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    mapRef.current.setView([lat, lng], zoom);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('المتصفح لا يدعم تحديد الموقع. يمكنك اختيار الموقع من الخريطة أو كتابة العنوان.');
      return;
    }
    setLocating(true);
    setLocationMessage('جاري تحديد موقعك الحالي...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        placeMarker(latitude, longitude);
        await reverseGeocode(latitude, longitude);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        const message = error.code === error.PERMISSION_DENIED
          ? 'لم يتم السماح بالموقع. فعّل إذن الموقع من إعدادات المتصفح أو اختر موقعًا يدويًا.'
          : 'تعذر تحديد موقعك الآن. اختر موقعًا من الخريطة أو اكتب العنوان يدويًا.';
        setLocationMessage(message);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(DEFAULT_CENTER, 12);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    map.on('click', async (event: L.LeafletMouseEvent) => {
      placeMarker(event.latlng.lat, event.latlng.lng);
      await reverseGeocode(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    setManualAddress(value);
  }, [value]);

  useEffect(() => {
    if (autoLocate && !autoLocatedRef.current && mapRef.current) {
      autoLocatedRef.current = true;
      useCurrentLocation();
    }
  });

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
          <MapPin className="w-4 h-4 text-orange-600" />
          موقع التوصيل
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-[11px] font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
        >
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
          {locating ? 'جاري التحديد...' : 'استخدم موقعي الحالي'}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <div ref={mapContainerRef} className="h-52 w-full" />
        <div className="absolute top-2 right-2 z-[500] bg-white/95 backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-slate-700 shadow">
          اضغط على الخريطة لاختيار أي مكان
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={manualAddress}
          onChange={(e) => {
            setManualAddress(e.target.value);
            onAddressChange(e.target.value);
          }}
          placeholder="أو اكتب عنوانًا مختلفًا يدويًا..."
          className="w-full bg-white text-xs p-3 pr-9 rounded-xl border border-slate-200 focus:border-orange-500 focus:outline-hidden"
        />
      </div>

      {locationMessage && (
        <div className="flex items-start gap-1.5 text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
          <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
          <span>{locationMessage}</span>
        </div>
      )}

      {searching && (
        <div className="text-[10px] text-orange-600 font-bold flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> جاري جلب اسم العنوان...
        </div>
      )}
    </div>
  );
};
