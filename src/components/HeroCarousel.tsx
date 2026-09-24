/**
 * components/HeroCarousel.tsx
 * ------------------------------------------------------------------
 * Порт js/gallery.js — автопрокрутка ~7 сек, стрелки, свайп (touch),
 * точки-индикаторы, зацикленная, пауза на наведении/фокусе и во время
 * свайпа, таймер стартует заново после любого ручного переключения.
 * 4 слайда-плейсхолдера (цветные градиенты в globals.css, классы
 * .hero__carousel-slide--1..4), подписи локализуются через t().
 * ------------------------------------------------------------------
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';

const AUTOPLAY_MS = 7000;
const SWIPE_THRESHOLD_PX = 40;
const SLIDE_COUNT = 4;

export function HeroCarousel() {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((newIndex: number) => {
    setIndex(((newIndex % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  const stopAutoplay = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    timerRef.current = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDE_COUNT);
    }, AUTOPLAY_MS);
  }, [stopAutoplay]);

  useEffect(() => {
    startAutoplay();
    return stopAutoplay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function manualGoTo(newIndex: number) {
    goTo(newIndex);
    startAutoplay();
  }

  function handleTouchStart(event: React.TouchEvent) {
    touchStartXRef.current = event.touches[0].clientX;
    stopAutoplay();
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
      manualGoTo(deltaX < 0 ? index + 1 : index - 1);
    } else {
      startAutoplay();
    }
    touchStartXRef.current = null;
  }

  const captions = [
    t('heroCarousel.slide1.caption'),
    t('heroCarousel.slide2.caption'),
    t('heroCarousel.slide3.caption'),
    t('heroCarousel.slide4.caption')
  ];

  return (
    <div
      className="hero__carousel"
      id="heroCarousel"
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={t('heroCarousel.ariaLabel')}
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
      onFocus={stopAutoplay}
      onBlur={startAutoplay}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="hero__carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {captions.map((caption, i) => (
          <div
            key={i}
            className={`hero__carousel-slide hero__carousel-slide--${i + 1}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${SLIDE_COUNT}`}
          >
            <p className="hero__carousel-caption">{caption}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="hero__carousel-arrow hero__carousel-arrow--prev"
        aria-label={t('heroCarousel.prevSlide')}
        onClick={() => manualGoTo(index - 1)}
      >
        ‹
      </button>
      <button
        type="button"
        className="hero__carousel-arrow hero__carousel-arrow--next"
        aria-label={t('heroCarousel.nextSlide')}
        onClick={() => manualGoTo(index + 1)}
      >
        ›
      </button>
      <div className="hero__carousel-dots" role="tablist" aria-label="Выбор слайда">
        {captions.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`hero__carousel-dot${i === index ? ' hero__carousel-dot--active' : ''}`}
            data-slide={i}
            role="tab"
            aria-selected={i === index}
            aria-label={t(`heroCarousel.dot${i + 1}`)}
            onClick={() => manualGoTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
