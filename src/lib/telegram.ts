/**
 * lib/telegram.ts
 * ------------------------------------------------------------------
 * Отправка оформленного заказа в Telegram-бота (Этап 3 плана — бекенд
 * для /api/orders). Токен бота и chat_id — переменные окружения
 * (.env.local, НЕ коммитятся в git):
 *   TELEGRAM_BOT_TOKEN — токен бота из @BotFather
 *   TELEGRAM_CHAT_ID   — чат/канал, куда слать заказы (плейсхолдер,
 *                        пользователь укажет сам, когда бот будет создан
 *                        и добавлен в нужный чат — см. .env.local)
 * ------------------------------------------------------------------
 */

import type { OrderPayload } from './orderPayload';

export interface TelegramSendResult {
  ok: boolean;
  description?: string;
}

export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN is not configured in .env.local' };
  }
  if (!chatId) {
    return { ok: false, description: 'TELEGRAM_CHAT_ID is not configured in .env.local (заполни его, когда бот будет добавлен в нужный чат)' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, description: data.description || `Telegram API HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : 'Unknown network error' };
  }
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMdl(amount: number): string {
  return `${Math.round(amount * 100) / 100} MDL`;
}

const METHOD_LABEL: Record<string, string> = { delivery: 'Доставка', pickup: 'Самовывоз' };
const PAYMENT_LABEL: Record<string, string> = { cash: 'Наличкой', card: 'Картой' };

// Собирает читаемое сообщение для Telegram из уже посчитанного на сервере
// order payload (lib/orderPayload.ts) — цены/состав корзины пересчитаны
// сервером через lib/cartSummary.ts, а не взяты "на слово" у клиента.
export function formatOrderMessage(payload: OrderPayload): string {
  const lines: string[] = [];
  lines.push(`<b>Новый заказ ${escapeHtml(payload.orderNumber)}</b>`);
  lines.push('');
  lines.push(`👤 ${escapeHtml(payload.contact.name)}`);
  lines.push(`📞 ${escapeHtml(payload.contact.phone)}`);
  lines.push('');
  lines.push(`🚚 ${METHOD_LABEL[payload.fulfillment.method] || payload.fulfillment.method}`);
  if (payload.fulfillment.address) {
    const a = payload.fulfillment.address;
    const addressParts = [a.street, a.building].filter(Boolean).join(', ');
    lines.push(`📍 ${escapeHtml(a.city)}, ${escapeHtml(addressParts)}`);
    const extra = [
      a.entrance ? `подъезд ${a.entrance}` : null,
      a.floor ? `этаж ${a.floor}` : null,
      a.apartment ? `кв. ${a.apartment}` : null
    ].filter(Boolean);
    if (extra.length) lines.push(`   ${escapeHtml(extra.join(', '))}`);
  }
  lines.push(`💳 ${PAYMENT_LABEL[payload.payment.method] || payload.payment.method}`);
  if (payload.ageConfirmed) lines.push('🔞 18+ подтверждено');
  lines.push('');
  lines.push('<b>Состав заказа:</b>');
  for (const item of payload.items) {
    lines.push(`• ${escapeHtml(item.name)} × ${item.qty} — ${formatMdl(item.lineTotal)}`);
    for (const modifier of item.modifiers) {
      lines.push(`   + ${escapeHtml(modifier.optionId)} × ${modifier.qty} (${formatMdl(modifier.price * modifier.qty)})`);
    }
    if (item.cutleryQty > 0) {
      lines.push(`   🍴 приборы: ${item.cutleryQty}${item.cutleryCost > 0 ? ` (доплата ${formatMdl(item.cutleryCost)})` : ''}`);
    }
  }
  lines.push('');
  lines.push(`Сумма заказа: ${formatMdl(payload.amounts.subtotal)}`);
  if (payload.fulfillment.method === 'delivery') {
    lines.push(`Доставка: ${payload.amounts.deliveryFee > 0 ? formatMdl(payload.amounts.deliveryFee) : 'Бесплатно'}`);
  }
  lines.push(`<b>Итого: ${formatMdl(payload.amounts.total)}</b>`);

  return lines.join('\n');
}
