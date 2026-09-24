/**
 * lib/cartSummary.ts
 * ------------------------------------------------------------------
 * Порт js/cart.js -> computeSummary() (нативная версия) — единственное
 * место, которое считает состав и сумму корзины. Переиспользуется:
 *   - на клиенте — попапом корзины (components/CartModal.tsx) и формой
 *     чекаута (components/CheckoutModal.tsx), через хук useCartSummary();
 *   - на сервере — app/api/orders/route.ts пересчитывает сумму САМ (не
 *     доверяя присланным с клиента цифрам), тем же кодом, с тем же
 *     результатом, что видел пользователь на экране.
 *
 * Правила расчёта не менялись при миграции (см. Context.md/js/cart.js):
 *  - Приборы — модификатор конкретной позиции: свободных наборов ровно qty
 *    строки, всё сверху — доплата 2 MDL/набор, только для позиций с
 *    cutleryEligible.
 *  - Доплата за приборы включена в lineTotal, поэтому порог бесплатной
 *    доставки (399 MDL) её естественно учитывает.
 *  - Позиция исключена из суммы, если !available ИЛИ отдел сейчас закрыт
 *    по часам работы (orderable = available && departmentOpen).
 *  - 18+: если есть хотя бы одна ЗАКАЗЫВАЕМАЯ позиция с ageRestricted —
 *    нужен cart.ageConfirmed, иначе canCheckout=false.
 * ------------------------------------------------------------------
 */

import { itemMetaIndex, modifierGroups } from './data';
import { isOpen as isDepartmentOpen, getOpenTimeLabel } from './hours';
import type { DepartmentValue } from '@/types/menu';

export const FREE_DELIVERY_THRESHOLD = 399;

export interface CartEntry {
  qty: number;
  modifiers: Record<string, Record<string, number>>;
  cutlery: number;
}

export interface Cart {
  items: Record<string, CartEntry>;
  ageConfirmed: boolean;
}

export function emptyCart(): Cart {
  return { items: {}, ageConfirmed: false };
}

export type Translator = (key: string) => string;

export interface ResolvedItemMeta {
  name: string;
  price: number;
  available: boolean;
  modifierGroupIds: string[];
  ageRestricted: boolean;
  cutleryEligible: boolean;
  department: DepartmentValue;
  departmentOpen: boolean;
  departmentOpenLabel: string;
  orderable: boolean;
}

export function resolveItemMeta(itemId: string, t: Translator, nowMinutes: number): ResolvedItemMeta {
  const base = itemMetaIndex[itemId];
  if (!base) {
    // Товар был в корзине, но исчез из menu.json (переименовали id и т.п.) —
    // редкий случай, показываем как недоступный, не даём сломать расчёт.
    return {
      name: itemId,
      price: 0,
      available: false,
      modifierGroupIds: [],
      ageRestricted: false,
      cutleryEligible: false,
      department: null,
      departmentOpen: true,
      departmentOpenLabel: '',
      orderable: false
    };
  }
  const departmentOpen = isDepartmentOpen(base.department, nowMinutes);
  const departmentOpenLabel = !departmentOpen ? getOpenTimeLabel(base.department, nowMinutes) : '';
  const name = t(`items.${itemId}.name`) || itemId;
  return {
    name,
    price: base.price,
    available: base.available,
    modifierGroupIds: base.modifierGroupIds,
    ageRestricted: base.ageRestricted,
    cutleryEligible: base.cutleryEligible,
    department: base.department,
    departmentOpen,
    departmentOpenLabel,
    orderable: base.available && departmentOpen
  };
}

export interface ModifierDetail {
  groupId: string;
  optionId: string;
  price: number;
  qty: number;
}

export interface CartLine {
  itemId: string;
  qty: number;
  meta: ResolvedItemMeta;
  modifiersDetail: ModifierDetail[];
  cutleryQty: number;
  extraCutlery: number;
  cutleryCost: number;
  lineTotal: number;
}

export interface CartSummary {
  lines: CartLine[];
  isEmpty: boolean;
  hasOrderableLine: boolean;
  subtotal: number;
  cutleryCost: number;
  total: number;
  hasAgeRestrictedLine: boolean;
  ageConfirmed: boolean;
  canCheckout: boolean;
  freeDeliveryReached: boolean;
  deliveryRemaining: number;
}

export function computeSummary(cart: Cart, t: Translator, nowMinutes: number): CartSummary {
  const lines: CartLine[] = [];
  let subtotal = 0;
  let totalCutleryCost = 0;
  let hasAgeRestrictedLine = false;

  for (const itemId of Object.keys(cart.items)) {
    const entry = cart.items[itemId];
    const qty = entry && typeof entry.qty === 'number' ? entry.qty : 0;
    if (qty <= 0) continue;

    const meta = resolveItemMeta(itemId, t, nowMinutes);
    if (meta.orderable && meta.ageRestricted) hasAgeRestrictedLine = true;

    const modifiersDetail: ModifierDetail[] = [];
    let modifiersCost = 0;
    for (const groupId of meta.modifierGroupIds) {
      const options = modifierGroups[groupId] || [];
      for (const option of options) {
        const selectedQty = entry.modifiers?.[groupId]?.[option.id] || 0;
        modifiersDetail.push({ groupId, optionId: option.id, price: option.price, qty: selectedQty });
        if (selectedQty > 0) modifiersCost += option.price * selectedQty;
      }
    }

    const cutleryQty = meta.cutleryEligible && typeof entry.cutlery === 'number' && entry.cutlery > 0 ? entry.cutlery : 0;
    const freeCutlery = meta.cutleryEligible ? qty : 0;
    const extraCutlery = Math.max(0, cutleryQty - freeCutlery);
    const cutleryCost = extraCutlery * 2;

    const lineTotal = meta.orderable ? meta.price * qty + modifiersCost + cutleryCost : 0;
    if (meta.orderable) {
      subtotal += lineTotal;
      totalCutleryCost += cutleryCost;
    }

    lines.push({ itemId, qty, meta, modifiersDetail, cutleryQty, extraCutlery, cutleryCost, lineTotal });
  }

  const hasOrderableLine = lines.some((line) => line.meta.orderable);
  const ageConfirmed = Boolean(cart.ageConfirmed);
  const ageOk = !hasAgeRestrictedLine || ageConfirmed;

  return {
    lines,
    isEmpty: lines.length === 0,
    hasOrderableLine,
    subtotal,
    cutleryCost: totalCutleryCost,
    total: subtotal,
    hasAgeRestrictedLine,
    ageConfirmed,
    canCheckout: hasOrderableLine && ageOk,
    freeDeliveryReached: subtotal >= FREE_DELIVERY_THRESHOLD,
    deliveryRemaining: Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)
  };
}
