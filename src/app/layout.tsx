import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/i18n/I18nProvider';
import { ThemeEffect } from '@/components/ThemeEffect';
import { themeInitScript } from '@/lib/themeInitScript';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartModal } from '@/components/CartModal';
import { CheckoutModal } from '@/components/CheckoutModal';
import { PrivacyModal } from '@/components/PrivacyModal';
import { ModalManager } from '@/components/ModalManager';
import { BackToTop } from '@/components/BackToTop';
import { SITE_URL, buildMetaTagValues, buildJsonLd } from '@/lib/seo';
import { Analytics } from "@vercel/analytics/next"

// Шрифты — раньше подключались обычным <link> на fonts.googleapis.com
// (перенесено как есть из build/template.html вместе со всем остальным
// CSS в первом раунде миграции). Next.js такой способ явно не
// рекомендует для App Router (ESLint-предупреждение
// @next/next/no-page-custom-font — правило унаследовано из времён Pages
// Router, но сама рекомендация актуальна и здесь): next/font/google
// скачивает файлы шрифтов на этапе сборки и раздаёт их с того же домена
// (self-hosted) — быстрее (нет отдельного запроса к Google при заходе
// посетителя), без CLS/мигания текста (Next сам подбирает
// метрически совместимый фолбэк-шрифт) и без стороннего запроса к
// Google Fonts на каждый визит. Веса и стили подобраны 1-в-1 под то, что
// запрашивал прежний <link> (Playfair Display: 400/600/700 + курсив 400,
// Inter: 300/400/500). subsets включает cyrillic/latin-ext — сайт
// трёхъязычный (ru/ro/en), без этого кириллица и румынские диакритики
// (ă/â/î/ș/ț) отрисовывались бы фолбэк-шрифтом, а не выбранной гарнитурой.
const playfairDisplay = Playfair_Display({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-head-google'
});

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['300', '400', '500'],
  style: ['normal'],
  display: 'swap',
  variable: '--font-body-google'
});

// Порт buildMetaTagValues()/buildJsonLd() (build/build.js, Этап 1 п.10
// нативной версии) — единый источник (lib/seo.ts, из того же data/i18n/
// ru.json + data/menu.json) вместо хардкода тегов. Статичный `metadata`,
// а не generateMetadata(): значения не зависят от запроса (сайт
// одностраничный, язык переключается на клиенте, см. комментарий в
// lib/seo.ts) — async-функция здесь не даёт ничего сверх статичного
// объекта.
//
// Фавикон: раньше был указан вручную как `icons: { icon: '/img/logo.png' }`
// (файл в public/) — не отображался у части пользователей, потому что
// многие браузеры и краулеры запрашивают классический /favicon.ico
// НАПРЯМУЮ, независимо от <link rel="icon"> в <head> (та же логика, что
// требует любой сайт), а такого файла не было вовсе. Теперь используется
// file-convention Next.js: app/icon.png (современный <link rel="icon">
// с правильными sizes/type, генерируется автоматически) + app/favicon.ico
// (тот самый классический путь, мультиразмерный ICO 16/32/48 — Next.js сам
// отдаёт его по адресу /favicon.ico). Оба файла — тот же img/logo.png,
// просто подготовленный под каждый формат. Ручной `icons` больше не нужен
// и убран, чтобы не плодить дублирующиеся/конфликтующие теги.
const seo = buildMetaTagValues();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: seo.title,
  description: seo.description,
  alternates: { canonical: seo.canonicalUrl },
  openGraph: {
    type: 'website',
    siteName: 'Crema Food',
    title: seo.title,
    description: seo.description,
    url: seo.canonicalUrl,
    images: [{ url: seo.ogImagePath }],
    locale: 'ru_RU',
    alternateLocale: ['ro_MD', 'en_US']
  },
  twitter: {
    card: 'summary_large_image',
    title: seo.title,
    description: seo.description,
    images: [{ url: seo.ogImagePath, alt: 'Cafe Crema Food Balti' }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = buildJsonLd();

  return (
    // suppressHydrationWarning на <html>: inline-скрипт ниже ставит
    // data-theme на этот элемент ДО гидратации React — это намеренное
    // расхождение с серверной разметкой, а не ошибка. Работает только на
    // один уровень (на сам <html>), на детей не распространяется.
    <html lang="ru" className={`${playfairDisplay.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Тема оформления (04.10.2026, см. Context.md): синхронный inline-
          скрипт ДО первой отрисовки ставит data-theme="dark", если
          пользователь ранее выбрал тёмную тему (светлая — база, ей атрибут
          не нужен). Без него сохранённая тема применялась бы только после
          гидратации React — отсюда было мигание при каждой загрузке. См.
          lib/themeInitScript.ts и store/themeStore.ts.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/*
          JSON-LD (schema.org Restaurant/CafeOrCoffeeShop + меню) — порт
          buildJsonLd() из build.js, см. lib/seo.ts. Собирается из тех же
          данных, что и видимая разметка меню, поэтому не может разойтись
          с тем, что реально показано на странице.
        */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        {/*
          Graceful fallback битых <img> — раньше (22.09.2026) был
          глобальный inline-скрипт здесь (strategy="beforeInteractive"),
          который слушал 'error' на document в capture-фазе и мутировал
          DOM напрямую в обход React. 02.10.2026 переписано на обычный
          React onError + useState на каждом <img> — см.
          lib/useImageFallback.ts, там подробно объяснена причина: прежний
          подход гонялся с гидратацией React именно для категории
          "Напитки" (она активна по умолчанию и видна сразу, поэтому её
          картинки первыми начинали грузиться/проваливаться — иногда ещё
          ДО того, как React успевал гидрироваться, и тогда гидратация
          перезаписывала ручную правку скрипта обратно к битому src).
          Новый подход на обычных React-хуках такой гонки не допускает в
          принципе — состояние "битая картинка" живёт внутри самого React,
          а не мутируется извне.
        */}
        {/*
          Тема оформления (тёмная/светлая) — проставляет data-theme на
          <html> после гидратации store/themeStore.ts (02.10.2026, см.
          components/ThemeEffect.tsx и Context.md). Рендерит null, вынесен
          за пределы I18nProvider, т.к. от i18n-контекста не зависит.
        */}
        <ThemeEffect />
        <I18nProvider>
          {/*
            Header/Footer — глобальный каркас, одинаковый на всех
            страницах, включая not-found.tsx/error.tsx (02.10.2026,
            оформление 404/500: по решению пользователя эти страницы
            используют настоящие Header/Footer сайта, а не отдельный
            минимальный макет). MapSection раньше была здесь же (между
            {'{children}'} и Footer) и поэтому показывалась на всех
            страницах без исключения — теперь она переехала в
            app/page.tsx как часть контента самой главной страницы
            (после Hero/MenuSection), чтобы НЕ показываться на 404/500.
          */}
          <Header />
          {children}
          <Footer />
          <CartModal />
          <CheckoutModal />
          <PrivacyModal />
          <ModalManager />
          <BackToTop />
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
