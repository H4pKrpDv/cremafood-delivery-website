/**
 * js/checkout.js
 * ------------------------------------------------------------------
 * Форма оформления заказа (Этап 1, п.8 плана). Второй попап на странице
 * (первый — корзина, js/cart.js) — открывается кликом по "Заказать" в
 * попапе корзины (js/cart.js закрывает свой попап и вызывает
 * window.CremaCheckout.open()).
 *
 * Что делает этот файл:
 *  - Маска молдавского номера телефона "+373 (__) ___-___" на чистом JS
 *    через событие 'input' (см. extractPhoneDigits/formatPhoneDigits ниже) —
 *    буквы отфильтровываются сами собой (значение всегда пересобирается
 *    заново из цифр), код страны +373 нельзя стереть (пересобирается
 *    заново на каждое нажатие).
 *  - Переключатель "доставка (+60 лей) / самовывоз" — показывает/прячет
 *    адресные поля и пересчитывает итог в блоке .checkout-summary.
 *  - Переключатель способа оплаты "наличкой / картой".
 *  - Валидация формы через Zod (точнее — js/vendor/zod-lite.js, см. его
 *    собственный комментарий про то, почему это не настоящий npm-пакет
 *    zod, и как его безболезненно заменить на настоящий в будущем).
 *    Провал валидации → класс .input-error на инпут (или контейнер
 *    переключателя) + текст ошибки в <span> под ним; ошибка конкретного
 *    поля убирается, как только пользователь начинает его редактировать
 *    (см. clearFieldError, вызывается из обработчиков 'input'/клика).
 *  - Заглушка отправки заказа (бекенда пока нет, это Этап 2 плана,
 *    пп.13-16): по клику "Оформить заказ" — спиннер ~1.6 сек, затем ВСЕГДА
 *    успех, КРОМЕ специального тестового номера телефона "+373 (00) 000-000"
 *    (все 8 цифр — нули) — на нём заглушка нарочно "падает" в ветку ошибки,
 *    чтобы можно было руками посмотреть, как выглядит экран ошибки, не
 *    дожидаясь реального бекенда. Это временное поведение заглушки,
 *    описано в Context.md — уберётся само, когда появится реальный fetch
 *    к /api/order (п.16 плана).
 *  - При успехе — корзина очищается (window.CremaCart.writeCart с пустыми
 *    items и ageConfirmed:false), сообщение об успехе остаётся на экране,
 *    пока пользователь сам не закроет попап (крестик/клик по оверлею вне
 *    модалки/Escape — правка от 19.09.2026: раньше попап закрывался сам
 *    через ~2.6 сек, пользователь мог отвлечься и не увидеть подтверждение
 *    заказа; теперь авто-закрытия нет вовсе). При закрытии попапа именно
 *    из состояния "успех" страница дополнительно скроллится наверх — как и
 *    требовала техника ("вернуть пользователя на главный экран"), см.
 *    closeCheckout(). При ошибке — форма и корзина НЕ очищаются, кнопка
 *    разблокируется, пользователь может поправить и нажать ещё раз.
 *
 * Проверка рабочего времени доставки (кухня 09:00-02:00 / бар 07:00-22:00,
 * см. js/hours.js) — реализована функцией checkHoursGate() ниже. Позиции,
 * закрытые прямо сейчас по часам работы отдела, уже исключены из суммы
 * попапом корзины (js/cart.js, meta.orderable) точно так же, как и товар
 * не в наличии — форма оформления не пересчитывает это заново, только
 * проверяет: если ПОСЛЕ такого исключения в корзине не осталось ни одной
 * заказываемой позиции (а причина именно в часах работы, а не в пустой
 * корзине/недостающем подтверждении возраста — те случаи уже отдельно не
 * пускают открыть сам попап оформления, см. open()) — показываем плашку
 * #checkoutHoursWarning с временем, когда отдел снова откроется, и
 * блокируем кнопку "Оформить заказ". Часы работы могут переключиться, пока
 * форма уже открыта (см. crema:hourscheck в initEvents ниже) — тогда плашка
 * появляется/исчезает сама, без действий пользователя.
 * ------------------------------------------------------------------
 */
(function () {
  var DELIVERY_FEE = 60;
  // Тестовый триггер для ручной проверки ветки ошибки заглушки-отправки —
  // см. комментарий выше и Context.md. Все 8 цифр номера после кода
  // страны — нули: "+373 (00) 000-000".
  var TEST_FAIL_DIGITS = '00000000';
  var SUBMIT_DELAY_MS = 1600;

  var els = {};
  var state = {
    method: null, // 'delivery' | 'pickup' | null (ничего не выбрано)
    payment: null // 'cash' | 'card' | null
  };

  // ---- Мини-резолвер i18n-ключей (тот же паттерн, что в js/cart.js) -------
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

  function formatMdl(amount) {
    var rounded = Math.round(amount * 100) / 100;
    return rounded + ' MDL';
  }

  // ---- Маска телефона ------------------------------------------------------
  function extractPhoneDigits(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    // Код страны +373 может попасть в digits, если пользователь его тоже
    // "напечатал" сам (например вставил номер целиком через paste) —
    // срезаем один раз в начале, остальное — уже локальные цифры номера.
    if (digits.indexOf('373') === 0) {
      digits = digits.slice(3);
    }
    return digits.slice(0, 8); // 2 (код оператора) + 3 + 3 = 8 цифр максимум
  }

  function formatPhoneDigits(digits) {
    var out = '+373 (' + digits.slice(0, 2);
    if (digits.length >= 2) out += ')';
    if (digits.length > 2) out += ' ' + digits.slice(2, 5);
    if (digits.length > 5) out += '-' + digits.slice(5, 8);
    return out;
  }

  function handlePhoneInput() {
    var digits = extractPhoneDigits(els.phone.value);
    var formatted = formatPhoneDigits(digits);
    els.phone.value = formatted;
    if (els.phone.setSelectionRange) {
      els.phone.setSelectionRange(formatted.length, formatted.length);
    }
    clearFieldError('phone');
  }

  // ---- Кэш DOM-узлов --------------------------------------------------------
  function cacheEls() {
    els.overlay = document.getElementById('checkoutOverlay');
    els.modal = document.getElementById('checkoutModal');
    els.closeBtn = document.getElementById('checkoutClose');
    els.form = document.getElementById('checkoutForm');

    els.name = document.getElementById('checkoutName');
    els.nameError = document.getElementById('checkoutNameError');
    els.phone = document.getElementById('checkoutPhone');
    els.phoneError = document.getElementById('checkoutPhoneError');

    els.methodToggle = document.getElementById('checkoutMethodToggle');
    els.methodError = document.getElementById('checkoutMethodError');
    els.addressFields = document.getElementById('checkoutAddressFields');
    els.street = document.getElementById('checkoutStreet');
    els.streetError = document.getElementById('checkoutStreetError');
    els.building = document.getElementById('checkoutBuilding');
    els.buildingError = document.getElementById('checkoutBuildingError');
    els.entrance = document.getElementById('checkoutEntrance');
    els.floor = document.getElementById('checkoutFloor');
    els.apartment = document.getElementById('checkoutApartment');

    els.paymentToggle = document.getElementById('checkoutPaymentToggle');
    els.paymentError = document.getElementById('checkoutPaymentError');

    els.summarySubtotal = document.getElementById('checkoutSummarySubtotal');
    els.summaryDeliveryRow = document.getElementById('checkoutSummaryDeliveryRow');
    els.summaryDeliveryFee = document.getElementById('checkoutSummaryDeliveryFee');
    els.summaryTotal = document.getElementById('checkoutSummaryTotal');
    els.deliveryFeeSuffix = document.getElementById('checkoutDeliveryFeeSuffix');

    els.hoursWarning = document.getElementById('checkoutHoursWarning');
    els.submitBtn = document.getElementById('checkoutSubmit');

    els.loading = document.getElementById('checkoutLoading');
    els.success = document.getElementById('checkoutSuccess');
    els.orderNumberEl = document.getElementById('checkoutOrderNumber');
    els.error = document.getElementById('checkoutError');
    els.retryBtn = document.getElementById('checkoutRetry');
  }

  function isOpen() {
    return !!(els.overlay && !els.overlay.hidden);
  }

  // ---- Ошибки валидации: .input-error + span под полем ---------------------
  // path[0] схемы Zod → элемент(ы), на которые вешаем/с которых снимаем
  // класс ошибки. Для обычных полей это <input>, для переключателей
  // (способ получения/оплаты) — их общий контейнер .checkout-toggle
  // (правило проекта про .input-error распространяем на них по смыслу —
  // это тоже "поле в состоянии ошибки", просто не текстовый инпут).
  function fieldErrorMap() {
    return {
      name: { inputEl: els.name, errorEl: els.nameError },
      phone: { inputEl: els.phone, errorEl: els.phoneError },
      method: { toggleEl: els.methodToggle, errorEl: els.methodError },
      street: { inputEl: els.street, errorEl: els.streetError },
      building: { inputEl: els.building, errorEl: els.buildingError },
      payment: { toggleEl: els.paymentToggle, errorEl: els.paymentError }
    };
  }

  function clearFieldError(fieldName) {
    var map = fieldErrorMap()[fieldName];
    if (!map) return;
    if (map.inputEl) map.inputEl.classList.remove('input-error');
    if (map.toggleEl) map.toggleEl.classList.remove('checkout-toggle--error');
    if (map.errorEl) {
      map.errorEl.hidden = true;
      map.errorEl.textContent = '';
    }
  }

  function clearAllErrors() {
    Object.keys(fieldErrorMap()).forEach(clearFieldError);
  }

  function showFieldError(fieldName, message) {
    var map = fieldErrorMap()[fieldName];
    if (!map) return;
    if (map.inputEl) map.inputEl.classList.add('input-error');
    if (map.toggleEl) map.toggleEl.classList.add('checkout-toggle--error');
    if (map.errorEl) {
      map.errorEl.hidden = false;
      map.errorEl.textContent = message;
    }
  }

  // ---- Переключатели способа получения / оплаты ----------------------------
  function setMethod(method) {
    state.method = method;
    var buttons = els.methodToggle.querySelectorAll('[data-method]');
    for (var i = 0; i < buttons.length; i++) {
      var isActive = buttons[i].getAttribute('data-method') === method;
      buttons[i].classList.toggle('checkout-toggle__btn--active', isActive);
      buttons[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    els.addressFields.hidden = method !== 'delivery';
    clearFieldError('method');
    if (method !== 'delivery') {
      // Пользователь мог сначала выбрать "доставка", оставить улицу пустой
      // (получить ошибку), затем передумать и выбрать "самовывоз" — старые
      // ошибки по адресу не должны остаться висеть на скрытых полях.
      clearFieldError('street');
      clearFieldError('building');
    }
    renderSummary();
  }

  function setPayment(payment) {
    state.payment = payment;
    var buttons = els.paymentToggle.querySelectorAll('[data-payment]');
    for (var i = 0; i < buttons.length; i++) {
      var isActive = buttons[i].getAttribute('data-payment') === payment;
      buttons[i].classList.toggle('checkout-toggle__btn--active', isActive);
      buttons[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    clearFieldError('payment');
  }

  // ---- Сумма заказа (подытог из корзины + доставка) ------------------------
  // window.CremaCartSummary.compute — тот же расчёт, что использует сам
  // попап корзины (js/cart.js), вынесен оттуда наружу правкой от 19.09.2026
  // именно для этого файла, чтобы сумма нигде не могла разойтись.
  function getCartSummary() {
    var cart = window.CremaCart.readCart();
    return window.CremaCartSummary.compute(cart);
  }

  // Правка от 19.09.2026 (фикс по видео пользователя, см. Context.md):
  // раньше при выборе "доставка" 60 лей прибавлялись к итогу всегда, даже
  // если подытог уже достиг порога бесплатной доставки (399 MDL,
  // summary.freeDeliveryReached из js/cart.js — тот же расчёт, что в
  // попапе корзины). Теперь при freeDeliveryReached доставка не
  // добавляется к total вовсе, а вместо суммы везде показывается
  // "Бесплатно" (i18n-ключ checkout.free).
  function renderSummary() {
    var summary = getCartSummary();
    var isDelivery = state.method === 'delivery';
    var freeDelivery = isDelivery && summary.freeDeliveryReached;
    var deliveryFee = isDelivery && !freeDelivery ? DELIVERY_FEE : 0;

    els.summarySubtotal.textContent = formatMdl(summary.total);
    els.summaryDeliveryRow.hidden = !isDelivery;
    els.summaryDeliveryFee.textContent = freeDelivery ? t('checkout.free') : formatMdl(deliveryFee);
    els.summaryDeliveryFee.classList.toggle('checkout-summary__amount--free', freeDelivery);
    els.summaryTotal.textContent = formatMdl(summary.total + deliveryFee);

    updateDeliveryToggleFeeSuffix(summary.freeDeliveryReached);
    checkHoursGate();
  }

  // Среди строк, заблокированных СЕЙЧАС именно часами работы отдела (товар
  // в наличии, но department закрыт — meta.available && !meta.departmentOpen),
  // берём самое ПОЗДНЕЕ время открытия. Та же логика, что внутри
  // js/hours.js/getOpenTimeLabel() для одной позиции с несколькими
  // отделами, только здесь — по всем строкам корзины сразу: заказ целиком
  // станет валиден только когда откроется САМЫЙ последний из них.
  function computeEarliestReopenLabel(summary) {
    var labels = summary.lines
      .filter(function (line) { return line.meta.available && !line.meta.departmentOpen; })
      .map(function (line) { return line.meta.departmentOpenLabel; })
      .filter(Boolean);
    if (!labels.length) return '';
    return labels.sort().slice(-1)[0];
  }

  // Блокирует кнопку "Оформить заказ" + показывает плашку
  // #checkoutHoursWarning, если ПОСЛЕ исключения хоурс-блокированных строк
  // (см. комментарий в шапке файла) в корзине не осталось ни одной
  // заказываемой позиции. Возвращает true, если оформление разрешено
  // (гейт пройден) — false, если заблокировано.
  function checkHoursGate() {
    var summary = getCartSummary();
    var hasHoursBlockedLine = summary.lines.some(function (line) {
      return line.meta.available && !line.meta.departmentOpen;
    });
    var shouldBlock = !summary.canCheckout && hasHoursBlockedLine;

    if (els.hoursWarning) {
      els.hoursWarning.hidden = !shouldBlock;
      if (shouldBlock) {
        var timeLabel = computeEarliestReopenLabel(summary);
        els.hoursWarning.textContent = t('checkout.workingHoursClosed').replace('{time}', timeLabel);
      }
    }
    if (els.submitBtn) els.submitBtn.disabled = shouldBlock;
    return !shouldBlock;
  }

  // Суффикс "(+60 MDL)" / "(Бесплатно)" на самой кнопке-переключателе
  // "Доставка" — раньше он был частью статичного data-i18n-key текста
  // кнопки ("Доставка (+60 лей)"), из-за чего не мог обновляться при
  // достижении порога бесплатной доставки. Теперь это отдельный элемент
  // (#checkoutDeliveryFeeSuffix), который обновляем сами при каждом
  // renderSummary() — в том числе ДО того, как способ получения выбран,
  // чтобы пользователь видел актуальную стоимость доставки заранее.
  function updateDeliveryToggleFeeSuffix(freeDeliveryReached) {
    if (!els.deliveryFeeSuffix) return;
    els.deliveryFeeSuffix.textContent = freeDeliveryReached
      ? '(' + t('checkout.free') + ')'
      : '(+' + formatMdl(DELIVERY_FEE) + ')';
  }

  // ---- Zod-схема и валидация -------------------------------------------------
  function buildSchema() {
    var z = window.Zod.z;
    var phoneRegex = /^\+373 \(\d{2}\) \d{3}-\d{3}$/;
    var requiredMsg = t('checkout.validation.required');
    var phoneMsg = t('checkout.validation.phoneFormat');

    var shape = {
      name: z.string().min(1, requiredMsg),
      phone: z.string().regex(phoneRegex, phoneMsg),
      method: z.enum(['delivery', 'pickup'], requiredMsg),
      payment: z.enum(['cash', 'card'], requiredMsg)
    };

    if (state.method === 'delivery') {
      shape.street = z.string().min(1, requiredMsg);
      shape.building = z.string().min(1, requiredMsg);
    }

    return z.object(shape);
  }

  function collectFormData() {
    return {
      name: els.name.value.trim(),
      phone: els.phone.value.trim(),
      method: state.method,
      payment: state.payment,
      street: els.street.value.trim(),
      building: els.building.value.trim(),
      entrance: els.entrance.value.trim(),
      floor: els.floor.value.trim(),
      apartment: els.apartment.value.trim()
    };
  }

  // Возвращает валидированные данные при успехе, иначе null (и сама рисует
  // ошибки на форме).
  function validateAndShowErrors() {
    clearAllErrors();
    var schema = buildSchema();
    var data = collectFormData();
    var result = schema.safeParse(data);
    if (result.success) {
      return data;
    }
    result.error.issues.forEach(function (issue) {
      var fieldName = issue.path[0];
      showFieldError(fieldName, issue.message);
    });
    // Фокус на первое поле с ошибкой — помогает быстрее найти, что поправить,
    // особенно на мобильном, где форма длиннее экрана.
    var firstField = result.error.issues[0].path[0];
    var map = fieldErrorMap()[firstField];
    if (map && map.inputEl && !map.inputEl.disabled) {
      map.inputEl.focus();
    }
    return null;
  }

  // ---- Номер заказа (временный, только для UX заглушки) --------------------
  // Реальный номер (с настоящим порядковым счётчиком) будет генерировать
  // сервер, когда появится бекенд (п.14 плана) — см. Context.md.
  function generateOrderNumber() {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    var rand = String(Math.floor(1000 + Math.random() * 9000));
    return 'CR-' + y + m + d + '-' + rand;
  }

  function buildOrderPayload(formData, orderNumber) {
    var cart = window.CremaCart.readCart();
    var summary = window.CremaCartSummary.compute(cart);
    // Тот же фикс бесплатной доставки, что и в renderSummary() выше —
    // важно применить его и здесь, иначе реальная (будущая) отправка на
    // сервер отправила бы неверную deliveryFee/total, даже если на экране
    // пользователь уже видел "Бесплатно".
    var deliveryFee = formData.method === 'delivery' && !summary.freeDeliveryReached ? DELIVERY_FEE : 0;

    return {
      orderNumber: orderNumber,
      createdAt: new Date().toISOString(),
      contact: { name: formData.name, phone: formData.phone },
      fulfillment: {
        method: formData.method,
        address: formData.method === 'delivery'
          ? {
              city: 'Balti',
              street: formData.street,
              building: formData.building,
              entrance: formData.entrance || null,
              floor: formData.floor || null,
              apartment: formData.apartment || null
            }
          : null
      },
      payment: { method: formData.payment },
      ageConfirmed: Boolean(cart.ageConfirmed),
      items: summary.lines
        .filter(function (line) { return line.meta.orderable; })
        .map(function (line) {
          return {
            id: line.itemId,
            name: line.meta.name,
            qty: line.qty,
            unitPrice: line.meta.price,
            modifiers: line.modifiersDetail
              .filter(function (d) { return d.qty > 0; })
              .map(function (d) { return { groupId: d.groupId, optionId: d.optionId, qty: d.qty, price: d.price }; }),
            cutleryQty: line.cutleryQty,
            cutleryCost: line.cutleryCost,
            lineTotal: line.lineTotal
          };
        }),
      amounts: {
        subtotal: summary.total,
        deliveryFee: deliveryFee,
        total: summary.total + deliveryFee
      }
    };
  }

  // ---- Состояния попапа: форма / загрузка / успех / ошибка -----------------
  function showView(view) {
    els.form.hidden = view !== 'form';
    els.loading.hidden = view !== 'loading';
    els.success.hidden = view !== 'success';
    els.error.hidden = view !== 'error';
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (els.submitBtn.disabled) return; // защита от двойного клика во время запроса
    // Защитная проверка часов работы прямо перед отправкой — на случай если
    // отдел закрылся ровно между последним crema:hourscheck и кликом
    // "Оформить заказ" (гонка, доли секунды). checkHoursGate() сама же
    // покажет плашку и отключит кнопку, если сейчас действительно нельзя.
    if (!checkHoursGate()) return;

    var formData = validateAndShowErrors();
    if (!formData) return;

    var orderNumber = generateOrderNumber();
    var payload = buildOrderPayload(formData, orderNumber);
    // Бекенда пока нет (п.13-16 плана) — payload пока просто логируем, чтобы
    // форма формата данных была видна и обкатана заранее, до появления
    // реального /api/order.
    console.log('[checkout.js] Заглушка отправки заказа, payload:', payload);

    els.submitBtn.disabled = true;
    showView('loading');

    var shouldFail = extractPhoneDigits(formData.phone) === TEST_FAIL_DIGITS;

    window.setTimeout(function () {
      if (shouldFail) {
        els.submitBtn.disabled = false;
        showView('error');
        return;
      }

      els.orderNumberEl.textContent = orderNumber;
      showView('success');

      // Заказ "оформлен" — корзина больше не актуальна, очищаем её (и
      // счётчик в шапке, и localStorage) так же, как это делает обычная
      // запись через window.CremaCart.writeCart.
      window.CremaCart.writeCart({ items: {}, ageConfirmed: false });

      // Больше НЕТ авто-закрытия по таймеру (правка от 19.09.2026) —
      // сообщение об успехе остаётся на экране, пока пользователь сам не
      // закроет попап (см. закрытие + скролл наверх в closeCheckout()).
    }, SUBMIT_DELAY_MS);
  }

  function handleRetry() {
    els.submitBtn.disabled = false;
    showView('form');
  }

  // ---- Открытие/закрытие ----------------------------------------------------
  function resetForm() {
    els.form.reset();
    els.phone.value = '+373 (';
    state.method = null;
    state.payment = null;
    setMethod(null);
    setPayment(null);
    clearAllErrors();
    els.submitBtn.disabled = false;
    showView('form');
  }

  function open() {
    if (!els.overlay) return;
    // Защита от гипотетического обхода (см. Context.md, раздел про
    // возрастное подтверждение): попап корзины уже не даёт нажать
    // "Заказать", пока корзина недоступна/не подтверждён возраст, но на
    // случай прямого вызова (например из консоли) — сверяем ещё раз здесь.
    var summary = getCartSummary();
    if (!summary.canCheckout) return;

    resetForm(); // resetForm() -> setMethod(null) уже вызывает renderSummary()
    els.overlay.hidden = false;
    document.body.classList.add('modal-open');
    if (els.name) els.name.focus();
  }

  function closeCheckout() {
    if (!els.overlay) return;
    // Раз попап закрывается именно из состояния "успех" (пользователь сам
    // нажал крестик/кликнул по оверлею/Escape, увидев подтверждение
    // заказа) — довыполняем то, что раньше делал авто-таймер: скроллим
    // страницу наверх, как и требовала техника ("вернуть пользователя на
    // главный экран"). Если попап закрывают из формы/ошибки — просто
    // закрываем, без скролла.
    var wasSuccess = !!(els.success && !els.success.hidden);
    els.overlay.hidden = true;
    document.body.classList.remove('modal-open');
    if (wasSuccess) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ---- Делегирование событий -------------------------------------------------
  function initEvents() {
    els.overlay.addEventListener('click', function (event) {
      if (event.target === els.overlay) closeCheckout();
    });
    els.closeBtn.addEventListener('click', closeCheckout);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) closeCheckout();
    });

    els.methodToggle.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-method]');
      if (btn) setMethod(btn.getAttribute('data-method'));
    });

    els.paymentToggle.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-payment]');
      if (btn) setPayment(btn.getAttribute('data-payment'));
    });

    els.phone.addEventListener('input', handlePhoneInput);

    // Правило проекта: ошибка поля убирается, как только пользователь
    // начинает в нём печатать.
    els.name.addEventListener('input', function () { clearFieldError('name'); });
    els.street.addEventListener('input', function () { clearFieldError('street'); });
    els.building.addEventListener('input', function () { clearFieldError('building'); });

    els.form.addEventListener('submit', handleSubmit);
    els.retryBtn.addEventListener('click', handleRetry);

    // Смена языка, пока попап открыт, — перерисовываем сумму (текст меток
    // меняется через data-i18n-key сам, но текст ошибок, если они сейчас
    // показаны, и i18n-строки, зашитые в JS выше формирования схемы, нет) —
    // проще всего просто перевалидировать текущее состояние заново, если
    // на экране уже есть ошибки.
    document.addEventListener('crema:langchange', function () {
      if (!isOpen()) return;
      renderSummary();
    });

    // Часы работы отдела могли переключиться, пока форма открыта (см.
    // js/hours.js). Действуем ТОЛЬКО когда сейчас реально показана форма
    // (не "загрузка"/"успех"/"ошибка") — иначе renderSummary() внутри
    // checkHoursGate() могла бы разблокировать кнопку "Оформить заказ"
    // прямо во время отправки заглушки, что было бы багом.
    document.addEventListener('crema:hourscheck', function () {
      if (!isOpen()) return;
      if (els.form.hidden) return;
      renderSummary();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    cacheEls();
    if (!els.overlay) return;
    initEvents();
  });

  window.CremaCheckout = {
    open: open,
    close: closeCheckout
  };
})();
