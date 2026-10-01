/**
 * components/Footer.tsx — порт футера (build/template.html) — часы зала и
 * доставки раздельными блоками, соцсети, ссылка на попап "Политика
 * конфиденциальности" (js/privacy.js -> store/uiStore.ts).
 *
 * Соцсети (27.09.2026 п.: добавление мессенджеров/соцсетей в футер):
 * Instagram — единственная ссылка с реальным адресом (аккаунт уже есть).
 * Остальные 7 (Facebook/TikTok/Telegram/WhatsApp/Viber/VK/OK) — по
 * решению пользователя пока ЗАГЛУШКИ (href="#", клик ничего не делает,
 * как и прочий плейсхолдерный контент на сайте — фото позиций/баннеров)
 * до появления реальных аккаунтов/номеров. Порядок — тоже по явному
 * решению пользователя: сначала крупные международные платформы
 * (Facebook/TikTok/Telegram), затем мессенджеры для прямой связи
 * (WhatsApp/Viber), затем русскоязычные соцсети (VK/OK). Иконки —
 * собственные упрощённые line-art пиктограммы (тот же визуальный язык,
 * что и у Instagram: viewBox 24x24, stroke=currentColor, без заливки
 * кроме акцентных точек) — не точное воспроизведение официальных
 * логотипов, т.к. это заглушки, а не финальный брендинг.
 */

'use client';

import type { ReactNode } from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import { useUIStore } from '@/store/uiStore';

const SOCIAL_ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true
};

// Заглушки — порядок и состав зафиксированы по решению пользователя
// (см. комментарий выше). labelKey — ключ в data/i18n/*.json (footer.*).
const PLACEHOLDER_SOCIALS: { key: string; labelKey: string; icon: ReactNode }[] = [
  {
    key: 'facebook',
    labelKey: 'footer.facebookLabel',
    icon: (
      <svg {...SOCIAL_ICON_PROPS}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <path d="M13.5 20V13h2.3l.4-2.6h-2.7V8.6c0-.8.4-1.2 1.3-1.2h1.5V4.6c-.3 0-1.2-.1-2.1-.1-2.1 0-3.4 1.3-3.4 3.6v2.3H8.5V13h2.3v7" />
      </svg>
    )
  },
  {
    key: 'tiktok',
    labelKey: 'footer.tiktokLabel',
    icon: (
      <svg {...SOCIAL_ICON_PROPS}>
        <circle cx="9.5" cy="16" r="3" />
        <path d="M12.5 16V4" />
        <path d="M12.5 4H17V8" />
      </svg>
    )
  },
  {
    key: 'telegram',
    labelKey: 'footer.telegramLabel',
    icon: (
      <svg {...SOCIAL_ICON_PROPS}>
        <path d="M3.5 12.5 20.5 4.5 15.5 19.5 10.5 13.5Z" />
        <path d="M20.5 4.5 10.5 13.5" />
      </svg>
    )
  },
  {
    key: 'whatsapp',
    labelKey: 'footer.whatsappLabel',
    icon: (
      <svg {...SOCIAL_ICON_PROPS}>
        <rect x="4" y="5" width="16" height="12" rx="4" />
        <path d="M8 17V20.5L11.5 17" />
        <circle cx="9" cy="11" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="12" cy="11" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="15" cy="11" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    key: 'viber',
    labelKey: 'footer.viberLabel',
    icon: (
      <svg {...SOCIAL_ICON_PROPS}>
        <rect x="4" y="5" width="16" height="12" rx="4" />
        <path d="M8 17V20.5L11.5 17" />
        <circle cx="12" cy="11" r="2" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    key: 'vk',
    labelKey: 'footer.vkLabel',
    icon: (
      <svg {...SOCIAL_ICON_PROPS}>
        <path d="M8 7 12 12 8 17" />
        <path d="M13 7 17 12 13 17" />
      </svg>
    )
  },
  {
    key: 'ok',
    labelKey: 'footer.okLabel',
    icon: (
      <svg {...SOCIAL_ICON_PROPS}>
        <circle cx="12" cy="12" r="7.5" />
        <path d="M9 12.3 11 14.3 15.3 9.5" />
      </svg>
    )
  }
];

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
            {PLACEHOLDER_SOCIALS.map(({ key, labelKey, icon }) => (
              <a
                key={key}
                href="#"
                className="footer__social"
                aria-label={t(labelKey)}
                title={t(labelKey)}
                onClick={(e) => e.preventDefault()}
              >
                {icon}
              </a>
            ))}
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
