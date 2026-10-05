/**
 * components/ThemeEffect.tsx
 * ------------------------------------------------------------------
 * Держит <html data-theme="..."> в синхроне со store/themeStore.ts.
 * Рендерит null — служит только для побочного эффекта над DOM (из
 * вложенного клиентского компонента достать до <html> иначе нельзя —
 * его рендерит серверный app/layout.tsx).
 *
 * ПЕРВОЕ значение атрибута (до отрисовки) ставит НЕ этот компонент, а
 * inline-скрипт в <head> (lib/themeInitScript.ts) — иначе при каждой
 * загрузке было бы мигание (подробно — в комментарии store/themeStore.ts).
 * До гидратации стора этот компонент атрибут не трогает вовсе: стор до
 * гидратации всегда отдаёт дефолт 'light', и запись его в DOM затёрла бы
 * тёмную тему, уже поставленную скриптом. Тему в эффекте читаем через
 * getState(), а не из замыкания — между гидратацией и подпиской на стор
 * замыкание может на один рендер отставать.
 * ------------------------------------------------------------------
 */

'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useThemeStore, useThemeHydrated } from '@/store/themeStore';
import { THEME_STORAGE_KEY } from '@/lib/themeInitScript';

export function ThemeEffect() {
  const theme = useThemeStore((s) => s.theme);
  const hydrated = useThemeHydrated();

  // 05.10.2026 — мигание светлой темой на 404. Серверная оболочка 404
  // (<html id="__next_error__">) не совпадает с деревом layout, поэтому
  // React отбрасывает гидратацию и рендерит дерево заново на клиенте — а
  // при этом СНИМАЕТ все атрибуты с <html>, включая data-theme, выставленный
  // inline-скриптами. Стор zustand в этот момент ещё не гидратирован
  // (hydrated=false), и до его гидратации тема оставалась светлой — на
  // 1–2 кадра (в них же счётчик корзины показывает 0 вместо реального).
  // useLayoutEffect выполняется в том же коммите, ДО отрисовки кадра, и
  // возвращает атрибут напрямую из localStorage, не дожидаясь стора.
  // На обычных страницах ничего не меняет (атрибут уже стоит).
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw && JSON.parse(raw)?.state?.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch {
      /* localStorage недоступен или повреждён — остаётся светлая тема */
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute('data-theme', useThemeStore.getState().theme);
  }, [theme, hydrated]);

  return null;
}
