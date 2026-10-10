/**
 * components/MenuSection.tsx
 * ------------------------------------------------------------------
 * Секция <section class="menu"> главной: ВСЕ разделы меню подряд, столбиком —
 * Спец. предложения, Напитки, Блюда, Полное меню (порядок menu.json). У
 * каждого — заголовок и сетка баннеров-ссылок на подкатегории
 * (SubcategoryBanner → /drinks/kofe), у «Полного меню» — только плашка с
 * PDF (FullMenuPlate).
 *
 * 10.10.2026 (для конверсии): пилюли разделов с главной убраны — все
 * подкатегории сразу на виду, голодному гостю не нужно искать, где
 * заказать. Ссылки на страницы разделов (/promo, /drinks, /food, /menu)
 * теперь в бургер-меню (мобильные) и в футере (десктоп), а ряд пилюль
 * (CategoryNav) остался только на страницах самих разделов.
 *
 * История: 09.10.2026 — пилюли были настоящими ссылками и на главной
 * показывался один блок (напитки); до того — кнопки-вкладки с запоминанием
 * в sessionStorage (lib/menuCategoryPersist.ts, больше не используется).
 * ------------------------------------------------------------------
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { menuData } from '@/lib/data';
import { hasSubcategoryPage } from '@/lib/subcategoryRoutes';
import { FULL_MENU_CATEGORY_ID } from '@/lib/menuPageRoutes';
import { isFullMenuSubcategory } from '@/types/menu';
import { FullMenuPlate } from './FullMenuPlate';
import { SubcategoryBanner } from './SubcategoryBanner';

export function MenuSection() {
  const { t } = useI18n();

  return (
    <section className="menu" id="menu">
      <div className="container">
        <div className="section-header">
          <p className="section-eyebrow">{t('menu.eyebrow')}</p>
          <h2 className="section-title">{t('menu.title')}</h2>
          <p className="section-desc">{t('menu.desc')}</p>
        </div>

        {menuData.categories.map((category) => {
          const isFullMenu = category.id === FULL_MENU_CATEGORY_ID;
          const bannerSubs = category.subcategories.filter(
            (sub) => !isFullMenuSubcategory(sub) && hasSubcategoryPage(sub.id)
          );
          if (!isFullMenu && bannerSubs.length === 0) return null;
          return (
            <section key={category.id} className="category-group" id={`cat-${category.id}`}>
              <h3 className="category-group__title">{t(`categories.${category.id}`)}</h3>
              {isFullMenu ? (
                <FullMenuPlate />
              ) : (
                <div className="sub-grid">
                  {bannerSubs.map((sub) => (
                    <SubcategoryBanner key={sub.id} subId={sub.id} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
