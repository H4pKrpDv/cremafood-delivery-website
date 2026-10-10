import { notFound } from 'next/navigation';

/**
 * app/[lang]/menu/page.tsx — СТАРЫЙ адрес страницы «Полное меню».
 * 10.10.2026: страница переехала на /full-menu (app/[lang]/full-menu/page.tsx),
 * а /menu, /ro/menu и /en/menu отдают 301 на новый адрес ещё в proxy.ts
 * (data/redirects.ts), так что сюда запрос не доходит. Файл оставлен только
 * потому, что ассистент не может удалить файл на диске пользователя —
 * папку src/app/[lang]/menu целиком можно безопасно удалить.
 */
export default function OldMenuRoutePage() {
  notFound();
}
