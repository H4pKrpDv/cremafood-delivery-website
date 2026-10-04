/**
 * components/MenuSection.tsx
 * ------------------------------------------------------------------
 * Порт секции <section class="menu"> + renderCategoryTabs()/renderPills()/
 * renderCategoryGroup()/renderSubcategory()/renderLoyaltyCard()/
 * renderFullMenuCard() (build/build.js) + переключения табов (js/menu.js).
 *
 * Как и в нативной версии — ВСЕ категории рендерятся всегда (не только
 * активная), скрытые получают класс .category-group--hidden (то же для
 * пилюль подкатегорий — .pill--hidden), а не убираются из DOM условным
 * рендером — так весь текст остаётся в статической разметке страницы
 * (важно было для SEO/шеринга у нативной версии; в Next.js это SSR в любом
 * случае, но поведение сознательно сохранено один в один).
 * ------------------------------------------------------------------
 */

'use client';

import { useState, useLayoutEffect } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { menuData, DEFAULT_ACTIVE_CATEGORY, publicImagePath, hasRealImage } from '@/lib/data';
import { useImageFallback } from '@/lib/useImageFallback';
import {
  MENU_CATEGORY_PRELOAD_STYLE_ID,
  readSavedMenuCategory,
  saveMenuCategory
} from '@/lib/menuCategoryPersist';
import { isFullMenuSubcategory, isSubRenderable, type MenuSubcategory } from '@/types/menu';
import { ItemCard } from './ItemCard';

function LoyaltyCard() {
  const { t } = useI18n();
  return (
    <div className="loyalty-card" id="loyalty-card">
      <span className="loyalty-card__badge">{t('specialOffers.loyaltyBadge')}</span>
      <h4 className="loyalty-card__title">{t('specialOffers.loyaltyTitle')}</h4>
      <p className="loyalty-card__text">{t('specialOffers.loyaltyText')}</p>
      <span className="loyalty-card__time">{t('specialOffers.loyaltyTime')}</span>
    </div>
  );
}

function FullMenuCard({ sub, categoryId }: { sub: MenuSubcategory; categoryId: string }) {
  const { t } = useI18n();
  if (!isFullMenuSubcategory(sub)) return null;
  // 04.10.2026: вместо QR-плейсхолдера и ссылки «здесь» внутри текста —
  // обычный текст + action-кнопка (.btn--primary), открывающая PDF полного
  // меню в НОВОЙ вкладке (target="_blank"): PDF открывается во встроенном
  // просмотрщике браузера, и в той же вкладке посетитель потерял бы место
  // на странице меню (на мобильных просмотрщик часто без кнопки "назад").
  // rel="noopener noreferrer" — стандартная защита для target="_blank".
  // Адрес PDF — pdfUrl из menu.json (сейчас "/full-menu.pdf" → файл
  // public/full-menu.pdf).
  return (
    <div className="category category--full-menu" id={`full-menu-card-${categoryId}`}>
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

function Subcategory({
  sub,
  index,
  categoryId
}: {
  sub: MenuSubcategory;
  index: number;
  categoryId: string;
}) {
  const { t } = useI18n();
  // Хуки обязаны вызываться безусловно и в одном и том же порядке на каждый
  // рендер — поэтому useImageFallback() идёт раньше раннего return у
  // карточки "Полное меню" (у неё нет своего баннера, но компонент Subcategory
  // всё равно должен каждый раз вызывать один и тот же набор хуков).
  const img = useImageFallback(
    isFullMenuSubcategory(sub) ? '' : publicImagePath(sub.image),
    isFullMenuSubcategory(sub) ? false : hasRealImage(sub.image)
  );
  if (isFullMenuSubcategory(sub)) return <FullMenuCard sub={sub} categoryId={categoryId} />;

  const titleKey = `subcategories.${sub.id}.title`;
  const descKey = `subcategories.${sub.id}.desc`;
  const reversed = index % 2 === 1;

  return (
    <div className="category" id={sub.id}>
      <div className={`category__header${reversed ? ' category__header--rev' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.src}
          alt={t(titleKey)}
          className={`category__img${img.imgClassName ? ` ${img.imgClassName}` : ''}`}
          loading="lazy"
          onError={img.onError}
        />
        <div className="category__text">
          <h4 className="category__title">{t(titleKey)}</h4>
          <p className="category__desc">{t(descKey)}</p>
        </div>
      </div>
      <div className="items-grid">
        {sub.items.map((item) => (
          <ItemCard key={item.id} itemId={item.id} />
        ))}
        {sub.id === 'promo-permanent' ? <LoyaltyCard /> : null}
      </div>
    </div>
  );
}

export function MenuSection() {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<string>(DEFAULT_ACTIVE_CATEGORY);
  const [currentPillAnchor, setCurrentPillAnchor] = useState<string | null>(null);

  // 04.10.2026: восстановление выбранной категории после перезагрузки (см.
  // lib/menuCategoryPersist.ts). Начальное состояние обязано совпадать с
  // серверным HTML (дефолтная категория), иначе будет ошибка гидратации, —
  // поэтому сохранённое значение читаем уже в эффекте. useLayoutEffect (а не
  // useEffect): обновление состояния из него применяется ДО отрисовки
  // кадра, так что мигания нет. Заодно убираем <style>, который inline-скрипт
  // из <head> добавил для самого первого кадра — дальше нужную категорию
  // рисуют обычные классы.
  useLayoutEffect(() => {
    const saved = readSavedMenuCategory(menuData.categories.map((category) => category.id));
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

        <nav className="menu-pills">
          {menuData.categories.flatMap((category) =>
            category.subcategories.filter(isSubRenderable).map((sub) => {
              const isFullMenu = isFullMenuSubcategory(sub);
              const anchor = isFullMenu ? `full-menu-card-${category.id}` : sub.id;
              const key = isFullMenu ? 'subcategories.full-menu.title' : `subcategories.${sub.id}.title`;
              const hiddenForTab = category.id !== activeCategory;
              return (
                <a
                  key={`${category.id}-${anchor}`}
                  href={`#${anchor}`}
                  data-category={category.id}
                  className={`pill${isFullMenu ? ' pill--accent' : ''}${hiddenForTab ? ' pill--hidden' : ''}${
                    currentPillAnchor === anchor ? ' pill--current' : ''
                  }`}
                  onClick={() => setCurrentPillAnchor(anchor)}
                >
                  {t(key)}
                </a>
              );
            })
          )}
        </nav>

        {menuData.categories.map((category) => (
          <section
            key={category.id}
            className={`category-group${category.id === activeCategory ? '' : ' category-group--hidden'}`}
            id={`cat-${category.id}`}
          >
            <h3 className="category-group__title">{t(`categories.${category.id}`)}</h3>
            {category.subcategories.filter(isSubRenderable).map((sub, index) => (
              <Subcategory key={sub.id} sub={sub} index={index} categoryId={category.id} />
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}
