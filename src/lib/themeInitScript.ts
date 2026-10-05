/**
 * lib/themeInitScript.ts
 * ------------------------------------------------------------------
 * Текст inline-скрипта, который app/layout.tsx кладёт в <head>. Выполняется
 * СИНХРОННО до первой отрисовки страницы и, если пользователь ранее выбрал
 * тёмную тему, сразу ставит data-theme="dark" на <html> — чтобы тёмная тема
 * была применена с самого первого кадра, а не после гидратации React
 * (иначе — мигание светлой темы, см. комментарий в store/themeStore.ts).
 *
 * Светлая тема — базовая (:root в globals.css), для неё атрибут не нужен:
 * если в localStorage ничего нет, ключ повреждён или localStorage
 * недоступен (приватный режим и т.п.) — молча остаётся светлая.
 *
 * Читает тот же ключ и формат, что пишет zustand persist:
 * {"state":{"theme":"dark"},"version":0}.
 * Файл без 'use client' — используется в серверном layout.tsx и в сторе.
 * ------------------------------------------------------------------
 */

export const THEME_STORAGE_KEY = 'crema_theme';

export const themeInitScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(s&&JSON.parse(s).state.theme==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;

/**
 * Скрипт «починки» <html> для первого элемента <body> (05.10.2026).
 *
 * Зачем. На страницах 404 (и при ошибках рендера на сервере) Next.js отдаёт
 * аварийную оболочку: серверный HTML начинается с голого
 * <html id="__next_error__"> — БЕЗ lang, без классов шрифтов и, главное,
 * без нашего <head> с themeInitScript (head из [lang]/layout.tsx в эту
 * оболочку не попадает, а содержимое <body> — шапка, футер, текст 404 — попадает).
 * В итоге страница рисовалась светлой (база :root), а тёмная тема включалась
 * только после гидратации — отсюда «белая вспышка» на 404.
 *
 * Этот скрипт кладётся ПЕРВЫМ ребёнком <body>, поэтому выполняется до
 * отрисовки остального содержимого и в обычной, и в аварийной оболочке:
 * ставит lang и классы шрифтов (чтобы шрифты не мигали фолбэком), затем
 * тот же data-theme, что и скрипт в <head>. Повторное выполнение
 * безвредно (всё идемпотентно): на обычных страницах он просто
 * подтверждает то, что уже поставил head-скрипт.
 */
export function buildHtmlBootScript(lang: string, className: string): string {
  return (
    themeInitScript +
    `(function(){try{var e=document.documentElement;e.setAttribute('lang',${JSON.stringify(
      lang
    )});var c=${JSON.stringify(
      className
    )}.split(' ');for(var i=0;i<c.length;i++){if(c[i])e.classList.add(c[i]);}}catch(x){}})();`
  );
}
