/**
 * components/ItemPage.tsx
 * ------------------------------------------------------------------
 * 07.10.2026. Страница отдельной позиции меню (/drinks/kofe/latte и т.д.).
 * Серверная обёртка — app/[lang]/[section]/[subcategory]/[item]/page.tsx.
 *
 * Состав (по ТЗ пользователя): хлебные крошки → фото → название → описание
 * → цена · граммаж/литраж → карточки соусов (модификаторов) → приборы →
 * кнопка «Добавить», которая после нажатия становится степпером. Кнопки
 * «липкой» панели нет — всё идёт в порядке документа (решение 07.10.2026).
 *
 * Синхронизация с корзиной — через тот же cartStore (store/cartStore.ts),
 * что использует попап корзины и карточки меню: позицию, соусы и приборы
 * можно менять и тут, и в корзине, состояние одно. Как и в корзине, у
 * соусов и приборов нет управления, пока самой позиции в корзине нет
 * (setModifierQty/setItemCutlery без записи позиции ничего не делают).
 * Правила цен — те же (lib/cartSummary.ts): первый набор приборов на
 * каждую порцию бесплатно, дальше +2 MDL; соусы по цене из menu.json.
 *
 * 09.10.2026 (SEO этап 4): под карточкой — «Похожие позиции»
 * (components/RelatedItems.tsx) и SEO-плашка «{Название} — заказать с
 * доставкой Crema Food в Бельцах» (components/ItemSeoPlate.tsx). Плашка —
 * СЕРВЕРНЫЙ компонент (уникальный текст позиции из data/seo/items.ru.json):
 * серверная страница позиции передаёт её сюда как children.
 * ------------------------------------------------------------------
 */

'use client';

import { useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import PriceDiscount from '@/components/PriceDiscount';
import { SyrupPicker } from '@/components/SyrupPicker';
import {
  drinkSurcharge,
  getItemDrinkDefaults,
  getItemDrinkGroups,
  getItemSyrupDefault,
  isCustomizableItem,
  isSyrupItem,
  makeLineKey,
  syrupSurcharge,
  type DrinkChoices
} from '@/lib/cartLines';
import { DrinkOptionSegments } from './DrinkOptionSegments';
import { useCartStore, useCartHydrated } from '@/store/cartStore';
import { useItemMeta } from '@/lib/useItemMeta';
import { useImageFallback } from '@/lib/useImageFallback';
import { hasRealImage, itemMetaIndex, modifierGroups, publicImagePath } from '@/lib/data';
import { getItemStatus } from '@/lib/itemRoutes';
import { getSubcategoryInternalPath } from '@/lib/subcategoryRoutes';
import type { ModifierOption } from '@/types/menu';
import { Breadcrumbs, categoryCrumb } from './Breadcrumbs';
import { RelatedItems } from './RelatedItems';

const CUTLERY_EXTRA_PRICE = 2; // MDL за каждый набор сверх числа порций (то же правило, что lib/cartSummary.ts)

// Картинка соуса по соглашению: public/img/modifiers/<id>.jpg (см. README в
// этой папке). Пока файла нет — вместо него рисуется заглушка-плейсхолдер.
function modifierImagePath(optionId: string): string {
  return `img/modifiers/${optionId}.jpg`;
}

interface ModifierCardProps {
  itemId: string;
  groupId: string;
  option: ModifierOption;
  interactive: boolean;
}

function ModifierCard({ itemId, groupId, option, interactive }: ModifierCardProps) {
  const { t } = useI18n();
  const hydrated = useCartHydrated();
  const qty = useCartStore((s) => (hydrated ? s.items[itemId]?.modifiers?.[groupId]?.[option.id] ?? 0 : 0));
  const setModifierQty = useCartStore((s) => s.setModifierQty);
  const path = modifierImagePath(option.id);
  const img = useImageFallback(publicImagePath(path), hasRealImage(path));
  const name = t(`modifiers.${option.id}.name`) || option.id;

  return (
    <li className="mod-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`mod-card__img${img.imgClassName ? ` ${img.imgClassName}` : ''}`}
        src={img.src}
        alt=""
        loading="lazy"
        width={240}
        height={180}
        onError={img.onError}
      />
      <div className="mod-card__body">
        <span className="mod-card__name">{name}</span>
        <span className="mod-card__price">+{option.price} MDL</span>
        {interactive ? (
          <div className="mod-card__stepper">
            {qty > 0 ? (
              <div className="stepper stepper--sm">
                <button
                  type="button"
                  className="stepper__btn"
                  aria-label={t('common.decreaseQty')}
                  onClick={() => setModifierQty(itemId, groupId, option.id, qty - 1)}
                >
                  −
                </button>
                <span className="stepper__qty" aria-label={t('common.quantityLabel')}>
                  {qty}
                </span>
                <button
                  type="button"
                  className="stepper__btn"
                  aria-label={t('common.increaseQty')}
                  onClick={() => setModifierQty(itemId, groupId, option.id, qty + 1)}
                >
                  +
                </button>
              </div>
            ) : (
              <button type="button" className="stepper__add" onClick={() => setModifierQty(itemId, groupId, option.id, 1)}>
                {t('common.add')}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function ItemPage({ itemId, children }: { itemId: string; children?: ReactNode }) {
  const { t, lang } = useI18n();
  const meta = useItemMeta(itemId);
  const base = itemMetaIndex[itemId];
  const hydrated = useCartHydrated();
  // 17.10.2026: сиропы. Выбор живёт здесь (черновик), а в корзине позиция
  // хранится под ключом строки «позиция + набор сиропов» (lib/cartLines.ts):
  // степпер ниже всегда показывает количество именно ВЫБРАННОГО набора.
  // Черновик привязан к itemId, чтобы при переходе на другую позицию
  // (компонент страницы может сохраниться) он сбрасывался на умолчания.
  const [draft, setDraft] = useState<{ itemId: string; syrups: string[]; choices: DrinkChoices }>({
    itemId,
    syrups: getItemSyrupDefault(itemId),
    choices: getItemDrinkDefaults(itemId)
  });
  const syrupsSupported = isSyrupItem(itemId);
  const drinkGroups = getItemDrinkGroups(itemId);
  const customizable = isCustomizableItem(itemId);
  const fresh = draft.itemId === itemId;
  const syrups = fresh ? draft.syrups : getItemSyrupDefault(itemId);
  const choices = fresh ? draft.choices : getItemDrinkDefaults(itemId);
  const lineKey = makeLineKey(itemId, syrups, choices);
  const qty = useCartStore((s) => (hydrated ? s.getItemQty(lineKey) : 0));
  const otherQty = useCartStore((s) => (hydrated && customizable ? s.getItemTotalQty(itemId) - s.getItemQty(lineKey) : 0));
  const cutleryQty = useCartStore((s) => (hydrated ? s.getItemCutlery(lineKey) : 0));
  const setItemQty = useCartStore((s) => s.setItemQty);
  const setItemCutlery = useCartStore((s) => s.setItemCutlery);
  const img = useImageFallback(base ? publicImagePath(base.image) : '', base?.hasImage ?? false);

  if (!base) return null;

  const name = t(`items.${itemId}.name`) || itemId;
  const desc = t(`items.${itemId}.desc`);
  const weight = t(`items.${itemId}.weight`);
  const imageAlt = t(`items.${itemId}.imageAlt`) || name;

  // 08.10.2026: подкатегория в крошках — ссылка на её страницу (если страница есть).
  const subcategoryPath = getSubcategoryInternalPath(lang, base.subcategoryId);

  const { status } = getItemStatus(itemId);
  const unavailable = status === 'unavailable' || base.available === false;
  const closedNow = !unavailable && !meta.departmentOpen;
  const orderable = !unavailable && !closedNow;
  // Управление соусами/приборами — только когда позиция уже в корзине.
  const inCart = orderable && qty > 0;

  const groupIds = base.modifierGroupIds.filter((groupId) => (modifierGroups[groupId] || []).length > 0);
  const extraCutlery = base.cutleryEligible ? Math.max(0, cutleryQty - qty) : 0;
  const cutleryExtraCost = extraCutlery * CUTLERY_EXTRA_PRICE;

  return (
    <main className="item-page">
      <div className="container">
        <Breadcrumbs
          items={[
            categoryCrumb(t(`categories.${base.categoryId}`), base.categoryId),
            { label: t(`subcategories.${base.subcategoryId}.title`), path: subcategoryPath ?? undefined },
            { label: name }
          ]}
        />

        <article className="item-page__layout">
          <div className="item-page__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={`item-page__img${img.imgClassName ? ` ${img.imgClassName}` : ''}`}
              src={img.src}
              alt={imageAlt}
              width={800}
              height={600}
              fetchPriority="high"
              onError={img.onError}
            />
          </div>

          <div className="item-page__info">
            <h1 className="item-page__title">{name}</h1>
            <p className="item-page__desc">{desc}</p>
            <p className="item-page__meta">
              <PriceDiscount price={base.price} oldPrice={base.oldPrice} />
              <span className="item-page__price">{base.price} MDL</span>
              {weight ? (
                <>
                  <span className="item-page__meta-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="item-page__weight">{weight}</span>
                </>
              ) : null}
            </p>

            {unavailable ? <p className="item-page__notice">{t('itemPage.unavailable')}</p> : null}
            {closedNow ? (
              <p className="item-page__notice">{t('menu.availableFrom').replace('{time}', meta.departmentOpenLabel)}</p>
            ) : null}

            {orderable && drinkGroups.length ? (
              <section className="item-page__section item-page__options">
                {drinkGroups.map((group) => (
                  <DrinkOptionSegments
                    key={group}
                    group={group}
                    value={choices[group] ?? ''}
                    onChange={(next) => setDraft({ itemId, syrups, choices: { ...choices, [group]: next } })}
                  />
                ))}
              </section>
            ) : null}

            {orderable && syrupsSupported ? (
              <section className="item-page__section item-page__syrups">
                <SyrupPicker
                  itemId={itemId}
                  value={syrups}
                  onChange={(next) => setDraft({ itemId, syrups: next, choices })}
                />
              </section>
            ) : null}

            {orderable
              ? groupIds.map((groupId) => (
                  <section className="item-page__section" key={groupId}>
                    <h2 className="item-page__section-title">{t(`modifiers.${groupId}.groupLabel`)}</h2>
                    {!inCart ? <p className="item-page__hint">{t('itemPage.modifiersHint')}</p> : null}
                    <ul className="item-page__mods">
                      {(modifierGroups[groupId] || []).map((option) => (
                        <ModifierCard key={option.id} itemId={lineKey} groupId={groupId} option={option} interactive={inCart} />
                      ))}
                    </ul>
                  </section>
                ))
              : null}

            {orderable && base.cutleryEligible ? (
              <section className="item-page__section item-page__cutlery">
                <div className="item-page__cutlery-row">
                  <span className="item-page__cutlery-left">
                    <span className="item-page__cutlery-label">{t('cart.cutlery')}</span>
                    {cutleryExtraCost > 0 ? (
                      <span className="item-page__cutlery-extra">(+{cutleryExtraCost} MDL)</span>
                    ) : null}
                  </span>
                  {inCart ? (
                    <div className="stepper stepper--sm">
                      <button
                        type="button"
                        className="stepper__btn"
                        aria-label={t('common.decreaseQty')}
                        onClick={() => setItemCutlery(lineKey, Math.max(0, cutleryQty - 1))}
                      >
                        −
                      </button>
                      <span className="stepper__qty" aria-label={t('common.quantityLabel')}>
                        {cutleryQty}
                      </span>
                      <button
                        type="button"
                        className="stepper__btn"
                        aria-label={t('common.increaseQty')}
                        onClick={() => setItemCutlery(lineKey, cutleryQty + 1)}
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="item-page__hint">{t('itemPage.cutleryNote')}</p>
              </section>
            ) : null}

            {orderable ? (
              <div className="item-page__actions">
                {qty > 0 ? (
                  <div className="stepper item-page__stepper">
                    <button type="button" className="stepper__btn" aria-label={t('common.decreaseQty')} onClick={() => setItemQty(lineKey, qty - 1)}>
                      −
                    </button>
                    <span className="stepper__qty" aria-label={t('common.quantityLabel')}>
                      {qty}
                    </span>
                    <button type="button" className="stepper__btn" aria-label={t('common.increaseQty')} onClick={() => setItemQty(lineKey, qty + 1)}>
                      +
                    </button>
                  </div>
                ) : (
                  <button type="button" className="stepper__add item-page__add" onClick={() => setItemQty(lineKey, 1)}>
                    {t('common.add')}
                    {customizable ? ` · ${base.price + syrupSurcharge(itemId, syrups) + drinkSurcharge(itemId, choices)} MDL` : ''}
                  </button>
                )}
                {otherQty > 0 ? (
                  <p className="item-page__hint item-page__other-qty">{t('syrups.inCartElse').replace('{n}', String(otherQty))}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>

        <RelatedItems itemId={itemId} />
        {children}
      </div>
    </main>
  );
}
