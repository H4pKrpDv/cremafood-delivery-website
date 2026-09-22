/*
 * js/privacy.js — попап "Политика конфиденциальности" (п.9 плана,
 * правка от 22.09.2026: раньше это был якорный блок #privacy прямо на
 * странице, пользователь попросил заменить на попап — та же схема, что у
 * корзины/чекаута (.cart-overlay/.cart-modal, .checkout-overlay/.checkout-modal):
 * оверлей на весь экран, блокировка прокрутки body (.modal-open), закрытие
 * по крестику/клику по подложке вне модалки/клавише Escape.
 *
 * Специально вынесено в отдельный маленький файл, а не дописано в main.js —
 * та же логика разделения ответственности, что у cart.js/checkout.js:
 * каждый попап — свой файл.
 *
 * Открывается двумя путями:
 *  1. Любая ссылка/кнопка на странице с атрибутом [data-open-privacy]
 *     (сейчас это ссылка "Политика конфиденциальности" в футере) —
 *     обрабатывается здесь же, делегированием на document.
 *  2. Программно, через window.CremaPrivacy.open() — так делает
 *     js/checkout.js для ссылки "политикой" в тексте согласия: сначала
 *     закрывает попап чекаута (чтобы не накладывать один попап на другой),
 *     затем вызывает CremaPrivacy.open().
 */
(function () {
  'use strict';

  var els = {};

  function cacheEls() {
    els.overlay = document.getElementById('privacyOverlay');
    els.modal = document.getElementById('privacyModal');
    els.closeBtn = document.getElementById('privacyClose');
  }

  function isOpen() {
    return !!(els.overlay && !els.overlay.hidden);
  }

  function open() {
    if (!els.overlay) return;
    els.overlay.hidden = false;
    document.body.classList.add('modal-open');
  }

  function close() {
    if (!els.overlay) return;
    els.overlay.hidden = true;
    document.body.classList.remove('modal-open');
  }

  function initEvents() {
    els.overlay.addEventListener('click', function (event) {
      if (event.target === els.overlay) close();
    });

    els.closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) close();
    });

    // Делегирование на document — так ссылка-триггер может быть где угодно
    // на странице (сейчас только футер), без необходимости знать её id
    // заранее.
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-open-privacy]');
      if (!trigger) return;
      event.preventDefault();
      open();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    cacheEls();
    if (!els.overlay) return;
    initEvents();
  });

  window.CremaPrivacy = {
    open: open,
    close: close
  };
})();
