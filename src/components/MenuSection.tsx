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

import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { menuData, DEFAULT_ACTIVE_CATEGORY, publicImagePath } from '@/lib/data';
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
  const text = t('subcategories.full-menu.text');
  const linkText = t('subcategories.full-menu.linkText');
  const parts = text.split('«здесь»');
  return (
    <div className="category category--full-menu" id={`full-menu-card-${categoryId}`}>
      <div className="full-menu-card">
        <div className="full-menu-card__qr-placeholder" aria-hidden="true">
          QR
        </div>
        <p>
          {parts.length === 2 ? (
            <>
              {parts[0]}«
              <a href={sub.pdfUrl} target="_blank" rel="noopener noreferrer">
                {linkText}
              </a>
              »{parts[1]}
            </>
          ) : (
            text
          )}
        </p>
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
  if (isFullMenuSubcategory(sub)) return <FullMenuCard sub={sub} categoryId={categoryId} />;

  const titleKey = `subcategories.${sub.id}.title`;
  const descKey = `subcategories.${sub.id}.desc`;
  const reversed = index % 2 === 1;

  return (
    <div className="category" id={sub.id}>
      <div className={`category__header${reversed ? ' category__header--rev' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={publicImagePath(sub.image)} alt={t(titleKey)} className="category__img" loading="lazy" />
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
              aria-selected={category.id === activeCategory}
              onClick={() => setActiveCategory(category.id)}
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
