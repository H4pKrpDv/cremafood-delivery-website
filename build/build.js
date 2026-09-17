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

// ---------------------------------------------------------------------
// Загрузка данных
// ---------------------------------------------------------------------

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw);
}

const menu = readJson('data/menu.json');
const i18n = readJson(`data/i18n/${DEFAULT_LANG}.json`);

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
              <!-- JS корзины (п.7 плана) подменит эту кнопку на "< + | кол-во | - >" -->
            </div>`;

  return `
          <article class="item-card${cardStateClass}" data-item-id="${item.id}"${modifiersAttr}${ageAttr}${availableAttr}>
            <img class="item-card__img" src="${escapeHtml(item.image)}" alt="${imageAlt}" loading="lazy" width="600" height="600" />
            <div class="item-card__body">
              <h5 class="item-card__name" data-i18n-key="${nameKey}">${name}</h5>
              <p class="item-card__desc" data-i18n-key="${descKey}">${desc}</p>
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

function renderSubcategory(sub, index, categoryId) {
  if (sub.type === 'full-menu-card') {
    return renderFullMenuCard({ ...sub, parentCategoryId: categoryId });
  }

  const titleKey = `subcategories.${sub.id}.title`;
  const descKey = `subcategories.${sub.id}.desc`;
  const reversed = index % 2 === 1 ? ' category__header--rev' : '';

  const itemsHtml = (sub.items || []).map(renderItemCard).join('\n');

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
          </div>
        </div>`;
}

// ---------------------------------------------------------------------
// Генерация группы верхнего уровня (special-offers / cafe / kitchen)
// ---------------------------------------------------------------------

function renderCategoryGroup(category) {
  const titleKey = `categories.${category.id}`;
  const subsHtml = category.subcategories
    .map((sub, index) => renderSubcategory(sub, index, category.id))
    .join('\n');

  return `
      <section class="category-group" id="cat-${category.id}" data-category="${category.id}">
        <h3 class="category-group__title" data-i18n-key="${titleKey}">${escapeHtml(t(titleKey))}</h3>
${subsHtml}
      </section>`;
}

// ---------------------------------------------------------------------
// Генерация быстрой навигации-пилюль (переключение табов — JS из п.6 плана)
// ---------------------------------------------------------------------

function renderPills() {
  const pills = [];
  for (const category of menu.categories) {
    for (const sub of category.subcategories) {
      const isFullMenu = sub.type === 'full-menu-card';
      const anchor = isFullMenu ? `full-menu-card-${category.id}` : sub.id;
      const key = isFullMenu ? 'subcategories.full-menu.title' : `subcategories.${sub.id}.title`;
      const accentClass = isFullMenu ? ' pill--accent' : '';
      pills.push(
        `<a href="#${anchor}" class="pill${accentClass}" data-category="${category.id}" data-i18n-key="${key}">${escapeHtml(t(key))}</a>`
      );
    }
  }
  return `<nav class="menu-pills">\n          ${pills.join('\n          ')}\n        </nav>`;
}

// ---------------------------------------------------------------------
// Сборка index.html из шаблона
// ---------------------------------------------------------------------

function buildIndexHtml() {
  const templatePath = path.join(ROOT, 'build/template.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  const menuCategoriesHtml = menu.categories.map(renderCategoryGroup).join('\n');
  const menuPillsHtml = renderPills();

  html = html.replace('<!--{{MENU_PILLS}}-->', menuPillsHtml);
  html = html.replace('<!--{{MENU_CATEGORIES}}-->', menuCategoriesHtml);

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
