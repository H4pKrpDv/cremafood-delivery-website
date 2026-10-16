/**
 * components/CartModal.tsx
 * ------------------------------------------------------------------
 * Порт попапа корзины (js/cart.js + разметка .cart-overlay/.cart-modal
 * из build/template.html). Расчёт состава/суммы — useCartSummary()
 * (lib/useCartSummary.ts, обёртка над lib/cartSummary.ts computeSummary,
 * тем же кодом, что использует и форма чекаута, и сервер). Изоляция
 * попапа (блокировка прокрутки body, закрытие по Escape/клику по оверлею)
 * реализована на уровне layout — см. components/ModalScrollLock.tsx.
 * ------------------------------------------------------------------
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useCartSummary } from '@/lib/useCartSummary';
import { FREE_DELIVERY_THRESHOLD, type CartLine } from '@/lib/cartSummary';
import { SyrupIcon } from './SyrupIcon';
import { SyrupPicker } from './SyrupPicker';
import { DrinkOptionSegments } from './DrinkOptionSegments';
import type { DrinkChoices } from '@/lib/cartLines';

function formatMdl(amount: number): string {
  return `${Math.round(amount * 100) / 100} MDL`;
}

// 17.10.2026. Сиропы в строке корзины: компактные иконки выбранных вкусов,
// пометка «в цене»/доплата и «Изменить». Правка — черновик + «Применить»,
// потому что смена набора меняет КЛЮЧ строки (lib/cartLines.ts): позиция
// переезжает в строку с новым набором (или сливается с уже существующей).
// Если в строке несколько напитков, можно применить набор ко всем или к
// одному — так получается «один латте с сиропом, второй без».
function CartSyrups({
  line,
  disabled,
  editing,
  onEdit
}: {
  line: CartLine;
  disabled: boolean;
  editing: boolean;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  const perCup = line.syrupSurcharge + line.drinkSurcharge;
  const changedChoices = line.drinkChoices.filter((c) => !c.isDefault);
  const inPrice = line.syrupIncluded > 0 && line.syrups.length > 0 && perCup === 0;
  const hasAnything = line.syrups.length > 0 || line.syrupIncluded > 0 || changedChoices.length > 0;

  return (
    <div className="cart-syrup">
      <div className="cart-syrup__summary">
        {changedChoices.map((c) => (
          <span className="cart-syrup__choice" key={c.group}>
            <span>{c.name}</span>
            {c.tag ? <span className="cart-syrup__tag">{c.tag}</span> : null}
          </span>
        ))}
        {line.syrups.length ? (
          <>
            {line.syrups.map((s) => (
              <span className="cart-syrup__item" key={s.id}>
                <SyrupIcon id={s.id} size={16} />
                <span>{s.name}</span>
              </span>
            ))}
            {inPrice ? <span className="cart-syrup__price">{t('syrups.inPrice')}</span> : null}
          </>
        ) : line.syrupIncluded > 0 ? (
          <span className="cart-syrup__none">{t('syrups.noSyrup')}</span>
        ) : null}
        {perCup > 0 ? (
          <span className="cart-syrup__price">{t('syrups.perCup').replace('{amount}', String(perCup))}</span>
        ) : null}
        {!editing && !disabled ? (
          <button type="button" className="cart-syrup__edit" onClick={onEdit}>
            {hasAnything ? t('syrups.edit') : `+ ${t('drinkOptions.customize')}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Редактор — отдельным блоком на всю ширину строки (под степпером), монтируется
// только при правке, поэтому черновик всегда стартует с текущего набора.
function CartSyrupEditor({ line, onClose }: { line: CartLine; onClose: () => void }) {
  const { t } = useI18n();
  const changeLineConfig = useCartStore((s) => s.changeLineConfig);
  const [draft, setDraft] = useState<string[]>(() => line.syrups.map((s) => s.id));
  const [choices, setChoices] = useState<DrinkChoices>(() => {
    const out: DrinkChoices = {};
    for (const c of line.drinkChoices) out[c.group] = c.id;
    return out;
  });
  const [scope, setScope] = useState<'all' | 'one'>('all');

  function apply() {
    changeLineConfig(line.lineKey, { syrups: draft, choices }, scope === 'one' && line.qty > 1 ? 1 : 'all');
    onClose();
  }

  return (
    <div className="cart-syrup__editor">
      {line.drinkChoices.map((c) => (
        <DrinkOptionSegments
          key={c.group}
          group={c.group}
          value={choices[c.group] ?? c.id}
          onChange={(next) => setChoices((prev) => ({ ...prev, [c.group]: next }))}
          compact
        />
      ))}
      {line.meta.syrupSupported ? <SyrupPicker itemId={line.itemId} value={draft} onChange={setDraft} mode="panel" /> : null}
      {line.qty > 1 ? (
        <fieldset className="drink-opt drink-opt--n2 drink-opt--compact drink-opt--scope">
          <legend className="drink-opt__legend">{t('syrups.scopeLabel')}</legend>
          <div className="drink-opt__wrap">
            <div className="drink-opt__seg">
              <label className={`drink-opt__item${scope === 'all' ? ' drink-opt__item--on' : ''}`}>
                <input
                  type="radio"
                  className="drink-opt__input"
                  name={`scope-${line.lineKey}`}
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                />
                <span className="drink-opt__name">{t('syrups.scopeAll').replace('{n}', String(line.qty))}</span>
              </label>
              <label className={`drink-opt__item${scope === 'one' ? ' drink-opt__item--on' : ''}`}>
                <input
                  type="radio"
                  className="drink-opt__input"
                  name={`scope-${line.lineKey}`}
                  checked={scope === 'one'}
                  onChange={() => setScope('one')}
                />
                <span className="drink-opt__name">{t('syrups.scopeOne')}</span>
              </label>
            </div>
          </div>
        </fieldset>
      ) : null}
      <div className="cart-syrup__actions">
        <button type="button" className="btn btn--secondary cart-syrup__btn" onClick={onClose}>
          {t('syrups.cancel')}
        </button>
        <button type="button" className="btn btn--primary cart-syrup__btn" onClick={apply}>
          {t('syrups.apply')}
        </button>
      </div>
    </div>
  );
}

function CartItemRow({ line }: { line: CartLine }) {
  const { t } = useI18n();
  const setItemQty = useCartStore((s) => s.setItemQty);
  const setModifierQty = useCartStore((s) => s.setModifierQty);
  const setItemCutlery = useCartStore((s) => s.setItemCutlery);
  const meta = line.meta;
  const disabled = !meta.orderable;
  const [editingSyrups, setEditingSyrups] = useState(false);

  const groupsSeen = new Set<string>();

  return (
    <li className={`cart-item${disabled ? ' cart-item--unavailable' : ''}`}>
      <div className="cart-item__info">
        <span className="cart-item__name">{meta.name}</span>
        {!meta.available ? (
          <span className="cart-item__unavailable-note">{t('cart.itemUnavailable')}</span>
        ) : !meta.departmentOpen ? (
          <span className="cart-item__unavailable-note">
            {t('cart.itemClosedNow').replace('{time}', meta.departmentOpenLabel)}
          </span>
        ) : null}

        {meta.customizable ? <CartSyrups line={line} disabled={disabled} editing={editingSyrups} onEdit={() => setEditingSyrups(true)} /> : null}

        {line.modifiersDetail.length ? (
          <div className="cart-item__modifiers">
            {line.modifiersDetail.map((detail) => {
              const showLabel = !groupsSeen.has(detail.groupId);
              groupsSeen.add(detail.groupId);
              // Значение уже посчитано useCartSummary() из того же состояния
              // корзины, что и текущий рендер — отдельный поход в store не
              // нужен, detail.qty и есть актуальное количество.
              const currentQty = detail.qty;
              return (
                <div key={`${detail.groupId}-${detail.optionId}`}>
                  {showLabel ? (
                    <span className="cart-item__modifiers-label">{t(`modifiers.${detail.groupId}.groupLabel`)}</span>
                  ) : null}
                  <div className="cart-item__modifier-row">
                    <span>{t(`modifiers.${detail.optionId}.name`)}</span>
                    <span>(+{detail.price} MDL)</span>
                    <div className="stepper stepper--sm">
                      <button
                        type="button"
                        className="stepper__btn"
                        disabled={disabled}
                        onClick={() => setModifierQty(line.lineKey, detail.groupId, detail.optionId, Math.max(0, currentQty - 1))}
                      >
                        −
                      </button>
                      <span className="stepper__qty">{currentQty}</span>
                      <button
                        type="button"
                        className="stepper__btn"
                        disabled={disabled}
                        onClick={() => setModifierQty(line.lineKey, detail.groupId, detail.optionId, currentQty + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {meta.cutleryEligible ? (
          <div className="cart-item__modifiers">
            <div className="cart-item__cutlery-row">
              <span className="cart-item__cutlery-left">
                <span className="cart-item__cutlery-label">{t('cart.cutlery')}</span>
                {line.cutleryCost > 0 ? (
                  <span className="cart-item__cutlery-extra">(+{formatMdl(line.cutleryCost)})</span>
                ) : null}
              </span>
              <div className="stepper stepper--sm">
                <button
                  type="button"
                  className="stepper__btn"
                  disabled={disabled}
                  onClick={() => setItemCutlery(line.lineKey, Math.max(0, line.cutleryQty - 1))}
                >
                  −
                </button>
                <span className="stepper__qty">{line.cutleryQty}</span>
                <button
                  type="button"
                  className="stepper__btn"
                  disabled={disabled}
                  onClick={() => setItemCutlery(line.lineKey, line.cutleryQty + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="cart-item__side">
        <span className="cart-item__price">{formatMdl(line.lineTotal)}</span>
        <div className="stepper">
          <button type="button" className="stepper__btn" disabled={disabled} onClick={() => setItemQty(line.lineKey, line.qty - 1)}>
            −
          </button>
          <span className="stepper__qty">{line.qty}</span>
          <button type="button" className="stepper__btn" disabled={disabled} onClick={() => setItemQty(line.lineKey, line.qty + 1)}>
            +
          </button>
        </div>
      </div>
      {editingSyrups && meta.customizable ? (
        <CartSyrupEditor line={line} onClose={() => setEditingSyrups(false)} />
      ) : null}
    </li>
  );
}

export function CartModal() {
  const { t } = useI18n();
  const cartOpen = useUIStore((s) => s.cartOpen);
  const closeCart = useUIStore((s) => s.closeCart);
  const goToCheckout = useUIStore((s) => s.goToCheckout);
  const ageConfirmed = useCartStore((s) => s.ageConfirmed);
  const setAgeConfirmed = useCartStore((s) => s.setAgeConfirmed);
  const summary = useCartSummary();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (cartOpen) closeBtnRef.current?.focus();
  }, [cartOpen]);

  if (!cartOpen) return <div className="cart-overlay" hidden />;

  const deliveryPct = Math.min(100, Math.round((summary.subtotal / FREE_DELIVERY_THRESHOLD) * 100));

  return (
    <div
      className="cart-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCart();
      }}
    >
      <div className="cart-modal" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
        <button type="button" className="cart-modal__close" ref={closeBtnRef} aria-label={t('common.close')} onClick={closeCart}>
          ×
        </button>

        <h2 className="cart-modal__title" id="cartTitle">
          {t('cart.title')}
        </h2>
        <p className="cart-modal__subtitle">{t('cart.subtitle')}</p>

        <div className="cart-modal__empty" hidden={!summary.isEmpty}>
          <p>{t('cart.empty')}</p>
        </div>

        <div className="cart-modal__body" hidden={summary.isEmpty}>
          <ul className="cart-list">
            {summary.lines.map((line) => (
              <CartItemRow key={line.lineKey} line={line} />
            ))}
          </ul>
        </div>

        {!summary.isEmpty && summary.hasAgeRestrictedLine ? (
          <div className="cart-modal__age-confirm">
            <label className="cart-modal__age-confirm-label">
              <input
                type="checkbox"
                className="cart-modal__age-checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
              />
              <span>{t('checkout.ageConfirm')}</span>
            </label>
            <span className="cart-modal__age-error" hidden={ageConfirmed}>
              {t('checkout.validation.ageConfirmRequired')}
            </span>
          </div>
        ) : null}

        {!summary.isEmpty ? (
          <div className="cart-modal__delivery">
            <p className={`cart-modal__delivery-text${summary.freeDeliveryReached ? ' cart-modal__delivery-text--reached' : ''}`}>
              {summary.freeDeliveryReached
                ? t('cart.freeDeliveryReached')
                : t('cart.freeDeliveryHint').replace('{amount}', String(summary.deliveryRemaining))}
            </p>
            <div className="cart-modal__delivery-bar">
              <div
                className="cart-modal__delivery-bar-fill"
                style={{ width: `${summary.freeDeliveryReached ? 100 : deliveryPct}%` }}
              />
            </div>
          </div>
        ) : null}

        {!summary.isEmpty ? (
          <div className="cart-modal__total">
            <span>{t('cart.total')}</span>
            <span className="cart-modal__total-amount">{formatMdl(summary.total)}</span>
          </div>
        ) : null}

        <div className="cart-modal__actions">
          <button type="button" className="btn btn--secondary" onClick={closeCart}>
            {t('cart.backToMenu')}
          </button>
          <button type="button" className="btn btn--primary" hidden={summary.isEmpty} disabled={!summary.canCheckout} onClick={goToCheckout}>
            {t('cart.checkout')}
          </button>
        </div>
      </div>
    </div>
  );
}
