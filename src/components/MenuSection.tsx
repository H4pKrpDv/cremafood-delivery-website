/**
 * components/MenuSection.tsx
 * ------------------------------------------------------------------
 * Секция <section class="menu"> главной: ряд пилюль разделов + сетка
 * мини-баннеров подкатегорий напитков.
 *
 * 09.10.2026: пилюли разделов стали НАСТОЯЩИМИ ССЫЛКАМИ (CategoryNav):
 * Спец. предложения → /promo, Напитки → /drinks, Блюда → /food, Полное меню
 * → /menu. Раньше это были кнопки-вкладки: адрес не менялся, а выбор
 * запоминался в sessionStorage — на раздел нельзя было направить трафик.
 * Теперь вкладки на главной нет: показывается всегда один блок — баннеры
 * напитков (решение пользователя), пилюля «Напитки» подсвечена визуально
 * (без aria-current: главная — не страница раздела). Остальные категории
 * на главной больше не рендерятся — на них ведут пилюли; sessionStorage-
 * запоминание категории и inline-скрипт в <head> убраны (lib/
 * menuCategoryPersist.ts больше не используется).
 *
 * 08.10.2026: внутри категории — сетка баннеров-ссылок (SubcategoryBanner),
 * каждый ведёт на страницу подкатегории (/drinks/kofe).
 * ------------------------------------------------------------------
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { menuData, DEFAULT_ACTIVE_CATEGORY } from '@/lib/data';
import { hasSubcategoryPage } from '@/lib/subcategoryRoutes';
import { isFullMenuSubcategory } from '@/types/menu';
import { CategoryNav } from './CategoryNav';
import { SubcategoryBanner } from './SubcategoryBanner';

export function MenuSection() {
  const { t } = useI18n();
  const category = menuData.categories.find((item) => item.id === DEFAULT_ACTIVE_CATEGORY);
  const bannerSubs = (category?.subcategories ?? []).filter(
    (sub) => !isFullMenuSubcategory(sub) && hasSubcategoryPage(sub.id)
  );

  return (
    <section className="menu" id="menu">
      <div className="container">
        <div className="section-header">
          <p className="section-eyebrow">{t('menu.eyebrow')}</p>
          <h2 className="section-title">{t('menu.title')}</h2>
          <p className="section-desc">{t('menu.desc')}</p>
        </div>

        <CategoryNav activeId={DEFAULT_ACTIVE_CATEGORY} current={false} />

        {category ? (
          <section className="category-group" id={`cat-${category.id}`}>
            <h3 className="category-group__title">{t(`categories.${category.id}`)}</h3>
            {bannerSubs.length > 0 ? (
              <div className="sub-grid">
                {bannerSubs.map((sub) => (
                  <SubcategoryBanner key={sub.id} subId={sub.id} />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </section>
  );
}
