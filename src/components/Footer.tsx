/**
 * components/Footer.tsx — порт футера (build/template.html) — часы зала и
 * доставки раздельными блоками, соцсети (Instagram), ссылка на попап
 * "Политика конфиденциальности" (js/privacy.js -> store/uiStore.ts).
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { useUIStore } from '@/store/uiStore';

export function Footer() {
  const { t } = useI18n();
  const openPrivacy = useUIStore((s) => s.openPrivacy);

  return (
    <footer className="footer" id="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <a href="#top" className="logo logo--footer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo__mark" src="/img/logo.png" alt="" aria-hidden="true" width={34} height={34} />
            <span className="logo__text">Crema Food</span>
          </a>
          <p className="footer__tagline">{t('footer.tagline')}</p>
        </div>
        <div className="footer__col">
          <h5 className="footer__col-title">{t('footer.locationTitle')}</h5>
          <address className="footer__address">
            <p>Bălți, Moldova</p>
            <p>Alexandru cel Bun 1A</p>
          </address>
        </div>
        <div className="footer__col">
          <h5 className="footer__col-title">{t('footer.hoursTitle')}</h5>
          <div className="hours">
            <div className="hours__row">
              <span className="hours__time">{t('footer.hoursCafe')}</span>
            </div>
          </div>
          <h5 className="footer__col-title footer__col-title--delivery" id="delivery-hours">
            {t('footer.deliveryHoursTitle')}
          </h5>
          <div className="hours">
            <div className="hours__row">
              <span className="hours__time">{t('footer.deliveryHours')}</span>
            </div>
          </div>
        </div>
        <div className="footer__col">
          <h5 className="footer__col-title">{t('footer.contactsTitle')}</h5>
          <div className="footer__contacts">
            <a href="tel:+37361088777" className="footer__contact">
              +373 (61) 088-777
            </a>
            <a href="mailto:cremafood.md@gmail.com" className="footer__contact">
              cremafood.md@gmail.com
            </a>
          </div>
          <h6 className="footer__subtitle">{t('footer.socialsTitle')}</h6>
          <div className="footer__socials">
            <a
              href="https://instagram.com/crema.md"
              className="footer__social"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('footer.instagramLabel')}
              title={t('footer.instagramLabel')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <p>{t('footer.rights')}</p>
        <a
          href="#"
          className="footer__privacy-link"
          onClick={(e) => {
            e.preventDefault();
            openPrivacy();
          }}
        >
          {t('footer.privacyTitle')}
        </a>
      </div>
    </footer>
  );
}
