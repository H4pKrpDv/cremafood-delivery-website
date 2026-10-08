/**
 * components/SeoText.tsx
 * ------------------------------------------------------------------
 * 08.10.2026. Блок SEO-текста внизу страницы, перед футером (как на
 * cappi.ua): заголовок и первый абзац видны всегда, остальное раскрывается
 * кнопкой «Читать далее» (нативный <details> — без JS и без гидратации).
 *
 * СЕРВЕРНЫЙ компонент (без 'use client'): весь текст, включая скрытую
 * часть, и все внутренние ссылки попадают в HTML ответа — это то, что
 * видят поисковые роботы. Тексты и разбор мини-разметки — lib/seoTexts.ts
 * (данные — data/seo/<язык>.json), ссылки строятся под язык страницы
 * (next/link работает и в серверных компонентах).
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import { createTranslator } from '@/lib/i18nCore';
import type { Lang } from '@/lib/i18nConfig';
import { getSeoLines, parseSeoBlocks, type SeoBlock, type SeoInline } from '@/lib/seoTexts';

function Inline({ parts }: { parts: SeoInline[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.href ? (
          <Link key={index} href={part.href} className="seo-text__link" prefetch={false}>
            {part.text}
          </Link>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}

function Block({ block }: { block: SeoBlock }) {
  if (block.type === 'h2') return <h2 className="seo-text__h2">{block.text}</h2>;
  if (block.type === 'h3') return <h3 className="seo-text__h3">{block.text}</h3>;
  if (block.type === 'p') {
    return (
      <p className="seo-text__p">
        <Inline parts={block.inline} />
      </p>
    );
  }
  if (block.type !== 'ul') return null;
  return (
    <ul className="seo-text__list">
      {block.items.map((item, index) => (
        <li key={index}>
          <Inline parts={item} />
        </li>
      ))}
    </ul>
  );
}

export function SeoText({ lang, textKey }: { lang: Lang; textKey: string }) {
  const lines = getSeoLines(lang, textKey);
  if (!lines) return null;
  const blocks = parseSeoBlocks(lang, lines);
  if (blocks.length === 0) return null;
  const t = createTranslator(lang);

  // Видимая часть — всё до конца первого абзаца после первого заголовка
  // (обычно H2 + вступление); остальное прячется под «Читать далее».
  const firstParagraph = blocks.findIndex((block) => block.type === 'p');
  const splitAt = firstParagraph === -1 ? blocks.length : firstParagraph + 1;
  const intro = blocks.slice(0, splitAt);
  const rest = blocks.slice(splitAt);

  return (
    <section className="seo-text" aria-label={t('seoText.label')}>
      <div className="container">
        <div className="seo-text__card">
          {intro.map((block, index) => (
            <Block key={`i${index}`} block={block} />
          ))}
          {rest.length > 0 ? (
            <details className="seo-text__more">
              <summary className="seo-text__toggle">
                <span className="seo-text__toggle-open">{t('seoText.readMore')}</span>
                <span className="seo-text__toggle-close">{t('seoText.hide')}</span>
              </summary>
              {rest.map((block, index) => (
                <Block key={`r${index}`} block={block} />
              ))}
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}
