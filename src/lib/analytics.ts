/**
 * lib/analytics.ts
 * ------------------------------------------------------------------
 * Порт js/analytics.js (нативная версия, Этап 1 п.12, 22.09.2026) —
 * заготовка под аналитику. trackEvent(name, data) — единая точка входа
 * для любого будущего события на сайте. Сейчас делает только
 * console.info и тихо копит последние 50 событий в памяти (getLog() —
 * для ручной проверки в консоли браузера, не для продакшена). Когда
 * дойдёт реальная аналитика — внутрь допишется gtag(...)/fbq(...) в одну-
 * две строки, без единой правки в местах вызова (сейчас это
 * CheckoutModal.tsx, ветка ошибки отправки заказа — тот же первый вызов,
 * что был в нативной версии).
 *
 * Модуль клиентский (обращения к нему — только из 'use client'-
 * компонентов), но сам по себе не требует директивы 'use client': не
 * использует хуки/DOM, только замыкание с массивом-логом в памяти
 * модуля (переживает ре-рендеры, сбрасывается только при полной
 * перезагрузке страницы — то же поведение, что и у window.CremaAnalytics
 * в нативной версии).
 * ------------------------------------------------------------------
 */

export interface AnalyticsEvent {
  name: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const MAX_LOG_SIZE = 50;
const log: AnalyticsEvent[] = [];

export function trackEvent(name: string, data?: Record<string, unknown>): void {
  const event: AnalyticsEvent = {
    name,
    data: data || {},
    timestamp: new Date().toISOString()
  };

  log.push(event);
  if (log.length > MAX_LOG_SIZE) log.shift();

  // Заглушка — реальная отправка появится позже. console.info, а не
  // console.error/warn: это ожидаемое поведение заглушки, не сбой.
  // eslint-disable-next-line no-console
  console.info('[analytics] trackEvent:', name, event.data);
}

export function getLog(): AnalyticsEvent[] {
  return log.slice();
}
