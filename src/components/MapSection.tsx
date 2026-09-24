/**
 * components/MapSection.tsx — порт секции карты (Google Maps embed без
 * API-ключа) перед футером.
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';

export function MapSection() {
  const { t } = useI18n();
  return (
    <section className="map-section" id="map">
      <div className="map-section__frame-wrap">
        <iframe
          className="map-section__frame"
          src="https://www.google.com/maps?q=B%C4%83l%C8%9Bi,+Alexandru+cel+Bun+1A&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={t('footer.mapTitle')}
        />
      </div>
      <a href="https://share.google/cIC2PGKOn0GDHVoVd" className="map-section__link" target="_blank" rel="noopener noreferrer">
        {t('footer.mapLink')}
      </a>
    </section>
  );
}
