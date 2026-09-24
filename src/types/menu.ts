/**
 * types/menu.ts
 * ------------------------------------------------------------------
 * Типы для data/menu.json — форма файла не менялась при миграции на
 * Next.js (тот же файл, что использовал build.js в нативной версии).
 * ------------------------------------------------------------------
 */

export type DepartmentId = 'kitchen' | 'bar';

// В JSON department может быть строкой ("bar"), CSV-строкой ("bar,kitchen")
// или массивом (["bar","kitchen"]) — см. js/hours.js в нативной версии.
export type DepartmentValue = string | string[] | null | undefined;

export interface MenuItem {
  id: string;
  price: number;
  image: string;
  modifiers?: string[];
  available?: boolean;
  ageRestricted?: boolean;
  department?: DepartmentValue;
}

export interface MenuSubcategoryItems {
  id: string;
  image: string;
  cutleryEligible?: boolean;
  items: MenuItem[];
  type?: undefined;
}

export interface MenuSubcategoryFullMenu {
  id: string;
  type: 'full-menu-card';
  pdfUrl: string;
  items?: never;
}

export type MenuSubcategory = MenuSubcategoryItems | MenuSubcategoryFullMenu;

export interface MenuCategory {
  id: string;
  subcategories: MenuSubcategory[];
}

export interface ModifierOption {
  id: string;
  price: number;
}

export interface MenuData {
  categories: MenuCategory[];
  modifierGroups: Record<string, ModifierOption[]>;
}

export function isFullMenuSubcategory(sub: MenuSubcategory): sub is MenuSubcategoryFullMenu {
  return sub.type === 'full-menu-card';
}

// Подкатегория считается "отрисовываемой", если это карточка "Полное меню"
// или если в ней реально есть товары (см. build.js/isSubRenderable в
// нативной версии — тот же критерий: пустые заглушки promo-seasonal/
// promo-new пропускаются, пока в menu.json у них нет items).
export function isSubRenderable(sub: MenuSubcategory): boolean {
  if (isFullMenuSubcategory(sub)) return true;
  return Boolean(sub.items && sub.items.length > 0);
}
