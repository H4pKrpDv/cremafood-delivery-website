/**
 * lib/orderPayload.ts
 * ------------------------------------------------------------------
 * Порт buildOrderPayload() из js/checkout.js (нативная версия) — но
 * теперь выполняется НА СЕРВЕРЕ (app/api/orders/route.ts), из суммы,
 * пересчитанной сервером же через lib/cartSummary.ts, а не из значений,
 * присланных клиентом. Тот же фикс бесплатной доставки, что был в
 * renderSummary()/buildOrderPayload() нативной версии: при
 * freeDeliveryReached доставка не добавляется к total вовсе.
 * ------------------------------------------------------------------
 */

import type { CartSummary } from './cartSummary';
import type { OrderFormValidated } from './orderSchema';

export const DELIVERY_FEE = 60;

export interface OrderPayloadItemModifier {
  groupId: string;
  optionId: string;
  qty: number;
  price: number;
}

export interface OrderPayloadItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  modifiers: OrderPayloadItemModifier[];
  cutleryQty: number;
  cutleryCost: number;
  lineTotal: number;
}

export interface OrderPayload {
  orderNumber: string;
  createdAt: string;
  contact: { name: string; phone: string };
  fulfillment: {
    method: 'delivery' | 'pickup';
    address: {
      city: string;
      street: string;
      building: string;
      entrance: string | null;
      floor: string | null;
      apartment: string | null;
    } | null;
  };
  payment: { method: 'cash' | 'card' };
  ageConfirmed: boolean;
  items: OrderPayloadItem[];
  amounts: { subtotal: number; deliveryFee: number; total: number };
}

// Тот же формат номера, что генерировала заглушка нативной версии
// (generateOrderNumber в js/checkout.js) — реального порядкового счётчика
// пока нет (нужна была бы БД), поэтому дата + случайные 4 цифры.
export function generateOrderNumber(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `CR-${y}${m}${d}-${rand}`;
}

export function buildOrderPayload(
  form: OrderFormValidated,
  summary: CartSummary,
  ageConfirmed: boolean,
  orderNumber: string = generateOrderNumber()
): OrderPayload {
  const deliveryFee = form.method === 'delivery' && !summary.freeDeliveryReached ? DELIVERY_FEE : 0;

  const items: OrderPayloadItem[] = summary.lines
    .filter((line) => line.meta.orderable)
    .map((line) => ({
      id: line.itemId,
      name: line.meta.name,
      qty: line.qty,
      unitPrice: line.meta.price,
      modifiers: line.modifiersDetail
        .filter((d) => d.qty > 0)
        .map((d) => ({ groupId: d.groupId, optionId: d.optionId, qty: d.qty, price: d.price })),
      cutleryQty: line.cutleryQty,
      cutleryCost: line.cutleryCost,
      lineTotal: line.lineTotal
    }));

  return {
    orderNumber,
    createdAt: new Date().toISOString(),
    contact: { name: form.name, phone: form.phone },
    fulfillment: {
      method: form.method as 'delivery' | 'pickup',
      address:
        form.method === 'delivery'
          ? {
              city: 'Balti',
              street: form.street,
              building: form.building,
              entrance: form.entrance || null,
              floor: form.floor || null,
              apartment: form.apartment || null
            }
          : null
    },
    payment: { method: form.payment as 'cash' | 'card' },
    ageConfirmed,
    items,
    amounts: {
      subtotal: summary.total,
      deliveryFee,
      total: summary.total + deliveryFee
    }
  };
}
