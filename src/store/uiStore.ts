/**
 * store/uiStore.ts
 * ------------------------------------------------------------------
 * Открыт/закрыт каждый из трёх попапов (корзина/чекаут/политика) — в
 * нативной версии это были три независимых модуля (js/cart.js,
 * js/checkout.js, js/privacy.js), каждый со своим els.overlay.hidden.
 * В React-версии состояние вынесено в общий store, т.к. кнопки открытия
 * одного попапа часто лежат внутри другого (например "Заказать" в
 * попапе корзины закрывает корзину и открывает чекаут, а ссылка
 * "политикой" в чекауте закрывает чекаут и открывает политику) — держать
 * это через prop-drilling было бы громоздко.
 * ------------------------------------------------------------------
 */

'use client';

import { create } from 'zustand';

interface UIState {
  cartOpen: boolean;
  checkoutOpen: boolean;
  privacyOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  openPrivacy: () => void;
  closePrivacy: () => void;
  // "Заказать" в корзине -> закрыть корзину, открыть чекаут (одним действием,
  // чтобы никогда не было двух открытых модалок одновременно — тот же
  // порядок, что в js/cart.js: closeCart(); CremaCheckout.open();).
  goToCheckout: () => void;
  // Ссылка "политикой" в чекауте -> закрыть чекаут, открыть политику.
  openPrivacyFromCheckout: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  cartOpen: false,
  checkoutOpen: false,
  privacyOpen: false,
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  openCheckout: () => set({ checkoutOpen: true }),
  closeCheckout: () => set({ checkoutOpen: false }),
  openPrivacy: () => set({ privacyOpen: true }),
  closePrivacy: () => set({ privacyOpen: false }),
  goToCheckout: () => set({ cartOpen: false, checkoutOpen: true }),
  openPrivacyFromCheckout: () => set({ checkoutOpen: false, privacyOpen: true })
}));
