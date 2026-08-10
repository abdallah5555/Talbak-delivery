import { useState, useEffect } from 'react';
import { SiteSettings } from '../types';

export function useSiteSettings() {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem('talabak_site_settings');
      return saved ? JSON.parse(saved) : {
        siteName: 'طلبك دليفري',
        logoUrl: '/favicon.svg',
        supportPhone: '01501600192',
        deliveryBaseFee: 15,
        bannerOfferText: 'خصم يصل إلى 50% على أشهى الوجبات والمطاعم المجاورة!'
      };
    } catch {
      return {
        siteName: 'طلبك دليفري',
        logoUrl: '/favicon.svg',
        supportPhone: '01501600192',
        deliveryBaseFee: 15,
        bannerOfferText: 'خصم يصل إلى 50% على أشهى الوجبات والمطاعم المجاورة!'
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('talabak_site_settings', JSON.stringify(siteSettings));
  }, [siteSettings]);

  const updateSiteSettings = (newSettings: Partial<SiteSettings>) => {
    setSiteSettings(prev => ({ ...prev, ...newSettings }));
  };

  return { siteSettings, updateSiteSettings };
}
