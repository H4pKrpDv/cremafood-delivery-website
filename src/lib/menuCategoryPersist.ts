/**
 * lib/menuCategoryPersist.ts
 * ------------------------------------------------------------------
 * 04.10.2026 (категории) + 05.10.2026 (подкатегории). Запоминание
 * выбранной категории меню (Спец.предложения / Напитки / Кухня) И
 * выбранной подкатегории в каждой категории на время жизни вкладки
 * браузера — чтобы после перезагрузки страницы (F5) посетитель оставался на
 * том же месте меню, а не возвращался на дефолтное («Напитки», первая
 * подкатегория) и не искал заново своё место.
 *
 * Хранилище — sessionStorage (решение пользователя): переживает
 * перезагрузку, но не новый заход (новая вкладка/другой день) — там сайт
 * как и раньше открывается на «Напитках», как для нового гостя. Два ключа:
 *  - crema_menu_category       — id выбранной категории (строка);
 *  - crema_menu_subcategories  — JSON-объект { id категории: якорь
 *    подкатегории }. Выбор подкатегории помнится ОТДЕЛЬНО для каждой
 *    категории: переключились на «Кухню» → «Десерты», вернулись в «Напитки»
 *    и обратно — снова «Десерты».
 *
 * ПОЧЕМУ ЗДЕСЬ ЕСТЬ INLINE-СКРИПТ, а не просто чтение в useEffect. Сервер
 * (SSR) про sessionStorage ничего не знает и всегда отдаёт в HTML дефолтный
 * выбор. Если читать сохранённое только после гидратации React, то:
 *   1) на время между первой отрисовкой и гидратацией видны «Напитки»
 *      (мигание);
 *   2) главное — браузер восстанавливает позицию прокрутки при перезагрузке
 *      ПО ВЫСОТЕ страницы на момент загрузки. С высотой дефолтного выбора
 *      он «промахивается» мимо места, где пользователь был.
 * Поэтому (тот же приём, что и для темы — lib/themeInitScript.ts) маленький
 * синхронный скрипт в <head> ДО первой отрисовки, если сохранённый выбор
 * отличается от дефолтного, добавляет <style id="..."> с правилами, которые
 * показывают нужную категорию/подкатегорию (блок, кнопки подкатегорий,
 * подсветка активных кнопок). Страница с самого первого кадра имеет высоту
 * нужного выбора — и прокрутка восстанавливается точно. Когда React
 * гидратируется, MenuSection в useLayoutEffect (до отрисовки) выставляет
 * состояние из sessionStorage и убирает этот <style> — дальше всё рисуют
 * обычные классы.
 * ------------------------------------------------------------------
 */

export const MENU_CATEGORY_STORAGE_KEY = 'crema_menu_category';
export const MENU_SUBCATEGORIES_STORAGE_KEY = 'crema_menu_subcategories';
export const MENU_CATEGORY_PRELOAD_STYLE_ID = 'menu-category-preload';

/** «Скелет» меню: категория -> якоря её подкатегорий (см. lib/data.ts). */
export interface MenuStructureLike {
  id: string;
  subs: readonly string[];
}

export interface SavedMenuSelection {
  /** Сохранённая категория или null (нет значения/значение устарело). */
  category: string | null;
  /** Сохранённые подкатегории по категориям — только валидные пары. */
  subs: Record<string, string>;
}

function readSubsMap(): Record<string, unknown> {
  try {
    const raw = window.sessionStorage.getItem(MENU_SUBCATEGORIES_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Читает сохранённый выбор из sessionStorage. Возвращает только значения,
 * которые есть в актуальном меню (защита от устаревшего или подменённого
 * значения): категория — из списка категорий, подкатегория — из списка
 * подкатегорий именно ЭТОЙ категории. Любая ошибка доступа к хранилищу
 * (приватный режим, заблокированные данные сайта) — «ничего не сохранено».
 */
export function readSavedMenuSelection(structure: readonly MenuStructureLike[]): SavedMenuSelection {
  const result: SavedMenuSelection = { category: null, subs: {} };
  try {
    const savedCategory = window.sessionStorage.getItem(MENU_CATEGORY_STORAGE_KEY);
    if (savedCategory && structure.some((category) => category.id === savedCategory)) {
      result.category = savedCategory;
    }
  } catch {
    // Хранилище недоступно — см. комментарий выше.
  }
  const map = readSubsMap();
  for (const category of structure) {
    const sub = map[category.id];
    if (typeof sub === 'string' && category.subs.includes(sub)) result.subs[category.id] = sub;
  }
  return result;
}

export function saveMenuCategory(categoryId: string): void {
  try {
    window.sessionStorage.setItem(MENU_CATEGORY_STORAGE_KEY, categoryId);
  } catch {
    // Хранилище недоступно — запоминание просто не сработает, на работу
    // меню это не влияет.
  }
}

export function saveMenuSubcategory(categoryId: string, subAnchor: string): void {
  try {
    const map = readSubsMap();
    map[categoryId] = subAnchor;
    window.sessionStorage.setItem(MENU_SUBCATEGORIES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // см. saveMenuCategory
  }
}

/**
 * Текст inline-скрипта для <head> (см. комментарий выше). structure и
 * defaultId вшиваются в код как JSON — берутся из menu.json на сервере, а
 * значения из sessionStorage сверяются с этим списком и дополнительно с
 * шаблоном [A-Za-z0-9_-]+, поэтому в CSS попадает только заведомо
 * безопасная строка. Код — намеренно ES5 и без зависимостей: выполняется
 * до любого бандла.
 *
 * Логика: выбранная категория C = сохранённая (если валидна) или дефолтная;
 * подкатегория S = сохранённая для C (если валидна) или первая из C. Если
 * C — не дефолтная категория ИЛИ S — не первая подкатегория C, то серверный
 * HTML (рассчитанный на дефолт) не совпадает с нужным выбором, и скрипт
 * добавляет правила (!important нужен, чтобы перебить классы
 * .category-group--hidden / .pill--hidden / .category--hidden /
 * .category-tab--active / .pill--current, расставленные сервером):
 *  - если C не дефолтная: все .category-group, кроме #cat-C, скрыты, #cat-C
 *    показана; показаны только кнопки подкатегорий с data-category="C";
 *    таб C выглядит активным, прежний активный — неактивным (значения
 *    повторяют .category-tab / .category-tab--active из globals.css);
 *  - внутри #cat-C показан только блок с data-subcategory="S"; кнопка S
 *    выглядит активной, прежняя активная (первая) — неактивной (значения
 *    повторяют .pill / .pill--current).
 */
export function buildMenuCategoryInitScript(
  structure: readonly MenuStructureLike[],
  defaultId: string
): string {
  return `(function(){try{var st=${JSON.stringify(structure)};var d=${JSON.stringify(defaultId)};var ok=/^[A-Za-z0-9_-]+$/;var cat=sessionStorage.getItem(${JSON.stringify(
    MENU_CATEGORY_STORAGE_KEY
  )});var map={};try{map=JSON.parse(sessionStorage.getItem(${JSON.stringify(
    MENU_SUBCATEGORIES_STORAGE_KEY
  )})||'{}')||{};}catch(e){}var c=null,i;for(i=0;i<st.length;i++){if(st[i].id===cat){c=st[i];}}if(!c){for(i=0;i<st.length;i++){if(st[i].id===d){c=st[i];}}}if(!c||!c.subs.length)return;var s=map[c.id];if(typeof s!=='string'||c.subs.indexOf(s)===-1){s=c.subs[0];}var catChanged=c.id!==d;var subChanged=s!==c.subs[0];if(!catChanged&&!subChanged)return;if(!ok.test(c.id)||!ok.test(s))return;var qc='[data-category="'+c.id+'"]';var qs='[data-subcategory="'+s+'"]';var css='';if(catChanged){css+='.category-group:not(#cat-'+c.id+'){display:none!important}#cat-'+c.id+'{display:block!important}.pill:not('+qc+'){display:none!important}.pill'+qc+'{display:block!important}.category-tab--active:not('+qc+'){background:none!important;color:var(--text-2)!important;border-color:var(--border)!important}.category-tab'+qc+'{background:var(--gold)!important;color:var(--on-gold)!important;border-color:var(--gold)!important}';}css+='#cat-'+c.id+' .category:not('+qs+'){display:none!important}#cat-'+c.id+' .category'+qs+'{display:block!important}.pill--current'+qc+':not('+qs+'){background:var(--surface)!important;color:var(--text-2)!important;border-color:var(--border)!important}.pill'+qc+qs+'{background:var(--gold)!important;color:var(--on-gold)!important;border-color:var(--gold)!important}';var el=document.createElement('style');el.id=${JSON.stringify(
    MENU_CATEGORY_PRELOAD_STYLE_ID
  )};el.textContent=css;document.head.appendChild(el);}catch(e){}})();`;
}
