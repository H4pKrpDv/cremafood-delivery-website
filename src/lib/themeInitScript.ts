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
