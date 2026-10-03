/**
 * components/ThemeEffect.tsx
 * ------------------------------------------------------------------
 * Применяет текущую тему (store/themeStore.ts) к <html data-theme="...">.
 * Рендерит null — компонент не выводит разметку, служит только для
 * побочного эффекта над DOM (менять атрибут самого <html> из вложенного
 * клиентского компонента можно только так — пропом через серверный
 * app/layout.tsx это не передать).
 *
 * До гидратации стора атрибут не трогаем вовсе, поэтому первый серверный
 * и первый клиентский рендер совпадают (оба — тёмная тема без атрибута,
 * см. :root в globals.css) — без hydration mismatch и без мигания темы
 * для пользователей с тёмной темой устройства. Для пользователей со
 * светлой темой устройства короткая вспышка тёмной темы на один тик при
 * монтировании возможна — тот же осознанный компромисс, на который уже
 * пошли для корзины (см. комментарий в store/cartStore.ts).
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
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, hydrated]);

  return null;
}
