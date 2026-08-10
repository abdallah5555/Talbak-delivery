import React from 'react';
import { SocialLinks } from '../types';

interface Props {
  socialLinks?: SocialLinks;
  supportPhone?: string;
  siteName?: string;
}

export const SocialLinksFooter: React.FC<Props> = ({ socialLinks, supportPhone, siteName }) => {
  const hasAnySocial = socialLinks && Object.values(socialLinks).some(link => Boolean(link) && String(link).trim() !== '');

  return (
    <footer className="bg-slate-900 text-slate-300 py-8 px-4 mt-12 border-t border-slate-800 rounded-t-3xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-right">
        <div>
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <span className="font-black text-white text-base">{siteName || 'طلبك دليفري'}</span>
            <span className="bg-orange-600/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
              رسمي
            </span>
          </div>
          <p className="text-xs text-slate-400">تطبيق التوصيل السريع للمطاعم، المتاجر والطلبات الخاصة</p>
          {supportPhone && (
            <p className="text-xs text-slate-400 mt-1 font-mono">الدعم والواتساب: {supportPhone}</p>
          )}
        </div>

        {hasAnySocial && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-300">تابعنا على وسائل التواصل الاجتماعي:</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              {socialLinks?.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-blue-600 text-white p-2.5 rounded-xl transition-all text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <span>فيسبوك</span>
                </a>
              )}
              {socialLinks?.whatsapp && (
                <a
                  href={socialLinks.whatsapp.startsWith('http') ? socialLinks.whatsapp : `https://wa.me/${socialLinks.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-emerald-600 text-white p-2.5 rounded-xl transition-all text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <span>واتساب</span>
                </a>
              )}
              {socialLinks?.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-pink-600 text-white p-2.5 rounded-xl transition-all text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <span>إنستغرام</span>
                </a>
              )}
              {socialLinks?.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-black text-white p-2.5 rounded-xl transition-all text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <span>تيك توك</span>
                </a>
              )}
              {socialLinks?.youtube && (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-red-600 text-white p-2.5 rounded-xl transition-all text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <span>يوتيوب</span>
                </a>
              )}
              {socialLinks?.telegram && (
                <a
                  href={socialLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-sky-500 text-white p-2.5 rounded-xl transition-all text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <span>تليجرام</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
        جميع الحقوق محفوظة © {new Date().getFullYear()} - {siteName || 'طلبك دليفري'}
      </div>
    </footer>
  );
};
