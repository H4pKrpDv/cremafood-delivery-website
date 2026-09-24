/**
 * components/Hero.tsx — карусель + текстовый блок первого экрана.
 * Порт секции .hero из build/template.html.
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { HeroCarousel } from './HeroCarousel';

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="hero">
      <HeroCarousel />
      <div className="hero__content-wrap">
        <div className="hero__content">
          <p className="hero__eyebrow">{t('hero.eyebrow')}</p>
          <h1 className="hero__title">{t('hero.title')}</h1>
          <p className="hero__tagline">{t('hero.tagline')}</p>
          <a href="#menu" className="btn btn--primary">
            {t('hero.cta')}
          </a>
        </div>
        <div className="hero__scroll">
          <span>{t('hero.scrollHint')}</span>
          <span className="hero__arrow" aria-hidden="true">
            ↓
          </span>
        </div>
      </div>
    </section>
  );
}
