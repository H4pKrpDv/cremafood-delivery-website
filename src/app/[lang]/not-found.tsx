/**
 * app/[lang]/not-found.tsx — кастомная 404-страница (02.10.2026, UX-правки пока
 * нет контента от заказчика, Этап 1 из двух: сначала 404, отдельным
 * раундом — error.tsx/global-error.tsx под 500).
 *
 * Next.js file-convention: этот компонент автоматически рендерится для
 * любого несуществующего маршрута, но остаётся ВНУТРИ app/layout.tsx —
 * то есть Header/Footer вокруг него те же, что и на главной (решение
 * пользователя: не делать отдельный минимальный макет без шапки/подвала).
 * Единственное, чего здесь намеренно нет — <MapSection>: она 02.10.2026
 * переехала из layout.tsx в app/page.tsx именно для того, чтобы НЕ
 * показываться на этой странице (раньше карта рендерилась на всех
 * маршрутах без исключения, что и имел в виду пользователь, говоря
 * "сейчас на 404 показывается тот же хедер/футер и секция с картой").
 *
 * 'use client' обязателен — тексты идут через useI18n() (контекст языка
 * из [lang]/layout.tsx, см. i18n/I18nProvider.tsx), поэтому экспортировать
 * metadata из этого же файла нельзя (ограничение Next.js для клиентских
 * компонентов) — страница использует заголовок/метатеги [lang]/layout.tsx
 * как есть.
 *
 * 05.10.2026: файл переехал из app/ в app/[lang]/ — 404 показывается на
 * языке адреса (/ro/xxx → румынский), а кнопка ведёт на главную ЭТОГО же
 * языка (localizedPath). Попадают сюда адреса через app/[lang]/[...rest].
 */

'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/I18nProvider';
import { localizedPath } from '@/lib/i18nConfig';

export default function NotFound() {
  const { t, lang } = useI18n();

  return (
    <section className="error-page error-page--404">
      <div className="error-page__inner">
        <div className="error-page__art" aria-hidden="true">
          {/* Чашка кофе с паром — тот же line-art стиль, что и иконки
              соцсетей в футере (stroke=currentColor, без заливки). */}
          <svg viewBox="0 0 140 140" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M70 2C66 10,74 16,70 24C66 32,74 38,70 46" />
            <path d="M46 4C42 12,50 18,46 26C42 34,50 40,46 48" />
            <path d="M94 4C90 12,98 18,94 26C90 34,98 40,94 48" />
            <ellipse cx="70" cy="60" rx="32" ry="6" />
            <path d="M38 60L102 60L94 108Q92 118 82 118L58 118Q48 118 46 108Z" />
            <path d="M100 72Q118 72 118 86Q118 100 100 100" />
            <ellipse cx="70" cy="124" rx="48" ry="7" />
          </svg>
        </div>
        <div className="error-page__content">
          <p className="error-page__code">404</p>
          <h1 className="error-page__title">{t('notFound.title')}</h1>
          <p className="error-page__text">{t('notFound.text')}</p>
          <Link href={localizedPath(lang, '/#menu')} className="btn btn--primary">
            {t('notFound.cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
