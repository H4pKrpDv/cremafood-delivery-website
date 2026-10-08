/**
 * components/Header.tsx
 * ------------------------------------------------------------------
 * Порт шапки сайта из build/template.html + js/main.js (бургер-меню,
 * выпадающий список языка на десктопе, счётчик корзины) — нативная
 * версия слушала клики по document с делегированием, здесь то же
 * поведение через обычные React-обработчики + один useEffect на
 * "клик вне списка языка" (аналог initLangDropdown()).
 *
 * 05.10.2026: переключатель языка — теперь ссылки на локализованные адреса
 * (/, /ro, /en — lib/i18nConfig.ts), а не кнопки, меняющие состояние. Это
 * настоящие <a href hrefLang>: работают без JS, их видят поисковики, и
 * "открыть в новой вкладке" ведёт на нужный язык. Переход — полная
 * загрузка страницы (разные корневые layout'ы), поэтому позицию прокрутки
 * запоминаем перед переходом (LangScrollRestore вернёт её на новой странице).
 * ------------------------------------------------------------------
 */

'use client';

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';
import { useCartStore, useCartHydrated } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useThemeStore } from '@/store/themeStore';
import { LANGS, HREFLANG, localizedPath } from '@/lib/i18nConfig';
import { findItemIdByPathname, getItemPathname } from '@/lib/itemRoutes';
import { findSubcategoryIdByPathname, getSubcategoryPathname } from '@/lib/subcategoryRoutes';
import { findCategoryIdByPathname, getCategoryPathname } from '@/lib/categoryRoutes';
import { rememberScrollForLangSwitch } from '@/components/LangScrollRestore';

// Иконки солнца/полумесяца — тот же визуальный язык, что и у иконки
// корзины ниже (stroke, currentColor, viewBox 0 24 24), декоративная
// геометрическая форма без привязки к конкретному набору иконок.
//
// ThemeIcon рендерит ОБЕ иконки сразу, а какая видна — решает CSS по
// data-theme на <html> (.theme-icon--sun/.theme-icon--moon в globals.css).
// Нельзя выбирать иконку в React по значению стора: до гидратации оно всегда
// дефолтное, и у пользователей с сохранённой тёмной темой иконка на
// мгновение была бы "не той" (то же мигание, что и с самой темой — см.
// store/themeStore.ts). Светлая тема → полумесяц ("перейти на тёмную"),
// тёмная → солнце ("перейти на светлую").
function ThemeIcon() {
  return (
    <>
      <svg className="theme-icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2.5v2.5M12 19v2.5M4.5 12H2M22 12h-2.5M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
      </svg>
      <svg className="theme-icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7.2 7.2 0 0 0 21 12.8z" />
      </svg>
    </>
  );
}

export function Header() {
  const { t, lang } = useI18n();
  // 07.10.2026: на странице позиции переключатель языка ведёт на ТУ ЖЕ
  // позицию на другом языке (у неё свой слаг: /drinks/kofe/latte →
  // /ro/drinks/cafea/latte), а не на главную. Где позиции нет — как раньше.
  const pathname = usePathname();
  const currentItemId = pathname ? findItemIdByPathname(pathname, lang) : null;
  // 08.10.2026: то же для страницы подкатегории (/drinks/kofe → /ro/drinks/cafea).
  const currentSubId = pathname && !currentItemId ? findSubcategoryIdByPathname(pathname, lang) : null;
  // 08.10.2026: и для страницы категории (/drinks → /ro/drinks).
  const currentCategoryId =
    pathname && !currentItemId && !currentSubId ? findCategoryIdByPathname(pathname) : null;
  const langHref = (code: (typeof LANGS)[number]): string =>
    (currentItemId ? getItemPathname(code, currentItemId) : null) ??
    (currentSubId ? getSubcategoryPathname(code, currentSubId) : null) ??
    (currentCategoryId ? getCategoryPathname(code, currentCategoryId) : null) ??
    localizedPath(code);
  const openCart = useUIStore((s) => s.openCart);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
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

  // Клик по ссылке языка: на текущий язык — просто закрываем список (перехода
  // не нужно), на другой — запоминаем прокрутку и даём браузеру перейти по
  // href (preventDefault НЕ вызываем — это обычная навигация по ссылке).
  function handleLangClick(event: ReactMouseEvent<HTMLAnchorElement>, next: (typeof LANGS)[number]) {
    if (next === lang) {
      event.preventDefault();
    } else {
      rememberScrollForLangSwitch();
    }
    setLangListOpen(false);
    setBurgerOpen(false);
  }

  const displayedCount = hydrated ? count : 0;
  const themeToggleLabel = theme === 'dark' ? t('header.themeToggle.toLight') : t('header.themeToggle.toDark');

  return (
    <header className="header" id="top">
      <div className="header__inner">
        <Link href={localizedPath(lang)} className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo__mark" src="/img/logo.png" alt="" aria-hidden="true" width={34} height={34} />
          <span className="logo__text">Crema Food</span>
        </Link>
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
                    <a
                      href={langHref(code)}
                      hrefLang={HREFLANG[code]}
                      lang={HREFLANG[code]}
                      className={`lang-option${code === lang ? ' lang-option--active' : ''}`}
                      role="option"
                      aria-selected={code === lang}
                      onClick={(event) => handleLangClick(event, code)}
                    >
                      {code.toUpperCase()}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
          {/*
            Переключатель темы (02.10.2026, см. Context.md) — слева от иконки
            корзины, на всех ширинах (с 04.10.2026 и на мобильном — раньше
            там был отдельный пункт в бургер-меню). Только иконка, без
            текста: подпись остаётся в aria-label/title. Иконка показывает
            ЦЕЛЕВУЮ тему (солнце = "сейчас тёмная, нажми — станет светлая",
            и наоборот), выбор иконки — через CSS, см. ThemeIcon.
          */}
          <button
            type="button"
            className="theme-toggle theme-toggle--header"
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
            onClick={toggleTheme}
          >
            <ThemeIcon />
          </button>
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
            <a
              key={code}
              href={langHref(code)}
              hrefLang={HREFLANG[code]}
              lang={HREFLANG[code]}
              className={`pill lang-option${code === lang ? ' pill--accent lang-option--active' : ''}`}
              aria-current={code === lang ? 'true' : undefined}
              onClick={(event) => handleLangClick(event, code)}
            >
              {code.toUpperCase()}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
