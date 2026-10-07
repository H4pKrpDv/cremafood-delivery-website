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
 *
 * 05.10.2026: подкатегории переключаются так же, как категории — видна
 * ТОЛЬКО выбранная подкатегория активной категории (по умолчанию первая),
 * остальные скрыты классом .category--hidden (в DOM остаются — см. выше про
 * SEO). Кнопки подкатегорий — <button>, а не якорные ссылки. Выбор
 * запоминается в sessionStorage по категориям (lib/menuCategoryPersist.ts).
 *
 * 07.10.2026: «Полное меню» — отдельная 4-я категория (вкладка) с единственной
 * плашкой-ссылкой на общий PDF (раньше плашка была подкатегорией в каждой из
 * трёх категорий). Подкатегория в категории одна, поэтому ряд пилюль для неё
 * не показывается: единственная пилюля только дублировала бы вкладку.
 * Правило общее: пилюли есть только у категорий минимум с двумя
 * отрисовываемыми подкатегориями (см. MIN_SUBS_FOR_PILLS).
 * ------------------------------------------------------------------
 */

'use client';

import { useState, useLayoutEffect } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import {
  menuData,
  menuStructure,
  DEFAULT_ACTIVE_CATEGORY,
  publicImagePath,
  hasRealImage
} from '@/lib/data';
import { useImageFallback } from '@/lib/useImageFallback';
import {
  MENU_CATEGORY_PRELOAD_STYLE_ID,
  readSavedMenuSelection,
  saveMenuCategory,
  saveMenuSubcategory
} from '@/lib/menuCategoryPersist';
import {
  isFullMenuSubcategory,
  isSubRenderable,
  subcategoryAnchor,
  type MenuSubcategory
} from '@/types/menu';
import { ItemCard } from './ItemCard';

// Категория показывает ряд пилюль подкатегорий, только если в ней не меньше
// стольких отрисовываемых подкатегорий (одна пилюль не нужна). Тот же порог
// зашит в inline-скрипт из lib/menuCategoryPersist.ts (первый кадр).
const MIN_SUBS_FOR_PILLS = 2;

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

function FullMenuCard({
  sub,
  categoryId,
  active
}: {
  sub: MenuSubcategory;
  categoryId: string;
  active: boolean;
}) {
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
    <div
      className={`category category--full-menu${active ? '' : ' category--hidden'}`}
      id={`full-menu-card-${categoryId}`}
      data-subcategory={`full-menu-card-${categoryId}`}
    >
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
  categoryId,
  active
}: {
  sub: MenuSubcategory;
  categoryId: string;
  active: boolean;
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
  if (isFullMenuSubcategory(sub)) return <FullMenuCard sub={sub} categoryId={categoryId} active={active} />;

  const titleKey = `subcategories.${sub.id}.title`;
  const descKey = `subcategories.${sub.id}.desc`;

  // Раньше баннеры чередовались (картинка то слева, то справа — по номеру
  // подкатегории в списке). Теперь на экране всегда ОДНА подкатегория, и
  // «чётность» зависела бы от того, какую кнопку нажали, — поэтому раскладка
  // везде одинаковая (модификатор .category__header--rev в CSS остался,
  // но больше не используется).
  return (
    <div
      className={`category${active ? '' : ' category--hidden'}`}
      id={sub.id}
      data-subcategory={sub.id}
    >
      <div className="category__header">
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
  // Выбранная подкатегория по категориям: { id категории: якорь подкатегории }.
  // Начальное значение — первая отрисовываемая подкатегория каждой категории
  // (то же, что рендерит сервер; восстановление из sessionStorage — ниже).
  const [activeSubs, setActiveSubs] = useState<Record<string, string>>(() =>
    Object.fromEntries(menuStructure.map((category) => [category.id, category.subs[0] ?? '']))
  );

  // 04.10.2026: восстановление выбранной категории после перезагрузки (см.
  // lib/menuCategoryPersist.ts). Начальное состояние обязано совпадать с
  // серверным HTML (дефолтная категория), иначе будет ошибка гидратации, —
  // поэтому сохранённое значение читаем уже в эффекте. useLayoutEffect (а не
  // useEffect): обновление состояния из него применяется ДО отрисовки
  // кадра, так что мигания нет. Заодно убираем <style>, который inline-скрипт
  // из <head> добавил для самого первого кадра — дальше нужную категорию
  // рисуют обычные классы.
  useLayoutEffect(() => {
    const saved = readSavedMenuSelection(menuStructure);
    if (saved.category) setActiveCategory(saved.category);
    if (Object.keys(saved.subs).length > 0) setActiveSubs((prev) => ({ ...prev, ...saved.subs }));
    document.getElementById(MENU_CATEGORY_PRELOAD_STYLE_ID)?.remove();
  }, []);

  // Ряд пилюль виден, только если у активной категории достаточно подкатегорий.
  const activeCategoryData = menuData.categories.find((category) => category.id === activeCategory);
  const pillsVisible =
    (activeCategoryData?.subcategories.filter(isSubRenderable).length ?? 0) >= MIN_SUBS_FOR_PILLS;

  function selectCategory(categoryId: string) {
    setActiveCategory(categoryId);
    saveMenuCategory(categoryId);
  }

  function selectSubcategory(categoryId: string, anchor: string) {
    setActiveSubs((prev) => ({ ...prev, [categoryId]: anchor }));
    saveMenuSubcategory(categoryId, anchor);
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

        <div
          className={`menu-pills${pillsVisible ? '' : ' menu-pills--hidden'}`}
          role="tablist"
          aria-label={t('menu.subcategoryTabsLabel')}
        >
          {menuData.categories.flatMap((category) => {
            const renderableSubs = category.subcategories.filter(isSubRenderable);
            if (renderableSubs.length < MIN_SUBS_FOR_PILLS) return [];
            return renderableSubs.map((sub) => {
              const anchor = subcategoryAnchor(category.id, sub);
              const key = `subcategories.${sub.id}.title`;
              const hiddenForTab = category.id !== activeCategory;
              const isCurrent = activeSubs[category.id] === anchor;
              return (
                <button
                  key={`${category.id}-${anchor}`}
                  type="button"
                  role="tab"
                  data-category={category.id}
                  data-subcategory={anchor}
                  aria-selected={isCurrent}
                  className={`pill${hiddenForTab ? ' pill--hidden' : ''}${isCurrent ? ' pill--current' : ''}`}
                  onClick={() => selectSubcategory(category.id, anchor)}
                >
                  {t(key)}
                </button>
              );
            });
          })}
        </div>

        {menuData.categories.map((category) => (
          <section
            key={category.id}
            className={`category-group${category.id === activeCategory ? '' : ' category-group--hidden'}`}
            id={`cat-${category.id}`}
          >
            <h3 className="category-group__title">{t(`categories.${category.id}`)}</h3>
            {category.subcategories.filter(isSubRenderable).map((sub) => (
              <Subcategory
                key={sub.id}
                sub={sub}
                categoryId={category.id}
                active={activeSubs[category.id] === subcategoryAnchor(category.id, sub)}
              />
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}
