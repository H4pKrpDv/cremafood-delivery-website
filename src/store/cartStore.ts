/**
 * store/cartStore.ts
 * ------------------------------------------------------------------
 * Zustand-хранилище корзины с persist в localStorage — порт модели данных
 * из js/main.js (нативная версия): { items: { id: { qty, modifiers,
 * cutlery } }, ageConfirmed }, тот же ключ localStorage "crema_cart", та
 * же нормализация мусорных значений при чтении.
 *
 * skipHydration:true + ручная гидратация через useCartHydrated() —
 * стандартный приём для Next.js App Router (SSR не имеет доступа к
 * localStorage; без этого React выдал бы hydration mismatch между
 * серверным HTML (всегда пустая корзина) и тем, что реально лежит в
 * браузере). Компоненты, которым состав корзины важен до первой отрисовки
 * (счётчик в шапке, степперы), сами решают, показывать ли скелетное
 * состояние, пока !hydrated — на практике корзина пуста на сервере и в
 * первом клиентском рендере, поэтому расхождение только на один "тик"
 * сразу после монтирования, визуально незаметно.
 * ------------------------------------------------------------------
 */

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { makeLineKey, parseLineKey, type DrinkChoices } from '@/lib/cartLines';

export interface CartEntry {
  qty: number;
  modifiers: Record<string, Record<string, number>>;
  cutlery: number;
}

export interface CartStoreState {
  items: Record<string, CartEntry>;
  ageConfirmed: boolean;
}

interface CartStoreActions {
  getItemQty: (itemId: string) => number;
  /** Сумма qty по ВСЕМ строкам позиции (с любыми наборами сиропов). */
  getItemTotalQty: (itemId: string) => number;
  /**
   * Меняет состав строки корзины (сиропы, молоко, кофе). count — сколько
   * напитков перенести в строку с новым составом ('all' — вся строка). Если
   * строка с таким составом уже есть, количества складываются.
   */
  changeLineConfig: (
    lineKey: string,
    config: { syrups: string[]; choices?: DrinkChoices },
    count: number | 'all'
  ) => void;
  setItemQty: (itemId: string, qty: number) => void;
  getItemCutlery: (itemId: string) => number;
  setItemCutlery: (itemId: string, qty: number) => void;
  getModifierQty: (itemId: string, groupId: string, optionId: string) => number;
  setModifierQty: (itemId: string, groupId: string, optionId: string, qty: number) => void;
  setAgeConfirmed: (value: boolean) => void;
  clearCart: () => void;
  getCount: () => number;
}

type CartStore = CartStoreState & CartStoreActions;

function normalizeEntry(entry: Partial<CartEntry> | undefined): CartEntry {
  return {
    qty: typeof entry?.qty === 'number' && entry.qty > 0 ? entry.qty : 0,
    modifiers: entry?.modifiers && typeof entry.modifiers === 'object' ? entry.modifiers : {},
    cutlery: typeof entry?.cutlery === 'number' && entry.cutlery >= 0 ? entry.cutlery : 0
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: {},
      ageConfirmed: false,

      // itemId здесь — КЛЮЧ СТРОКИ (для позиции без сиропов он равен id позиции).
      getItemQty: (itemId) => get().items[itemId]?.qty ?? 0,

      getItemTotalQty: (itemId) =>
        Object.entries(get().items).reduce(
          (sum, [key, entry]) => (parseLineKey(key).itemId === itemId ? sum + (entry.qty || 0) : sum),
          0
        ),

      changeLineConfig: (lineKey, config, count) =>
        set((state) => {
          const source = state.items[lineKey];
          if (!source) return state;
          const { itemId } = parseLineKey(lineKey);
          const targetKey = makeLineKey(itemId, config.syrups, config.choices);
          if (targetKey === lineKey) return state;
          const move = count === 'all' ? source.qty : Math.max(0, Math.min(count, source.qty));
          if (move <= 0) return state;
          const items = { ...state.items };
          const moveAll = move >= source.qty;
          if (moveAll) delete items[lineKey];
          else items[lineKey] = { ...source, qty: source.qty - move };
          const existing = items[targetKey];
          items[targetKey] = existing
            ? { ...existing, qty: existing.qty + move }
            : { qty: move, modifiers: moveAll ? source.modifiers : {}, cutlery: moveAll ? source.cutlery : 0 };
          return { items };
        }),

      setItemQty: (itemId, qty) =>
        set((state) => {
          const items = { ...state.items };
          if (qty <= 0) {
            delete items[itemId];
          } else {
            const existing = normalizeEntry(items[itemId]);
            items[itemId] = { ...existing, qty };
          }
          return { items };
        }),

      getItemCutlery: (itemId) => get().items[itemId]?.cutlery ?? 0,

      setItemCutlery: (itemId, qty) =>
        set((state) => {
          const existing = state.items[itemId];
          if (!existing) return state; // товара уже нет в корзине — нечего менять
          const items = { ...state.items };
          items[itemId] = { ...existing, cutlery: Math.max(0, qty) };
          return { items };
        }),

      getModifierQty: (itemId, groupId, optionId) => get().items[itemId]?.modifiers?.[groupId]?.[optionId] ?? 0,

      setModifierQty: (itemId, groupId, optionId, qty) =>
        set((state) => {
          const existing = state.items[itemId];
          if (!existing) return state; // защита от гонки кликов, как и в js/cart.js
          const modifiers = { ...existing.modifiers };
          const group = { ...(modifiers[groupId] || {}) };
          if (qty > 0) {
            group[optionId] = qty;
          } else {
            delete group[optionId];
          }
          modifiers[groupId] = group;
          const items = { ...state.items, [itemId]: { ...existing, modifiers } };
          return { items };
        }),

      setAgeConfirmed: (value) => set({ ageConfirmed: Boolean(value) }),

      clearCart: () => set({ items: {}, ageConfirmed: false }),

      getCount: () =>
        Object.values(get().items).reduce((sum, entry) => sum + (typeof entry.qty === 'number' ? entry.qty : 0), 0)
    }),
    {
      name: 'crema_cart',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items, ageConfirmed: state.ageConfirmed })
    }
  )
);

// Хук гидратации — вызывается один раз, на уровне провайдера (app/layout.tsx),
// чтобы состояние из localStorage подхватилось сразу после монтирования на
// клиенте (см. комментарий в шапке файла).
//
// ВАЖНО: обращение к useCartStore.persist вынесено целиком внутрь useEffect.
// При статической сборке (next build / prerender) этот компонент дерева
// клиентских компонентов всё равно выполняется на сервере (Node), а Zustand
// в серверном/RSC-окружении может отдавать урезанную сборку стора без API
// persist — обращение к нему прямо в теле рендера (в т.ч. в инициализаторе
// useState) там падает с "Cannot read properties of undefined". useEffect
// же гарантированно не выполняется во время prerender, а только в браузере
// после монтирования — там persist всегда доступен.
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = useCartStore.persist;
    if (!persistApi) {
      // Защитный фолбэк на случай отсутствия API persist в рантайме —
      // не блокируем интерфейс в состоянии "не гидратировано" навсегда.
      setHydrated(true);
      return;
    }

    if (persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }

    const unsubscribe = persistApi.onFinishHydration(() => setHydrated(true));
    persistApi.rehydrate();
    return unsubscribe;
  }, []);

  return hydrated;
}
