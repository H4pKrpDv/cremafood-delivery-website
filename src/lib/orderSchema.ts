/**
 * lib/orderSchema.ts
 * ------------------------------------------------------------------
 * Zod-схема формы оформления заказа — ОДНА схема на фронт и бекенд, как
 * и просил пользователь ("форма проверяется на фронте и в апи роутере на
 * бекенде"). createOrderFormSchema(t) — фабрика (тот же приём, что
 * buildSchema() в нативном js/checkout.js), т.к. текст ошибок должен быть
 * на текущем языке пользователя — принимает переводчик t() (см.
 * lib/i18nCore.ts на сервере, i18n/I18nProvider.tsx на клиенте) и решает,
 * какие поля обязательны (street/building — только при method==='delivery'),
 * ровно как в нативной версии.
 *
 * cartPayloadSchema — структурная проверка присланной с фронта корзины
 * (форма { items, ageConfirmed }, та же, что хранится в localStorage под
 * ключом "crema_cart", см. store/cartStore.ts) — сервер НЕ доверяет ценам/
 * суммам с клиента, а пересчитывает их сам через lib/cartSummary.ts,
 * поэтому здесь достаточно проверить форму данных, а не значения.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';
import { PHONE_REGEX } from './phone';
import type { Translator } from './cartSummary';

export const FULFILLMENT_METHODS = ['delivery', 'pickup'] as const;
export const PAYMENT_METHODS = ['cash', 'card'] as const;

export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface OrderFormInput {
  name: string;
  phone: string;
  method: FulfillmentMethod | null;
  payment: PaymentMethod | null;
  street: string;
  building: string;
  entrance: string;
  floor: string;
  apartment: string;
}

// Фабрика — та же идея, что buildSchema() в js/checkout.js: сообщения об
// ошибках локализованы текущим языком, street/building обязательны только
// при доставке.
export function createOrderFormSchema(t: Translator) {
  const requiredMsg = t('checkout.validation.required');
  const phoneMsg = t('checkout.validation.phoneFormat');

  return z
    .object({
      name: z.string().trim().min(1, requiredMsg),
      phone: z.string().regex(PHONE_REGEX, phoneMsg),
      method: z.enum(FULFILLMENT_METHODS, requiredMsg),
      payment: z.enum(PAYMENT_METHODS, requiredMsg),
      street: z.string().trim().optional().default(''),
      building: z.string().trim().optional().default(''),
      entrance: z.string().trim().optional().default(''),
      floor: z.string().trim().optional().default(''),
      apartment: z.string().trim().optional().default('')
    })
    .superRefine((data, ctx) => {
      if (data.method === 'delivery') {
        if (!data.street) {
          ctx.addIssue({ code: 'custom', path: ['street'], message: requiredMsg });
        }
        if (!data.building) {
          ctx.addIssue({ code: 'custom', path: ['building'], message: requiredMsg });
        }
      }
    });
}

export type OrderFormValidated = z.infer<ReturnType<typeof createOrderFormSchema>>;

// ---- Корзина (структурная проверка формы, не значений — см. комментарий сверху) ----
const cartEntrySchema = z.object({
  qty: z.number().int().positive(),
  modifiers: z.record(z.string(), z.record(z.string(), z.number().int().min(0))).optional().default({}),
  cutlery: z.number().int().min(0).optional().default(0)
});

export const cartPayloadSchema = z.object({
  items: z.record(z.string(), cartEntrySchema).optional().default({}),
  ageConfirmed: z.boolean().optional().default(false)
});

export type CartPayload = z.infer<typeof cartPayloadSchema>;

// ---- Полный запрос к /api/orders ----
export const orderRequestSchema = z.object({
  lang: z.enum(['ru', 'ro', 'en']).optional().default('ru'),
  form: z.object({
    name: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    method: z.union([z.enum(FULFILLMENT_METHODS), z.null()]).optional(),
    payment: z.union([z.enum(PAYMENT_METHODS), z.null()]).optional(),
    street: z.string().optional().default(''),
    building: z.string().optional().default(''),
    entrance: z.string().optional().default(''),
    floor: z.string().optional().default(''),
    apartment: z.string().optional().default('')
  }),
  cart: cartPayloadSchema
});

export type OrderRequest = z.infer<typeof orderRequestSchema>;
