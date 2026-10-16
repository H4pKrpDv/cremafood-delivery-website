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
  /** Цена «без акции» — показывается зачёркнутой рядом с price (пока только у комбо). */
  oldPrice?: number;
  image: string;
  modifiers?: string[];
  available?: boolean;
  ageRestricted?: boolean;
  department?: DepartmentValue;
  /**
   * Сиропы (кастомизация напитка). Наличие поля = сиропы разрешены. default —
   * сиропы, выбранные по умолчанию (raf-coffee: ваниль); included — сколько
   * порций сиропа уже входит в цену напитка (raf-coffee: 1).
   */
  syrups?: ItemSyrupConfig;
  /**
   * 18.10.2026. Группы «основы» напитка, которые можно выбрать на странице
   * позиции: 'milk' (молоко), 'beans' (кофе: классический / декаф).
   * Настройки групп — MenuData.drinkOptions.
   */
  drinkOptions?: DrinkGroupId[];
}

export type DrinkGroupId = 'milk' | 'beans';

export interface DrinkOptionGroup {
  /** Доплата за вариант НЕ по умолчанию, MDL за один напиток. */
  price: number;
  /** id варианта по умолчанию (в цене). */
  default: string;
  options: { id: string }[];
}

export interface ItemSyrupConfig {
  default?: string[];
  included?: number;
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

export interface SyrupOption {
  id: string;
  /** Вкус доступен только этим позициям (ваниль — только raf-coffee). */
  onlyFor?: string[];
}

export interface SyrupSettings {
  /** Цена одной порции, MDL. */
  price: number;
  /** Объём одной порции, мл. */
  volumeMl: number;
  /** Максимум порций (разных вкусов, по одной порции) в одном напитке. */
  maxPerDrink: number;
  options: SyrupOption[];
}

export interface MenuData {
  categories: MenuCategory[];
  modifierGroups: Record<string, ModifierOption[]>;
  syrups: SyrupSettings;
  drinkOptions: Record<DrinkGroupId, DrinkOptionGroup>;
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

// Уникальный на всё меню идентификатор («якорь») подкатегории: id самой
// подкатегории, а для карточки «Полное меню» — id с префиксом категории
// (id у карточки всегда один и тот же — "full-menu"; с 07.10.2026 она
// лежит в отдельной категории «Полное меню», но схема на случай других
// карточек такого типа осталась прежней). Используется как значение data-subcategory у кнопки и блока
// подкатегории и как значение, которое запоминается в sessionStorage.
export function subcategoryAnchor(categoryId: string, sub: MenuSubcategory): string {
  return isFullMenuSubcategory(sub) ? `full-menu-card-${categoryId}` : sub.id;
}
