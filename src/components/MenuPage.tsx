/**
 * components/MenuPage.tsx
 * ------------------------------------------------------------------
 * 09.10.2026. Страница «Полное меню» (/menu). Серверная обёртка —
 * app/[lang]/menu/page.tsx. Сейчас здесь: крошки, пилюли разделов,
 * ключевой H1 с вступлением, оглавление меню (раздел → ссылки на
 * подкатегории) и плашка со ссылкой на PDF полного меню. SEO-текст
 * (SeoText, ключ page:menu) передаётся как children и выводится под
 * контентом. Позже здесь может появиться онлайн-вид полного меню вместо
 * PDF (пример — andys.md/restaurantmenu).
 * ------------------------------------------------------------------
 */

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { menuData } from '@/lib/data';
import { getCategoryPathname, getCategorySubcategoryIds } from '@/lib/categoryRoutes';
import { getSubcategoryPathname } from '@/lib/subcategoryRoutes';
import { FULL_MENU_CATEGORY_ID } from '@/lib/menuPageRoutes';
import { isFullMenuSubcategory } from '@/types/menu';
import { Breadcrumbs } from './Breadcrumbs';
import { CategoryNav } from './CategoryNav';

export function MenuPage({ children }: { children?: ReactNode }) {
  const { t, lang } = useI18n();
  const sections = menuData.categories.filter((category) => category.id !== FULL_MENU_CATEGORY_ID);
  const fullMenuSub = menuData.categories
    .find((category) => category.id === FULL_MENU_CATEGORY_ID)
    ?.subcategories.find(isFullMenuSubcategory);

  return (
    <main className="sub-page category-page menu-page">
      <div className="container">
        <Breadcrumbs items={[{ label: t('menuPage.crumb') }]} />
        <CategoryNav activeId={FULL_MENU_CATEGORY_ID} />
        <h1 className="category-group__title">{t('menuPage.h1')}</h1>
        <p className="menu-page__intro">{t('menuPage.intro')}</p>

        <div className="menu-page__sections">
          {sections.map((category) => {
            const categoryHref = getCategoryPathname(lang, category.id);
            const subIds = getCategorySubcategoryIds(category.id);
            if (subIds.length === 0) return null;
            return (
              <section key={category.id} className="menu-page__section">
                <h2 className="menu-page__section-title">
                  {categoryHref ? (
                    <Link href={categoryHref} className="menu-page__section-link">
                      {t(`categories.${category.id}`)}
                    </Link>
                  ) : (
                    t(`categories.${category.id}`)
                  )}
                </h2>
                <ul className="menu-page__links">
                  {subIds.map((subId) => {
                    const href = getSubcategoryPathname(lang, subId);
                    if (!href) return null;
                    return (
                      <li key={subId}>
                        <Link href={href} className="menu-page__link">
                          {t(`subcategories.${subId}.title`)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        {fullMenuSub ? (
          <section className="menu-page__pdf" aria-labelledby="menu-pdf-title">
            <h2 className="menu-page__section-title" id="menu-pdf-title">
              {t('menuPage.pdfTitle')}
            </h2>
            <div className="full-menu-card">
              <p>{t('subcategories.full-menu.text')}</p>
              {/* PDF открывается в НОВОЙ вкладке: во встроенном просмотрщике
                  браузера (особенно на мобильных) нет кнопки «назад» и
                  посетитель потерял бы страницу меню. rel — защита для
                  target="_blank". Адрес — pdfUrl из menu.json. */}
              <a
                className="btn btn--primary full-menu-card__btn"
                href={fullMenuSub.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('subcategories.full-menu.buttonText')}
              </a>
            </div>
          </section>
        ) : null}
      </div>
      {children}
    </main>
  );
}
