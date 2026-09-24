/**
 * lib/seo.ts
 * ------------------------------------------------------------------
 * Порт SEO-констант и JSON-LD генерации из build/build.js (нативная
 * версия, Этап 1 п.10, 22.09.2026: buildMetaTagValues()/buildJsonLd()).
 *
 * В нативной версии это были две функции, вызываемые build-скриптом при
 * генерации статичного index.html. В Next.js аналог — статичный
 * `export const metadata` в app/layout.tsx (заполняется значениями
 * buildMetaTagValues() отсюда) + JSON-LD <script> в теле layout.tsx
 * (buildJsonLd() отсюда, сериализуется через JSON.stringify в компоненте).
 *
 * ВАЖНО (то же ограничение, что и в нативной версии, задокументировано
 * там же в Context.md): сайт одностраничный, язык переключается на
 * клиенте без отдельных URL на язык (см. i18n/I18nProvider.tsx) — поэтому
 * <title>/description/canonical/JSON-LD "запекаются" один раз на русском
 * (DEFAULT_LANG) и не меняются при переключении языка в браузере. Это
 * осознанная граница возможностей клиентского i18n, не баг.
 * ------------------------------------------------------------------
 */

import { menuData } from '@/lib/data';
import { I18N_DATA, resolveKey, DEFAULT_LANG } from '@/lib/i18nCore';
import { isFullMenuSubcategory, type MenuSubcategoryItems } from '@/types/menu';

export const SITE_URL = 'https://cremafood.md';

// Реквизиты заведения — та же константа BUSINESS, что была в build.js.
// ВАЖНО: эти факты также "запечены" в разметке футера (Footer.tsx) —
// при смене адреса/телефона/соцсетей нужно обновить оба места (то же
// предупреждение, что было в build.js).
export const BUSINESS = {
  name: 'Crema Food',
  telephone: '+37361088777',
  email: 'cremafood.md@gmail.com',
  streetAddress: 'Alexandru cel Bun 1A',
  addressLocality: 'Bălți',
  addressCountry: 'MD',
  sameAs: ['https://instagram.com/crema.md'],
  hasMap: 'https://share.google/cIC2PGKOn0GDHVoVd',
  // Часы ОЧНОГО визита (footer.hoursCafe — "Кафе/бар 7–22, кухня 9–22"),
  // не часы доставки (footer.deliveryHours, кухня до 02:00) — то же
  // разграничение, что и в build.js: openingHoursSpecification описывает,
  // когда можно физически прийти, а не когда работает курьерская доставка.
  openingHours: { opens: '07:00', closes: '22:00' }
} as const;

function t(key: string, fallback = ''): string {
  return resolveKey(I18N_DATA[DEFAULT_LANG], key) ?? fallback;
}

export interface SeoMetaValues {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImagePath: string;
}

export function buildMetaTagValues(): SeoMetaValues {
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    canonicalUrl: '/',
    // Относительный путь — Next.js резолвит его в абсолютный через
    // metadataBase (см. app/layout.tsx), как и было в build.js (там
    // абсолютный URL собирался вручную через SITE_URL).
    ogImagePath: '/img/og_default.png'
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildJsonLd(): Record<string, any> {
  const menuSections = menuData.categories
    .map((category) => {
      const subSections = (category.subcategories || [])
        .filter((sub): sub is MenuSubcategoryItems => !isFullMenuSubcategory(sub) && Boolean(sub.items && sub.items.length > 0))
        .map((sub) => {
          const menuItems = sub.items
            .filter((item) => item.available !== false)
            .map((item) => ({
              '@type': 'MenuItem',
              name: t(`items.${item.id}.name`, item.id),
              description: t(`items.${item.id}.desc`, ''),
              offers: {
                '@type': 'Offer',
                price: String(item.price),
                priceCurrency: 'MDL'
              }
            }));
          if (menuItems.length === 0) return null;
          return {
            '@type': 'MenuSection',
            name: t(`subcategories.${sub.id}.title`, sub.id),
            description: t(`subcategories.${sub.id}.desc`, ''),
            hasMenuItem: menuItems
          };
        })
        .filter((section): section is NonNullable<typeof section> => Boolean(section));
      if (subSections.length === 0) return null;
      return {
        '@type': 'MenuSection',
        name: t(`categories.${category.id}`, category.id),
        hasMenuSection: subSections
      };
    })
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  const allPrices = menuData.categories
    .flatMap((category) => category.subcategories || [])
    .filter((sub): sub is MenuSubcategoryItems => !isFullMenuSubcategory(sub) && Boolean(sub.items))
    .flatMap((sub) => sub.items)
    .filter((item) => item.available !== false)
    .map((item) => item.price);
  const priceRange = allPrices.length ? `${Math.min(...allPrices)}–${Math.max(...allPrices)} MDL` : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'CafeOrCoffeeShop'],
    name: BUSINESS.name,
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/img/og_default.png`,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    servesCuisine: ['Coffee', 'Mexican', 'Breakfast', 'Desserts'],
    priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressCountry: BUSINESS.addressCountry
    },
    hasMap: BUSINESS.hasMap,
    sameAs: BUSINESS.sameAs,
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: BUSINESS.openingHours.opens,
      closes: BUSINESS.openingHours.closes
    },
    hasMenu: {
      '@type': 'Menu',
      name: t('meta.title'),
      hasMenuSection: menuSections
    }
  };
}
