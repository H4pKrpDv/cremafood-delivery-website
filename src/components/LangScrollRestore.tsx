/**
 * components/LangScrollRestore.tsx
 * ------------------------------------------------------------------
 * 05.10.2026. Сохраняет позицию прокрутки при смене языка.
 *
 * Язык теперь — часть адреса (/, /ro, /en), а переключатель в шапке —
 * обычные ссылки <a href>. Переход между ними — это именно переход между
 * разными корневыми layout'ами ([lang]/layout.tsx содержит <html>), то есть
 * полная загрузка страницы, и браузер открывает её сверху. Чтобы человек,
 * переключивший язык где-то в середине меню, не оказывался в самом верху,
 * перед переходом запоминаем scrollY в sessionStorage
 * (rememberScrollForLangSwitch(), вызывается из Header), а здесь — после
 * загрузки новой страницы, ДО её отрисовки (useLayoutEffect) — возвращаем.
 *
 * Высота страницы к этому моменту уже правильная: выбранная категория и
 * подкатегория меню отображаются с первого кадра (inline-скрипт в <head>,
 * см. lib/menuCategoryPersist.ts), а язык на высоту не влияет. Запись
 * живёт 15 секунд — если пользователь не доехал до страницы (или открыл
 * её позже), старая позиция не применится.
 * ------------------------------------------------------------------
 */

'use client';

import { useLayoutEffect } from 'react';

const STORAGE_KEY = 'crema_lang_switch_scroll';
const MAX_AGE_MS = 15_000;

/** Вызвать прямо перед переходом на другую языковую версию. */
export function rememberScrollForLangSwitch(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ y: window.scrollY, t: Date.now() }));
  } catch {
    // Хранилище недоступно — страница просто откроется сверху.
  }
}

export function LangScrollRestore() {
  useLayoutEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      window.sessionStorage.removeItem(STORAGE_KEY);
      const saved = JSON.parse(raw) as { y?: unknown; t?: unknown };
      if (typeof saved.y !== 'number' || typeof saved.t !== 'number') return;
      if (Date.now() - saved.t > MAX_AGE_MS) return;
      window.scrollTo(0, saved.y);
    } catch {
      // Битая запись/недоступное хранилище — не критично.
    }
  }, []);

  return null;
}
