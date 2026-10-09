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
 * 05.10.2026: у каждого языка теперь СВОЙ адрес (/, /ro, /en — см.
 * lib/i18nConfig.ts и proxy.ts), поэтому <title>/description/canonical/
 * hreflang/og:locale/JSON-LD собираются отдельно для каждого языка на
 * сервере (app/[lang]/layout.tsx вызывает buildMetaTagValues(lang) и
 * buildJsonLd(lang)). Прежнее ограничение «всё запекается один раз на
 * русском» снято. Пока ro/en не переведены, их страницы закрыты от
 * индексации — см. INDEXABLE_LANGS в lib/i18nConfig.ts.
 * ------------------------------------------------------------------
 */

import { menuData } from '@/lib/data';
import { I18N_DATA, resolveKey, DEFAULT_LANG, type Lang } from '@/lib/i18nCore';
import { INDEXABLE_LANGS, HREFLANG, localizedPath, isIndexableLang } from '@/lib/i18nConfig';
import { isFullMenuSubcategory, type MenuSubcategoryItems } from '@/types/menu';

export const SITE_URL = 'https://cremafood.md';

// Постоянный идентификатор заведения в JSON-LD: на него ссылаются страницы
// позиций (Offer.seller), чтобы поисковик связывал их с одним объектом.
export const RESTAURANT_ID = `${SITE_URL}/#restaurant`;

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
  // Часы ОЧНОГО визита (lib/hours.ts VENUE_HOURS — кафе/бар 7–22, кухня 9–22),
  // не часы доставки (DEPARTMENT_HOURS, кухня до 02:00) — то же
  // разграничение, что и в build.js: openingHoursSpecification описывает,
  // когда можно физически прийти, а не когда работает курьерская доставка.
  openingHours: { opens: '07:00', closes: '22:00' }
} as const;

// Перевод ключа на нужный язык с фолбэком на язык по умолчанию (как t() в
// I18nProvider), затем на fallback.
function translate(lang: Lang, key: string, fallback = ''): string {
  return resolveKey(I18N_DATA[lang], key) ?? resolveKey(I18N_DATA[DEFAULT_LANG], key) ?? fallback;
}

/** Абсолютный URL страницы нужного языка: https://cremafood.md/ , https://cremafood.md/ro */
export function absoluteUrl(lang: Lang, path: string = '/'): string {
  const localized = localizedPath(lang, path);
  return localized === '/' ? `${SITE_URL}/` : `${SITE_URL}${localized}`;
}

/**
 * hreflang-альтернативы для <link rel="alternate">/sitemap: только языки из
 * INDEXABLE_LANGS (не ссылаемся на noindex-страницы) + x-default на язык по
 * умолчанию. Если индексируется один язык — hreflang не нужен (undefined).
 */
export function buildHreflangAlternates(): Record<string, string> | undefined {
  if (INDEXABLE_LANGS.length < 2) return undefined;
  const languages: Record<string, string> = {};
  for (const lang of INDEXABLE_LANGS) languages[HREFLANG[lang]] = absoluteUrl(lang);
  languages['x-default'] = absoluteUrl(DEFAULT_LANG);
  return languages;
}

export { isIndexableLang };

export interface SeoMetaValues {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImagePath: string;
}

export function buildMetaTagValues(lang: Lang = DEFAULT_LANG): SeoMetaValues {
  return {
    title: translate(lang, 'meta.title'),
    description: translate(lang, 'meta.description'),
    // Canonical каждой языковой версии — она сама ('/', '/ro', '/en'),
    // резолвится в абсолютный URL через metadataBase.
    canonicalUrl: localizedPath(lang),
    // Относительный путь — Next.js резолвит его в абсолютный через
    // metadataBase (см. app/layout.tsx), как и было в build.js (там
    // абсолютный URL собирался вручную через SITE_URL).
    ogImagePath: '/img/og_default.png'
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildJsonLd(lang: Lang = DEFAULT_LANG): Record<string, any> {
  const t = (key: string, fallback = ''): string => translate(lang, key, fallback);

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
    // 08.10.2026: оставлен ОДИН тип — Restaurant (подтип FoodEstablishment).
    // Раньше было ['Restaurant', 'CafeOrCoffeeShop']: заведение — кафе-ресторан
    // с доставкой еды, Restaurant покрывает и кухню, и бар/кофе, а Google
    // для локального бизнеса работает с одним понятным типом (CafeOrCoffeeShop
    // не даёт ничего сверх, кроме неопределённости).
    '@type': 'Restaurant',
    '@id': RESTAURANT_ID,
    name: BUSINESS.name,
    url: absoluteUrl(lang),
    inLanguage: HREFLANG[lang],
    image: `${SITE_URL}/img/og_default.png`,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    servesCuisine: ['Coffee', 'Mexican', 'Breakfast', 'Desserts'],
    description: translate(lang, 'meta.description'),
    priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressCountry: BUSINESS.addressCountry
    },
    areaServed: { '@type': 'City', name: BUSINESS.addressLocality },
    // Заказ доставки/самовывоза на сайте: действие «заказать еду».
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl(lang),
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform'
        ]
      },
      deliveryMethod: ['http://purl.org/goodrelations/v1#DeliveryModeOwnFleet', 'http://purl.org/goodrelations/v1#DeliveryModePickUp']
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
