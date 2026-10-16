/**
 * lib/cartLines.ts
 * ------------------------------------------------------------------
 * 17.10.2026. «Строка корзины» с кастомизацией (сиропы). Чистые функции без
 * React — используются и клиентом (store/cartStore.ts, компоненты), и
 * сервером (lib/cartSummary.ts при пересчёте заказа).
 *
 * Модель: корзина по-прежнему хранит `items: Record<ключ, { qty, modifiers,
 * cutlery }>`, но ключ — это КЛЮЧ СТРОКИ, а не только id позиции:
 *   - `latte`               — позиция без сиропов (для позиции без сиропов
 *                             ключ ВСЕГДА равен id — старые корзины в
 *                             localStorage продолжают работать как есть);
 *   - `latte~caramel+coconut` — латте с сиропами (id вкусов в каноническом
 *                             порядке из menu.json, разделитель «+»);
 *   - `raf-coffee`          — Raf с набором по умолчанию (ваниль);
 *   - `raf-coffee~caramel`  — Raf, где ваниль заменена на карамель;
 *   - `raf-coffee~`         — Raf без сиропа (ваниль убрали).
 * Так «латте с карамелью» и «латте без сиропа» — две разные строки со
 * своими счётчиками, а бариста видит, в какой стакан какой сироп.
 *
 * Цена: сироп стоит syrups.price за порцию; у позиции может быть
 * syrups.included порций «в цене» (raf-coffee: 1 — любой вкус, не
 * обязательно ваниль). Доплата за стакан = max(0, порций − included) × цена.
 * Сервер НЕ доверяет клиенту: sanitizeSyrups() отбрасывает неизвестные и
 * недоступные позиции вкусы, дубликаты и всё сверх maxPerDrink.
 * ------------------------------------------------------------------
 */

import { itemMetaIndex, syrupSettings } from './data';

export const LINE_SEP = '~';
export const SYRUP_SEP = '+';

/** Поддерживает ли позиция сиропы. */
export function isSyrupItem(itemId: string): boolean {
  return Boolean(itemMetaIndex[itemId]?.syrups);
}

/** Вкусы, доступные для позиции (в каноническом порядке из menu.json). */
export function getItemSyrupOptionIds(itemId: string): string[] {
  if (!isSyrupItem(itemId)) return [];
  const ids = syrupSettings.options
    .filter((option) => !option.onlyFor || option.onlyFor.includes(itemId))
    .map((option) => option.id);
  // Вкус «по умолчанию» (ваниль у raf-coffee) показываем первым.
  const defaults = getItemSyrupDefault(itemId);
  return [...defaults.filter((id) => ids.includes(id)), ...ids.filter((id) => !defaults.includes(id))];
}

/** Набор сиропов по умолчанию (raf-coffee → ['vanilla'], остальные → []). */
export function getItemSyrupDefault(itemId: string): string[] {
  const cfg = itemMetaIndex[itemId]?.syrups;
  if (!cfg?.default?.length) return [];
  return cfg.default.filter((id) =>
    syrupSettings.options.some((option) => option.id === id && (!option.onlyFor || option.onlyFor.includes(itemId)))
  );
}

/** Сколько порций сиропа уже входит в цену напитка. */
export function getItemSyrupIncluded(itemId: string): number {
  return itemMetaIndex[itemId]?.syrups?.included ?? 0;
}

/**
 * Приводит выбор к допустимому: только доступные позиции вкусы, без
 * дубликатов, в каноническом порядке, не больше maxPerDrink.
 */
export function sanitizeSyrups(itemId: string, ids: readonly string[]): string[] {
  const allowed = getItemSyrupOptionIds(itemId);
  if (!allowed.length) return [];
  const wanted = new Set(ids);
  return allowed.filter((id) => wanted.has(id)).slice(0, syrupSettings.maxPerDrink);
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** Ключ строки корзины для позиции с данным набором сиропов. */
export function makeLineKey(itemId: string, syrups: readonly string[] = []): string {
  if (!isSyrupItem(itemId)) return itemId;
  const clean = sanitizeSyrups(itemId, syrups);
  // Канонический порядок «по умолчанию» первым — для сравнения берём тот же порядок.
  if (sameList(clean, sanitizeSyrups(itemId, getItemSyrupDefault(itemId)))) return itemId;
  return `${itemId}${LINE_SEP}${clean.join(SYRUP_SEP)}`;
}

/** Разбор ключа строки → id позиции и ИТОГОВЫЙ набор сиропов (с учётом умолчаний). */
export function parseLineKey(key: string): { itemId: string; syrups: string[] } {
  const idx = key.indexOf(LINE_SEP);
  if (idx === -1) {
    return { itemId: key, syrups: sanitizeSyrups(key, getItemSyrupDefault(key)) };
  }
  const itemId = key.slice(0, idx);
  const raw = key
    .slice(idx + 1)
    .split(SYRUP_SEP)
    .filter(Boolean);
  return { itemId, syrups: sanitizeSyrups(itemId, raw) };
}

/** Доплата за сиропы на ОДИН напиток, MDL. */
export function syrupSurcharge(itemId: string, syrups: readonly string[]): number {
  if (!isSyrupItem(itemId)) return 0;
  const count = sanitizeSyrups(itemId, syrups).length;
  return Math.max(0, count - getItemSyrupIncluded(itemId)) * syrupSettings.price;
}
