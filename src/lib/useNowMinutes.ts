/**
 * lib/useNowMinutes.ts
 * ------------------------------------------------------------------
 * Порт "тикера" часов работы из js/hours.js (нативная версия): раз в
 * 30 сек + сразу при возврате вкладки в фокус (visibilitychange, на
 * случай если ноутбук/телефон был в сне и обычный интервал внутри
 * спящей вкладки не тикал надёжно) — пересчитывает текущее время в
 * минутах (Europe/Chisinau) и триггерит перерисовку всего, что зависит
 * от часов работы отделов (степперы в сетке меню, попап корзины, форма
 * чекаута — те же три места, что слушали "crema:hourscheck" в нативной
 * версии).
 * ------------------------------------------------------------------
 */

'use client';

import { useEffect, useState } from 'react';
import { getNowMinutes } from './hours';

const RECHECK_INTERVAL_MS = 30000;

export function useNowMinutes(): number {
  const [nowMinutes, setNowMinutes] = useState<number>(() => getNowMinutes());

  useEffect(() => {
    const tick = () => setNowMinutes(getNowMinutes());
    const intervalId = window.setInterval(tick, RECHECK_INTERVAL_MS);
    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    // Пересчитать сразу на маунте — на случай если между первым useState()
    // (на сервере/при гидратации) и монтированием прошло заметное время.
    tick();
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return nowMinutes;
}
