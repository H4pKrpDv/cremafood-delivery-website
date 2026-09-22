/*
 * js/analytics.js — Этап 1, п.12 плана (заготовка под аналитику, 22.09.2026).
 *
 * Сейчас никакой реальной аналитики на сайте нет (пользователь подтвердил —
 * подключать пока не нужно, см. Context.md, раздел "Про SEO/трафик"), но
 * код, который будет ОТПРАВЛЯТЬ события (ошибки заказа и т.п.), должен
 * появиться уже сейчас, чтобы потом не переписывать checkout.js и другие
 * файлы — просто дописать реализацию внутри trackEvent().
 *
 * window.CremaAnalytics.trackEvent(name, data) — единая точка входа для
 * любого события на сайте. Пока делает только console.log (плюс тихо
 * копит последние события в памяти — удобно для ручной проверки в devtools
 * консоли через window.CremaAnalytics.getLog()). Когда дойдём до реальной
 * аналитики (Этап 3 плана, "аналитика (просто заполнить trackEvent)") —
 * сюда впишется gtag('event', name, data) / fbq('trackCustom', name, data)
 * или что выберем, одной-двумя строками, БЕЗ изменений в местах вызова.
 *
 * Первый реальный вызов — js/checkout.js, ветка ошибки отправки заказа:
 * trackEvent('order_error', {...}) — ровно то, что уже описано в
 * Context.md, раздел "Обработка сети при отправке заказа".
 *
 * Должен идти РАНЬШЕ любого файла, который может вызвать trackEvent —
 * сейчас это js/checkout.js, поэтому подключается одним из первых
 * <script>-тегов (сразу после js/i18n.js), тем же принципом, что и
 * js/hours.js.
 */
(function () {
  'use strict';

  var MAX_LOG_SIZE = 50;
  var log = [];

  function trackEvent(name, data) {
    var event = {
      name: name,
      data: data || {},
      timestamp: new Date().toISOString()
    };

    log.push(event);
    if (log.length > MAX_LOG_SIZE) log.shift();

    // Заглушка (Этап 1, п.12): реальная отправка появится позже (Этап 3).
    // console.info, а не console.error/warn — это ожидаемое поведение
    // заглушки, а не сбой.
    console.info('[analytics] trackEvent:', name, event.data);
  }

  function getLog() {
    return log.slice();
  }

  window.CremaAnalytics = {
    trackEvent: trackEvent,
    getLog: getLog
  };
})();
