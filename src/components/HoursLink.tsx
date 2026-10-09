/**
 * components/HoursLink.tsx
 * ------------------------------------------------------------------
 * 10.10.2026. Ссылка «график доставки» в SEO-текстах (токен `hours`). График
 * живёт в двух местах: на мобильных (<769px) — в бургер-меню, на десктопе —
 * в футере. Поэтому на мобильном клик открывает бургер (Header слушает
 * событие CREMA_OPEN_SCHEDULE_EVENT) и показывает график, а на десктопе —
 * обычный переход к якорю футера (#delivery-hours). Без JS остаётся обычная
 * ссылка на якорь.
 * ------------------------------------------------------------------
 */

'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';

export const CREMA_OPEN_SCHEDULE_EVENT = 'crema:open-schedule';

export function HoursLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 768px)').matches) return;
    event.preventDefault();
    window.dispatchEvent(new CustomEvent(CREMA_OPEN_SCHEDULE_EVENT));
  }
  return (
    <Link href={href} className={className} prefetch={false} onClick={onClick}>
      {children}
    </Link>
  );
}
