/**
 * lib/phone.ts
 * ------------------------------------------------------------------
 * Порт маски молдавского номера из js/checkout.js (нативная версия) —
 * "+373 (__) ___-___", реализовано на чистой строковой логике (без
 * зависимости от DOM), чтобы одну и ту же функцию можно было
 * переиспользовать и в React-обработчике onChange (components/
 * CheckoutModal.tsx), и в Zod-схеме валидации (тот же формат regex).
 * ------------------------------------------------------------------
 */

export const PHONE_REGEX = /^\+373 \(\d{2}\) \d{3}-\d{3}$/;
export const PHONE_EMPTY_VALUE = '+373 (';

export function extractPhoneDigits(raw: string): string {
  let digits = String(raw || '').replace(/\D/g, '');
  // Код страны +373 может попасть в digits, если пользователь его тоже
  // "напечатал" сам (например вставил номер целиком через paste) — срезаем
  // один раз в начале, остальное — уже локальные цифры номера.
  if (digits.indexOf('373') === 0) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 8); // 2 (код оператора) + 3 + 3 = 8 цифр максимум
}

export function formatPhoneDigits(digits: string): string {
  let out = '+373 (' + digits.slice(0, 2);
  if (digits.length >= 2) out += ')';
  if (digits.length > 2) out += ' ' + digits.slice(2, 5);
  if (digits.length > 5) out += '-' + digits.slice(5, 8);
  return out;
}

// Примечание: в нативной версии (js/checkout.js) здесь же жил TEST_FAIL_DIGITS —
// тестовый номер "+373 (00) 000-000", на котором заглушка отправки нарочно
// "падала" в ветку ошибки, чтобы можно было увидеть экран ошибки без
// реального бекенда. Теперь бекенд реальный (app/api/orders — отправка в
// Telegram, см. lib/telegram.ts) — ветка ошибки срабатывает от настоящих
// сбоев (сеть/Telegram API/валидация), поэтому стаб-триггер по номеру
// телефона больше не нужен и сюда не перенесён.
