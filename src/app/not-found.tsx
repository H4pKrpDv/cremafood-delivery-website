/**
 * app/not-found.tsx — корневая «страховка» 404 (05.10.2026).
 *
 * Полноценная 404 с шапкой, футером и переводами — app/[lang]/not-found.tsx
 * (в неё попадают все несуществующие адреса через app/[lang]/[...rest]).
 * Сюда доходит только то, что не смогла обработать локализованная ветка
 * (практически — недопустимое значение [lang]). Корневой layout
 * (app/layout.tsx) «сквозной» и <html> не рендерит, поэтому эта страница
 * сама содержит <html>/<body> — минимальная, без зависимостей от
 * контекста языка (тот же подход, что и у app/global-error.tsx).
 */

export default function RootNotFound() {
  return (
    <html lang="ru">
      <head>
        <title>Crema Food — страница не найдена</title>
        <meta name="robots" content="noindex" />
      </head>
      <body style={{ margin: 0, background: '#130e09', color: '#f0dfc8', fontFamily: 'Georgia, serif' }}>
        <section
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1.25rem',
            textAlign: 'center'
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <p style={{ fontSize: '4rem', margin: 0, color: '#c8964a' }}>404</p>
            <h1 style={{ fontSize: '1.5rem', margin: '0.5rem 0 1rem' }}>Страница не найдена</h1>
            {/* Обычный <a>, а не next/link: на странице нет ни контекста
                приложения, ни стилей сайта, а переход на главную должен
                работать всегда. */}
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.75rem',
                borderRadius: 8,
                background: '#c8964a',
                color: '#1c1410',
                textDecoration: 'none'
              }}
            >
              На главную
            </a>
          </div>
        </section>
      </body>
    </html>
  );
}
