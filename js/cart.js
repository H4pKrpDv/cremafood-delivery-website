/**
 * js/cart.js
 * ------------------------------------------------------------------
 * Попап корзины (Этап 1, п.7 плана).
 *
 * Модель данных и localStorage["crema_cart"] — целиком в window.CremaCart
 * (см. js/main.js: readCart/writeCart/getItemQty/setItemQty). Этот файл
 * только: открывает/закрывает попап, рисует список позиций/степперов из
 * текущей корзины и пересчитывает итог. Степпер количества товара в самой
 * сетке меню (js/menu.js) слушает то же событие "crema:cartchange", которое
 * шлёт window.CremaCart.writeCart() — поэтому изменение количества здесь,
 * в попапе, само подтягивается в карточку товара сетки, и наоборот.
 *
 * Метаданные позиции (цена, доступность, какие группы модификаторов у
 * товара) этот файл не хранит отдельно — берёт напрямую из уже
 * отрисованной карточки товара в сетке меню (атрибуты data-price/
 * data-available/data-modifiers на .item-card/.item-card__stepper).
 * Это гарантирует, что попап никогда не разойдётся с тем, что реально
 * показано в меню, и не плодит третий источник правды по товарам.
 * Цены самих модификаторов (соусы и т.п.) — из window.__CREMA_MODIFIER_GROUPS__
 * (вшито build.js из data/menu.json, см. build/build.js).
 *
 * Правила, которые считает этот файл (см. Context.md, разделы
 * "Модификаторы и приборы" и уточнения по бесплатной доставке; ПЕРЕСМОТРЕНО
 * правками от 18.09.2026):
 *  - Приборы — модификатор КОНКРЕТНОЙ позиции (как соусы), а не общий
 *    счётчик на всю корзину. Доступны только для позиций, у которых на
 *    карточке в сетке меню стоит data-cutlery-eligible="true" (это
 *    подкатегории с cutleryEligible:true в data/menu.json — сейчас
 *    kitchen->breakfast, kitchen->mexican, cafe->desserts). Для такой
 *    позиции первый набор приборов на каждую заказанную единицу товара —
 *    бесплатно (N бесплатных = qty этой строки), всё сверху — доплата
 *    2 лея за набор. Это позволяет при отправке инф-ции о заказе указать,
 *    к какой именно позиции сколько приборов положить (напр. вилки к
 *    омлету и отдельно палочки к суши, если такое появится).
 *  - Доплата за приборы сложена прямо в lineTotal каждой строки — поэтому
 *    порог бесплатной доставки (см. ниже) естественным образом её учитывает
 *    (раньше отдельно исключалась — это было ошибкой, поправлено).
 *  - Бесплатная доставка (визуальный триггер, сама доставка добавляется
 *    в форме заказа, п.8): порог 399 лей по сумме ДОСТУПНЫХ позиций,
 *    ВКЛЮЧАЯ доплату за приборы.
 *  - Товар с available:false (см. data-available на карточке) показывается
 *    в списке с пометкой "больше нет в наличии" и не участвует в сумме —
 *    не удаляется молча, пользователь должен увидеть и убрать сам.
 *  - Подтверждение 18+: если в корзине есть хотя бы одна ДОСТУПНАЯ позиция
 *    с data-age-restricted="true" (алкоголь), показываем чекбокс
 *    "Подтверждаю, что мне есть 18 лет" и блокируем кнопку "Заказать",
 *    пока он не отмечен. Состояние живёт в cart.ageConfirmed (корень
 *    корзины) — чтобы позже (п.8) его можно было отправить в инф-ции заказа.
 * ------------------------------------------------------------------
 */
(function () {
  var FREE_DELIVERY_THRESHOLD = 399;

  // ---- Мини-резолвер i18n-ключей (тот же паттерн, что в js/menu.js) -------
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

  function formatMdl(amount) {
    // Цены в menu.json целые, но подстраховываемся от плавающей арифметики
    // (например 0.1+0.2 в JS даёт не круглое число).
    var rounded = Math.round(amount * 100) / 100;
    return rounded + ' MDL';
  }

  // ---- Метаданные товара — берём напрямую из уже отрисованной карточки
  // товара в сетке меню, а не из отдельного дублирующего источника. -------
  function getModifierGroups() {
    return window.__CREMA_MODIFIER_GROUPS__ || {};
  }

  function getItemMeta(itemId) {
    var cardEl = document.querySelector('.item-card[data-item-id="' + itemId + '"]');
    if (!cardEl) {
      // Товар был в корзине, но исчез из menu.json (переименовали id и т.п.) —
      // редкий случай, показываем как недоступный, не даём сломать попап.
      return { name: itemId, price: 0, available: false, modifierGroupIds: [], ageRestricted: false, cutleryEligible: false };
    }
    var stepperEl = cardEl.querySelector('[data-stepper]');
    var price = stepperEl ? parseFloat(stepperEl.getAttribute('data-price')) || 0 : 0;
    var available = cardEl.getAttribute('data-available') !== 'false';
    var modifiersAttr = cardEl.getAttribute('data-modifiers') || '';
    var modifierGroupIds = modifiersAttr ? modifiersAttr.split(',').filter(Boolean) : [];
    var ageRestricted = cardEl.getAttribute('data-age-restricted') === 'true';
    var cutleryEligible = cardEl.getAttribute('data-cutlery-eligible') === 'true';
    var name = t('items.' + itemId + '.name') || itemId;
    return {
      name: name,
      price: price,
      available: available,
      modifierGroupIds: modifierGroupIds,
      ageRestricted: ageRestricted,
      cutleryEligible: cutleryEligible
    };
  }

  // ---- Пересчёт корзины: строки, сумма, приборы (теперь на уровне строки),
  // порог бесплатной доставки, подтверждение 18+ ----------------------------
  function computeSummary(cart) {
    var modifierGroups = getModifierGroups();
    var lines = [];
    var subtotal = 0;
    var totalCutleryCost = 0;
    var hasAgeRestrictedLine = false;

    Object.keys(cart.items).forEach(function (itemId) {
      var entry = cart.items[itemId];
      var qty = entry && typeof entry.qty === 'number' ? entry.qty : 0;
      if (qty <= 0) return;

      var meta = getItemMeta(itemId);
      if (meta.available && meta.ageRestricted) hasAgeRestrictedLine = true;

      var modifiersDetail = [];
      var modifiersCost = 0;
      meta.modifierGroupIds.forEach(function (groupId) {
        var options = modifierGroups[groupId] || [];
        options.forEach(function (option) {
          var selectedQty = (entry.modifiers && entry.modifiers[groupId] && entry.modifiers[groupId][option.id]) || 0;
          modifiersDetail.push({ groupId: groupId, optionId: option.id, price: option.price, qty: selectedQty });
          if (selectedQty > 0) modifiersCost += option.price * selectedQty;
        });
      });

      // Приборы — модификатор ЭТОЙ строки. Бесплатных наборов ровно столько,
      // сколько единиц товара заказано в этой строке (qty); всё сверху —
      // доплата 2 лея/набор. Позиции без cutleryEligible приборы не заказывают
      // вовсе (напитки и т.п.) — cutleryQty у них всегда 0.
      var cutleryQty = meta.cutleryEligible && typeof entry.cutlery === 'number' && entry.cutlery > 0
        ? entry.cutlery
        : 0;
      var freeCutlery = meta.cutleryEligible ? qty : 0;
      var extraCutlery = Math.max(0, cutleryQty - freeCutlery);
      var cutleryCost = extraCutlery * 2;

      // Доплата за приборы сложена прямо в lineTotal — благодаря этому
      // subtotal (и, соответственно, порог бесплатной доставки ниже)
      // естественным образом включает стоимость приборов.
      var lineTotal = meta.available ? meta.price * qty + modifiersCost + cutleryCost : 0;
      if (meta.available) {
        subtotal += lineTotal;
        totalCutleryCost += cutleryCost;
      }

      lines.push({
        itemId: itemId,
        qty: qty,
        meta: meta,
        modifiersDetail: modifiersDetail,
        cutleryQty: cutleryQty,
        extraCutlery: extraCutlery,
        cutleryCost: cutleryCost,
        lineTotal: lineTotal
      });
    });

    var hasAvailableLine = lines.some(function (line) {
      return line.meta.available;
    });

    var ageConfirmed = Boolean(cart.ageConfirmed);
    var ageOk = !hasAgeRestrictedLine || ageConfirmed;

    return {
      lines: lines,
      isEmpty: lines.length === 0,
      hasAvailableLine: hasAvailableLine,
      subtotal: subtotal,
      cutleryCost: totalCutleryCost,
      total: subtotal,
      hasAgeRestrictedLine: hasAgeRestrictedLine,
      ageConfirmed: ageConfirmed,
      canCheckout: hasAvailableLine && ageOk,
      freeDeliveryReached: subtotal >= FREE_DELIVERY_THRESHOLD,
      deliveryRemaining: Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)
    };
  }

  // ---- Разметка одной строки списка ---------------------------------------
  function renderModifierRow(itemId, detail, isLineAvailable) {
    var optionName = escapeHtml(t('modifiers.' + detail.optionId + '.name'));
    var disabledAttr = isLineAvailable ? '' : ' disabled';
    return (
      '<div class="cart-item__modifier-row" data-modifier-group="' + detail.groupId + '" data-modifier-id="' + detail.optionId + '">' +
        '<span data-i18n-key="modifiers.' + detail.optionId + '.name">' + optionName + '</span>' +
        '<span>(+' + detail.price + ' MDL)</span>' +
        '<div class="stepper stepper--sm" data-item-id="' + itemId + '" data-modifier-group="' + detail.groupId + '" data-modifier-id="' + detail.optionId + '">' +
          '<button type="button" class="stepper__btn" data-action="modifier-decrease"' + disabledAttr + '>−</button>' +
          '<span class="stepper__qty">' + detail.qty + '</span>' +
          '<button type="button" class="stepper__btn" data-action="modifier-increase"' + disabledAttr + '>+</button>' +
        '</div>' +
      '</div>'
    );
  }

  // Приборы для конкретной позиции (правки от 18.09.2026) — та же визуальная
  // логика, что и у соусов (renderModifierRow), но не через
  // window.__CREMA_MODIFIER_GROUPS__ (приборы не общий модификатор с ценой
  // из menu.json, а собственное правило "N бесплатно, дальше 2 лея").
  function renderCutleryRow(line, isLineAvailable) {
    var disabledAttr = isLineAvailable ? '' : ' disabled';
    // Правка от 18.09.2026 (UX-фикс по видео пользователя): раньше "+N MDL"
    // была ТРЕТЬИМ flex-элементом строки (после степпера), что при
    // justify-content:space-between на 2 vs 3 детях заставляло сам степпер
    // визуально "прыгать" влево/вправо в зависимости от того, есть ли
    // доплата. Теперь подпись и доплата сгруппированы в один общий
    // левый flex-элемент (.cart-item__cutlery-left, та же идея, что у
    // name+price в renderModifierRow — соусы), а степпер остаётся ВТОРЫМ
    // и последним элементом строки всегда — при justify-content:space-between
    // ровно на 2 элементах он гарантированно не сдвигается, есть доплата
    // или нет. Формат доплаты приведён к тому же виду, что у цены модификатора
    // соуса — "(+N MDL)" — для единообразия, как и попросил пользователь.
    var extraHtml = line.cutleryCost > 0
      ? '<span class="cart-item__cutlery-extra">(+' + formatMdl(line.cutleryCost) + ')</span>'
      : '';
    return (
      '<div class="cart-item__cutlery-row" data-cutlery-stepper data-item-id="' + line.itemId + '">' +
        '<span class="cart-item__cutlery-left">' +
          '<span class="cart-item__cutlery-label" data-i18n-key="cart.cutlery">' + escapeHtml(t('cart.cutlery')) + '</span>' +
          extraHtml +
        '</span>' +
        '<div class="stepper stepper--sm">' +
          '<button type="button" class="stepper__btn" data-action="cutlery-decrease"' + disabledAttr + '>−</button>' +
          '<span class="stepper__qty">' + line.cutleryQty + '</span>' +
          '<button type="button" class="stepper__btn" data-action="cutlery-increase"' + disabledAttr + '>+</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderCartItemHtml(line) {
    var meta = line.meta;
    var groupsRendered = {};

    var modifiersHtml = '';
    if (line.modifiersDetail.length) {
      var rows = line.modifiersDetail
        .map(function (detail) {
          var labelHtml = '';
          if (!groupsRendered[detail.groupId]) {
            groupsRendered[detail.groupId] = true;
            labelHtml =
              '<span class="cart-item__modifiers-label" data-i18n-key="modifiers.' + detail.groupId + '.groupLabel">' +
              escapeHtml(t('modifiers.' + detail.groupId + '.groupLabel')) +
              '</span>';
          }
          return labelHtml + renderModifierRow(line.itemId, detail, meta.available);
        })
        .join('');
      modifiersHtml = '<div class="cart-item__modifiers">' + rows + '</div>';
    }

    var cutleryHtml = meta.cutleryEligible
      ? '<div class="cart-item__modifiers">' + renderCutleryRow(line, meta.available) + '</div>'
      : '';

    var unavailableHtml = !meta.available
      ? '<span class="cart-item__unavailable-note" data-i18n-key="cart.itemUnavailable">' + escapeHtml(t('cart.itemUnavailable')) + '</span>'
      : '';

    var itemStepperDisabled = meta.available ? '' : ' disabled';
    var cardClass = meta.available ? 'cart-item' : 'cart-item cart-item--unavailable';

    return (
      '<li class="' + cardClass + '" data-cart-item-id="' + line.itemId + '">' +
        '<div class="cart-item__info">' +
          '<span class="cart-item__name" data-i18n-key="items.' + line.itemId + '.name">' + escapeHtml(meta.name) + '</span>' +
          unavailableHtml +
          modifiersHtml +
          cutleryHtml +
        '</div>' +
        '<div class="cart-item__side">' +
          '<span class="cart-item__price">' + formatMdl(line.lineTotal) + '</span>' +
          '<div class="stepper" data-item-id="' + line.itemId + '">' +
            '<button type="button" class="stepper__btn" data-action="item-decrease"' + itemStepperDisabled + '>−</button>' +
            '<span class="stepper__qty">' + line.qty + '</span>' +
            '<button type="button" class="stepper__btn" data-action="item-increase"' + itemStepperDisabled + '>+</button>' +
          '</div>' +
        '</div>' +
      '</li>'
    );
  }

  // ---- Кэш DOM-узлов попапа + рендер целиком ------------------------------
  var els = {};

  function cacheEls() {
    els.overlay = document.getElementById('cartOverlay');
    els.modal = document.getElementById('cartModal');
    els.closeBtn = document.getElementById('cartClose');
    els.empty = document.getElementById('cartEmpty');
    els.body = document.getElementById('cartBody');
    els.list = document.getElementById('cartList');
    els.ageConfirm = document.getElementById('cartAgeConfirm');
    els.ageCheckbox = document.getElementById('cartAgeCheckbox');
    els.ageError = document.getElementById('cartAgeError');
    // Правки от 18.09.2026: .cart-modal__delivery/.cart-modal__total теперь
    // отдельные "закреплённые" блоки ВНЕ .cart-modal__body (см. template.html) —
    // раньше прятались вместе с ним автоматически через [hidden] на родителе,
    // теперь нужно скрывать/показывать их явно здесь при пустой корзине.
    els.deliveryBlock = document.getElementById('cartDelivery');
    els.deliveryText = document.getElementById('cartDeliveryText');
    els.deliveryBarFill = document.getElementById('cartDeliveryBarFill');
    els.totalRow = document.getElementById('cartTotalRow');
    els.totalAmount = document.getElementById('cartTotalAmount');
    els.backToMenuBtn = document.getElementById('cartBackToMenu');
    els.checkoutBtn = document.getElementById('cartCheckout');
    els.cartButton = document.getElementById('cartButton');
  }

  function renderCartModal() {
    var cart = window.CremaCart.readCart();
    var summary = computeSummary(cart);

    if (summary.isEmpty) {
      els.empty.hidden = false;
      els.body.hidden = true;
      els.checkoutBtn.hidden = true;
      // Возрастной блок/доставка/итог теперь вне .cart-modal__body — при
      // пустой корзине скрываем их явно, иначе останутся видны сами по себе.
      if (els.ageConfirm) els.ageConfirm.hidden = true;
      if (els.deliveryBlock) els.deliveryBlock.hidden = true;
      if (els.totalRow) els.totalRow.hidden = true;
      return;
    }

    els.empty.hidden = true;
    els.body.hidden = false;
    els.checkoutBtn.hidden = false;
    els.checkoutBtn.disabled = !summary.canCheckout;
    if (els.deliveryBlock) els.deliveryBlock.hidden = false;
    if (els.totalRow) els.totalRow.hidden = false;

    els.list.innerHTML = summary.lines.map(renderCartItemHtml).join('');

    // Отдельная надпись про правило приборов и агрегированная "Доплата за
    // приборы: N лей" убраны правкой от 18.09.2026 — та же информация уже
    // видна по месту, в строке каждой позиции (.cart-item__cutlery-extra,
    // "+N MDL" рядом со степпером приборов, см. renderCutleryRow выше).

    // Чекбокс "подтверждаю 18+" — показываем только если в корзине есть
    // хотя бы одна доступная позиция с алкоголем (data-age-restricted).
    if (els.ageConfirm) {
      if (summary.hasAgeRestrictedLine) {
        els.ageConfirm.hidden = false;
        if (els.ageCheckbox) els.ageCheckbox.checked = summary.ageConfirmed;
        if (els.ageError) els.ageError.hidden = summary.ageConfirmed;
      } else {
        els.ageConfirm.hidden = true;
      }
    }

    if (summary.freeDeliveryReached) {
      els.deliveryText.textContent = t('cart.freeDeliveryReached');
      els.deliveryText.classList.add('cart-modal__delivery-text--reached');
      els.deliveryBarFill.style.width = '100%';
    } else {
      els.deliveryText.textContent = t('cart.freeDeliveryHint').replace('{amount}', summary.deliveryRemaining);
      els.deliveryText.classList.remove('cart-modal__delivery-text--reached');
      var pct = Math.min(100, Math.round((summary.subtotal / FREE_DELIVERY_THRESHOLD) * 100));
      els.deliveryBarFill.style.width = pct + '%';
    }

    els.totalAmount.textContent = formatMdl(summary.total);
  }

  // ---- Открытие/закрытие --------------------------------------------------
  function openCart() {
    renderCartModal();
    els.overlay.hidden = false;
    document.body.classList.add('cart-modal-open');
    if (els.closeBtn) els.closeBtn.focus();
  }

  function closeCart() {
    els.overlay.hidden = true;
    document.body.classList.remove('cart-modal-open');
    if (els.cartButton) els.cartButton.focus();
  }

  function isOpen() {
    return els.overlay && !els.overlay.hidden;
  }

  // ---- Обработчики кликов (делегирование на document — список
  // перерисовывается целиком, навешивать слушатели на каждый узел заново
  // после каждого рендера не нужно) ----------------------------------------
  function handleItemStepperClick(actionEl) {
    var stepperEl = actionEl.closest('[data-item-id]');
    var itemId = stepperEl.getAttribute('data-item-id');
    var cart = window.CremaCart.readCart();
    var qty = window.CremaCart.getItemQty(cart, itemId);
    qty = actionEl.getAttribute('data-action') === 'item-increase' ? qty + 1 : Math.max(0, qty - 1);
    window.CremaCart.setItemQty(cart, itemId, qty);
    window.CremaCart.writeCart(cart);
  }

  function handleModifierStepperClick(actionEl) {
    var stepperEl = actionEl.closest('[data-modifier-id]');
    var itemId = stepperEl.getAttribute('data-item-id');
    var groupId = stepperEl.getAttribute('data-modifier-group');
    var optionId = stepperEl.getAttribute('data-modifier-id');

    var cart = window.CremaCart.readCart();
    var entry = cart.items[itemId];
    if (!entry) return; // товар уже убрали из корзины — защита от гонки кликов

    if (!entry.modifiers || typeof entry.modifiers !== 'object') entry.modifiers = {};
    if (!entry.modifiers[groupId] || typeof entry.modifiers[groupId] !== 'object') entry.modifiers[groupId] = {};

    var currentQty = entry.modifiers[groupId][optionId] || 0;
    var nextQty = actionEl.getAttribute('data-action') === 'modifier-increase' ? currentQty + 1 : Math.max(0, currentQty - 1);

    if (nextQty > 0) {
      entry.modifiers[groupId][optionId] = nextQty;
    } else {
      delete entry.modifiers[groupId][optionId];
    }
    window.CremaCart.writeCart(cart);
  }

  function handleCutleryClick(actionEl) {
    var stepperEl = actionEl.closest('[data-cutlery-stepper]');
    if (!stepperEl) return;
    var itemId = stepperEl.getAttribute('data-item-id');
    var cart = window.CremaCart.readCart();
    if (!cart.items[itemId]) return; // товар уже убрали из корзины — защита от гонки кликов
    var qty = window.CremaCart.getItemCutlery(cart, itemId);
    qty = actionEl.getAttribute('data-action') === 'cutlery-increase' ? qty + 1 : Math.max(0, qty - 1);
    window.CremaCart.setItemCutlery(cart, itemId, qty);
    window.CremaCart.writeCart(cart);
  }

  function handleAgeCheckboxChange(checkboxEl) {
    var cart = window.CremaCart.readCart();
    cart.ageConfirmed = Boolean(checkboxEl.checked);
    window.CremaCart.writeCart(cart);
  }

  function initClickDelegation() {
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest) return;

      if (target.closest('#cartButton')) {
        openCart();
        return;
      }

      // Клик по подложке (не по самой модалке) — за пределами .cart-modal.
      if (target === els.overlay) {
        closeCart();
        return;
      }

      if (target.closest('#cartClose') || target.closest('#cartBackToMenu')) {
        closeCart();
        return;
      }

      if (target.closest('#cartCheckout')) {
        // Форма оформления заказа (п.8 плана) ещё не реализована — переход
        // добавится, когда дойдём до этого пункта. Пока просто не даём
        // кнопке ничего не делать молча — оставляем след в консоли.
        console.log('[cart.js] Оформление заказа (п.8 плана) пока не реализовано.');
        return;
      }

      var itemStepperBtn = target.closest('.cart-list [data-action="item-increase"], .cart-list [data-action="item-decrease"]');
      if (itemStepperBtn) {
        handleItemStepperClick(itemStepperBtn);
        return;
      }

      var modifierBtn = target.closest('.cart-list [data-action="modifier-increase"], .cart-list [data-action="modifier-decrease"]');
      if (modifierBtn) {
        handleModifierStepperClick(modifierBtn);
        return;
      }

      var cutleryBtn = target.closest('.cart-list [data-action="cutlery-increase"], .cart-list [data-action="cutlery-decrease"]');
      if (cutleryBtn) {
        handleCutleryClick(cutleryBtn);
        return;
      }
    });

    // Чекбокс "подтверждаю 18+" — отдельным слушателем на 'change' (а не через
    // делегированный click выше), т.к. на момент 'change' checkboxEl.checked
    // уже гарантированно отражает новое состояние.
    document.addEventListener('change', function (event) {
      if (event.target && event.target.id === 'cartAgeCheckbox') {
        handleAgeCheckboxChange(event.target);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        closeCart();
      }
    });

    // Любое изменение корзины (в том числе из степпера карточки товара в
    // сетке меню, js/menu.js) — перерисовываем попап, если он открыт.
    document.addEventListener('crema:cartchange', function () {
      if (isOpen()) renderCartModal();
    });

    // Смена языка, если попап открыт — иначе вычисленные строки (доплата
    // за приборы, подсказка про бесплатную доставку) останутся на старом
    // языке до следующего изменения корзины. Статический текст (заголовок,
    // подписи) i18n.js обновит сам через data-i18n-key, как обычно.
    document.addEventListener('crema:langchange', function () {
      if (isOpen()) renderCartModal();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    cacheEls();
    if (!els.overlay) return;
    initClickDelegation();
  });
})();
