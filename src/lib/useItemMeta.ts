/**
 * lib/useItemMeta.ts
 * ------------------------------------------------------------------
 * Реактивная версия resolveItemMeta() (lib/cartSummary.ts) для карточки
 * товара в сетке меню (components/ItemCard.tsx) — нужна, чтобы решить,
 * что показать: степпер (отдел открыт) или "Будет доступно с HH:MM"
 * (отдел закрыт прямо сейчас), пересчитывается при каждом тике часов
 * работы (lib/useNowMinutes.ts) и при смене языка.
 * ------------------------------------------------------------------
 */

'use client';

import { useMemo } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { useNowMinutes } from './useNowMinutes';
import { resolveItemMeta, type ResolvedItemMeta } from './cartSummary';

export function useItemMeta(itemId: string): ResolvedItemMeta {
  const { t } = useI18n();
  const nowMinutes = useNowMinutes();
  return useMemo(() => resolveItemMeta(itemId, t, nowMinutes), [itemId, t, nowMinutes]);
}
