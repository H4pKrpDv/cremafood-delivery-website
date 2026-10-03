/**
 * store/themeStore.ts
 * ------------------------------------------------------------------
 * Zustand-хранилище темы оформления (тёмная/светлая) с persist в
 * localStorage — тот же паттерн, что и store/cartStore.ts (skipHydration +
 * ручная гидратация через useThemeHydrated(), см. подробный комментарий
 * там же про useCartHydrated(): SSR не имеет доступа ни к localStorage,
 * ни к системным настройкам пользователя, поэтому первый серверный рендер
 * всегда "тёмная тема" (значение по умолчанию ниже совпадает с базовыми
 * стилями :root в globals.css без модификатора [data-theme="light"]) —
 * реальная тема применяется сразу после монтирования на клиенте, см.
 * components/ThemeEffect.tsx.
 *
 * Если в localStorage ещё нет сохранённого значения (первый визит на
 * сайт) — при гидратации один раз берём системную/браузерную настройку
 * через matchMedia('(prefers-color-scheme: light)') и сразу сохраняем её
 * как пользовательский выбор (тот же эффект, что и у ручного переключения
 * тумблером). Дальше она живёт как обычный выбор пользователя и не
 * синхронизируется с ОС повторно — "дефолтная тема" означает стартовое
 * значение при первом визите, а не постоянное отслеживание системной темы.
 * ------------------------------------------------------------------
 */

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeStoreState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'crema_theme';

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' })
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true
    }
  )
);

// Хук гидратации — тот же приём, что useCartHydrated() (store/cartStore.ts).
// Дополнительно (в отличие от корзины): если ДО гидратации в сторе не было
// реального сохранённого значения (первый визит), подставляем системную
// тему пользователя вместо дефолтного 'dark'.
export function useThemeHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = useThemeStore.persist;
    if (!persistApi) {
      // Защитный фолбэк на случай отсутствия API persist в рантайме —
      // не блокируем интерфейс в состоянии "не гидратировано" навсегда.
      setHydrated(true);
      return;
    }

    function applySystemDefaultIfFirstVisit() {
      let hasStoredValue = false;
      try {
        hasStoredValue = window.localStorage.getItem(STORAGE_KEY) !== null;
      } catch {
        /* localStorage недоступен (приватный режим и т.п.) — считаем это первым визитом */
      }
      if (!hasStoredValue && typeof window.matchMedia === 'function') {
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        useThemeStore.getState().setTheme(prefersLight ? 'light' : 'dark');
      }
      setHydrated(true);
    }

    if (persistApi.hasHydrated()) {
      applySystemDefaultIfFirstVisit();
      return;
    }

    const unsubscribe = persistApi.onFinishHydration(applySystemDefaultIfFirstVisit);
    persistApi.rehydrate();
    return unsubscribe;
  }, []);

  return hydrated;
}
