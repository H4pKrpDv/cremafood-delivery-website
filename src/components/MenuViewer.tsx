/**
 * components/MenuViewer.tsx
 * ------------------------------------------------------------------
 * 10.10.2026. Онлайн-просмотр страниц полного меню на /full-menu вместо PDF
 * (идея — andys.md/restaurantmenu): картинки страниц листаются свайпом,
 * стрелками на экране и клавишами ← →; под страницей — счётчик «3 из 6» и
 * лента миниатюр. Без библиотек: нативная прокрутка со scroll-snap, так что
 * жесты и инерция — системные, а страницу (в отличие от PDF во встроенном
 * просмотрщике) можно увеличить обычным щипком.
 *
 * Страницы — data/fullMenu.json (image + thumb, пути как в menu.json, без
 * ведущего слэша; файлы лежат в public/img/full-menu/). Пока файлов нет, на
 * месте страниц заглушки (useImageFallback + манифест, как у остальных
 * картинок сайта) — запросов за несуществующими файлами нет.
 *
 * Загрузка: первые две страницы — сразу (loading="eager" у первой, остальные
 * lazy), у каждого <img> заданы width/height (нет «прыжков» вёрстки).
 * alt у страницы — «Меню Crema Food, страница N из M»: текст на картинках
 * поисковики не читают.
 *
 * Активная страница считается по scrollLeft (rAF-троттлинг); клик по
 * миниатюре/стрелке — scrollTo со smooth (без анимации при
 * prefers-reduced-motion). Активная миниатюра прокручивается в поле зрения
 * ТОЛЬКО по горизонтали (scrollTo у ленты) — scrollIntoView дёргал бы всю
 * страницу по вертикали.
 * ------------------------------------------------------------------
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { hasRealImage, publicImagePath } from '@/lib/data';
import { useImageFallback } from '@/lib/useImageFallback';
import fullMenu from '@/data/fullMenu.json';

interface MenuPageImage {
  id: string;
  image: string;
  thumb: string;
}

const PAGES = (fullMenu as { pages: MenuPageImage[] }).pages;

// Размер заглушки/страницы (пропорция листа меню 2:3 — как у типичного A5/A4-
// макета; реальные страницы с другой пропорцией просто впишутся object-fit).
const PAGE_W = 800;
const PAGE_H = 1200;

function Slide({ page, index, total }: { page: MenuPageImage; index: number; total: number }) {
  const { t } = useI18n();
  const img = useImageFallback(publicImagePath(page.image), hasRealImage(page.image));
  return (
    <li
      className="menu-viewer__slide"
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} ${t('fullMenu.pageOf')} ${total}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.src}
        alt={`${t('fullMenu.pageAlt')} ${index + 1} ${t('fullMenu.pageOf')} ${total}`}
        className={`menu-viewer__img${img.imgClassName ? ` ${img.imgClassName}` : ''}`}
        width={PAGE_W}
        height={PAGE_H}
        loading={index === 0 ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onError={img.onError}
      />
    </li>
  );
}

function Thumb({
  page,
  index,
  active,
  onSelect
}: {
  page: MenuPageImage;
  index: number;
  active: boolean;
  onSelect: (index: number) => void;
}) {
  const { t } = useI18n();
  const img = useImageFallback(publicImagePath(page.thumb), hasRealImage(page.thumb));
  return (
    <button
      type="button"
      className={`menu-viewer__thumb${active ? ' menu-viewer__thumb--active' : ''}`}
      aria-label={`${t('fullMenu.goTo')} ${index + 1}`}
      aria-current={active ? 'true' : undefined}
      onClick={() => onSelect(index)}
      data-thumb={index}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.src}
        alt=""
        className={`menu-viewer__thumb-img${img.imgClassName ? ` ${img.imgClassName}` : ''}`}
        width={96}
        height={144}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={img.onError}
      />
    </button>
  );
}

export function MenuViewer() {
  const { t } = useI18n();
  const total = PAGES.length;
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLUListElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const reducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const next = Math.max(0, Math.min(total - 1, index));
      track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
    },
    [total]
  );

  // Активная страница — по положению прокрутки (свайп, стрелки и клики сходятся
  // в одном месте). Один пересчёт на кадр.
  const onScroll = () => {
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      const track = trackRef.current;
      if (!track || track.clientWidth === 0) return;
      setActive(Math.max(0, Math.min(total - 1, Math.round(track.scrollLeft / track.clientWidth))));
    });
  };

  useEffect(
    () => () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    },
    []
  );

  // Активная миниатюра — в центр ленты (только горизонтальная прокрутка ленты).
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.querySelector<HTMLElement>(`[data-thumb="${active}"]`);
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2;
    strip.scrollTo({ left, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [active]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(active - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(active + 1);
    }
  };

  return (
    <section className="menu-viewer" aria-roledescription="carousel" aria-label={t('fullMenu.viewerLabel')}>
      <div className="menu-viewer__stage" tabIndex={0} onKeyDown={onKeyDown}>
        <button
          type="button"
          className="menu-viewer__nav menu-viewer__nav--prev"
          aria-label={t('fullMenu.prev')}
          disabled={active === 0}
          onClick={() => goTo(active - 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <ul className="menu-viewer__track" ref={trackRef} onScroll={onScroll}>
          {PAGES.map((page, index) => (
            <Slide key={page.id} page={page} index={index} total={total} />
          ))}
        </ul>
        <button
          type="button"
          className="menu-viewer__nav menu-viewer__nav--next"
          aria-label={t('fullMenu.next')}
          disabled={active === total - 1}
          onClick={() => goTo(active + 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <p className="menu-viewer__counter" aria-live="polite">
        {active + 1} {t('fullMenu.pageOf')} {total}
      </p>
      <div className="menu-viewer__thumbs" ref={thumbsRef} role="group" aria-label={t('fullMenu.thumbsLabel')}>
        {PAGES.map((page, index) => (
          <Thumb key={page.id} page={page} index={index} active={index === active} onSelect={goTo} />
        ))}
      </div>
    </section>
  );
}
