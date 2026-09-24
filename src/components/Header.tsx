/**
 * components/Header.tsx
 * ------------------------------------------------------------------
 * Порт шапки сайта из build/template.html + js/main.js (бургер-меню,
 * выпадающий список языка на десктопе, счётчик корзины) — нативная
 * версия слушала клики по document с делегированием, здесь то же
 * поведение через обычные React-обработчики + один useEffect на
 * "клик вне списка языка" (аналог initLangDropdown()).
 * ------------------------------------------------------------------
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { useCartStore, useCartHydrated } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import type { Lang } from '@/lib/i18nCore';

const LANGS: Lang[] = ['ru', 'ro', 'en'];

export function Header() {
  const { t, lang, setLang } = useI18n();
  const openCart = useUIStore((s) => s.openCart);
  const hydrated = useCartHydrated();
  const count = useCartStore((s) =>
    Object.values(s.items).reduce((sum, entry) => sum + (typeof entry.qty === 'number' ? entry.qty : 0), 0)
  );

  const [burgerOpen, setBurgerOpen] = useState(false);
  const [langListOpen, setLangListOpen] = useState(false);
  const langSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!langListOpen) return;
      const target = event.target as Node;
      if (langSwitcherRef.current && !langSwitcherRef.current.contains(target)) {
        setLangListOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setLangListOpen(false);
        setBurgerOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [langListOpen]);

  function selectLang(next: Lang) {
    setLang(next);
    setLangListOpen(false);
    setBurgerOpen(false);
  }

  const displayedCount = hydrated ? count : 0;

  return (
    <header className="header" id="top">
      <div className="header__inner">
        <a href="#top" className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo__mark" src="/img/logo.png" alt="" aria-hidden="true" width={34} height={34} />
          <span className="logo__text">Crema Food</span>
        </a>
        <div className="header__actions">
          <nav className="nav">
            <a href="tel:+37361088777" className="nav__link">
              {t('header.phone')}
            </a>
            <a href="#delivery-hours" className="nav__link">
              {t('header.deliverySchedule')}
            </a>
            <div className="lang-switcher" ref={langSwitcherRef}>
              <button
                type="button"
                className="lang-switcher__toggle"
                aria-haspopup="listbox"
                aria-expanded={langListOpen}
                onClick={() => setLangListOpen((v) => !v)}
              >
                <span>{lang.toUpperCase()}</span>
                <span className="lang-switcher__arrow" aria-hidden="true">
                  ▾
                </span>
              </button>
              <ul className="lang-switcher__list" role="listbox" hidden={!langListOpen}>
                {LANGS.map((code) => (
                  <li role="presentation" key={code}>
                    <button
                      type="button"
                      className={`lang-option${code === lang ? ' lang-option--active' : ''}`}
                      role="option"
                      aria-selected={code === lang}
                      onClick={() => selectLang(code)}
                    >
                      {code.toUpperCase()}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
          <button
            type="button"
            className="header__cart"
            aria-label={t('cart.title')}
            title={t('cart.title')}
            onClick={() => openCart()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" />
            </svg>
            <span className="header__cart-count">{displayedCount}</span>
          </button>
          <button
            type="button"
            className="burger"
            aria-label={t('header.menuToggle')}
            aria-expanded={burgerOpen}
            aria-controls="mobileMenu"
            onClick={() => setBurgerOpen((v) => !v)}
          >
            <span className="burger__line" />
            <span className="burger__line" />
            <span className="burger__line" />
          </button>
        </div>
      </div>
      <div className="mobile-menu" id="mobileMenu" hidden={!burgerOpen}>
        <a href="tel:+37361088777" className="mobile-menu__link" onClick={() => setBurgerOpen(false)}>
          {t('header.phone')}
        </a>
        <a href="#delivery-hours" className="mobile-menu__link" onClick={() => setBurgerOpen(false)}>
          {t('header.deliverySchedule')}
        </a>
        <div className="mobile-menu__lang" role="group" aria-label={t('header.langLabel')}>
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              className={`pill lang-option${code === lang ? ' pill--accent lang-option--active' : ''}`}
              onClick={() => selectLang(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
