/**
 * data/routes.ts
 * ------------------------------------------------------------------
 * 07.10.2026. Слаги (ЧПУ-адреса) страниц позиций меню — ЕДИНСТВЕННЫЙ
 * источник правды. Таблица утверждена пользователем 07.10.2026 (Claude
 * Docs «Слаги страниц позиций — на утверждение», версия 2).
 *
 * Итоговый адрес позиции (lib/itemRoutes.ts собирает его из этих данных):
 *   ru (по умолчанию, без префикса):  /drinks/kofe/latte
 *   ro:                               /ro/drinks/cafea/latte
 *   en:                               /en/drinks/coffee/latte
 *
 * ПРАВИЛА (см. Context.md, «НЕ ЗАБЫТЬ»):
 *  - Сегмент раздела ВСЕГДА английский и одинаковый на всех языках
 *    (cafe→drinks, kitchen→food, special-offers→promo). Текст пилюль в
 *    интерфейсе при этом не меняется — это только адрес.
 *  - Слаги подкатегорий и позиций — свои на каждый язык: ru —
 *    транслитерация, ro — румынские слова латиницей без диакритики,
 *    en — английские слова.
 *  - Слаг привязан к ПОЗИЦИИ, а не к её названию. Если слаг меняется —
 *    старый адрес ОБЯЗАТЕЛЬНО добавить в data/redirects.ts (301 на новый),
 *    иначе потеряется накопленный поисковый вес.
 *  - Статус позиции (active/unavailable/archived) — ниже, в ITEM_STATUS.
 *    Правила жизненного цикла позиции — в комментарии к ITEM_STATUS.
 *
 * Новая позиция/подкатегория: добавить запись сюда (иначе страницы у неё
 * не будет, а в меню название не станет ссылкой) и перевод в i18n.
 * ------------------------------------------------------------------
 */

import type { Lang } from '@/lib/i18nConfig';

export type LangSlugs = Record<Lang, string>;

/** id категории из menu.json → сегмент раздела в адресе (один на все языки). */
export const SECTION_SLUGS: Record<string, string> = {
  'special-offers': 'promo',
  'cafe': 'drinks',
  'kitchen': 'food',
};

/** id подкатегории из menu.json → слаг на каждом языке. */
export const SUBCATEGORY_SLUGS: Record<string, LangSlugs> = {
  'promo-permanent': { ru: 'postoyannye', ro: 'permanente', en: 'permanent' },
  'promo-seasonal': { ru: 'sezonnye', ro: 'sezoniere', en: 'seasonal' },
  'promo-new': { ru: 'novinki', ro: 'noutati', en: 'new' },
  'coffee': { ru: 'kofe', ro: 'cafea', en: 'coffee' },
  'ice-coffee': { ru: 'ays-kofe', ro: 'cafea-rece', en: 'iced-coffee' },
  'milkshakes': { ru: 'milksheyki', ro: 'milkshakes', en: 'milkshakes' },
  'lemonades': { ru: 'limonady', ro: 'limonade', en: 'lemonades' },
  'matcha': { ru: 'matcha', ro: 'matcha', en: 'matcha' },
  'ube': { ru: 'ube', ro: 'ube', en: 'ube' },
  'bubble-tea': { ru: 'bubble-tea', ro: 'bubble-tea', en: 'bubble-tea' },
  'alcohol': { ru: 'alkogol', ro: 'alcool', en: 'alcohol' },
  'breakfast': { ru: 'zavtraki', ro: 'mic-dejun', en: 'breakfast' },
  'mexican': { ru: 'meksikanskaya-kuhnya', ro: 'bucatarie-mexicana', en: 'mexican-cuisine' },
  'desserts': { ru: 'deserty', ro: 'deserturi', en: 'desserts' },
};

/** id позиции из menu.json → слаг на каждом языке. */
export const ITEM_SLUGS: Record<string, LangSlugs> = {
  'combo-latte-sandwich': { ru: 'kombo-latte-kapuchino-sendvich', ro: 'combo-latte-cappuccino-sandvis', en: 'combo-latte-cappuccino-sandwich' },
  'spicy-tea-strawberry-raspberry': { ru: 'chay-pryanyy-klubnika-malina', ro: 'ceai-picant-capsuni-zmeura', en: 'spiced-tea-strawberry-raspberry' },
  'tea-seabuckthorn-passionfruit': { ru: 'chay-oblepiha-marakuyya', ro: 'ceai-catina-fructul-pasiunii', en: 'tea-sea-buckthorn-passion-fruit' },
  'tea-barberry-mint-orange': { ru: 'chay-barbaris-myata-apelsin', ro: 'ceai-berberis-menta-portocala', en: 'tea-barberry-mint-orange' },
  'spicy-tea-apple-cinnamon': { ru: 'chay-pryanyy-yabloko-koritsa', ro: 'ceai-picant-mar-scortisoara', en: 'spiced-tea-apple-cinnamon' },
  'milk-oolong-cranberry-orange': { ru: 'molochnyy-ulun-klyukva-apelsin', ro: 'oolong-cu-lapte-merisoare-portocala', en: 'milk-oolong-cranberry-orange' },
  'milk-oolong-peach': { ru: 'molochnyy-ulun-persik', ro: 'oolong-cu-lapte-piersica', en: 'milk-oolong-peach' },
  'mocha-orange-chocolate': { ru: 'mokko-apelsin-shokolad', ro: 'mocha-portocala-ciocolata', en: 'mocha-orange-chocolate' },
  'raf-raspberry-cheese-foam': { ru: 'malinovyy-raf-s-syrnoy-penkoy', ro: 'raf-zmeura-spuma-de-branza', en: 'raspberry-raf-cheese-foam' },
  'raf-cherry-chocolate': { ru: 'raf-vishnya-shokolad', ro: 'raf-visine-ciocolata', en: 'raf-cherry-chocolate' },
  'matcha-raspberry-white-chocolate': { ru: 'matcha-malina-belyy-shokolad', ro: 'matcha-zmeura-ciocolata-alba', en: 'matcha-raspberry-white-chocolate' },
  'espresso': { ru: 'espresso', ro: 'espresso', en: 'espresso' },
  'americano': { ru: 'americano', ro: 'americano', en: 'americano' },
  'doppio': { ru: 'doppio', ro: 'doppio', en: 'doppio' },
  'cortado': { ru: 'cortado', ro: 'cortado', en: 'cortado' },
  'cappuccino': { ru: 'cappuccino', ro: 'cappuccino', en: 'cappuccino' },
  'grand-cappuccino': { ru: 'grand-cappuccino', ro: 'grand-cappuccino', en: 'grand-cappuccino' },
  'latte': { ru: 'latte', ro: 'latte', en: 'latte' },
  'flat-white': { ru: 'flat-white', ro: 'flat-white', en: 'flat-white' },
  'moccacino': { ru: 'moccacino', ro: 'moccacino', en: 'moccacino' },
  'raf-coffee': { ru: 'raf-coffee', ro: 'raf-coffee', en: 'raf-coffee' },
  'iced-latte': { ru: 'ice-latte', ro: 'ice-latte', en: 'ice-latte' },
  'frappe': { ru: 'frappe', ro: 'frappe', en: 'frappe' },
  'espresso-tonic': { ru: 'espresso-tonic', ro: 'espresso-tonic', en: 'espresso-tonic' },
  'bumblebee': { ru: 'bumblebee', ro: 'bumblebee', en: 'bumblebee' },
  'raspberry-pink-latte': { ru: 'raspberry-pink-latte', ro: 'raspberry-pink-latte', en: 'raspberry-pink-latte' },
  'milkshake-classic': { ru: 'classic-milkshake', ro: 'classic-milkshake', en: 'classic-milkshake' },
  'milkshake-chocolate': { ru: 'chocolate-milkshake', ro: 'chocolate-milkshake', en: 'chocolate-milkshake' },
  'milkshake-banana': { ru: 'banana-milkshake', ro: 'banana-milkshake', en: 'banana-milkshake' },
  'milkshake-strawberry': { ru: 'strawberry-milkshake', ro: 'strawberry-milkshake', en: 'strawberry-milkshake' },
  'milkshake-oreo': { ru: 'oreo-milkshake', ro: 'oreo-milkshake', en: 'oreo-milkshake' },
  'lemonade-mojito': { ru: 'mojito', ro: 'mojito', en: 'mojito' },
  'lemonade-tropic': { ru: 'tropical-lemonade', ro: 'tropical-lemonade', en: 'tropical-lemonade' },
  'lemonade-strawberry': { ru: 'strawberry-lemonade', ro: 'strawberry-lemonade', en: 'strawberry-lemonade' },
  'lemonade-blue-lagoon': { ru: 'blue-lagoon', ro: 'blue-lagoon', en: 'blue-lagoon' },
  'lemonade-raspberry-chai-fizz': { ru: 'raspberry-chai-fizz', ro: 'raspberry-chai-fizz', en: 'raspberry-chai-fizz' },
  'matcha-classic': { ru: 'classic-matcha-latte', ro: 'classic-matcha-latte', en: 'classic-matcha-latte' },
  'matcha-coconut': { ru: 'coconut-matcha-latte', ro: 'coconut-matcha-latte', en: 'coconut-matcha-latte' },
  'matcha-strawberry': { ru: 'strawberry-matcha', ro: 'strawberry-matcha', en: 'strawberry-matcha' },
  'matcha-tonic': { ru: 'matcha-tonic', ro: 'matcha-tonic', en: 'matcha-tonic' },
  'matcha-mango': { ru: 'mango-matcha-latte', ro: 'mango-matcha-latte', en: 'mango-matcha-latte' },
  'ube-latte': { ru: 'ube-latte', ro: 'ube-latte', en: 'ube-latte' },
  'ube-cream-latte': { ru: 'ube-cream-latte', ro: 'ube-cream-latte', en: 'ube-cream-latte' },
  'ube-smoothie': { ru: 'ube-smoothie', ro: 'ube-smoothie', en: 'ube-smoothie' },
  'bubble-tea-tropic': { ru: 'bubble-tea-tropic', ro: 'bubble-tea-tropic', en: 'bubble-tea-tropic' },
  'bubble-tea-kiwi': { ru: 'bubble-tea-kiwi', ro: 'bubble-tea-kiwi', en: 'bubble-tea-kiwi' },
  'bubble-tea-strawberry': { ru: 'bubble-tea-strawberry', ro: 'bubble-tea-strawberry', en: 'bubble-tea-strawberry' },
  'bubble-tea-peach': { ru: 'bubble-tea-peach', ro: 'bubble-tea-peach', en: 'bubble-tea-peach' },
  'bubble-latte-caramel': { ru: 'bubble-latte-caramel', ro: 'bubble-latte-caramel', en: 'bubble-latte-caramel' },
  'bubble-latte-chocolate': { ru: 'bubble-latte-chocolate', ro: 'bubble-latte-chocolate', en: 'bubble-latte-chocolate' },
  'jack-daniels-honey': { ru: 'jack-daniels-honey', ro: 'jack-daniels-honey', en: 'jack-daniels-honey' },
  'jack-daniels-apple': { ru: 'jack-daniels-apple', ro: 'jack-daniels-apple', en: 'jack-daniels-apple' },
  'crema-kick-mango': { ru: 'crema-kick-the-rules-mango', ro: 'crema-kick-the-rules-mango', en: 'crema-kick-the-rules-mango' },
  'crema-kick-watermelon': { ru: 'crema-kick-the-rules-watermelon', ro: 'crema-kick-the-rules-watermelon', en: 'crema-kick-the-rules-watermelon' },
  'johnnie-walker-red': { ru: 'johnnie-walker-red-label', ro: 'johnnie-walker-red-label', en: 'johnnie-walker-red-label' },
  'jagermeister': { ru: 'jagermeister', ro: 'jagermeister', en: 'jagermeister' },
  'english-breakfast': { ru: 'angliyskiy-zavtrak', ro: 'mic-dejun-englezesc', en: 'english-breakfast' },
  'shakshuka': { ru: 'shakshuka', ro: 'shakshuka', en: 'shakshuka' },
  'syrniki': { ru: 'syrniki', ro: 'sirniki', en: 'syrniki' },
  'salmon-scramble': { ru: 'skrembl-s-lososem', ro: 'oua-jumari-cu-somon', en: 'salmon-scramble' },
  'chicken-sandwich': { ru: 'sendvich-s-kuritsey', ro: 'sandvis-cu-pui', en: 'chicken-sandwich' },
  'nachos': { ru: 'nachos', ro: 'nachos', en: 'nachos' },
  'quesadilla': { ru: 'kesadilya', ro: 'quesadilla', en: 'quesadilla' },
  'burrito': { ru: 'burrito', ro: 'burrito', en: 'burrito' },
  'tacos': { ru: 'tacos', ro: 'tacos', en: 'tacos' },
  'cheesecake-caramel': { ru: 'cheesecake-caramel', ro: 'cheesecake-caramel', en: 'cheesecake-caramel' },
  'cheesecake-mac': { ru: 'cheesecake-mac', ro: 'cheesecake-mac', en: 'cheesecake-mac' },
  'smetannik': { ru: 'smetannik', ro: 'smetannik', en: 'smetannik' },
  'donuts': { ru: 'donuts', ro: 'donuts', en: 'donuts' },
};

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  СТАТУС ПОЗИЦИИ — НЕ ЗАБЫТЬ (решение пользователя, 07.10.2026)   ║
 * ║                                                                  ║
 * ║  'active' (по умолчанию, запись не нужна) — обычная страница.    ║
 * ║                                                                  ║
 * ║  'unavailable' — позиция временно недоступна (нет сырья, сезон   ║
 * ║    закончился, но вернётся). Страница остаётся, отдаёт 200,      ║
 * ║    показывает плашку «Временно недоступно», в JSON-LD            ║
 * ║    availability = OutOfStock, остаётся в sitemap.xml.            ║
 * ║    Статус unavailable также выставляется АВТОМАТИЧЕСКИ, если в   ║
 * ║    menu.json у позиции available:false — записи здесь не нужно.  ║
 * ║                                                                  ║
 * ║  'archived' — позиция снята навсегда. Страница больше не         ║
 * ║    открывается: если есть replacedBy (id позиции-замены) —       ║
 * ║    постоянный редирект (301) на неё, иначе — 410 Gone. НИКОГДА   ║
 * ║    не редиректить на главную (Google считает это «мягким 404»).  ║
 * ║    Из sitemap.xml исключается. Редирект/410 для архивной         ║
 * ║    позиции отрабатывает proxy.ts по data/redirects.ts — при      ║
 * ║    архивации позиции добавить её адреса (на всех трёх языках)    ║
 * ║    в REDIRECTS (есть замена) или GONE (замены нет) ТАМ ЖЕ.       ║
 * ║                                                                  ║
 * ║  Страницы «скоро в меню» (суши и т.п.) НЕ создаём: пока позиции  ║
 * ║  нет в menu.json — нет и страницы.                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
export type ItemStatus = 'active' | 'unavailable' | 'archived';

export interface ItemStatusEntry {
  status: ItemStatus;
  /** id позиции-замены (только для archived): на её адрес пойдёт 301. */
  replacedBy?: string;
}

/** Только позиции с НЕобычным статусом. Пример: 'old-id': { status: 'archived', replacedBy: 'new-id' }. */
export const ITEM_STATUS: Record<string, ItemStatusEntry> = {};
