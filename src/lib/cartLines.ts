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
 * (молоко/кофе — токены `m=`/`b=` в конце ключа, см. константы ниже).
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

import { drinkOptionSettings, itemMetaIndex, syrupSettings } from './data';
import type { DrinkGroupId } from '@/types/menu';

export const LINE_SEP = '~';
export const SYRUP_SEP = '+';

// 18.10.2026. Молоко и кофе (классический/декаф) — тоже часть состава строки.
// Ключ расширен ТОКЕНАМИ после id: `m=<молоко>` и `b=<кофе>`, пишутся только
// если вариант не по умолчанию, всегда после сиропов, в порядке m, b:
//   - `latte~m=coconut`                 — латте на кокосовом молоке;
//   - `latte~caramel~m=almond~b=decaf`  — миндальное молоко, декаф и карамель;
//   - `espresso~b=decaf`                — декаф-эспрессо;
//   - `raf-coffee~~b=decaf`             — Raf без сиропа (пустая часть) на декафе.
// Часть без «=» (если есть) — набор сиропов, как раньше; её отсутствие
// означает «сиропы по умолчанию». Старые ключи (`id`, `id~syr+syr`) разбираются
// без изменений.
export const DRINK_GROUPS: DrinkGroupId[] = ['milk', 'beans'];
const DRINK_TOKEN: Record<DrinkGroupId, string> = { milk: 'm', beans: 'b' };

/** Выбор по группам основы: только те группы, что доступны позиции. */
export type DrinkChoices = Partial<Record<DrinkGroupId, string>>;

/** Группы основы (молоко/кофе), доступные позиции, в каноническом порядке. */
export function getItemDrinkGroups(itemId: string): DrinkGroupId[] {
  const wanted = itemMetaIndex[itemId]?.drinkOptions;
  if (!wanted?.length) return [];
  return DRINK_GROUPS.filter((g) => wanted.includes(g) && drinkOptionSettings[g]);
}

export function getDrinkOptionIds(group: DrinkGroupId): string[] {
  return drinkOptionSettings[group].options.map((o) => o.id);
}

export function getDrinkDefault(group: DrinkGroupId): string {
  return drinkOptionSettings[group].default;
}

/** Выбор по умолчанию для позиции (по всем её группам). */
export function getItemDrinkDefaults(itemId: string): DrinkChoices {
  const out: DrinkChoices = {};
  for (const g of getItemDrinkGroups(itemId)) out[g] = getDrinkDefault(g);
  return out;
}

/** Приводит выбор к допустимому: неизвестный/недоступный вариант → по умолчанию. */
export function sanitizeDrinkChoices(itemId: string, choices: DrinkChoices | undefined): DrinkChoices {
  const out: DrinkChoices = {};
  for (const g of getItemDrinkGroups(itemId)) {
    const wanted = choices?.[g];
    out[g] = wanted && getDrinkOptionIds(g).includes(wanted) ? wanted : getDrinkDefault(g);
  }
  return out;
}

/** Есть ли у позиции хоть какая-то кастомизация (сиропы, молоко, кофе). */
export function isCustomizableItem(itemId: string): boolean {
  return isSyrupItem(itemId) || getItemDrinkGroups(itemId).length > 0;
}

/** Доплата за молоко/кофе не по умолчанию на ОДИН напиток, MDL. */
export function drinkSurcharge(itemId: string, choices: DrinkChoices | undefined): number {
  const clean = sanitizeDrinkChoices(itemId, choices);
  let sum = 0;
  for (const g of getItemDrinkGroups(itemId)) {
    if (clean[g] !== getDrinkDefault(g)) sum += drinkOptionSettings[g].price;
  }
  return sum;
}

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

/** Ключ строки корзины для позиции: сиропы + (необязательно) молоко/кофе. */
export function makeLineKey(itemId: string, syrups: readonly string[] = [], choices?: DrinkChoices): string {
  const hasSyrups = isSyrupItem(itemId);
  const groups = getItemDrinkGroups(itemId);
  if (!hasSyrups && !groups.length) return itemId;

  let syrupPart: string | undefined;
  if (hasSyrups) {
    const clean = sanitizeSyrups(itemId, syrups);
    // Канонический порядок «по умолчанию» первым — для сравнения берём тот же порядок.
    if (!sameList(clean, sanitizeSyrups(itemId, getItemSyrupDefault(itemId)))) syrupPart = clean.join(SYRUP_SEP);
  }
  const clean = sanitizeDrinkChoices(itemId, choices);
  const tokens = groups.filter((g) => clean[g] !== getDrinkDefault(g)).map((g) => `${DRINK_TOKEN[g]}=${clean[g]}`);

  if (syrupPart === undefined && !tokens.length) return itemId;
  const parts = [itemId];
  if (syrupPart !== undefined) parts.push(syrupPart);
  parts.push(...tokens);
  return parts.join(LINE_SEP);
}

export interface ParsedLineKey {
  itemId: string;
  /** ИТОГОВЫЙ набор сиропов (с учётом умолчаний). */
  syrups: string[];
  /** ИТОГОВЫЙ выбор молока/кофе (только доступные позиции группы). */
  choices: DrinkChoices;
}

/** Разбор ключа строки → id позиции, сиропы и выбор молока/кофе (с учётом умолчаний). */
export function parseLineKey(key: string): ParsedLineKey {
  const [itemId, ...rest] = key.split(LINE_SEP);
  const syrupRaw = rest.find((p) => !p.includes('='));
  const syrups =
    syrupRaw === undefined
      ? sanitizeSyrups(itemId, getItemSyrupDefault(itemId))
      : sanitizeSyrups(itemId, syrupRaw.split(SYRUP_SEP).filter(Boolean));
  const raw: DrinkChoices = {};
  for (const part of rest) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const tok = part.slice(0, eq);
    const value = part.slice(eq + 1);
    const group = DRINK_GROUPS.find((g) => DRINK_TOKEN[g] === tok);
    if (group) raw[group] = value;
  }
  return { itemId, syrups, choices: sanitizeDrinkChoices(itemId, raw) };
}

/** Доплата за сиропы на ОДИН напиток, MDL. */
export function syrupSurcharge(itemId: string, syrups: readonly string[]): number {
  if (!isSyrupItem(itemId)) return 0;
  const count = sanitizeSyrups(itemId, syrups).length;
  return Math.max(0, count - getItemSyrupIncluded(itemId)) * syrupSettings.price;
}
