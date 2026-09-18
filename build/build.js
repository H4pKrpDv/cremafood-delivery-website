/**
 * build/build.js
 * ---------------------------------------------------------------------
 * Этап 1, п.2 плана.
 *
 * Что делает этот скрипт (и почему он вообще нужен — см. Context.md,
 * раздел "Важный нюанс: JS-рендер меню vs SEO/шеринг в соцсети"):
 *
 *   1. Читает data/menu.json (структура категорий/подкатегорий/товаров)
 *      и data/i18n/ru.json (тексты по умолчанию — русский язык).
 *   2. Генерирует готовую HTML-разметку меню (категории → подкатегории →
 *      сетка карточек товара) и "запекает" её прямо в index.html, вместо
 *      того чтобы рисовать меню в браузере через JS. Так поисковые роботы
 *      и боты соцсетей (которые JS не выполняют) видят готовый текст.
 *   3. Каждый текстовый элемент получает атрибут data-i18n-key — по нему
 *      js/i18n.js (появится в одном из следующих шагов) будет на лету
 *      подменять текст при переключении языка, без перезагрузки страницы.
 *   4. Заодно генерирует robots.txt и sitemap.xml.
 *
 * Как запустить:
 *   node build/build.js
 *
 * Или, если добавишь в package.json скрипт "build" (уже добавлено):
 *   npm run build
 *
 * ВАЖНО: index.html, robots.txt и sitemap.xml в корне проекта —
 * это СГЕНЕРИРОВАННЫЕ файлы. Их не редактируют руками — при следующем
 * запуске build.js они будут перезаписаны. Чтобы что-то изменить:
 *   - контент/цены/фото товаров -> правь data/menu.json
 *   - тексты (названия, описания) -> правь data/i18n/ru.json (и ro/en)
 *   - разметку шапки/hero/футера/CSS-классы -> правь build/template.html
 *   - саму логику генерации -> правь этот файл
 * ---------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_LANG = 'ru';
const SITE_URL = 'https://cremafood.md';

// Какой верхнеуровневый таб (Спец.предложения/Кафе/Кухня) открыт по умолчанию
// при первой загрузке страницы (п.6 плана). Выбрали "Кафе" — это самая
// богатая контентом категория (напитки/десерты), а "Спец.предложения" сейчас
// почти пустая (только карточка лояльности + QR "Полное меню", т.к.
// promo-seasonal/promo-new — заглушки без товаров, см. isSubRenderable).
const DEFAULT_ACTIVE_CATEGORY = 'cafe';

// ---------------------------------------------------------------------
// Загрузка данных
// ---------------------------------------------------------------------

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw);
}

const menu = readJson('data/menu.json');

// Читаем все три языка: RU используется для "запекания" статичного текста
// (как и раньше), но теперь RO и EN тоже нужны — они вшиваются в саму
// страницу, чтобы js/i18n.js мог переключать язык в браузере без fetch()
// (см. buildI18nDataScript ниже и комментарий в build/template.html).
const i18nRu = readJson('data/i18n/ru.json');
const i18nRo = readJson('data/i18n/ro.json');
const i18nEn = readJson('data/i18n/en.json');
const i18n = i18nRu;

// ---------------------------------------------------------------------
// Маленькие помощники
// ---------------------------------------------------------------------

// Безопасно достаём значение из i18n по ключу вида "subcategories.coffee.title"
function t(key, fallback = '') {
  const parts = key.split('.');
  let value = i18n;
  for (const part of parts) {
    if (value == null) break;
    value = value[part];
  }
  if (value == null) {
    console.warn(`[build.js] Нет перевода для ключа "${key}" в data/i18n/${DEFAULT_LANG}.json`);
    return fallback;
  }
  return value;
}

// Экранируем текст, который вставляем в HTML (на случай спецсимволов в JSON)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Универсальный "текстовый span с data-i18n-key"
function span(key, className) {
  const text = escapeHtml(t(key));
  const cls = className ? ` class="${className}"` : '';
  return `<span${cls} data-i18n-key="${key}">${text}</span>`;
}

// ---------------------------------------------------------------------
// Генерация карточки товара
// ---------------------------------------------------------------------

function renderItemCard(item) {
  const nameKey = `items.${item.id}.name`;
  const descKey = `items.${item.id}.desc`;
  const weightKey = `items.${item.id}.weight`;
  const imageAltKey = `items.${item.id}.imageAlt`;

  const name = escapeHtml(t(nameKey, item.id));
  const desc = escapeHtml(t(descKey, ''));
  const weight = escapeHtml(t(weightKey, ''));
  const imageAlt = escapeHtml(t(imageAltKey, name));

  const modifiersAttr = item.modifiers && item.modifiers.length
    ? ` data-modifiers="${item.modifiers.join(',')}"`
    : '';
  const ageAttr = item.ageRestricted ? ' data-age-restricted="true"' : '';
  const availableAttr = item.available === false ? ' data-available="false"' : ' data-available="true"';
  const cardStateClass = item.available === false ? ' item-card--unavailable' : '';

  // Пока available:false нигде реально не используется (все товары сейчас
  // available:true), но логика должна работать уже сейчас — переключишь
  // поле в menu.json, пересоберёшь сайт, и карточка отрисуется без степпера.
  const actionHtml = item.available === false
    ? `<p class="item-card__unavailable-note" data-i18n-key="cart.itemUnavailable">${escapeHtml(t('cart.itemUnavailable'))}</p>`
    : `<div class="item-card__stepper" data-stepper data-item-id="${item.id}" data-price="${item.price}">
              <button type="button" class="stepper__add" data-action="add-to-cart" data-i18n-key="common.add">${escapeHtml(t('common.add'))}</button>
              <!-- js/menu.js (п.6 плана) подменяет эту кнопку на "< + | кол-во | - >"
                   при клике, и при загрузке страницы — если товар уже лежит в
                   localStorage["crema_cart"] (гидратация). Выбор соусов/модификаторов
                   для кухонных позиций — отдельный попап корзины, п.7 плана. -->
            </div>`;

  // Кнопка "ещё"/"свернуть" — по умолчанию скрыта атрибутом hidden; JS
  // показывает её только если описание реально обрезано до 2 строк
  // (scrollHeight > clientHeight), см. .item-card__desc-toggle в CSS.
  const descToggleId = `desc-${item.id}`;

  return `
          <article class="item-card${cardStateClass}" data-item-id="${item.id}"${modifiersAttr}${ageAttr}${availableAttr}>
            <img class="item-card__img" src="${escapeHtml(item.image)}" alt="${imageAlt}" loading="lazy" width="600" height="450" />
            <div class="item-card__body">
              <h5 class="item-card__name" data-i18n-key="${nameKey}">${name}</h5>
              <p class="item-card__desc" id="${descToggleId}" data-i18n-key="${descKey}">${desc}</p>
              <button type="button" class="item-card__desc-toggle" data-action="toggle-desc" aria-controls="${descToggleId}" aria-expanded="false" data-i18n-key="common.readMore" hidden>${escapeHtml(t('common.readMore'))}</button>
              <div class="item-card__meta">
                <span class="item-card__weight" data-i18n-key="${weightKey}">${weight}</span>
                <span class="item-card__price">${item.price} MDL</span>
              </div>
              ${actionHtml}
            </div>
          </article>`;
}

// ---------------------------------------------------------------------
// Генерация карточки "Полное меню" (вместо баннера — QR-плейсхолдер)
// ---------------------------------------------------------------------

function renderFullMenuCard(sub) {
  const textKey = 'subcategories.full-menu.text';
  const linkTextKey = 'subcategories.full-menu.linkText';
  return `
        <div class="category category--full-menu" id="full-menu-card-${sub.parentCategoryId}">
          <div class="full-menu-card">
            <div class="full-menu-card__qr-placeholder" aria-hidden="true">QR</div>
            <p data-i18n-key="${textKey}">
              ${escapeHtml(t(textKey)).replace('«здесь»', `«<a href="${escapeHtml(sub.pdfUrl)}" data-i18n-key="${linkTextKey}">${escapeHtml(t(linkTextKey))}</a>»`)}
            </p>
          </div>
        </div>`;
}

// ---------------------------------------------------------------------
// Генерация одной подкатегории (баннер + сетка карточек товара)
// ---------------------------------------------------------------------

// Подкатегория считается "отрисовываемой", если это карточка "Полное меню"
// (у неё нет items — она не товарная) или если в ней реально есть товары.
// Сейчас пустые заглушки — promo-seasonal и promo-new (у special-offers):
// в menu.json у них items: [] (задел на будущие акции/новинки), и рисовать
// пустую сетку карточек/пилюлю-ссылку на пустой блок было бы багом вида
// "пустой экран" — поэтому такие подкатегории пропускаем целиком (и в
// сетке категорий, и в навигации-пилюлях, см. renderPills). Как только в
// menu.json у них появятся товары — они начнут отображаться автоматически.
function isSubRenderable(sub) {
  return sub.type === 'full-menu-card' || Boolean(sub.items && sub.items.length > 0);
}

function renderSubcategory(sub, index, categoryId) {
  if (sub.type === 'full-menu-card') {
    return renderFullMenuCard({ ...sub, parentCategoryId: categoryId });
  }

  const titleKey = `subcategories.${sub.id}.title`;
  const descKey = `subcategories.${sub.id}.desc`;
  const reversed = index % 2 === 1 ? ' category__header--rev' : '';

  const itemsHtml = (sub.items || []).map(renderItemCard).join('\n');

  // Карточка лояльности ("Скидочная карта −20%") живёт не отдельно, а как
  // последний элемент сетки товаров подкатегории "Постоянные" (promo-permanent)
  // внутри "Спец.предложений" — уточнение от 18.09.2026 (п.6). Занимает всю
  // ширину строки сетки через CSS .items-grid > .loyalty-card, см. template.html.
  const loyaltyHtml = sub.id === 'promo-permanent' ? renderLoyaltyCard() : '';

  return `
        <div class="category" id="${sub.id}">
          <div class="category__header${reversed}">
            <img src="${escapeHtml(sub.image)}" alt="${escapeHtml(t(titleKey))}" class="category__img" loading="lazy" />
            <div class="category__text">
              <h4 class="category__title" data-i18n-key="${titleKey}">${escapeHtml(t(titleKey))}</h4>
              <p class="category__desc" data-i18n-key="${descKey}">${escapeHtml(t(descKey))}</p>
            </div>
          </div>
          <div class="items-grid">${itemsHtml}
${loyaltyHtml}
          </div>
        </div>`;
}

// ---------------------------------------------------------------------
// Карточка программы лояльности ("Скидочная карта −20%") — это не товар,
// поэтому в menu.json её нет: она не заказывается, у неё нет цены за
// порцию/степпера. Показываем её только внутри группы "special-offers",
// отдельным информационным блоком. См. Context.md, раздел
// "Скидочная карта / программа лояльности".
// ---------------------------------------------------------------------

function renderLoyaltyCard() {
  const badgeKey = 'specialOffers.loyaltyBadge';
  const titleKey = 'specialOffers.loyaltyTitle';
  const textKey = 'specialOffers.loyaltyText';
  const timeKey = 'specialOffers.loyaltyTime';

  return `
        <div class="loyalty-card" id="loyalty-card">
          <span class="loyalty-card__badge" data-i18n-key="${badgeKey}">${escapeHtml(t(badgeKey))}</span>
          <h4 class="loyalty-card__title" data-i18n-key="${titleKey}">${escapeHtml(t(titleKey))}</h4>
          <p class="loyalty-card__text" data-i18n-key="${textKey}">${escapeHtml(t(textKey))}</p>
          <span class="loyalty-card__time" data-i18n-key="${timeKey}">${escapeHtml(t(timeKey))}</span>
        </div>`;
}

// ---------------------------------------------------------------------
// Генерация группы верхнего уровня (special-offers / cafe / kitchen)
// ---------------------------------------------------------------------

function renderCategoryGroup(category) {
  const titleKey = `categories.${category.id}`;
  const isActive = category.id === DEFAULT_ACTIVE_CATEGORY;
  const hiddenClass = isActive ? '' : ' category-group--hidden';
  const visibleSubs = category.subcategories.filter(isSubRenderable);
  const subsHtml = visibleSubs
    .map((sub, index) => renderSubcategory(sub, index, category.id))
    .join('\n');

  return `
      <section class="category-group${hiddenClass}" id="cat-${category.id}" data-category="${category.id}">
        <h3 class="category-group__title" data-i18n-key="${titleKey}">${escapeHtml(t(titleKey))}</h3>
${subsHtml}
      </section>`;
}

// ---------------------------------------------------------------------
// Табы верхнего уровня (Спец.предложения/Кафе/Кухня) — переключение и
// синхронизация с пилюлями/секциями делает js/menu.js (п.6 плана).
// По умолчанию открыт DEFAULT_ACTIVE_CATEGORY — остальные табы отрисованы
// в HTML (важно для SEO/шеринга — весь текст есть в статике), но их секции
// сразу получают класс .category-group--hidden.
// ---------------------------------------------------------------------

function renderCategoryTabs() {
  const tabs = menu.categories.map((category) => {
    const titleKey = `categories.${category.id}`;
    const isActive = category.id === DEFAULT_ACTIVE_CATEGORY;
    const activeClass = isActive ? ' category-tab--active' : '';
    return `<button type="button" class="category-tab${activeClass}" data-category-tab="${category.id}" role="tab" aria-selected="${isActive ? 'true' : 'false'}" data-i18n-key="${titleKey}">${escapeHtml(t(titleKey))}</button>`;
  });
  return `<div class="category-tabs" id="categoryTabs" role="tablist" aria-label="Категории меню" data-i18n-attr-aria-label="menu.categoryTabsLabel">\n          ${tabs.join('\n          ')}\n        </div>`;
}

// ---------------------------------------------------------------------
// Генерация быстрой навигации-пилюль (переключение табов — JS из п.6 плана)
// ---------------------------------------------------------------------

function renderPills() {
  const pills = [];
  for (const category of menu.categories) {
    const isActiveCategory = category.id === DEFAULT_ACTIVE_CATEGORY;
    for (const sub of category.subcategories.filter(isSubRenderable)) {
      const isFullMenu = sub.type === 'full-menu-card';
      const anchor = isFullMenu ? `full-menu-card-${category.id}` : sub.id;
      const key = isFullMenu ? 'subcategories.full-menu.title' : `subcategories.${sub.id}.title`;
      const accentClass = isFullMenu ? ' pill--accent' : '';
      const hiddenClass = isActiveCategory ? '' : ' pill--hidden';
      pills.push(
        `<a href="#${anchor}" class="pill${accentClass}${hiddenClass}" data-category="${category.id}" data-i18n-key="${key}">${escapeHtml(t(key))}</a>`
      );
    }
  }
  return `<nav class="menu-pills" id="menuPills">\n          ${pills.join('\n          ')}\n        </nav>`;
}

// ---------------------------------------------------------------------
// <script> с данными всех 3 языков — вставляется перед </body>, чтобы
// js/i18n.js мог переключать язык в браузере без сетевого запроса
// (fetch json-файла не сработал бы при открытии index.html напрямую
// как file://, из-за CORS — см. комментарий в build/template.html).
// ---------------------------------------------------------------------

function buildI18nDataScript() {
  const payload = { ru: i18nRu, ro: i18nRo, en: i18nEn };
  // Экранируем "<", чтобы случайная подстрока вида "</script>" внутри
  // текста перевода не оборвала тег раньше времени.
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<script id="i18n-data">\n      window.__CREMA_I18N__ = ${json};\n      window.__CREMA_DEFAULT_LANG__ = ${JSON.stringify(DEFAULT_LANG)};\n    </script>`;
}

// ---------------------------------------------------------------------
// Сборка index.html из шаблона
// ---------------------------------------------------------------------

function buildIndexHtml() {
  const templatePath = path.join(ROOT, 'build/template.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  const menuCategoriesHtml = menu.categories.map(renderCategoryGroup).join('\n');
  const categoryTabsHtml = renderCategoryTabs();
  const menuPillsHtml = renderPills();
  const i18nDataScript = buildI18nDataScript();

  html = html.replace('<!--{{CATEGORY_TABS}}-->', categoryTabsHtml);
  html = html.replace('<!--{{MENU_PILLS}}-->', menuPillsHtml);
  html = html.replace('<!--{{MENU_CATEGORIES}}-->', menuCategoriesHtml);
  html = html.replace('<!--{{I18N_DATA}}-->', i18nDataScript);

  const outputPath = path.join(ROOT, 'index.html');
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`[build.js] index.html сгенерирован (${menu.categories.length} категорий).`);
}

// ---------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------

function buildRobotsTxt() {
  const content = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), content, 'utf-8');
  console.log('[build.js] robots.txt сгенерирован.');
}

// ---------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------

function buildSitemapXml() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), content, 'utf-8');
  console.log(`[build.js] sitemap.xml сгенерирован (lastmod=${today}).`);
}

// ---------------------------------------------------------------------
// main
// ---------------------------------------------------------------------

function main() {
  buildIndexHtml();
  buildRobotsTxt();
  buildSitemapXml();
  console.log('[build.js] Готово. Открой index.html в браузере, чтобы проверить результат.');
}

main();
