/**
 * app/api/orders/route.ts
 * ------------------------------------------------------------------
 * Этап 3 плана — реальный бекенд вместо заглушки js/checkout.js.
 * POST /api/orders принимает { lang, form, cart } (см. lib/orderSchema.ts),
 * ВСЕГДА проверяет данные на сервере заново (форма пользователя УЖЕ
 * проверена на фронте той же Zod-схемой — components/CheckoutModal.tsx —
 * но фронтенд не доверенный источник, поэтому бекенд не пропускает заказ
 * дальше, пока сам не убедится, что всё верно), и только после успешной
 * серверной валидации отправляет заказ в Telegram-бота.
 *
 * Шаги:
 *  1. Структурная проверка тела запроса (orderRequestSchema).
 *  2. Локализованная валидация полей формы (createOrderFormSchema(t)) —
 *     те же правила, что на фронте (обязательные поля, формат телефона,
 *     street/building только при доставке).
 *  3. Пересчёт корзины СЕРВЕРОМ (computeSummary) — часы работы отделов
 *     проверяются по серверным часам (Europe/Chisinau), а не по тому, что
 *     прислал клиент; цены берутся из lib/data.ts (menu.json), а не из
 *     присланного payload — клиент не может подделать сумму заказа.
 *  4. Проверка summary.canCheckout (в корзине есть хотя бы одна
 *     заказываемая позиция И 18+ подтверждён, если нужно) — если нет,
 *     400 без похода в Telegram.
 *  5. Сборка payload (lib/orderPayload.ts) и отправка в Telegram
 *     (lib/telegram.ts) — только если шаги 1-4 прошли успешно.
 * ------------------------------------------------------------------
 */

import { NextResponse } from 'next/server';

import { orderRequestSchema, createOrderFormSchema } from '@/lib/orderSchema';
import { computeSummary } from '@/lib/cartSummary';
import { createTranslator, isLang, DEFAULT_LANG } from '@/lib/i18nCore';
import { getNowMinutes } from '@/lib/hours';
import { buildOrderPayload } from '@/lib/orderPayload';
import { sendTelegramMessage, formatOrderMessage } from '@/lib/telegram';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  // ---- Шаг 1: структурная проверка тела запроса ----
  const structural = orderRequestSchema.safeParse(body);
  if (!structural.success) {
    return NextResponse.json(
      { success: false, error: 'invalid_request', issues: structural.error.issues },
      { status: 400 }
    );
  }

  const lang = isLang(structural.data.lang) ? structural.data.lang : DEFAULT_LANG;
  const t = createTranslator(lang);

  // ---- Шаг 2: локализованная валидация формы (та же схема, что на фронте) ----
  const formSchema = createOrderFormSchema(t);
  const formResult = formSchema.safeParse(structural.data.form);
  if (!formResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of formResult.error.issues) {
      const field = String(issue.path[0] ?? '');
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return NextResponse.json({ success: false, error: 'validation_failed', fieldErrors }, { status: 400 });
  }

  // ---- Шаг 3: пересчёт корзины сервером (не доверяем цифрам с клиента) ----
  const nowMinutes = getNowMinutes();
  const cart = {
    items: structural.data.cart.items,
    ageConfirmed: structural.data.cart.ageConfirmed
  };
  const summary = computeSummary(cart, t, nowMinutes);

  // ---- Шаг 4: тот же гейт, что и на фронте (checkHoursGate/summary.canCheckout) ----
  if (!summary.canCheckout) {
    return NextResponse.json(
      {
        success: false,
        error: summary.isEmpty || !summary.hasOrderableLine ? 'cart_not_orderable' : 'age_confirmation_required'
      },
      { status: 400 }
    );
  }

  // ---- Шаг 5: сборка payload + отправка в Telegram ----
  const payload = buildOrderPayload(formResult.data, summary, cart.ageConfirmed);
  const message = formatOrderMessage(payload);
  const telegramResult = await sendTelegramMessage(message);

  if (!telegramResult.ok) {
    // Заказ прошёл валидацию, но реально не ушёл (бот не настроен/сеть/
    // Telegram API отказал) — сообщаем об ошибке, ничего не считаем
    // успешным (тот же принцип, что и в нативной заглушке: ветка ошибки
    // не очищает корзину и не показывает номер заказа как подтверждённый).
    return NextResponse.json(
      { success: false, error: 'telegram_send_failed', detail: telegramResult.description },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, orderNumber: payload.orderNumber });
}

// На всякий случай — явный 405 для остальных методов вместо next.js
// дефолтной страницы.
export async function GET() {
  return NextResponse.json({ success: false, error: 'method_not_allowed' }, { status: 405 });
}
