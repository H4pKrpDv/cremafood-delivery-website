/**
 * app/global-error.tsx — аварийный fallback НА СЛУЧАЙ, если упадёт сам
 * корневой layout.tsx (02.10.2026, часть работы над 500-страницей).
 *
 * В App Router error.tsx (соседний файл) ловит ошибки только в дереве
 * НИЖЕ layout.tsx — если ошибка происходит в самом layout.tsx (например,
 * в buildJsonLd()/buildMetaTagValues() из lib/seo.ts, в next/font или
 * в разметке <html>/<body>), error.tsx тоже оказывается недоступен, т.к.
 * он сам рендерится ВНУТРИ layout.tsx. Для этого случая Next.js требует
 * отдельный global-error.tsx, который заменяет ВЕСЬ документ целиком —
 * поэтому, в отличие от error.tsx/not-found.tsx, здесь нужны собственные
 * <html>/<body> (обычно их даёт layout.tsx, но раз сам layout.tsx мог
 * быть источником проблемы — на него полагаться нельзя).
 *
 * Специально НЕ переиспользует I18nProvider/Header/Footer/SocialLinks/
 * globals.css — это всё инфраструктура, которую обычно поднимает именно
 * layout.tsx, а раз он сам мог быть источником проблемы, полагаться на
 * него нельзя. Поэтому здесь полностью самодостаточная разметка: текст —
 * статичный русский (без t()), цвета — те же значения, что и в
 * :root globals.css, но продублированы как обычные hex-строки в inline
 * style (а не через CSS-классы/переменные) — максимум независимости от
 * остального приложения, минимум того, что может сломаться вместе с ним.
 *
 * На практике это крайний случай ("подстраховка на подстраховку") —
 * в 99% случаев реальные сбои (ошибка в API, в данных, в рендере секции)
 * ловит именно error.tsx. Протестировать global-error.tsx "по-настоящему"
 * сложно, не ломая сам layout.tsx (см. объяснение пользователю в чате).
 */

'use client';

import type { ReactNode } from 'react';

// Сокращённый набор (5 из 8, что на error.tsx/в футере) — это крайний
// аварийный fallback, не хочется разрастания файла без веской причины;
// при желании можно дополнить до полного списка по образцу
// components/SocialLinks.tsx (копировать оттуда, не импортировать —
// см. комментарий в начале файла про независимость от остального кода).
const SOCIALS: { key: string; label: string; href: string; icon: ReactNode }[] = [
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com/crema.md',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
      </>
    )
  },
  {
    key: 'facebook',
    label: 'Facebook',
    href: '#',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <path d="M13.5 20V13h2.3l.4-2.6h-2.7V8.6c0-.8.4-1.2 1.3-1.2h1.5V4.6c-.3 0-1.2-.1-2.1-.1-2.1 0-3.4 1.3-3.4 3.6v2.3H8.5V13h2.3v7" />
      </>
    )
  },
  {
    key: 'telegram',
    label: 'Telegram',
    href: '#',
    icon: (
      <>
        <path d="M3.5 12.5 20.5 4.5 15.5 19.5 10.5 13.5Z" />
        <path d="M20.5 4.5 10.5 13.5" />
      </>
    )
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    href: '#',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="12" rx="4" />
        <path d="M8 17V20.5L11.5 17" />
        <circle cx="9" cy="11" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="12" cy="11" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="15" cy="11" r="0.9" fill="currentColor" stroke="none" />
      </>
    )
  },
  {
    key: 'viber',
    label: 'Viber',
    href: '#',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="12" rx="4" />
        <path d="M8 17V20.5L11.5 17" />
        <circle cx="12" cy="11" r="2" fill="currentColor" stroke="none" />
      </>
    )
  }
];

export default function GlobalError() {
  return (
    <html lang="ru">
      <head>
        <title>Crema Food — сайт временно недоступен</title>
      </head>
      <body style={{ margin: 0, background: '#130e09', color: '#f0dfc8', fontFamily: 'Georgia, serif' }}>
        <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem', textAlign: 'center' }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ width: 160, margin: '0 auto 1.5rem', color: '#c8964a' }} aria-hidden="true">
              <svg viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <path d="M12 98Q12 28 80 22Q148 28 148 98" />
                <path d="M28 92Q28 46 80 40Q132 46 132 92" />
                <path d="M30 90 42 72 54 86 66 68 80 84 94 68 106 86 118 72 130 90" />
                <circle cx="54" cy="80" r="4" fill="currentColor" stroke="none" />
                <circle cx="94" cy="79" r="4" fill="currentColor" stroke="none" />
                <circle cx="74" cy="88" r="3.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#e8b96a', margin: '0 0 0.5rem' }}>500</p>
            <h1 style={{ fontSize: '1.5rem', color: '#f5e6d0', margin: '0 0 0.75rem' }}>Сайт временно недоступен</h1>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#c4a882', margin: '0 0 1.5rem' }}>
              Приносим извинения, у нас техническая неполадка. Напишите нам в соцсети или мессенджер — оформим заказ, пока здесь всё наладим.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
              {SOCIALS.map(({ key, label, href, icon }) => (
                <a
                  key={key}
                  href={href}
                  target={href === '#' ? undefined : '_blank'}
                  rel={href === '#' ? undefined : 'noopener noreferrer'}
                  aria-label={label}
                  title={label}
                  onClick={href === '#' ? (e) => e.preventDefault() : undefined}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '1px solid #4a3520',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c4a882',
                    textDecoration: 'none'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 18, height: 18 }}>
                    {icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </section>
      </body>
    </html>
  );
}
