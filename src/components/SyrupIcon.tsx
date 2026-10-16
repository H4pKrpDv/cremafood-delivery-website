/**
 * components/SyrupIcon.tsx
 * ------------------------------------------------------------------
 * 17.1.2026. Иконки вкусов сиропов (24×24, контур currentColor) — у
 * сиропов нет фото, ассоциацию с вкусом даёт иконка. Цвет вкуса задаётся
 * через CSS-переменную --syrup-color на самой иконке; контур подходит и
 * для светлой, и для тёмной темы. Черновые иконки — при желании можно
 * заменить на нарисованные дизайнером, API компонента не изменится.
 * ------------------------------------------------------------------
 */

import type { CSSProperties } from 'react';

const COLORS: Record<string, string> = {
  'green-banana': '#7da04a',
  caramel: '#c98a2b',
  'salted-caramel': '#b9772a',
  'chocolate-cookie': '#8a5a3b',
  coconut: '#b79c7e',
  hazelnut: '#a06a3c',
  vanilla: '#d2a640'
};

function Shape({ id }: { id: string }) {
  switch (id) {
    case 'green-banana':
      return (
        <>
          <path d="M4 14c1.2 4.6 8 6.4 13.4 2.2C20.6 13.8 21.4 10 20 6.5l-2 .9c.7 3-.7 6-3.6 7.8-3.2 2-6.8 1.7-9.4-.8z" />
          <path d="M20 6.5 21 4.5" />
        </>
      );
    case 'caramel':
      return (
        <>
          <path d="M12 3c3.2 4 6 7 6 10.5a6 6 0 0 1-12 0C6 10 8.8 7 12 3z" />
          <path d="M9.5 14.5a2.8 2.8 0 0 0 2.3 2.6" />
        </>
      );
    case 'salted-caramel':
      return (
        <>
          <path d="M10.5 5c2.6 3.3 5 5.8 5 8.8a5 5 0 0 1-10 0C5.5 10.8 7.9 8.3 10.5 5z" />
          <path d="M18 3.5l1 1-1 1-1-1z M20.5 8l.8.8-.8.8-.8-.8z M17.5 10l.8.8-.8.8-.8-.8z" />
        </>
      );
    case 'chocolate-cookie':
      return (
        <>
          <path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-4-4 4 4 0 0 1-5-5z" />
          <circle cx="9" cy="10" r=".9" fill="currentColor" />
          <circle cx="14" cy="15" r=".9" fill="currentColor" />
          <circle cx="8.5" cy="15.5" r=".9" fill="currentColor" />
          <circle cx="16" cy="11.5" r=".9" fill="currentColor" />
        </>
      );
    case 'coconut':
      return (
        <>
          <path d="M3 11a9 9 0 0 0 18 0z" />
          <path d="M3 11a9 4 0 0 1 18 0" />
          <path d="M8 15.5c1 .8 2.4 1.2 4 1.2" />
        </>
      );
    case 'hazelnut':
      return (
        <>
          <path d="M6 11c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5z" />
          <path d="M7.5 11c.2 4.8 1.9 8.5 4.5 8.5s4.3-3.7 4.5-8.5" />
          <path d="M12 5.5V3.5" />
        </>
      );
    case 'vanilla':
      // цветок ванили: пять лепестков вокруг сердцевины
      return (
        <>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 10V4.5a2.2 2.2 0 0 1 4 0c0 1.8-1.7 3.2-4 5.5" />
          <path d="M12 10V4.5a2.2 2.2 0 0 0-4 0c0 1.8 1.7 3.2 4 5.5" />
          <path d="M13.9 12.6l5.6 1.7a2.2 2.2 0 0 1-2.4 3.7c-1.4-.9-2.5-2.9-3.2-5.4z" />
          <path d="M10.1 12.6l-5.6 1.7a2.2 2.2 0 0 0 2.4 3.7c1.4-.9 2.5-2.9 3.2-5.4z" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="8" />;
  }
}

export function SyrupIcon({ id, size = 20, className }: { id: string; size?: number; className?: string }) {
  const style = { '--syrup-color': COLORS[id] ?? 'currentColor' } as CSSProperties;
  return (
    <svg
      className={`syrup-icon${className ? ` ${className}` : ''}`}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <Shape id={id} />
    </svg>
  );
}
