import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { AdBanner } from '../types';

interface Props {
  banners?: AdBanner[];
}

export const AdBannersSection: React.FC<Props> = ({ banners }) => {
  const activeBanners = (banners || []).filter(b => b.active);

  // Auto-collapse completely if no active banners exist (No empty whitespace or placeholder boxes left)
  if (!activeBanners || activeBanners.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
          <span>عروض وإعلانات مميزة 🔥</span>
        </h3>
      </div>

      <div className={`grid grid-cols-1 ${activeBanners.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
        {activeBanners.map((banner) => {
          const ContentWrapper = banner.targetUrl ? 'a' : 'div';
          const wrapperProps = banner.targetUrl
            ? {
                href: banner.targetUrl,
                target: banner.targetUrl.startsWith('http') ? '_blank' : '_self',
                rel: 'noopener noreferrer'
              }
            : {};

          return (
            <ContentWrapper
              key={banner.id}
              {...wrapperProps}
              className="relative group rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 bg-slate-900 min-h-[140px] flex items-center justify-between p-5 transition-all hover:shadow-xl hover:border-orange-500/50 cursor-pointer block"
            >
              {/* Background Image or Animated GIF */}
              <img
                src={banner.imageUrl}
                alt={banner.title || 'إعلان'}
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />

              <div className="relative z-10 space-y-1.5 max-w-[70%] text-white">
                {banner.badge && (
                  <span className="inline-block bg-orange-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                    {banner.badge}
                  </span>
                )}
                <h4 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                  {banner.title}
                </h4>
                {banner.targetUrl && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:text-orange-300">
                    <span>اضغط هنا للتفاصيل</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                )}
              </div>
            </ContentWrapper>
          );
        })}
      </div>
    </section>
  );
};
