/**
 * lib/seoTexts.ts
 * ------------------------------------------------------------------
 * 08.10.2026. SEO-тексты страниц (блок «Читать далее» внизу, перед
 * футером — идея cappi.ua) и разбор их мини-разметки. Тексты лежат в
 * data/seo/<язык>.json: ключ страницы → массив строк. Пока переведён
 * только русский: ro/en берут русские тексты (как и остальной контент,
 * эти страницы закрыты noindex до перевода — INDEXABLE_LANGS).
 *
 * Ключи страниц: "home", "cat:<id категории>", "sub:<id подкатегории>", "page:full-menu".
 *
 * Мини-разметка строки:
 *   "## Заголовок"         — H2;   "### Заголовок" — H3;
 *   "- пункт"              — элемент маркированного списка (подряд идущие
 *                            пункты собираются в один <ul>);
 *   всё остальное          — абзац.
 * Внутри текста — ссылки [текст](токен). Токены (внутренняя перелинковка,
 * адрес собирается под язык страницы):
 *   home | menu | hours | page:full-menu | cat:<categoryId> | sub:<subId> | item:<itemId>
 * (page:full-menu — страница «Полное меню» /full-menu, 09.10.2026 (ключ переименован из page:menu 10.10.2026); menu — якорь меню на главной)
 * Если токен неизвестен или страницы нет, текст выводится без ссылки (а в
 * dev-режиме сборка не падает) — это защита от битых ссылок при смене
 * меню/слагов.
 *
 * Файл без React: разбор строк делает серверный компонент SeoText.
 * ------------------------------------------------------------------
 */

import ruTexts from '@/data/seo/ru.json';
import ruItemTexts from '@/data/seo/items.ru.json';
import { DEFAULT_LANG, localizedPath, type Lang } from '@/lib/i18nConfig';
import { getCategoryPathname } from '@/lib/categoryRoutes';
import { getSubcategoryPathname } from '@/lib/subcategoryRoutes';
import { getItemPathname } from '@/lib/itemRoutes';
import { getMenuPagePathname } from '@/lib/menuPageRoutes';

const TEXTS: Record<Lang, Record<string, string[]>> = {
  ru: ruTexts as Record<string, string[]>,
  // TODO(перевод): подставить data/seo/ro.json и en.json, когда появятся.
  ro: ruTexts as Record<string, string[]>,
  en: ruTexts as Record<string, string[]>
};

// 10.10.2026: уникальные тексты позиций (плашка внизу страницы позиции,
// components/ItemSeoPlate.tsx): id позиции → ОДИН абзац с той же
// мини-разметкой ссылок [текст](токен). Пока только русский (ro/en — его копия).
const ITEM_TEXTS: Record<Lang, Record<string, string>> = {
  ru: ruItemTexts as Record<string, string>,
  ro: ruItemTexts as Record<string, string>,
  en: ruItemTexts as Record<string, string>
};

/** Строка уникального текста позиции (с разметкой ссылок) или null. */
export function getItemSeoLine(lang: Lang, itemId: string): string | null {
  return ITEM_TEXTS[lang]?.[itemId] ?? ITEM_TEXTS[DEFAULT_LANG][itemId] ?? null;
}

/** Строки SEO-текста страницы или null, если для неё текста нет. */
export function getSeoLines(lang: Lang, key: string): string[] | null {
  return TEXTS[lang]?.[key] ?? TEXTS[DEFAULT_LANG][key] ?? null;
}

/** Публичный адрес по токену ссылки (или null — ссылки не будет). */
export function resolveSeoHref(lang: Lang, token: string): string | null {
  if (token === 'home') return localizedPath(lang);
  if (token === 'menu') return `${localizedPath(lang)}#menu`;
  if (token === 'hours') return `${localizedPath(lang)}#delivery-hours`;
  if (token === 'page:full-menu') return getMenuPagePathname(lang);
  const [kind, id] = token.split(':');
  if (!id) return null;
  if (kind === 'cat') return getCategoryPathname(lang, id);
  if (kind === 'sub') return getSubcategoryPathname(lang, id);
  if (kind === 'item') return getItemPathname(lang, id);
  return null;
}

export type SeoInline = { text: string; href?: string; hours?: boolean };
export type SeoBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; inline: SeoInline[] }
  | { type: 'ul'; items: SeoInline[][] };

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

export function parseInline(lang: Lang, line: string): SeoInline[] {
  const parts: SeoInline[] = [];
  let last = 0;
  for (const match of line.matchAll(LINK_RE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: line.slice(last, index) });
    const href = resolveSeoHref(lang, match[2]);
    // 10.10.2026: токен hours помечаем — SeoText выводит его как HoursLink (на
    // мобильном открывает бургер с графиком, на десктопе ведёт к футеру).
    parts.push(href ? { text: match[1], href, ...(match[2] === 'hours' ? { hours: true } : {}) } : { text: match[1] });
    last = index + match[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return parts;
}

export function parseSeoBlocks(lang: Lang, lines: string[]): SeoBlock[] {
  const blocks: SeoBlock[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('### ')) blocks.push({ type: 'h3', text: line.slice(4) });
    else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) });
    else if (line.startsWith('- ')) {
      const item = parseInline(lang, line.slice(2));
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === 'ul') prev.items.push(item);
      else blocks.push({ type: 'ul', items: [item] });
    } else blocks.push({ type: 'p', inline: parseInline(lang, line) });
  }
  return blocks;
}
