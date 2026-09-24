/**
 * components/ModalManager.tsx
 * ------------------------------------------------------------------
 * Общее поведение для всех трёх попапов (корзина/чекаут/политика) — по
 * правилу проекта: пока любой попап открыт, блокируем прокрутку основного
 * сайта (body.modal-open), Escape закрывает верхний открытый попап. В
 * нативной версии это было продублировано в js/cart.js/js/checkout.js/
 * js/privacy.js по отдельности (каждый вешал/снимал класс сам) — здесь
 * вынесено в одно место, т.к. все три состояния уже лежат в одном
 * store/uiStore.ts.
 *
 * Порядок закрытия по Escape при нескольких формально открытых попапах
 * (на практике такого не бывает — открытие одного всегда закрывает
 * предыдущий, см. goToCheckout/openPrivacyFromCheckout) — чекаут -> корзина
 * -> политика, просто на случай прямого вызова из консоли/будущих правок.
 * ------------------------------------------------------------------
 */

'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

export function ModalManager() {
  const cartOpen = useUIStore((s) => s.cartOpen);
  const checkoutOpen = useUIStore((s) => s.checkoutOpen);
  const privacyOpen = useUIStore((s) => s.privacyOpen);
  const closeCart = useUIStore((s) => s.closeCart);
  const closeCheckout = useUIStore((s) => s.closeCheckout);
  const closePrivacy = useUIStore((s) => s.closePrivacy);

  const anyOpen = cartOpen || checkoutOpen || privacyOpen;

  useEffect(() => {
    document.body.classList.toggle('modal-open', anyOpen);
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [anyOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (checkoutOpen) {
        closeCheckout();
      } else if (privacyOpen) {
        closePrivacy();
      } else if (cartOpen) {
        closeCart();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [cartOpen, checkoutOpen, privacyOpen, closeCart, closeCheckout, closePrivacy]);

  return null;
}
