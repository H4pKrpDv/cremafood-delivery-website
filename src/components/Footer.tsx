/**
 * components/Footer.tsx — порт футера (build/template.html) — часы зала и
 * доставки раздельными блоками, соцсети, ссылка на попап "Политика
 * конфиденциальности" (js/privacy.js -> store/uiStore.ts).
 *
 * Соцсети (27.09.2026 — добавление мессенджеров/соцсетей; 02.10.2026 —
 * сами ссылки/иконки вынесены в components/SocialLinks.tsx, т.к.
 * error.tsx (500-страница) тоже должен их показывать — подробности о
 * составе/порядке/заглушках см. комментарий в том файле).
 */

'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import { useUIStore } from '@/store/uiStore';
import { SocialLinks } from '@/components/SocialLinks';
import { localizedPath } from '@/lib/i18nConfig';

export function Footer() {
  const { t, lang } = useI18n();
  const openPrivacy = useUIStore((s) => s.openPrivacy);

  return (
    <footer className="footer" id="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Link href={localizedPath(lang)} className="logo logo--footer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo__mark" src="/img/logo.png" alt="" aria-hidden="true" width={34} height={34} />
            <span className="logo__text">Crema Food</span>
          </Link>
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
          {/* id="venue-hours" — якорь для ссылки «График работы заведения» из
              мобильного бургер-меню (09.10.2026); отступ под фиксированную
              шапку — .footer__col-title--venue в globals.css. */}
          <h5 className="footer__col-title footer__col-title--venue" id="venue-hours">
            {t('footer.hoursTitle')}
          </h5>
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
            <SocialLinks />
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
