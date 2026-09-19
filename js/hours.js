/**
 * js/hours.js
 * ------------------------------------------------------------------
 * Проверка рабочего времени доставки (Этап 1, п.8b плана — отдельный шаг,
 * сознательно отложенный при реализации формы оформления заказа в п.8,
 * см. Context.md). Часы работы отделов (техничка, раздел "Ограничение по
 * времени работы"):
 *   - кухня: 09:00–02:00 (интервал переходит через полночь)
 *   - бар:   07:00–22:00
 * Проверяется строго по таймзоне Europe/Chisinau (через Intl.DateTimeFormat),
 * а НЕ по локальному времени/таймзоне устройства пользователя — иначе
 * турист с другим системным часовым поясом увидел бы неверные часы работы.
 *
 * У позиции меню может быть ОДИН отдел ("kitchen"/"bar", для категорий
 * "kitchen"/"cafe" — определяется автоматически build.js по родительской
 * категории) или НЕСКОЛЬКО отделов сразу (позиции из "Спец.предложений" —
 * там могут быть и кухонные, и барные блюда в одном комбо, например
 * "Комбо: Латте + сэндвич" — кофе от бара, сэндвич от кухни; для таких
 * позиций department в data/menu.json явно проставлен вручную как массив).
 * Позиция считается доступной для заказа только если ОТКРЫТЫ ВСЕ
 * перечисленные отделы одновременно.
 *
 * Этот файл — единственный источник правды по часам работы, его читают:
 *   - js/menu.js (карточка товара в сетке меню — блокирует степпер,
 *     показывает "Будет доступно с HH:MM")
 *   - js/cart.js (попап корзины — исключает позицию из суммы, как и
 *     available:false, но с другим текстом причины)
 *   - js/checkout.js (форма оформления — плашка "Приём заказов на доставку
 *     временно закрыт" + блокировка кнопки "Оформить заказ", если ни одной
 *     заказываемой позиции не осталось)
 *
 * Часы работы могут "переключиться" (открыться/закрыться) пока страница
 * открыта в браузере — этот файл сам заводит таймер (проверка раз в 30 сек)
 * и слушатель на visibilitychange (когда пользователь возвращается на вкладку
 * после того, как ноутбук/телефон был в сне) и рассылает кастомное событие
 * "crema:hourscheck" — остальные файлы подписываются на него и перерисовывают
 * свою часть UI, тем же паттерном, что уже есть у "crema:cartchange"/
 * "crema:langchange" (см. js/main.js/js/i18n.js).
 * ------------------------------------------------------------------
 */
(function () {
  var TIMEZONE = 'Europe/Chisinau';

  // Время в минутах от полуночи.
  var DEPARTMENT_HOURS = {
    kitchen: { openMinutes: 9 * 60, closeMinutes: 2 * 60 }, // 09:00–02:00 (через полночь)
    bar: { openMinutes: 7 * 60, closeMinutes: 22 * 60 } // 07:00–22:00
  };

  var RECHECK_INTERVAL_MS = 30000;

  function getNowMinutes() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(new Date());
    var hour = 0;
    var minute = 0;
    parts.forEach(function (part) {
      if (part.type === 'hour') hour = parseInt(part.value, 10) || 0;
      if (part.type === 'minute') minute = parseInt(part.value, 10) || 0;
    });
    return hour * 60 + minute;
  }

  function normalizeDepartments(department) {
    if (!department) return [];
    if (Array.isArray(department)) return department.filter(Boolean);
    return String(department).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function isSingleDepartmentOpen(departmentId, nowMinutes) {
    var range = DEPARTMENT_HOURS[departmentId];
    // Неизвестный/незаданный отдел — не блокируем по ошибке конфигурации
    // (лучше по умолчанию считать открытым, чем случайно "выключить"
    // продажи из-за опечатки в menu.json).
    if (!range) return true;
    if (range.openMinutes <= range.closeMinutes) {
      return nowMinutes >= range.openMinutes && nowMinutes < range.closeMinutes;
    }
    // Интервал через полночь (кухня: 09:00–02:00).
    return nowMinutes >= range.openMinutes || nowMinutes < range.closeMinutes;
  }

  // Открыт товар, только если открыты ВСЕ перечисленные отделы.
  function isOpen(department) {
    var departments = normalizeDepartments(department);
    if (!departments.length) return true;
    var nowMinutes = getNowMinutes();
    return departments.every(function (dep) {
      return isSingleDepartmentOpen(dep, nowMinutes);
    });
  }

  function formatMinutes(minutes) {
    var h = Math.floor(minutes / 60) % 24;
    var m = minutes % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  // Для плашки "Будет доступно с HH:MM" — если закрыто несколько отделов
  // сразу (позиция требует и кухню, и бар), берём САМОЕ ПОЗДНЕЕ время
  // открытия среди закрытых прямо сейчас отделов — именно тогда позиция
  // реально станет доступна целиком.
  function getOpenTimeLabel(department) {
    var departments = normalizeDepartments(department);
    var nowMinutes = getNowMinutes();
    var closedRanges = departments
      .filter(function (dep) { return !isSingleDepartmentOpen(dep, nowMinutes); })
      .map(function (dep) { return DEPARTMENT_HOURS[dep]; })
      .filter(Boolean);
    if (!closedRanges.length) return '';
    var latestOpenMinutes = closedRanges.reduce(function (max, range) {
      return range.openMinutes > max ? range.openMinutes : max;
    }, 0);
    return formatMinutes(latestOpenMinutes);
  }

  function startTicker() {
    window.setInterval(function () {
      document.dispatchEvent(new CustomEvent('crema:hourscheck'));
    }, RECHECK_INTERVAL_MS);

    // Ноутбук/телефон мог уснуть с открытой вкладкой — при возврате часы
    // работы могли давно поменяться, а обычный интервал внутри спящей
        // вкладки не тикает надёжно. Перепроверяем сразу, как вкладка снова
    // становится видимой.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        document.dispatchEvent(new CustomEvent('crema:hourscheck'));
      }
    });
  }

  startTicker();

  window.CremaHours = {
    isOpen: isOpen,
    getOpenTimeLabel: getOpenTimeLabel,
    DEPARTMENT_HOURS: DEPARTMENT_HOURS
  };
})();
