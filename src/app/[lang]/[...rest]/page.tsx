import { notFound } from 'next/navigation';

/**
 * app/[lang]/[...rest]/page.tsx — «ловушка» для любых несуществующих
 * адресов (05.10.2026). proxy.ts отправляет любой путь без префикса языка
 * на русскую версию (/foo → /ru/foo), а /ro/foo и /en/foo приходят сюда
 * как есть. Страницы нет → notFound() → показывается app/[lang]/not-found.tsx
 * ВНУТРИ [lang]/layout.tsx, то есть с настоящими Header/Footer на нужном
 * языке (так было и раньше — решение пользователя от 02.10.2026). Без этого
 * файла такие адреса попали бы в корневой app/not-found.tsx, у которого нет
 * ни шапки, ни переводов.
 */
export default function CatchAllNotFound() {
  notFound();
}
