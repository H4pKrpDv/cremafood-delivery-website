/**
 * lib/hours.ts
 * ------------------------------------------------------------------
 * Порт js/hours.js (нативная версия) на TypeScript — единый источник
 * правды по часам работы отделов (кухня/бар), используется:
 *   - на клиенте (карточка товара в сетке, попап корзины, форма чекаута) —
 *     через хук useNowMinutes(), который тикает раз в 30 сек и при
 *     возврате вкладки в фокус (visibilitychange), как и в нативной версии;
 *   - на сервере (app/api/orders/route.ts) — считает часы работы ещё раз
 *     на момент запроса, не доверяя клиенту (клиент мог бы подделать
 *     локальное время устройства).
 *
 * Все функции принимают nowMinutes уже посчитанным (см. getNowMinutes()) —
 * это дешёвая чистая арифметика, поэтому вызывающий код сам решает, как
 * часто её пересчитывать, вместо того чтобы каждая функция лезла в
 * Intl.DateTimeFormat заново.
 *
 * Таймзона строго Europe/Chisinau — НЕ локальная таймзона браузера/сервера
 * (иначе турист с другим системным часовым поясом или сервер в другом
 * регионе увидели бы неверные часы работы).
 * ------------------------------------------------------------------
 */

import type { DepartmentValue } from '@/types/menu';

const TIMEZONE = 'Europe/Chisinau';

export interface DepartmentHoursRange {
  openMinutes: number;
  closeMinutes: number;
}

// Время в минутах от полуночи.
export const DEPARTMENT_HOURS: Record<string, DepartmentHoursRange> = {
  kitchen: { openMinutes: 9 * 60, closeMinutes: 2 * 60 }, // 09:00–02:00 (через полночь)
  bar: { openMinutes: 7 * 60, closeMinutes: 22 * 60 } // 07:00–22:00
};

export function getNowMinutes(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === 'hour') hour = parseInt(part.value, 10) || 0;
    if (part.type === 'minute') minute = parseInt(part.value, 10) || 0;
  }
  return hour * 60 + minute;
}

export function normalizeDepartments(department: DepartmentValue): string[] {
  if (!department) return [];
  if (Array.isArray(department)) return department.filter(Boolean);
  return String(department)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isSingleDepartmentOpen(departmentId: string, nowMinutes: number): boolean {
  const range = DEPARTMENT_HOURS[departmentId];
  // Неизвестный/незаданный отдел — не блокируем по ошибке конфигурации
  // (лучше по умолчанию считать открытым, чем случайно "выключить" продажи
  // из-за опечатки в menu.json).
  if (!range) return true;
  if (range.openMinutes <= range.closeMinutes) {
    return nowMinutes >= range.openMinutes && nowMinutes < range.closeMinutes;
  }
  // Интервал через полночь (кухня: 09:00–02:00).
  return nowMinutes >= range.openMinutes || nowMinutes < range.closeMinutes;
}

// Открыт товар, только если открыты ВСЕ перечисленные отделы.
export function isOpen(department: DepartmentValue, nowMinutes: number): boolean {
  const departments = normalizeDepartments(department);
  if (!departments.length) return true;
  return departments.every((dep) => isSingleDepartmentOpen(dep, nowMinutes));
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

// Для плашки "Будет доступно с HH:MM" — если закрыто несколько отделов сразу
// (позиция требует и кухню, и бар), берём САМОЕ ПОЗДНЕЕ время открытия среди
// закрытых прямо сейчас отделов — именно тогда позиция реально станет
// доступна целиком.
export function getOpenTimeLabel(department: DepartmentValue, nowMinutes: number): string {
  const departments = normalizeDepartments(department);
  const closedRanges = departments
    .filter((dep) => !isSingleDepartmentOpen(dep, nowMinutes))
    .map((dep) => DEPARTMENT_HOURS[dep])
    .filter((r): r is DepartmentHoursRange => Boolean(r));
  if (!closedRanges.length) return '';
  const latestOpenMinutes = closedRanges.reduce((max, range) => (range.openMinutes > max ? range.openMinutes : max), 0);
  return formatMinutes(latestOpenMinutes);
}
