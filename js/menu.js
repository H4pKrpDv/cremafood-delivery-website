/**
 * js/menu.js
 * ------------------------------------------------------------------
 * Интерактив раздела "Меню" (Этап 1, п.6 плана):
 *  - переключение верхнеуровневых табов (Спец.предложения/Кафе/Кухня):
 *    показывает нужную .category-group, скрывает остальные классом
 *    .category-group--hidden, и синхронно показывает/скрывает пилюли
 *    подкатегорий текущего таба (.pill--hidden) — все они уже есть в
 *    статическом HTML (важно для SEO/шеринга), просто прячутся/показываются;
 *  - подсветка "текущей" пилюли подкатегории по клику (.pill--current);
 *  - раскрытие/сворачивание описания товара кнопкой "ещё"/"свернуть" —
 *    кнопка показывается только если текст реально обрезан до 2 строк
 *    (scrollHeight > clientHeight), пересчитывается при ресайзе и после
 *    смены языка (событие "crema:langchange" из js/i18n.js), т.к. длина
 *    текста перевода может отличаться;
 *  - степпер "Добавить" → "‹ − | кол-во | + ›" в карточке товара: пишет
 *    реальные данные в localStorage["crema_cart"] через общую модель
 *    window.CremaCart (см. js/main.js — readCart/writeCart/getItemQty/
 *    setItemQty теперь живут там одним местом, чтобы попап корзины из
 *    п.7, js/cart.js, не мог разойтись в логике с этой карточкой). При
 *    qty=0 товар убирается из корзины и карточка возвращается к кнопке
 *    "Добавить". Выбор модификаторов (соусы для кухонных позиций) в саму
 *    карточку НЕ вынесен — это отдельный шаг в попапе корзины, п.7 плана;
 *    здесь modifiers всегда {}.
 *  - гидратация при загрузке страницы: если товар уже лежит в корзине
 *    (localStorage сохранился с прошлого визита) — карточка сразу
 *    рисуется со степпером и правильным количеством, а не с "Добавить".
 *    Та же гидратация переиспользуется для пересинхронизации ПОСЛЕ любого
 *    изменения корзины из попапа (событие "crema:cartchange" из
 *    js/main.js) — например, если товар убрали через попап корзины,
 *    его карточка в сетке должна вернуться к кнопке "Добавить" сама.
 * ------------------------------------------------------------------
 */
(function () {
  // ---- Мини-версия резолвера i18n-ключей (только для текста, который
  // нужно вставить в динамически создаваемую разметку прямо в момент
  // создания — сам механизм переключения языка на лету остаётся в
  // js/i18n.js и отдельно проходит по data-i18n-key/-attr-* атрибутам). ----
  function resolveKey(langData, key) {
    var parts = key.split('.');
    var value = langData;
    for (var i = 0; i < parts.length; i++) {
      if (value == null) return undefined;
      value = value[parts[i]];
    }
    return typeof value === 'string' ? value : undefined;
  }

  function t(key) {
    var DATA = window.__CREMA_I18N__ || {};
    var defaultLang = window.__CREMA_DEFAULT_LANG__ || 'ru';
    var lang = (window.CremaI18n && window.CremaI18n.currentLang) || defaultLang;
    var text = resolveKey(DATA[lang] || {}, key);
    if (text === undefined) {
      text = resolveKey(DATA[defaultLang] || {}, key);
    }
    return text === undefined ? '' : text;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ------------------------------------------------------------------
  // Табы категорий (Спец.предложения / Кафе / Кухня)
  // ------------------------------------------------------------------
  function initCategoryTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-category-tab]'));
    if (!tabs.length) return;

    function activateCategory(categoryId) {
      tabs.forEach(function (tab) {
        var isActive = tab.getAttribute('data-category-tab') === categoryId;
        tab.classList.toggle('category-tab--active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      document.querySelectorAll('.category-group').forEach(function (group) {
        var isActive = group.getAttribute('data-category') === categoryId;
        group.classList.toggle('category-group--hidden', !isActive);
      });

      document.querySelectorAll('.menu-pills .pill').forEach(function (pill) {
        var isActive = pill.getAttribute('data-category') === categoryId;
        pill.classList.toggle('pill--hidden', !isActive);
        // Пилюля из скрытого таба не должна оставаться "текущей", когда
        // пользователь вернётся на этот таб позже — сбрасываем подсветку.
        if (!isActive) pill.classList.remove('pill--current');
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activateCategory(tab.getAttribute('data-category-tab'));
      });
    });
  }

  // ------------------------------------------------------------------
  // Подсветка "текущей" пилюли подкатегории по клику
  // ------------------------------------------------------------------
  function initPillHighlight() {
    var pills = Array.prototype.slice.call(document.querySelectorAll('.menu-pills .pill'));
    if (!pills.length) return;

    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        pills.forEach(function (p) {
          p.classList.remove('pill--current');
        });
        pill.classList.add('pill--current');
      });
    });
  }

  // ------------------------------------------------------------------
  // Раскрытие/сворачивание описания товара ("ещё" / "свернуть")
  // ------------------------------------------------------------------
  function checkDescOverflow(desc) {
    var toggle = document.querySelector('.item-card__desc-toggle[aria-controls="' + desc.id + '"]');
    if (!toggle) return;

    // Уже раскрыто — кнопка нужна, чтобы можно было свернуть обратно,
    // независимо от того, обрезался бы текст в свёрнутом виде или нет.
    if (desc.classList.contains('item-card__desc--expanded')) {
      toggle.hidden = false;
      return;
    }

    var isOverflowing = desc.scrollHeight - desc.clientHeight > 1;
    toggle.hidden = !isOverflowing;
  }

  function setToggleLabel(toggle, expanded) {
    var key = expanded ? 'common.showLess' : 'common.readMore';
    toggle.setAttribute('data-i18n-key', key);
    toggle.textContent = t(key);
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function initDescToggles() {
    var descs = Array.prototype.slice.call(document.querySelectorAll('.item-card__desc'));
    if (!descs.length) return;

    function recheckAll() {
      descs.forEach(checkDescOverflow);
    }

    recheckAll();

    document.addEventListener('click', function (event) {
      var toggle = event.target.closest ? event.target.closest('.item-card__desc-toggle') : null;
      if (!toggle) return;

      var descId = toggle.getAttribute('aria-controls');
      var desc = descId ? document.getElementById(descId) : null;
      if (!desc) return;

      var expanded = !desc.classList.contains('item-card__desc--expanded');
      desc.classList.toggle('item-card__desc--expanded', expanded);
      setToggleLabel(toggle, expanded);
    });

    // Ширина карточек не меняется по брейкпоинтам количества колонок в
    // сетке (2 колонки и на мобильном, и почти везде), но высота строки
    // текста может — пересчитываем с debounce, чтобы не дёргать layout
    // на каждый пиксель ресайза.
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(recheckAll, 200);
    });

    // После смены языка длина текста перевода другая — пересчитываем
    // обрезку сразу после того, как i18n.js подставит новый текст.
    document.addEventListener('crema:langchange', function () {
      window.setTimeout(recheckAll, 0);
    });
  }

  // ------------------------------------------------------------------
  // Степпер "Добавить" → "‹ − | кол-во | + ›" + localStorage["crema_cart"]
  // (модель корзины теперь целиком в window.CremaCart, см. js/main.js)
  // ------------------------------------------------------------------
  function stepperMarkupIdle() {
    return (
      '<button type="button" class="stepper__add" data-action="add-to-cart" data-i18n-key="common.add">' +
      escapeHtml(t('common.add')) +
      '</button>'
    );
  }

  function stepperMarkupActive(qty) {
    return (
      '<div class="stepper">' +
      '<button type="button" class="stepper__btn" data-action="decrease" aria-label="' +
      escapeHtml(t('common.decreaseQty')) +
      '" data-i18n-attr-aria-label="common.decreaseQty">−</button>' +
      '<span class="stepper__qty" aria-label="' +
      escapeHtml(t('common.quantityLabel')) +
      '" data-i18n-attr-aria-label="common.quantityLabel">' +
      qty +
      '</span>' +
      '<button type="button" class="stepper__btn" data-action="increase" aria-label="' +
      escapeHtml(t('common.increaseQty')) +
      '" data-i18n-attr-aria-label="common.increaseQty">+</button>' +
      '</div>'
    );
  }

  function renderStepper(container, qty) {
    container.innerHTML = qty > 0 ? stepperMarkupActive(qty) : stepperMarkupIdle();
  }

  // Всегда перерисовывает КАЖДЫЙ степпер по текущему состоянию корзины —
  // как при первой загрузке страницы (часть карточек станет активным
  // степпером, если товар уже был в корзине с прошлого визита), так и
  // при пересинхронизации после изменений из попапа корзины (часть
  // карточек наоборот должна вернуться к кнопке "Добавить", если товар
  // убрали через попап) — поэтому вызывается безусловно, не только для qty>0.
  function hydrateSteppers() {
    var cart = window.CremaCart.readCart();
    var containers = document.querySelectorAll('[data-stepper]');
    containers.forEach(function (container) {
      var itemId = container.getAttribute('data-item-id');
      var qty = window.CremaCart.getItemQty(cart, itemId);
      renderStepper(container, qty);
    });
    updateHoursNotes();
  }

  // ------------------------------------------------------------------
  // Проверка рабочего времени отдела (кухня/бар) на карточках товара
  // (отдельный шаг после п.8, см. Context.md и js/hours.js). Часы работы
  // НЕ известны на этапе сборки (в отличие от available:false) — build.js
  // всегда запекает степпер в разметку для available:true позиций, а рядом
  // кладёт скрытый параграф #hours-note-<id> (см. renderItemCard в
  // build/build.js). Здесь, на клиенте, в реальном времени решаем, что
  // показать: степпер (отдел открыт) или этот параграф (отдел закрыт) —
  // и наоборот, если отдел открылся, пока страница была открыта.
  // ------------------------------------------------------------------
  function parseDepartment(attrValue) {
    if (!attrValue) return null;
    return attrValue.indexOf(',') >= 0 ? attrValue.split(',') : attrValue;
  }

  function updateHoursNotes() {
    if (!window.CremaHours) return; // js/hours.js почему-то не загрузился — не блокируем степперы по ошибке
    var cards = document.querySelectorAll('.item-card[data-department]');
    cards.forEach(function (cardEl) {
      var stepperContainer = cardEl.querySelector('[data-stepper]');
      if (!stepperContainer) return; // available:false — степпера и hours-note у такой карточки нет вовсе

      var itemId = cardEl.getAttribute('data-item-id');
      var noteEl = document.getElementById('hours-note-' + itemId);
      var department = parseDepartment(cardEl.getAttribute('data-department'));
      var isDeptOpen = window.CremaHours.isOpen(department);

      cardEl.classList.toggle('item-card--closed-hours', !isDeptOpen);
      stepperContainer.hidden = !isDeptOpen;

      if (noteEl) {
        noteEl.hidden = isDeptOpen;
        if (!isDeptOpen) {
          var timeLabel = window.CremaHours.getOpenTimeLabel(department);
          noteEl.textContent = t('menu.availableFrom').replace('{time}', timeLabel);
        }
      }
    });
  }

  function initSteppers() {
    hydrateSteppers();

    document.addEventListener('click', function (event) {
      var actionEl = event.target.closest
        ? event.target.closest('[data-action="add-to-cart"], [data-action="increase"], [data-action="decrease"]')
        : null;
      if (!actionEl) return;

      var container = actionEl.closest('[data-stepper]');
      if (!container) return;

      var itemId = container.getAttribute('data-item-id');
      var action = actionEl.getAttribute('data-action');
      var cart = window.CremaCart.readCart();
      var qty = window.CremaCart.getItemQty(cart, itemId);

      if (action === 'add-to-cart') {
        qty = 1;
      } else if (action === 'increase') {
        qty += 1;
      } else if (action === 'decrease') {
        qty = Math.max(0, qty - 1);
      }

      window.CremaCart.setItemQty(cart, itemId, qty);
      window.CremaCart.writeCart(cart);
      // Перерисовку делает слушатель "crema:cartchange" ниже (writeCart
      // уже разослал событие синхронно) — не дублируем renderStepper здесь.
    });

    // Корзину мог изменить попап (js/cart.js) — например, убрать товар
    // целиком или поменять количество не через карточку в сетке.
    // Пересинхронизируем ВСЕ степпера сетки по свежему состоянию корзины.
    document.addEventListener('crema:cartchange', hydrateSteppers);

    // Часы работы отдела могли "переключиться" (открыться/закрыться), пока
    // страница открыта в браузере — js/hours.js рассылает это раз в 30 сек
    // и сразу при возврате на вкладку (см. его комментарий). Сам степпер
    // (кол-во в корзине) при этом не меняется — перерисовываем только
    // видимость степпер/hours-note, полный hydrateSteppers() здесь не нужен.
    document.addEventListener('crema:hourscheck', updateHoursNotes);

    // Смена языка — у #hours-note-<id> нет data-i18n-key (текст содержит
    // подставляемое "{time}", см. build.js), поэтому js/i18n.js его не
    // трогает — обновляем текст сами, если параграф сейчас показан.
    document.addEventListener('crema:langchange', updateHoursNotes);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCategoryTabs();
    initPillHighlight();
    initDescToggles();
    initSteppers();
  });
})();
