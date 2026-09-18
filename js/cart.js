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
 * "Модификаторы и приборы" и уточнения по бесплатной доставке):
 *  - Приборы: первые N бесплатны, где N = суммарное количество ДОСТУПНЫХ
 *    позиций в корзине; каждый прибор сверх — доплата 2 лея.
 *  - Бесплатная доставка (визуальный триггер, сама доставка добавляется
 *    в форме заказа, п.8): порог 399 лей по сумме ДОСТУПНЫХ позиций
 *    (без учёта приборов).
 *  - Товар с available:false (см. data-available на карточке) показывается
 *    в списке с пометкой "больше нет в наличии" и не участвует в сумме —
 *    не удаляется молча, пользователь должен увидеть и убрать сам.
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
      return { name: itemId, price: 0, available: false, modifierGroupIds: [] };
    }
    var stepperEl = cardEl.querySelector('[data-stepper]');
    var price = stepperEl ? parseFloat(stepperEl.getAttribute('data-price')) || 0 : 0;
    var available = cardEl.getAttribute('data-available') !== 'false';
    var modifiersAttr = cardEl.getAttribute('data-modifiers') || '';
    var modifierGroupIds = modifiersAttr ? modifiersAttr.split(',').filter(Boolean) : [];
    var name = t('items.' + itemId + '.name') || itemId;
    return { name: name, price: price, available: available, modifierGroupIds: modifierGroupIds };
  }

  // ---- Пересчёт корзины: строки, сумма, приборы, порог бесплатной доставки
  function computeSummary(cart) {
    var modifierGroups = getModifierGroups();
    var lines = [];
    var subtotal = 0;
    var availableItemsQty = 0;

    Object.keys(cart.items).forEach(function (itemId) {
      var entry = cart.items[itemId];
      var qty = entry && typeof entry.qty === 'number' ? entry.qty : 0;
      if (qty <= 0) return;

      var meta = getItemMeta(itemId);
      if (meta.available) availableItemsQty += qty;

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

      var lineTotal = meta.available ? meta.price * qty + modifiersCost : 0;
      if (meta.available) subtotal += lineTotal;

      lines.push({
        itemId: itemId,
        qty: qty,
        meta: meta,
        modifiersDetail: modifiersDetail,
        lineTotal: lineTotal
      });
    });

    var cutleryQty = typeof cart.cutlery === 'number' && cart.cutlery > 0 ? cart.cutlery : 0;
    var extraCutlery = Math.max(0, cutleryQty - availableItemsQty);
    var cutleryCost = extraCutlery * 2;

    var hasAvailableLine = lines.some(function (line) {
      return line.meta.available;
    });

    return {
      lines: lines,
      isEmpty: lines.length === 0,
      hasAvailableLine: hasAvailableLine,
      subtotal: subtotal,
      cutleryQty: cutleryQty,
      extraCutlery: extraCutlery,
      cutleryCost: cutleryCost,
      total: subtotal + cutleryCost,
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
    els.cutleryQty = document.getElementById('cutleryQty');
    els.cutleryExtra = document.getElementById('cartCutleryExtra');
    els.deliveryText = document.getElementById('cartDeliveryText');
    els.deliveryBarFill = document.getElementById('cartDeliveryBarFill');
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
      return;
    }

    els.empty.hidden = true;
    els.body.hidden = false;
    els.checkoutBtn.hidden = false;
    els.checkoutBtn.disabled = !summary.hasAvailableLine;

    els.list.innerHTML = summary.lines.map(renderCartItemHtml).join('');

    els.cutleryQty.textContent = String(summary.cutleryQty);
    if (summary.extraCutlery > 0) {
      els.cutleryExtra.hidden = false;
      els.cutleryExtra.textContent = t('cart.cutleryExtraFee').replace('{amount}', summary.cutleryCost);
    } else {
      els.cutleryExtra.hidden = true;
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
    var cart = window.CremaCart.readCart();
    var qty = typeof cart.cutlery === 'number' && cart.cutlery > 0 ? cart.cutlery : 0;
    qty = actionEl.getAttribute('data-action') === 'cutlery-increase' ? qty + 1 : Math.max(0, qty - 1);
    cart.cutlery = qty;
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

      var cutleryBtn = target.closest('[data-action="cutlery-increase"], [data-action="cutlery-decrease"]');
      if (cutleryBtn) {
        handleCutleryClick(cutleryBtn);
        return;
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
