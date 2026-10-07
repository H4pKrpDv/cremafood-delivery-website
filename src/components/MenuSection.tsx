/**
 * components/MenuSection.tsx
 * ------------------------------------------------------------------
 * Секция <section class="menu"> главной: вкладки категорий + для каждой
 * категории сетка мини-баннеров подкатегорий.
 *
 * Как и в нативной версии — ВСЕ категории рендерятся всегда (не только
 * активная), скрытые получают класс .category-group--hidden, а не
 * убираются из DOM условным рендером — так весь текст и все ссылки на
 * подкатегории остаются в статической разметке страницы (SEO/шеринг).
 *
 * 08.10.2026: навигация по подкатегориям переделана. Пилюли подкатегорий и
 * показ одной выбранной подкатегории убраны: внутри вкладки категории —
 * сетка баннеров-ссылок (SubcategoryBanner), каждая ведёт на страницу
 * подкатегории (/drinks/kofe), где и лежит сетка позиций. Позиции на
 * главной больше не показываются. Запоминается (sessionStorage) только
 * выбранная категория — lib/menuCategoryPersist.ts.
 *
 * 07.10.2026: «Полное меню» — отдельная 4-я категория (вкладка) с
 * единственной плашкой-ссылкой на общий PDF; баннеров в ней нет.
 * ------------------------------------------------------------------
 */

'use client';

import { useState, useLayoutEffect } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { menuData, menuStructure, DEFAULT_ACTIVE_CATEGORY } from '@/lib/data';
import {
  MENU_CATEGORY_PRELOAD_STYLE_ID,
  readSavedMenuCategory,
  saveMenuCategory
} from '@/lib/menuCategoryPersist';
import { hasSubcategoryPage } from '@/lib/subcategoryRoutes';
import { isFullMenuSubcategory, subcategoryAnchor, type MenuSubcategory } from '@/types/menu';
import { SubcategoryBanner } from './SubcategoryBanner';

function FullMenuCard({ sub, categoryId }: { sub: MenuSubcategory; categoryId: string }) {
  const { t } = useI18n();
  if (!isFullMenuSubcategory(sub)) return null;
  // 07.10.2026: плашка живёт в отдельной категории «Полное меню» (одна на
  // весь сайт, один общий PDF), а не в каждой из трёх категорий.
  // 04.10.2026: вместо QR-плейсхолдера и ссылки «здесь» внутри текста —
  // обычный текст + action-кнопка (.btn--primary), открывающая PDF полного
  // меню в НОВОЙ вкладке (target="_blank"): PDF открывается во встроенном
  // просмотрщике браузера, и в той же вкладке посетитель потерял бы место
  // на странице меню (на мобильных просмотрщик часто без кнопки "назад").
  // rel="noopener noreferrer" — стандартная защита для target="_blank".
  // Адрес PDF — pdfUrl из menu.json (сейчас "/full-menu.pdf" → файл
  // public/full-menu.pdf).
  return (
    <div className="category category--full-menu" id={subcategoryAnchor(categoryId, sub)}>
      <div className="full-menu-card">
        <p>{t('subcategories.full-menu.text')}</p>
        <a
          className="btn btn--primary full-menu-card__btn"
          href={sub.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('subcategories.full-menu.buttonText')}
        </a>
      </div>
    </div>
  );
}

export function MenuSection() {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<string>(DEFAULT_ACTIVE_CATEGORY);

  // 04.10.2026: восстановление выбранной категории после перезагрузки (см.
  // lib/menuCategoryPersist.ts). Начальное состояние обязано совпадать с
  // серверным HTML (дефолтная категория), иначе будет ошибка гидратации, —
  // поэтому сохранённое значение читаем уже в эффекте. useLayoutEffect (а не
  // useEffect): обновление состояния из него применяется ДО отрисовки
  // кадра, так что мигания нет. Заодно убираем <style>, который inline-скрипт
  // из <head> добавил для самого первого кадра — дальше нужную категорию
  // рисуют обычные классы.
  useLayoutEffect(() => {
    const saved = readSavedMenuCategory(menuStructure);
    if (saved) setActiveCategory(saved);
    document.getElementById(MENU_CATEGORY_PRELOAD_STYLE_ID)?.remove();
  }, []);

  function selectCategory(categoryId: string) {
    setActiveCategory(categoryId);
    saveMenuCategory(categoryId);
  }

  return (
    <section className="menu" id="menu">
      <div className="container">
        <div className="section-header">
          <p className="section-eyebrow">{t('menu.eyebrow')}</p>
          <h2 className="section-title">{t('menu.title')}</h2>
          <p className="section-desc">{t('menu.desc')}</p>
        </div>

        <div className="category-tabs" role="tablist" aria-label={t('menu.categoryTabsLabel')}>
          {menuData.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`category-tab${category.id === activeCategory ? ' category-tab--active' : ''}`}
              role="tab"
              data-category={category.id}
              aria-selected={category.id === activeCategory}
              onClick={() => selectCategory(category.id)}
            >
              {t(`categories.${category.id}`)}
            </button>
          ))}
        </div>

        {menuData.categories.map((category) => {
          const bannerSubs = category.subcategories.filter(
            (sub) => !isFullMenuSubcategory(sub) && hasSubcategoryPage(sub.id)
          );
          const fullMenuSub = category.subcategories.find(isFullMenuSubcategory);
          return (
            <section
              key={category.id}
              className={`category-group${category.id === activeCategory ? '' : ' category-group--hidden'}`}
              id={`cat-${category.id}`}
            >
              <h3 className="category-group__title">{t(`categories.${category.id}`)}</h3>
              {bannerSubs.length > 0 ? (
                <div className="sub-grid">
                  {bannerSubs.map((sub) => (
                    <SubcategoryBanner key={sub.id} subId={sub.id} categoryId={category.id} />
                  ))}
                </div>
              ) : null}
              {fullMenuSub ? <FullMenuCard sub={fullMenuSub} categoryId={category.id} /> : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}
