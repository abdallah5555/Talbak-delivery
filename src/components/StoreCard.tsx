import React from 'react';
import { Store } from '../types';
import { Star, Clock, Bike, MapPin, Sparkles, ChevronLeft } from 'lucide-react';

interface Props {
  store: Store;
  onClick: () => void;
}

export const StoreCard: React.FC<Props> = ({ store, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full transform hover:-translate-y-1"
    >
      {/* Banner / Image Container */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        <img
          src={store.image}
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />

        {/* Featured Tag */}
        {store.isFeatured && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            مميز
          </div>
        )}

        {/* Delivery Time Badge */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold px-2.5 py-1 rounded-xl shadow flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-orange-600" />
          <span>{store.deliveryTime}</span>
        </div>

        {/* Rating Badge */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-xl shadow flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{store.rating}</span>
        </div>
      </div>

      {/* Store Info Details */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-extrabold text-base text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
              {store.name}
            </h3>
            <span className="text-xs font-bold text-slate-400 flex items-center shrink-0">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{store.address}</span>
            <span className="text-slate-300">•</span>
            <span>{store.distance}</span>
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {store.tags.map((tag, idx) => (
              <span
                key={idx}
                className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer info: Dynamic Delivery & No Min Order */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1">
            <Bike className="w-4 h-4 text-orange-600" />
            <span>توصيل سريع حسب المسافة</span>
          </div>
          <div className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
            <span>بدون حد أدنى</span>
          </div>
        </div>
      </div>
    </div>
  );
};
