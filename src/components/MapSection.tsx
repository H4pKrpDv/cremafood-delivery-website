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
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2209.577096869613!2d27.89528177555448!3d47.785056175638395!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40cb5f0006997305%3A0xb12512652bec706b!2sCR%20Crema%20Premium%20Coffee!5e1!3m2!1sru!2s!4v1790892141760!5m2!1sru!2s"
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
