/**
 * js/main.js
 * ------------------------------------------------------------------
 * Общая инициализация интерактива шапки (Этап 1, п.4 плана):
 *  - бургер-меню (открыть/закрыть, закрытие по Escape и по клику на
 *    ссылку внутри панели);
 *  - выпадающий список языка на десктопе (открыть/закрыть, закрытие
 *    по клику вне списка и по Escape) — сам перевод текста делает
 *    js/i18n.js, здесь только открытие/закрытие самого списка;
 *  - кнопка "наверх" (появляется после прокрутки на один экран вниз,
 *    скроллит обратно к #top);
 *  - счётчик товаров на иконке корзины в шапке — считает суммарное
 *    количество позиций из localStorage по модели корзины из
 *    Context.md (ключ "crema_cart"): { items: { id: { qty, modifiers } }, cutlery }.
 *    Сама корзина (попап, добавление товаров) появится в п.7 плана —
 *    здесь только отображение счётчика, чтобы иконка не выглядела
 *    "пустой" уже сейчас. window.CremaCart.updateBadge() специально
 *    вынесен наружу — п.7 будет вызывать его после каждого изменения
 *    localStorage, чтобы не дублировать логику подсчёта в двух местах.
 * ------------------------------------------------------------------
 */
(function () {
  var CART_STORAGE_KEY = 'crema_cart';

  // ---- Счётчик корзины ---------------------------------------------------
  function getCartItemCount() {
    try {
      var raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return 0;
      var data = JSON.parse(raw);
      if (!data || !data.items) return 0;
      return Object.keys(data.items).reduce(function (sum, id) {
        var entry = data.items[id];
        var qty = entry && entry.qty;
        return sum + (typeof qty === 'number' && qty > 0 ? qty : 0);
      }, 0);
    } catch (e) {
      return 0;
    }
  }

  function updateCartBadge(count) {
    var el = document.getElementById('cartCount');
    if (!el) return;
    var value = typeof count === 'number' ? count : getCartItemCount();
    el.textContent = String(value);
  }

  window.CremaCart = {
    getCount: getCartItemCount,
    updateBadge: updateCartBadge
  };

  // ---- Бургер-меню --------------------------------------------------------
  function initBurger() {
    var burger = document.getElementById('burgerButton');
    var menu = document.getElementById('mobileMenu');
    if (!burger || !menu) return;

    function closeMenu() {
      menu.hidden = true;
      burger.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
      menu.hidden = false;
      burger.setAttribute('aria-expanded', 'true');
    }

    burger.addEventListener('click', function () {
      var isOpen = burger.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Клик по ссылке внутри бургера (телефон/график доставки) — закрываем панель
    var links = menu.querySelectorAll('a');
    links.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });
  }

  // ---- Выпадающий список языка (десктоп) -----------------------------------
  function initLangDropdown() {
    var toggle = document.getElementById('langToggle');
    var list = document.getElementById('langList');
    if (!toggle || !list) return;

    function closeList() {
      list.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }

    function openList() {
      list.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeList();
      } else {
        openList();
      }
    });

    document.addEventListener('click', function (event) {
      if (!list.hidden && !list.contains(event.target) && event.target !== toggle) {
        closeList();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeList();
      }
    });
  }

  // ---- Кнопка "наверх" -------------------------------------------------------
  function initBackToTop() {
    var button = document.getElementById('backToTop');
    if (!button) return;

    var threshold = window.innerHeight; // появляется после первого экрана (hero)

    function onScroll() {
      if (window.scrollY > threshold) {
        button.classList.add('back-to-top--visible');
      } else {
        button.classList.remove('back-to-top--visible');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initBurger();
    initLangDropdown();
    initBackToTop();
    updateCartBadge();
  });
})();
