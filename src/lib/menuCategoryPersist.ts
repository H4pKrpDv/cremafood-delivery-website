/**
 * lib/menuCategoryPersist.ts
 * ------------------------------------------------------------------
 * 04.10.2026. Запоминание выбранной категории меню (Спец.предложения /
 * Напитки / Блюда / Полное меню) на время жизни вкладки браузера — чтобы
 * после перезагрузки страницы (F5) или возврата со страницы подкатегории
 * кнопкой «назад» посетитель оставался в той же вкладке меню, а не
 * возвращался на дефолтную («Напитки»).
 *
 * Хранилище — sessionStorage (решение пользователя): переживает
 * перезагрузку, но не новый заход (новая вкладка/другой день) — там сайт
 * как и раньше открывается на «Напитках», как для нового гостя. Один ключ:
 *  - crema_menu_category — id выбранной категории (строка).
 *
 * 08.10.2026: подкатегории больше не переключаются на главной (это теперь
 * баннеры-ссылки на отдельные страницы), поэтому ключ
 * crema_menu_subcategories и всё, что с ним связано, удалено; устаревшее
 * значение в sessionStorage при чтении стирается.
 *
 * ПОЧЕМУ ЗДЕСЬ ЕСТЬ INLINE-СКРИПТ, а не просто чтение в useEffect. Сервер
 * (SSR) про sessionStorage ничего не знает и всегда отдаёт в HTML дефолтную
 * категорию. Если читать сохранённое только после гидратации React, то:
 *   1) на время между первой отрисовкой и гидратацией видны «Напитки»
 *      (мигание);
 *   2) главное — браузер восстанавливает позицию прокрутки при перезагрузке
 *      ПО ВЫСОТЕ страницы на момент загрузки. С высотой дефолтной категории
 *      он «промахивается» мимо места, где пользователь был.
 * Поэтому (тот же приём, что и для темы — lib/themeInitScript.ts) маленький
 * синхронный скрипт в <head> ДО первой отрисовки, если сохранённая категория
 * отличается от дефолтной, добавляет <style id="..."> с правилами, которые
 * показывают нужную категорию и подсвечивают её вкладку. Когда React
 * гидратируется, MenuSection в useLayoutEffect (до отрисовки) выставляет
 * состояние из sessionStorage и убирает этот <style> — дальше всё рисуют
 * обычные классы.
 *
 * 07.10.2026: скрипт работает ТОЛЬКО на главной (см. HOME_PATH_PATTERN):
 * <style> снимает только MenuSection, а её нет на остальных страницах.
 * ------------------------------------------------------------------
 */

import { LANGS } from './i18nConfig';

export const MENU_CATEGORY_STORAGE_KEY = 'crema_menu_category';
export const MENU_CATEGORY_PRELOAD_STYLE_ID = 'menu-category-preload';
// Ключ устаревшего запоминания подкатегорий (до 08.10.2026) — только чтобы стереть.
const LEGACY_SUBCATEGORIES_STORAGE_KEY = 'crema_menu_subcategories';

// Скрипт должен работать ТОЛЬКО на главной (/, /ro, /en): меню есть только
// там. Список строится из LANGS, поэтому новый язык подхватывается сам.
const HOME_PATH_PATTERN = `^/(${LANGS.join('|')})?/?$`;

/** Список категорий меню (достаточно поля id — см. menuStructure в lib/data.ts). */
export interface MenuStructureLike {
  id: string;
}

/**
 * Читает сохранённую категорию из sessionStorage. Возвращает её, только если
 * она есть в актуальном меню (защита от устаревшего или подменённого
 * значения), иначе null. Любая ошибка доступа к хранилищу (приватный режим,
 * заблокированные данные сайта) — «ничего не сохранено».
 */
export function readSavedMenuCategory(structure: readonly MenuStructureLike[]): string | null {
  try {
    window.sessionStorage.removeItem(LEGACY_SUBCATEGORIES_STORAGE_KEY);
    const saved = window.sessionStorage.getItem(MENU_CATEGORY_STORAGE_KEY);
    return saved && structure.some((category) => category.id === saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveMenuCategory(categoryId: string): void {
  try {
    window.sessionStorage.setItem(MENU_CATEGORY_STORAGE_KEY, categoryId);
  } catch {
    // Хранилище недоступно — запоминание просто не сработает, на работу
    // меню это не влияет.
  }
}

/**
 * Текст inline-скрипта для <head> (см. комментарий выше). Список категорий
 * и id по умолчанию вшиваются в код как JSON — берутся из menu.json на
 * сервере, а значение из sessionStorage сверяется с этим списком и
 * дополнительно с шаблоном [A-Za-z0-9_-]+, поэтому в CSS попадает только
 * заведомо безопасная строка. Код — намеренно ES5 и без зависимостей:
 * выполняется до любого бандла.
 *
 * Логика: если сохранённая категория C валидна и не дефолтная, серверный
 * HTML (рассчитанный на дефолт) не совпадает с нужным выбором, и скрипт
 * добавляет правила (!important нужен, чтобы перебить классы
 * .category-group--hidden / .category-tab--active, расставленные
 * сервером): все .category-group, кроме #cat-C, скрыты, #cat-C показана;
 * вкладка C выглядит активной, прежняя активная — неактивной (значения
 * повторяют .category-tab / .category-tab--active из globals.css).
 */
export function buildMenuCategoryInitScript(
  structure: readonly MenuStructureLike[],
  defaultId: string
): string {
  const ids = structure.map((category) => category.id);
  return `(function(){try{if(!new RegExp(${JSON.stringify(HOME_PATH_PATTERN)}).test(location.pathname))return;var ids=${JSON.stringify(ids)};var d=${JSON.stringify(defaultId)};var ok=/^[A-Za-z0-9_-]+$/;var c=sessionStorage.getItem(${JSON.stringify(MENU_CATEGORY_STORAGE_KEY)});if(!c||c===d||ids.indexOf(c)===-1||!ok.test(c))return;var qc='[data-category="'+c+'"]';var css='.category-group:not(#cat-'+c+'){display:none!important}#cat-'+c+'{display:block!important}.category-tabs .category-tab--active:not('+qc+'){background:none!important;color:var(--text-2)!important;border-color:var(--border)!important}.category-tabs .category-tab'+qc+'{background:var(--gold)!important;color:var(--on-gold)!important;border-color:var(--gold)!important}';var el=document.createElement('style');el.id=${JSON.stringify(MENU_CATEGORY_PRELOAD_STYLE_ID)};el.textContent=css;document.head.appendChild(el);}catch(e){}})();`;
}
