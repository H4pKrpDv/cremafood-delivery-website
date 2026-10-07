import { Hero } from '@/components/Hero';
import { MenuSection } from '@/components/MenuSection';
import { MapSection } from '@/components/MapSection';
import { isLang, DEFAULT_LANG } from '@/lib/i18nConfig';
import { buildJsonLd } from '@/lib/seo';

// Главная страница (05.10.2026 переехала из app/page.tsx в app/[lang]/ —
// одна и та же страница на трёх языках: /, /ro, /en; язык берёт из
// контекста I18nProvider, который задаёт [lang]/layout.tsx).
export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  // JSON-LD ресторана + меню (schema.org Restaurant/CafeOrCoffeeShop) — порт
  // buildJsonLd() из build.js. До 07.10.2026 лежал в <head> общего layout и
  // попадал на каждую страницу; теперь — только на главную (см. комментарий
  // в [lang]/layout.tsx). "<" экранируем, чтобы данные не закрыли <script>.
  const jsonLd = buildJsonLd(isLang(lang) ? lang : DEFAULT_LANG);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Hero />
      <MenuSection />
      {/* Переехала сюда из layout.tsx 02.10.2026 (оформление 404/500) —
          карта относится к контенту главной страницы, а не к глобальному
          каркасу (Header/Footer), поэтому не должна показываться на
          not-found.tsx/error.tsx. */}
      <MapSection />
    </>
  );
}
