import type { ReactNode } from 'react';

/**
 * app/layout.tsx — «сквозной» корневой layout (05.10.2026).
 *
 * Настоящий корневой layout с <html>/<body>, шрифтами, метаданными, шапкой и
 * футером теперь лежит в app/[lang]/layout.tsx: язык (/, /ro, /en) —
 * динамический сегмент, и атрибут <html lang> должен ставиться на сервере
 * по адресу (для SEO), а значит <html> обязан рендерить layout, знающий
 * параметр lang. Этот файл остаётся только затем, чтобы рядом мог жить
 * корневой app/not-found.tsx (последняя страховка 404, см. его комментарий)
 * — Next.js требует корневой layout в app/. Он ничего не оборачивает и
 * просто возвращает children (штатный приём для локализованных сайтов).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
