/**
 * js/main.js
 * ------------------------------------------------------------------
 * Общая инициализация интерактива шапки (Этап 1, п.4 плана) + единая
 * модель корзины в window.CremaCart (центр хранения, дополнено в п.7):
 *  - бургер-меню (открыть/закрыть, закрытие по Escape и по клику на
 *    ссылку внутри панели);
 *  - выпадающий список языка на десктопе (открыть/закрыть, закрытие
 *    по клику вне списка и по Escape) — сам перевод текста делает
 *    js/i18n.js, здесь только открытие/закрытие самого списка;
 *  - кнопка "наверх" (появляется после прокрутки на один экран вниз,
 *    скроллит обратно к #top);
 *  - счётчик товаров на иконке корзины в шапке.
 *
 * window.CremaCart — единственное место, которое читает/пишет
 * localStorage["crema_cart"] (модель, обновлена правками от 18.09.2026:
 * { items: { id: { qty, modifiers, cutlery } }, ageConfirmed }). Приборы —
 * теперь модификатор конкретной позиции (cutlery внутри каждой строки
 * items[id]), а не общий счётчик на всю корзину; ageConfirmed — чекбокс
 * "подтверждаю 18+", живёт на корне корзины, т.к. относится к заказу целиком,
 * а не к конкретному товару. До п.7 эта логика (readCart/writeCart/getItemQty/setItemQty)
 * была продублирована прямо в js/menu.js — при добавлении попапа корзины
 * (п.7, js/cart.js) вынесено сюда одним местом, чтобы js/menu.js (степпер
 * в карточке товара сетки) и js/cart.js (попап) не могли разойтись в
 * логике чтения/записи корзины. writeCart() сама вызывает updateBadge()
 * и рассылает кастомное событие "crema:cartchange" — любой другой скрипт
 * подписывается на него, чтобы пересинхронизировать свою часть UI после
 * ЛЮБОГО изменения корзины, независимо от того, кто именно её изменил
 * (см. js/menu.js: hydrateSteppers() по этому событию; js/cart.js:
 * перерисовка попапа по этому событию).
 * ------------------------------------------------------------------
 */
(function () {
  var CART_STORAGE_KEY = 'crema_cart';

  // ---- Модель корзины (localStorage) --------------------------------------
  function readCart() {
    try {
      var raw = localStorage.getItem(CART_STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (!data || typeof data !== 'object') data = {};
      if (!data.items || typeof data.items !== 'object') data.items = {};
      // Нормализуем каждую строку корзины: qty (число > 0, иначе строка мусор
      // и удаляется), modifiers (объект), cutlery (число >= 0 — приборы для
      // ЭТОЙ конкретной позиции, правки от 18.09.2026, раньше был общий
      // счётчик на корне корзины).
      Object.keys(data.items).forEach(function (id) {
        var entry = data.items[id];
        if (!entry || typeof entry !== 'object' || typeof entry.qty !== 'number' || entry.qty <= 0) {
          delete data.items[id];
          return;
        }
        if (!entry.modifiers || typeof entry.modifiers !== 'object') entry.modifiers = {};
        if (typeof entry.cutlery !== 'number' || entry.cutlery < 0) entry.cutlery = 0;
      });
      // Подтверждение 18+ (для позиций с ageRestricted:true) — относится к
      // заказу целиком, не к конкретному товару, поэтому живёт на корне.
      data.ageConfirmed = Boolean(data.ageConfirmed);
      return data;
    } catch (e) {
      return { items: {}, ageConfirmed: false };
    }
  }

  function writeCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      /* localStorage недоступен (приватный режим и т.п.) — не критично,
         просто состояние корзины не переживёт перезагрузку страницы. */
    }
    updateCartBadge();
    document.dispatchEvent(new CustomEvent('crema:cartchange', { detail: { cart: cart } }));
  }

  function getItemQty(cart, itemId) {
    var entry = cart.items[itemId];
    return entry && typeof entry.qty === 'number' ? entry.qty : 0;
  }

  // qty <= 0 удаляет позицию из корзины целиком (вместе с её модификаторами
  // и приборами). Существующие модификаторы (соусы) и приборы сохраняются
  // при простом изменении qty.
  function setItemQty(cart, itemId, qty) {
    if (qty <= 0) {
      delete cart.items[itemId];
      return;
    }
    var existing = cart.items[itemId] || { modifiers: {}, cutlery: 0 };
    existing.qty = qty;
    if (!existing.modifiers || typeof existing.modifiers !== 'object') {
      existing.modifiers = {};
    }
    if (typeof existing.cutlery !== 'number' || existing.cutlery < 0) {
      existing.cutlery = 0;
    }
    cart.items[itemId] = existing;
  }

  // ---- Приборы для конкретной позиции (правки от 18.09.2026) --------------
  // Раньше был один общий счётчик cart.cutlery на всю корзину; теперь приборы —
  // модификатор конкретной строки, как и соусы, чтобы при отправке инф-ции
  // заказа можно было указать, к какой именно позиции сколько наборов
  // приборов положить (см. Context.md).
  function getItemCutlery(cart, itemId) {
    var entry = cart.items[itemId];
    return entry && typeof entry.cutlery === 'number' && entry.cutlery > 0 ? entry.cutlery : 0;
  }

  function setItemCutlery(cart, itemId, qty) {
    var entry = cart.items[itemId];
    if (!entry) return; // товара уже нет в корзине — нечего менять
    entry.cutlery = Math.max(0, qty);
  }

  // ---- Счётчик корзины ---------------------------------------------------
  function getCartItemCount() {
    var cart = readCart();
    return Object.keys(cart.items).reduce(function (sum, id) {
      return sum + getItemQty(cart, id);
    }, 0);
  }

  function updateCartBadge(count) {
    var el = document.getElementById('cartCount');
    if (!el) return;
    var value = typeof count === 'number' ? count : getCartItemCount();
    el.textContent = String(value);
  }

  window.CremaCart = {
    getCount: getCartItemCount,
    updateBadge: updateCartBadge,
    readCart: readCart,
    writeCart: writeCart,
    getItemQty: getItemQty,
    setItemQty: setItemQty,
    getItemCutlery: getItemCutlery,
    setItemCutlery: setItemCutlery
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
