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

import { useEffect } from 'react';
import { useThemeStore, useThemeHydrated } from '@/store/themeStore';

export function ThemeEffect() {
  const theme = useThemeStore((s) => s.theme);
  const hydrated = useThemeHydrated();

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute('data-theme', useThemeStore.getState().theme);
  }, [theme, hydrated]);

  return null;
}
