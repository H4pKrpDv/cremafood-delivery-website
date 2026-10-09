/**
 * components/Header.tsx
 * ------------------------------------------------------------------
 * Порт шапки сайта из build/template.html + js/main.js (бургер-меню,
 * выпадающий список языка, счётчик корзины) — нативная версия слушала клики
 * по document с делегированием, здесь то же поведение через обычные
 * React-обработчики + один useEffect на "клик вне списка языка" (аналог
 * initLangDropdown()).
 *
 * 05.10.2026: переключатель языка — теперь ссылки на локализованные адреса
 * (/, /ro, /en — lib/i18nConfig.ts), а не кнопки, меняющие состояние. Это
 * настоящие <a href hrefLang>: работают без JS, их видят поисковики, и
 * "открыть в новой вкладке" ведёт на нужный язык. Переход — полная
 * загрузка страницы (разные корневые layout'ы), поэтому позицию прокрутки
 * запоминаем перед переходом (LangScrollRestore вернёт её на новой странице).
 *
 * 09.10.2026: РЕДИЗАЙН БУРГЕР-МЕНЮ (мобильные, < 769px). Раньше — небольшая
 * плашка под шапкой. Теперь — панель на весь экран ПОД шапкой: выезжает
 * сбоку (справа), шапка (лого, язык, корзина, крестик) остаётся видимой и
 * кликабельной. Пока меню открыто, прокрутка страницы заблокирована
 * (body.menu-open, см. globals.css), скроллится только сама панель.
 * Содержимое по центру: раскрывающиеся списки категорий (Напитки / Блюда /
 * Спец. предложения) со ссылками на подкатегории текстом в ряд, график
 * доставки, переключатель темы; кнопка «позвонить» закреплена внизу панели.
 * Переключатели поменялись местами: ЯЗЫК теперь в шапке (на всех ширинах —
 * один и тот же выпадающий список), а ТЕМА на мобильном — внутри меню (на
 * десктопе кнопка темы осталась в шапке). Сюда же позже добавятся ссылки на
 * служебные страницы и блог.
 *
 * Панель всегда есть в разметке (ссылки на подкатегории видят поисковики,
 * это сквозная внутренняя перелинковка), закрытая — visibility:hidden +
 * inert: не фокусируется и не читается скринридером.
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
import { menuData } from '@/lib/data';
import { ScheduleCards } from '@/components/ScheduleCards';
import { CREMA_OPEN_SCHEDULE_EVENT } from '@/components/HoursLink';
import { findItemIdByPathname, getItemPathname } from '@/lib/itemRoutes';
import { findSubcategoryIdByPathname, getSubcategoryPathname } from '@/lib/subcategoryRoutes';
import { findCategoryIdByPathname, getCategoryPathname, getCategorySubcategoryIds } from '@/lib/categoryRoutes';
import { rememberScrollForLangSwitch } from '@/components/LangScrollRestore';
import { getMenuPagePathname, isMenuPagePathname } from '@/lib/menuPageRoutes';

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

// Категории бургер-меню: те, у кого есть своя страница (promo / drinks /
// food), и их подкатегории со страницами — в порядке menu.json. Считается
// один раз на модуль (данные статичны).
const MENU_CATEGORIES = menuData.categories
  .map((category) => ({ id: category.id, subIds: getCategorySubcategoryIds(category.id) }))
  .filter((category) => category.subIds.length > 0);

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
    (pathname && isMenuPagePathname(pathname) ? getMenuPagePathname(code) : null) ??
    localizedPath(code);
  const openCart = useUIStore((s) => s.openCart);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const hydrated = useCartHydrated();
  const count = useCartStore((s) =>
    Object.values(s.items).reduce((sum, entry) => sum + (typeof entry.qty === 'number' ? entry.qty : 0), 0)
  );

  // Бургер-меню "открыто на странице X": храним адрес, на котором его открыли,
  // и считаем меню открытым, только пока pathname тот же. Так оно само
  // закрывается при любой навигации (в том числе "назад" в браузере), без
  // useEffect с setState.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const burgerOpen = menuPath !== null && menuPath === (pathname ?? '');
  const closeBurger = () => setMenuPath(null);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
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
        setMenuPath(null);
      }
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [langListOpen]);

  // Пока меню открыто — блокируем прокрутку страницы (body.menu-open, правило
  // проекта "изоляция"), класс снимается при закрытии и размонтировании.
  useEffect(() => {
    document.body.classList.toggle('menu-open', burgerOpen);
    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [burgerOpen]);

  // Поворот планшета/растягивание окна до десктопной ширины — меню там нет
  // (его заменяет инлайн-шапка), поэтому закрываем, чтобы не осталось состояния.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 769px)');
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setMenuPath(null);
    }
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // 10.10.2026: ссылка «график доставки» в SEO-текстах на мобильном (HoursLink)
  // присылает событие — открываем бургер на текущей странице и прокручиваем
  // панель к графику. Задержка: панель до открытия inert/скрыта, scrollIntoView
  // нужен уже после применения состояния.
  useEffect(() => {
    function onOpenSchedule() {
      setMenuPath(pathname ?? '');
      window.setTimeout(() => {
        document.getElementById('mobileMenuScheduleDelivery')?.scrollIntoView({ block: 'center' });
      }, 80);
    }
    window.addEventListener(CREMA_OPEN_SCHEDULE_EVENT, onOpenSchedule);
    return () => window.removeEventListener(CREMA_OPEN_SCHEDULE_EVENT, onOpenSchedule);
  }, [pathname]);

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
    closeBurger();
  }

  const displayedCount = hydrated ? count : 0;
  const themeToggleLabel = theme === 'dark' ? t('header.themeToggle.toLight') : t('header.themeToggle.toDark');
  // Подпись пункта темы в меню — ЦЕЛЕВАЯ тема (как и иконка): сейчас тёмная →
  // «Светлая тема».
  const themeMenuLabel = theme === 'dark' ? t('header.themeNameLight') : t('header.themeNameDark');
  const hoursHref = `${localizedPath(lang)}#delivery-hours`;
  return (
    <>
    <header className="header" id="top">
      <div className="header__inner">
        <Link href={localizedPath(lang)} className="logo" onClick={closeBurger}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo__mark" src="/img/logo.png" alt="" aria-hidden="true" width={34} height={34} />
          <span className="logo__text">Crema Food</span>
        </Link>
        <div className="header__actions">
          <nav className="nav">
            <a href="tel:+37361088777" className="nav__link">
              {t('header.phone')}
            </a>
            <Link href={hoursHref} className="nav__link">
              {t('header.deliverySchedule')}
            </Link>
          </nav>
          {/*
            Переключатель языка (09.10.2026) вынесен из <nav> (на мобильном он
            скрыт) прямо в .header__actions: на мобильном язык теперь в шапке,
            а не в бургер-меню. Список тот же выпадающий, что и на десктопе.
          */}
          <div className="lang-switcher" ref={langSwitcherRef}>
            <button
              type="button"
              className="lang-switcher__toggle"
              aria-haspopup="listbox"
              aria-expanded={langListOpen}
              aria-label={t('header.langLabel')}
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
          {/*
            Переключатель темы (02.10.2026, см. Context.md) — слева от иконки
            корзины. С 09.10.2026 только на десктопе (≥ 769px); на мобильном
            он переехал в бургер-меню (.mobile-menu__theme). Только иконка,
            без текста: подпись остаётся в aria-label/title. Иконка показывает
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
            onClick={() => {
              closeBurger();
              openCart();
            }}
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
            aria-label={burgerOpen ? t('header.menuClose') : t('header.menuToggle')}
            aria-expanded={burgerOpen}
            aria-controls="mobileMenu"
            onClick={() => setMenuPath(burgerOpen ? null : (pathname ?? ''))}
          >
            <span className="burger__line" />
            <span className="burger__line" />
            <span className="burger__line" />
          </button>
        </div>
      </div>
    </header>
      {/* Панель — сосед шапки, а не потомок: у .header есть backdrop-filter,
          он сделал бы шапку containing block'ом для position:fixed (см. CSS). */}
      <div
        className={`mobile-menu${burgerOpen ? ' mobile-menu--open' : ''}`}
        id="mobileMenu"
        inert={!burgerOpen}
      >
        <div className="mobile-menu__scroll">
          <nav className="mobile-menu__nav" aria-label={t('header.navLabel')}>
            <ul className="mobile-menu__cats">
              {MENU_CATEGORIES.map((category) => {
                const open = openCategoryId === category.id;
                const categoryHref = getCategoryPathname(lang, category.id);
                return (
                  <li key={category.id} className="mobile-menu__cat-item">
                    <button
                      type="button"
                      className="mobile-menu__cat"
                      aria-expanded={open}
                      aria-controls={`mobileMenuSub-${category.id}`}
                      onClick={() => setOpenCategoryId(open ? null : category.id)}
                    >
                      <span>{t(`categories.${category.id}`)}</span>
                      <svg className="mobile-menu__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    <div
                      className={`mobile-menu__sub${open ? ' mobile-menu__sub--open' : ''}`}
                      id={`mobileMenuSub-${category.id}`}
                      inert={!open}
                    >
                      <div className="mobile-menu__sub-inner">
                        <ul className="mobile-menu__sublist">
                          {categoryHref ? (
                            <li>
                              <Link
                                href={categoryHref}
                                className={`mobile-menu__sublink mobile-menu__sublink--all${pathname === categoryHref ? ' mobile-menu__sublink--current' : ''}`}
                                aria-current={pathname === categoryHref ? 'page' : undefined}
                                prefetch={false}
                                onClick={closeBurger}
                              >
                                {t('header.menuAll')}
                              </Link>
                            </li>
                          ) : null}
                          {category.subIds.map((subId) => {
                            const href = getSubcategoryPathname(lang, subId);
                            if (!href) return null;
                            const current = pathname === href;
                            return (
                              <li key={subId}>
                                <Link
                                  href={href}
                                  className={`mobile-menu__sublink${current ? ' mobile-menu__sublink--current' : ''}`}
                                  aria-current={current ? 'page' : undefined}
                                  prefetch={false}
                                  onClick={closeBurger}
                                >
                                  {t(`subcategories.${subId}.title`)}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </li>
                );
              })}
              {/* 09.10.2026: «Полное меню» — отдельная страница /menu, в бургере
                  обычная ссылка (без раскрывающегося списка). */}
              <li className="mobile-menu__cat-item">
                <Link
                  href={getMenuPagePathname(lang)}
                  className="mobile-menu__cat mobile-menu__cat--link"
                  aria-current={pathname === getMenuPagePathname(lang) ? 'page' : undefined}
                  prefetch={false}
                  onClick={closeBurger}
                >
                  <span>{t('categories.full-menu')}</span>
                </Link>
              </li>
            </ul>
          </nav>
          {/* Графики сразу в меню (решение пользователя; 10.10.2026 — и график
              работы заведения): плашки с живым статусом (ScheduleCards) — видно,
              работает ли доставка и открыто ли заведение прямо сейчас; кнопка
              «позвонить» закреплена внизу панели. На десктопе (бургера нет)
              те же плашки показывает футер. */}
          <section className="mobile-menu__schedule" aria-labelledby="mobileMenuScheduleDelivery">
            <p className="mobile-menu__schedule-title" id="mobileMenuScheduleDelivery">
              {t('header.deliveryTitle')}
            </p>
            <ScheduleCards kind="delivery" />
          </section>
          <section className="mobile-menu__schedule" aria-labelledby="mobileMenuScheduleVenue">
            <p className="mobile-menu__schedule-title" id="mobileMenuScheduleVenue">
              {t('schedule.venueTitle')}
            </p>
            <ScheduleCards kind="venue" />
          </section>
          <button type="button" className="mobile-menu__theme" onClick={toggleTheme} aria-label={themeToggleLabel}>
            <ThemeIcon />
            <span>{themeMenuLabel}</span>
          </button>
        </div>
        <div className="mobile-menu__footer">
          <a href="tel:+37361088777" className="mobile-menu__cta" onClick={closeBurger}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
            </svg>
            <span>{t('header.phone')}</span>
          </a>
        </div>
      </div>
    </>
  );
}
