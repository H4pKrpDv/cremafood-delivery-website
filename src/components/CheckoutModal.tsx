/**
 * components/CheckoutModal.tsx
 * ------------------------------------------------------------------
 * Порт формы оформления заказа (js/checkout.js + разметка .checkout-overlay/
 * .checkout-modal из build/template.html):
 *  - маска телефона (lib/phone.ts, то же поведение — курсор всегда
 *    переезжает в конец после каждого ввода, как и в нативной версии);
 *  - переключатели способа получения/оплаты;
 *  - Zod-валидация (lib/orderSchema.ts createOrderFormSchema(t)) — ТА ЖЕ
 *    схема-фабрика, что использует сервер (app/api/orders/route.ts),
 *    провал → .input-error на инпут/переключатель + текст в <span>,
 *    убирается при начале ввода (правило проекта);
 *  - часы работы доставки — checkHoursGate() пересчитывается реактивно
 *    через useCartSummary() (тикает каждые 30 сек, см. lib/useNowMinutes.ts),
 *    без ручной подписки на события, как было в нативной версии;
 *  - реальная отправка на /api/orders (Zod-заглушки больше нет — Этап 3):
 *    сервер сам валидирует и пересчитывает сумму, здесь только UI-состояния
 *    "форма / загрузка / успех / ошибка".
 * ------------------------------------------------------------------
 */

'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useCartSummary } from '@/lib/useCartSummary';
import { extractPhoneDigits, formatPhoneDigits, PHONE_EMPTY_VALUE } from '@/lib/phone';
import { createOrderFormSchema, type OrderFormInput } from '@/lib/orderSchema';
import { DELIVERY_FEE } from '@/lib/orderPayload';
import { trackEvent } from '@/lib/analytics';

function formatMdl(amount: number): string {
  return `${Math.round(amount * 100) / 100} MDL`;
}

type FieldName = 'name' | 'phone' | 'method' | 'street' | 'building' | 'payment';
type View = 'form' | 'loading' | 'success' | 'error';

const emptyForm: OrderFormInput = {
  name: '',
  phone: PHONE_EMPTY_VALUE,
  method: null,
  payment: null,
  street: '',
  building: '',
  entrance: '',
  floor: '',
  apartment: ''
};

export function CheckoutModal() {
  const { t, lang } = useI18n();
  const checkoutOpen = useUIStore((s) => s.checkoutOpen);
  const closeCheckout = useUIStore((s) => s.closeCheckout);
  const openPrivacyFromCheckout = useUIStore((s) => s.openPrivacyFromCheckout);
  const items = useCartStore((s) => s.items);
  const ageConfirmed = useCartStore((s) => s.ageConfirmed);
  const clearCart = useCartStore((s) => s.clearCart);
  const summary = useCartSummary();

  const [form, setForm] = useState<OrderFormInput>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [view, setView] = useState<View>('form');
  const [orderNumber, setOrderNumber] = useState('');
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Сброс формы при каждом открытии — тот же resetForm(), что в open()
  // нативной версии. useLayoutEffect (не useEffect) — чтобы сброс успел
  // применится ДО того, как браузер отрисует кадр, иначе при повторном
  // открытии на долю секунды мелькал бы экран "успех"/"ошибка", оставшийся
  // от предыдущего оформления.
  useLayoutEffect(() => {
    if (checkoutOpen) {
      setForm(emptyForm);
      setErrors({});
      setView('form');
    }
  }, [checkoutOpen]);

  useEffect(() => {
    if (checkoutOpen) nameRef.current?.focus();
  }, [checkoutOpen]);

  // Курсор маски телефона всегда уезжает в конец — то же простое поведение,
  // что и в нативной версии (setSelectionRange(formatted.length, formatted.length)
  // на каждый input).
  useEffect(() => {
    const el = phoneRef.current;
    if (el && document.activeElement === el) {
      el.setSelectionRange(form.phone.length, form.phone.length);
    }
  }, [form.phone]);

  if (!checkoutOpen) return <div className="checkout-overlay" hidden />;

  const isDelivery = form.method === 'delivery';
  const freeDelivery = isDelivery && summary.freeDeliveryReached;
  const deliveryFee = isDelivery && !freeDelivery ? DELIVERY_FEE : 0;

  const hasHoursBlockedLine = summary.lines.some((line) => line.meta.available && !line.meta.departmentOpen);
  const shouldBlockHours = !summary.canCheckout && hasHoursBlockedLine;
  const earliestReopenLabel = (() => {
    const labels = summary.lines
      .filter((line) => line.meta.available && !line.meta.departmentOpen)
      .map((line) => line.meta.departmentOpenLabel)
      .filter(Boolean);
    if (!labels.length) return '';
    return [...labels].sort().slice(-1)[0];
  })();

  function clearFieldError(field: FieldName) {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function updateField<K extends keyof OrderFormInput>(key: K, value: OrderFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = extractPhoneDigits(e.target.value);
    updateField('phone', formatPhoneDigits(digits));
    clearFieldError('phone');
  }

  function setMethod(method: OrderFormInput['method']) {
    updateField('method', method);
    clearFieldError('method');
    if (method !== 'delivery') {
      clearFieldError('street');
      clearFieldError('building');
    }
  }

  function setPayment(payment: OrderFormInput['payment']) {
    updateField('payment', payment);
    clearFieldError('payment');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (shouldBlockHours) return;

    const schema = createOrderFormSchema(t);
    const result = schema.safeParse(form);
    if (!result.success) {
      const nextErrors: Partial<Record<FieldName, string>> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]) as FieldName;
        if (!nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      const firstField = String(result.error.issues[0]?.path[0]) as FieldName;
      if (firstField === 'name') nameRef.current?.focus();
      if (firstField === 'phone') phoneRef.current?.focus();
      return;
    }

    setErrors({});
    setView('loading');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          form,
          cart: { items, ageConfirmed }
        })
      });
      const data = await res.json();

      if (data.success) {
        setOrderNumber(data.orderNumber);
        setView('success');
        clearCart();
        return;
      }

      if (data.error === 'validation_failed' && data.fieldErrors) {
        setErrors(data.fieldErrors);
        setView('form');
        return;
      }

      // Заказ дошёл до сервера, но не прошёл (гейт по часам/18+ успел
      // сработать между открытием формы и сабмитом, бот Telegram не
      // настроен/недоступен и т.п.) — заготовка под аналитику (Этап 1
      // п.12 нативной версии, lib/analytics.ts), первый реальный вызов,
      // как и в нативной версии (там срабатывал на тестовом номере-
      // заглушке; здесь бекенд настоящий, поэтому reason — код ошибки,
      // который реально вернул /api/orders).
      trackEvent('order_error', { reason: data.error || 'unknown' });
      setView('error');
    } catch {
      // Сеть недоступна / fetch не смог достучаться до /api/orders вовсе
      // (в отличие от ветки выше, где сервер ответил, но с ошибкой).
      trackEvent('order_error', { reason: 'network' });
      setView('error');
    }
  }

  function closeAndMaybeScroll() {
    const wasSuccess = view === 'success';
    closeCheckout();
    if (wasSuccess) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div
      className="checkout-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAndMaybeScroll();
      }}
    >
      <div className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle">
        <button type="button" className="checkout-modal__close" aria-label={t('common.close')} onClick={closeAndMaybeScroll}>
          ×
        </button>

        <h2 className="checkout-modal__title" id="checkoutTitle">
          {t('checkout.formTitle')}
        </h2>

        <div className="checkout-modal__scroll">
          {view === 'form' ? (
            <form onSubmit={handleSubmit} noValidate>
              <div className="checkout-field">
                <label className="checkout-field__label" htmlFor="checkoutName">
                  <span>{t('checkout.name')}</span> <span className="checkout-field__required">*</span>
                </label>
                <input
                  type="text"
                  className={`checkout-field__input${errors.name ? ' input-error' : ''}`}
                  id="checkoutName"
                  ref={nameRef}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => {
                    updateField('name', e.target.value);
                    clearFieldError('name');
                  }}
                />
                <span className="checkout-field__error" hidden={!errors.name}>
                  {errors.name}
                </span>
              </div>

              <div className="checkout-field">
                <label className="checkout-field__label" htmlFor="checkoutPhone">
                  <span>{t('checkout.phone')}</span> <span className="checkout-field__required">*</span>
                </label>
                <input
                  type="tel"
                  className={`checkout-field__input${errors.phone ? ' input-error' : ''}`}
                  id="checkoutPhone"
                  ref={phoneRef}
                  inputMode="numeric"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handlePhoneChange}
                />
                <span className="checkout-field__error" hidden={!errors.phone}>
                  {errors.phone}
                </span>
              </div>

              <div className="checkout-field">
                <span className="checkout-field__label" id="checkoutMethodLabel">
                  {t('checkout.method')}
                </span>
                <div
                  className={`checkout-toggle${errors.method ? ' checkout-toggle--error' : ''}`}
                  role="radiogroup"
                  aria-labelledby="checkoutMethodLabel"
                >
                  <button
                    type="button"
                    className={`checkout-toggle__btn${form.method === 'delivery' ? ' checkout-toggle__btn--active' : ''}`}
                    onClick={() => setMethod('delivery')}
                  >
                    <span>{t('checkout.delivery')}</span>
                    <span className="checkout-toggle__fee">
                      {summary.freeDeliveryReached ? `(${t('checkout.free')})` : `(+${formatMdl(DELIVERY_FEE)})`}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`checkout-toggle__btn${form.method === 'pickup' ? ' checkout-toggle__btn--active' : ''}`}
                    onClick={() => setMethod('pickup')}
                  >
                    {t('checkout.pickup')}
                  </button>
                </div>
                <span className="checkout-field__error" hidden={!errors.method}>
                  {errors.method}
                </span>
              </div>

              <div className="checkout-address-fields" hidden={form.method !== 'delivery'}>
                <div className="checkout-field">
                  <label className="checkout-field__label" htmlFor="checkoutCity">
                    {t('checkout.city')}
                  </label>
                  <input type="text" className="checkout-field__input" id="checkoutCity" value="Balti" disabled />
                </div>
                <div className="checkout-field">
                  <label className="checkout-field__label" htmlFor="checkoutStreet">
                    <span>{t('checkout.street')}</span> <span className="checkout-field__required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`checkout-field__input${errors.street ? ' input-error' : ''}`}
                    id="checkoutStreet"
                    autoComplete="street-address"
                    value={form.street}
                    onChange={(e) => {
                      updateField('street', e.target.value);
                      clearFieldError('street');
                    }}
                  />
                  <span className="checkout-field__error" hidden={!errors.street}>
                    {errors.street}
                  </span>
                </div>
                <div className="checkout-field">
                  <label className="checkout-field__label" htmlFor="checkoutBuilding">
                    <span>{t('checkout.building')}</span> <span className="checkout-field__required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`checkout-field__input${errors.building ? ' input-error' : ''}`}
                    id="checkoutBuilding"
                    value={form.building}
                    onChange={(e) => {
                      updateField('building', e.target.value);
                      clearFieldError('building');
                    }}
                  />
                  <span className="checkout-field__error" hidden={!errors.building}>
                    {errors.building}
                  </span>
                </div>
                <div className="checkout-address-fields__row">
                  <div className="checkout-field">
                    <label className="checkout-field__label" htmlFor="checkoutEntrance">
                      {t('checkout.entrance')}
                    </label>
                    <input
                      type="text"
                      className="checkout-field__input"
                      id="checkoutEntrance"
                      value={form.entrance}
                      onChange={(e) => updateField('entrance', e.target.value)}
                    />
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-field__label" htmlFor="checkoutFloor">
                      {t('checkout.floor')}
                    </label>
                    <input
                      type="text"
                      className="checkout-field__input"
                      id="checkoutFloor"
                      value={form.floor}
                      onChange={(e) => updateField('floor', e.target.value)}
                    />
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-field__label" htmlFor="checkoutApartment">
                      {t('checkout.apartment')}
                    </label>
                    <input
                      type="text"
                      className="checkout-field__input"
                      id="checkoutApartment"
                      value={form.apartment}
                      onChange={(e) => updateField('apartment', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="checkout-field">
                <span className="checkout-field__label" id="checkoutPaymentLabel">
                  {t('checkout.paymentTitle')}
                </span>
                <div
                  className={`checkout-toggle${errors.payment ? ' checkout-toggle--error' : ''}`}
                  role="radiogroup"
                  aria-labelledby="checkoutPaymentLabel"
                >
                  <button
                    type="button"
                    className={`checkout-toggle__btn${form.payment === 'cash' ? ' checkout-toggle__btn--active' : ''}`}
                    onClick={() => setPayment('cash')}
                  >
                    {t('checkout.cash')}
                  </button>
                  <button
                    type="button"
                    className={`checkout-toggle__btn${form.payment === 'card' ? ' checkout-toggle__btn--active' : ''}`}
                    onClick={() => setPayment('card')}
                  >
                    {t('checkout.card')}
                  </button>
                </div>
                <span className="checkout-field__error" hidden={!errors.payment}>
                  {errors.payment}
                </span>
              </div>

              <div className="checkout-summary">
                <div className="checkout-summary__row">
                  <span>{t('checkout.subtotal')}</span>
                  <span className="checkout-summary__amount">{formatMdl(summary.total)}</span>
                </div>
                <div className="checkout-summary__row" hidden={!isDelivery}>
                  <span>{t('checkout.delivery')}</span>
                  <span className={`checkout-summary__amount${freeDelivery ? ' checkout-summary__amount--free' : ''}`}>
                    {freeDelivery ? t('checkout.free') : formatMdl(deliveryFee)}
                  </span>
                </div>
                <div className="checkout-summary__row checkout-summary__row--total">
                  <span>{t('cart.total')}</span>
                  <span className="checkout-summary__amount">{formatMdl(summary.total + deliveryFee)}</span>
                </div>
              </div>

              <div className="checkout-hours-warning" hidden={!shouldBlockHours}>
                {shouldBlockHours ? t('checkout.workingHoursClosed').replace('{time}', earliestReopenLabel) : null}
              </div>

              <p className="checkout-consent">
                <span>{t('checkout.consentBefore')} </span>
                <a
                  href="#"
                  className="checkout-consent__link"
                  onClick={(e) => {
                    e.preventDefault();
                    openPrivacyFromCheckout();
                  }}
                >
                  {t('checkout.consentPolicyLink')}
                </a>
                <span> {t('checkout.consentAfter')}</span>
              </p>

              <div className="checkout-modal__submit-wrap">
                <button type="submit" className="btn btn--primary" disabled={shouldBlockHours}>
                  {t('checkout.submit')}
                </button>
              </div>
            </form>
          ) : null}

          {view === 'loading' ? (
            <div className="checkout-state checkout-state--loading">
              <div className="spinner" aria-hidden="true" />
              <p>{t('checkout.loading')}</p>
            </div>
          ) : null}

          {view === 'success' ? (
            <div className="checkout-state checkout-state--success">
              <div className="checkout-state__icon" aria-hidden="true">
                ✓
              </div>
              <p>{t('checkout.success')}</p>
              <p className="checkout-state__order-number">{orderNumber}</p>
            </div>
          ) : null}

          {view === 'error' ? (
            <div className="checkout-state checkout-state--error">
              <div className="checkout-state__icon" aria-hidden="true">
                !
              </div>
              <p>{t('checkout.error')}</p>
              <button type="button" className="btn btn--secondary" onClick={() => setView('form')}>
                {t('checkout.submit')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
