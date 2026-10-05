import { Hero } from '@/components/Hero';
import { MenuSection } from '@/components/MenuSection';
import { MapSection } from '@/components/MapSection';

// Главная страница (05.10.2026 переехала из app/page.tsx в app/[lang]/ —
// одна и та же страница на трёх языках: /, /ro, /en; язык берёт из
// контекста I18nProvider, который задаёт [lang]/layout.tsx).
export default function HomePage() {
  return (
    <>
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
