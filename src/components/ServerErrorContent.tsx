/**
 * components/ServerErrorContent.tsx — визуальное содержимое 500-страницы
 * (02.10.2026). Вынесено из app/error.tsx в отдельный компонент
 * 03.10.2026 — после того как выяснилось, что app/error.tsx нельзя
 * просто "открыть по ссылке" для проверки (см. ниже) и понадобилась
 * отдельная демо-страница с ТЕМ ЖЕ содержимым, но без реального throw.
 * Теперь и app/error.tsx, и app/test-error/page.tsx (демо-маршрут для
 * проверки) рендерят один и тот же компонент — разметка не дублируется.
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { SocialLinks } from '@/components/SocialLinks';

export function ServerErrorContent() {
  const { t } = useI18n();

  return (
    <section className="error-page error-page--500">
      <div className="error-page__inner">
        <div className="error-page__art" aria-hidden="true">
          {/* Тако — отсылка на мексиканскую кухню в меню, тот же
              line-art стиль, что и чашка кофе на 404 и иконки соцсетей. */}
          <svg viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 98Q12 28 80 22Q148 28 148 98" />
            <path d="M28 92Q28 46 80 40Q132 46 132 92" />
            <path d="M30 90 42 72 54 86 66 68 80 84 94 68 106 86 118 72 130 90" />
            <circle cx="54" cy="80" r="4" fill="currentColor" stroke="none" />
            <circle cx="94" cy="79" r="4" fill="currentColor" stroke="none" />
            <circle cx="74" cy="88" r="3.5" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div className="error-page__content">
          <p className="error-page__code">500</p>
          <h1 className="error-page__title">{t('serverError.title')}</h1>
          <p className="error-page__text">{t('serverError.text')}</p>
          <p className="error-page__socials-hint">{t('serverError.socialsHint')}</p>
          <div className="footer__socials error-page__socials">
            <SocialLinks />
          </div>
        </div>
      </div>
    </section>
  );
}
