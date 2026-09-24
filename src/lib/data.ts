/**
 * lib/data.ts
 * ------------------------------------------------------------------
 * Загрузка data/menu.json (JSON-импорт, работает и на сервере, и на
 * клиенте — Next.js собирает его в бандл, отдельного fetch()/API не
 * нужно, тот же принцип, что был у build.js/index.html в нативной
 * версии: все данные "запечены" заранее).
 *
 * itemMetaIndex — плоский индекс "id товара -> метаданные", который в
 * нативной версии js/cart.js/js/menu.js читали прямо из DOM-атрибутов
 * уже отрисованной карточки товара (data-price/data-available/...). В
 * React-версии карточки рендерятся из тех же данных, поэтому логичнее
 * держать один и тот же индекс как единый источник правды — его же
 * переиспользует computeSummary() (lib/cartSummary.ts) на клиенте И на
 * сервере (app/api/orders/route.ts), вместо того чтобы парсить разметку.
 * ------------------------------------------------------------------
 */

import menuJson from '@/data/menu.json';
import type { MenuData, MenuItem, DepartmentValue } from '@/types/menu';

export const menuData = menuJson as unknown as MenuData;

// Департамент (кухня/бар) определяется по категории автоматически — то же
// правило, что CATEGORY_DEPARTMENT в build.js нативной версии. Для
// "special-offers" автоматика не подходит — там department проставлен
// вручную в menu.json (см. combo-latte-sandwich: department:["bar","kitchen"]).
const CATEGORY_DEPARTMENT: Record<string, string> = {
  cafe: 'bar',
  kitchen: 'kitchen'
};

export function resolveDepartment(item: MenuItem, categoryId: string): DepartmentValue {
  if (item.department) return item.department;
  return CATEGORY_DEPARTMENT[categoryId] ?? null;
}

export interface ItemMetaBase {
  id: string;
  price: number;
  image: string;
  available: boolean;
  modifierGroupIds: string[];
  ageRestricted: boolean;
  cutleryEligible: boolean;
  department: DepartmentValue;
  categoryId: string;
  subcategoryId: string;
}

function buildItemMetaIndex(): Record<string, ItemMetaBase> {
  const index: Record<string, ItemMetaBase> = {};
  for (const category of menuData.categories) {
    for (const sub of category.subcategories) {
      if (!sub.items || !sub.items.length) continue;
      for (const item of sub.items) {
        index[item.id] = {
          id: item.id,
          price: item.price,
          image: item.image,
          available: item.available !== false,
          modifierGroupIds: item.modifiers ?? [],
          ageRestricted: Boolean(item.ageRestricted),
          cutleryEligible: Boolean(sub.cutleryEligible),
          department: resolveDepartment(item, category.id),
          categoryId: category.id,
          subcategoryId: sub.id
        };
      }
    }
  }
  return index;
}

export const itemMetaIndex: Record<string, ItemMetaBase> = buildItemMetaIndex();

export const modifierGroups = menuData.modifierGroups ?? {};

export const DEFAULT_ACTIVE_CATEGORY = 'cafe';

// data/menu.json хранит пути к изображениям без ведущего слэша ("img/items/…"),
// т.к. в нативной версии это были относительные пути от index.html в корне
// сайта. В Next.js файлы из public/ отдаются от корня домена — нормализуем
// путь здесь одним местом, а не в каждом компоненте.
export function publicImagePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}
