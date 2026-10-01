/**
 * app/error.tsx — кастомная "500"-страница (02.10.2026, Этап 2 из двух —
 * первой была app/not-found.tsx под 404).
 *
 * Next.js file-convention: error.tsx — это error boundary уровня сегмента
 * маршрута (технически в App Router нет буквальной "страницы 500", как
 * была в Pages Router, — есть граница ошибок, которую Next.js
 * автоматически оборачивает вокруг {children} в layout.tsx и показывает,
 * если что-то в дереве ниже бросает ошибку при рендере, с HTTP-статусом
 * 500). Как и not-found.tsx, этот компонент рендерится ВНУТРИ
 * app/layout.tsx — Header/Footer на месте, MapSection нет (та же логика,
 * что и у 404, см. layout.tsx/page.tsx).
 *
 * 'use client' здесь не опционален, а ОБЯЗАТЕЛЕН — Next.js требует,
 * чтобы error.tsx был клиентским компонентом (это само по себе часть
 * контракта file-convention, не связано с использованием i18n, как у
 * not-found.tsx). По той же причине, что и там, metadata экспортировать
 * нельзя.
 *
 * Кнопки "на главную" здесь намеренно НЕТ (решение пользователя) — если
 * сайт действительно недоступен (а не просто поймал ошибку рендера на
 * клиенте), ссылка на "/" может никуда не вести. Вместо этого — текст
 * с объяснением + SocialLinks (те же иконки/ссылки, что и в футере,
 * общий компонент components/SocialLinks.tsx) — соцсети и мессенджеры
 * работают независимо от состояния самого сайта.
 *
 * error/reset — стандартные props, которые Next.js прокидывает в
 * error.tsx: error — пойманный объект ошибки (не показываем пользователю
 * его message/stack — технические детали ни к чему посетителю кафе,
 * в проде Next.js и так обрезает message у серверных ошибок до общего
 * "An error occurred"), reset — функция повторной попытки рендера
 * сегмента без полной перезагрузки страницы; здесь не используется,
 * т.к. кнопку повтора пользователь не просил, а в сценарии "сайт
 * недоступен" reset() всё равно, скорее всего, тут же наткнётся на ту же
 * ошибку ещё раз.
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { SocialLinks } from '@/components/SocialLinks';

export default function Error() {
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
