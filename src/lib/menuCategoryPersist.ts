/**
 * lib/menuCategoryPersist.ts
 * ------------------------------------------------------------------
 * 04.10.2026. Запоминание выбранной категории меню (Спец.предложения /
 * Напитки / Кухня) на время жизни вкладки браузера — чтобы после
 * перезагрузки страницы (F5) посетитель оставался в той же категории, а не
 * возвращался на дефолтную («Напитки», см. DEFAULT_ACTIVE_CATEGORY в
 * lib/data.ts) и не искал заново своё место в меню.
 *
 * Хранилище — sessionStorage (решение пользователя): переживает
 * перезагрузку, но не новый заход (новая вкладка/другой день) — там сайт
 * как и раньше открывается на «Напитках», как для нового гостя.
 *
 * ПОЧЕМУ ЗДЕСЬ ЕСТЬ INLINE-СКРИПТ, а не просто чтение в useEffect. Сервер
 * (SSR) про sessionStorage ничего не знает и всегда отдаёт в HTML дефолтную
 * категорию. Если читать сохранённое только после гидратации React, то:
 *   1) на время между первой отрисовкой и гидратацией видны «Напитки»
 *      (мигание);
 *   2) главное — браузер восстанавливает позицию прокрутки при перезагрузке
 *      ПО ВЫСОТЕ страницы на момент загрузки. С высотой дефолтной категории
 *      он «промахивается» мимо места, где пользователь был в другой,
 *      гораздо более длинной/короткой категории.
 * Поэтому (тот же приём, что и для темы — lib/themeInitScript.ts) маленький
 * синхронный скрипт в <head> ДО первой отрисовки, если в sessionStorage
 * лежит не дефолтная категория, добавляет <style id="..."> с правилами,
 * которые показывают нужную категорию вместо дефолтной (группа, пилюли
 * подкатегорий, подсветка активного таба). Страница с самого первого кадра
 * имеет высоту нужной категории — и прокрутка восстанавливается точно.
 * Когда React гидратируется, MenuSection в useLayoutEffect (до отрисовки)
 * выставляет activeCategory из sessionStorage и убирает этот <style> —
 * дальше всё рисуют обычные классы, как и раньше.
 * ------------------------------------------------------------------
 */

export const MENU_CATEGORY_STORAGE_KEY = 'crema_menu_category';
export const MENU_CATEGORY_PRELOAD_STYLE_ID = 'menu-category-preload';

/**
 * Читает сохранённую категорию из sessionStorage. Возвращает её, только
 * если она есть в списке актуальных id меню (защита от устаревшего или
 * подменённого значения), иначе null. Любая ошибка доступа к хранилищу
 * (приватный режим, заблокированные данные сайта) — тоже null.
 */
export function readSavedMenuCategory(validIds: readonly string[]): string | null {
  try {
    const saved = window.sessionStorage.getItem(MENU_CATEGORY_STORAGE_KEY);
    return saved && validIds.includes(saved) ? saved : null;
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
 * Текст inline-скрипта для <head> (см. комментарий выше). validIds и
 * defaultId вшиваются в код как JSON — id берутся из menu.json на сервере,
 * а значение из sessionStorage сверяется с этим списком и дополнительно с
 * шаблоном [a-z0-9-]+, поэтому в CSS попадает только заведомо безопасная
 * строка. Код — намеренно ES5 и без зависимостей: выполняется до любого
 * бандла.
 *
 * Правила, которые добавляет скрипт (X — сохранённая категория):
 *  - все .category-group, кроме #cat-X, скрыты; #cat-X показана;
 *  - пилюли подкатегорий: показаны только с data-category="X";
 *  - таб с data-category="X" выглядит активным, прежний активный (дефолтный)
 *    — неактивным (значения повторяют .category-tab / .category-tab--active
 *    из globals.css). !important нужен, чтобы перебить классы
 *    .category-group--hidden / .pill--hidden / .category-tab--active,
 *    которые сервер расставил под дефолтную категорию.
 */
export function buildMenuCategoryInitScript(validIds: readonly string[], defaultId: string): string {
  return `(function(){try{var ids=${JSON.stringify(validIds)};var d=${JSON.stringify(defaultId)};var id=sessionStorage.getItem(${JSON.stringify(
    MENU_CATEGORY_STORAGE_KEY
  )});if(!id||id===d||ids.indexOf(id)===-1||!/^[a-z0-9-]+$/.test(id))return;var q='[data-category="'+id+'"]';var css='.category-group:not(#cat-'+id+'){display:none!important}#cat-'+id+'{display:block!important}.pill:not('+q+'){display:none!important}.pill'+q+'{display:block!important}.category-tab--active:not('+q+'){background:none!important;color:var(--text-2)!important;border-color:var(--border)!important}.category-tab'+q+'{background:var(--gold)!important;color:var(--on-gold)!important;border-color:var(--gold)!important}';var s=document.createElement('style');s.id=${JSON.stringify(
    MENU_CATEGORY_PRELOAD_STYLE_ID
  )};s.textContent=css;document.head.appendChild(s);}catch(e){}})();`;
}
