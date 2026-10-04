/**
 * store/themeStore.ts
 * ------------------------------------------------------------------
 * Zustand-хранилище темы оформления (светлая/тёмная) с persist в
 * localStorage — тот же паттерн, что и store/cartStore.ts (skipHydration +
 * ручная гидратация через useThemeHydrated()).
 *
 * ТЕМА ПО УМОЛЧАНИЮ — СВЕТЛАЯ (04.10.2026; раньше при первом визите
 * бралась системная тема устройства через matchMedia). Пока пользователь
 * сам не нажал переключатель, в localStorage ничего не пишется и сайт
 * светлый; после первого нажатия в 'crema_theme' лежит выбор пользователя
 * ({"state":{"theme":"dark"},"version":0}) и применяется при каждом
 * следующем заходе.
 *
 * ПОЧЕМУ БЫЛО МИГАНИЕ. Серверный HTML и первый клиентский рендер не знают,
 * что лежит в localStorage (SSR его не видит), поэтому раньше всегда
 * рисовалась тёмная тема, а настоящая применялась только в useEffect после
 * гидратации стора — то есть через 100–200 мс после первой отрисовки
 * (видно на видеозаписи пользователя). Одной сменой дефолта это не
 * лечится (мигали бы уже те, кто выбрал тёмную). Настоящее решение —
 * выставить data-theme на <html> СИНХРОННЫМ inline-скриптом в <head>
 * (app/layout.tsx, themeInitScript из lib/themeInitScript.ts) ДО первой
 * отрисовки, читая тот же ключ localStorage напрямую. Стор и
 * components/ThemeEffect.tsx после гидратации лишь подхватывают уже
 * применённое значение и синхронизируют последующие переключения.
 * ------------------------------------------------------------------
 */

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/themeInitScript';

export type Theme = 'light' | 'dark';

interface ThemeStoreState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' })
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true
    }
  )
);

// Хук гидратации — тот же приём, что useCartHydrated() (store/cartStore.ts):
// обращение к persist вынесено внутрь useEffect (на сервере/при prerender
// API persist может отсутствовать).
export function useThemeHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = useThemeStore.persist;
    if (!persistApi) {
      // Защитный фолбэк — не блокируем интерфейс в "не гидратировано" навсегда.
      setHydrated(true);
      return;
    }

    if (persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }

    const unsubscribe = persistApi.onFinishHydration(() => setHydrated(true));
    persistApi.rehydrate();
    return unsubscribe;
  }, []);

  return hydrated;
}
