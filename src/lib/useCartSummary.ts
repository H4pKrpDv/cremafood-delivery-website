/**
 * lib/useCartSummary.ts
 * ------------------------------------------------------------------
 * Реактивная обёртка над computeSummary() (lib/cartSummary.ts) для
 * клиентских компонентов — попапа корзины и формы чекаута. Пересчитывается
 * при изменении корзины (store/cartStore.ts), смене языка (i18n/
 * I18nProvider.tsx — влияет на локализованные названия товаров в строках)
 * и при каждом тике часов работы (lib/useNowMinutes.ts).
 * ------------------------------------------------------------------
 */

'use client';

import { useMemo } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useI18n } from '@/i18n/I18nProvider';
import { useNowMinutes } from './useNowMinutes';
import { computeSummary, type CartSummary } from './cartSummary';

export function useCartSummary(): CartSummary {
  const items = useCartStore((state) => state.items);
  const ageConfirmed = useCartStore((state) => state.ageConfirmed);
  const { t } = useI18n();
  const nowMinutes = useNowMinutes();

  return useMemo(
    () => computeSummary({ items, ageConfirmed }, t, nowMinutes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, ageConfirmed, t, nowMinutes]
  );
}
