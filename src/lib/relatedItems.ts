/**
 * lib/relatedItems.ts
 * ------------------------------------------------------------------
 * 09.10.2026 (SEO этап 4). Подбор «похожих позиций» для страницы позиции:
 * сначала соседи по подкатегории (по кругу, начиная со следующей за
 * текущей), затем — позиции других подкатегорий той же категории. Нужны
 * для внутренней перелинковки и для удержания гостя на сайте.
 *
 * В выдачу попадают только активные позиции (status 'active', не
 * available:false) со своей страницей. Без React — безопасно импортировать
 * и в серверных, и в клиентских компонентах.
 * ------------------------------------------------------------------
 */

import { itemMetaIndex } from '@/lib/data';
import { getItemStatus, hasItemPage } from '@/lib/itemRoutes';
import { getSubcategoryData } from '@/lib/subcategoryRoutes';
import { getCategorySubcategoryIds } from '@/lib/categoryRoutes';

function isLinkable(itemId: string): boolean {
  const base = itemMetaIndex[itemId];
  if (!base || base.available === false) return false;
  return getItemStatus(itemId).status === 'active' && hasItemPage(itemId);
}

export function getRelatedItemIds(itemId: string, limit = 4): string[] {
  const base = itemMetaIndex[itemId];
  if (!base) return [];

  const result: string[] = [];
  const push = (id: string) => {
    if (id !== itemId && !result.includes(id) && isLinkable(id)) result.push(id);
  };

  // 1) соседи по подкатегории — по кругу, начиная со следующей позиции
  const siblings = (getSubcategoryData(base.subcategoryId)?.items ?? []).map((item) => item.id);
  const at = siblings.indexOf(itemId);
  const ordered = at === -1 ? siblings : [...siblings.slice(at + 1), ...siblings.slice(0, at)];
  for (const id of ordered) {
    if (result.length >= limit) break;
    push(id);
  }

  // 2) добор из других подкатегорий той же категории: по одной позиции из
  // каждой, затем по кругу (чтобы подборка не состояла из одной подкатегории)
  if (result.length < limit) {
    const others = getCategorySubcategoryIds(base.categoryId).filter((subId) => subId !== base.subcategoryId);
    const lists = others.map((subId) => (getSubcategoryData(subId)?.items ?? []).map((item) => item.id));
    for (let round = 0; result.length < limit; round += 1) {
      let any = false;
      for (const list of lists) {
        if (round < list.length) {
          any = true;
          push(list[round]);
          if (result.length >= limit) break;
        }
      }
      if (!any) break;
    }
  }

  return result.slice(0, limit);
}
