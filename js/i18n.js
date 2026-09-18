/**
 * js/i18n.js
 * ------------------------------------------------------------------
 * Переключение языка (RU/RO/EN) без перезагрузки страницы.
 *
 * Как это работает:
 *  - build.js вшивает ВСЕ три языка прямо в index.html как
 *    window.__CREMA_I18N__ = { ru: {...}, ro: {...}, en: {...} }
 *    (см. <script id="i18n-data"> перед закрывающим </body>). Поэтому
 *    этому скрипту не нужно ничего дополнительно загружать по сети —
 *    это важно, потому что открытие index.html напрямую из файловой
 *    системы (file://) не даёт грузить json через fetch() из-за CORS.
 *  - Каждый переводимый элемент на странице помечен атрибутом
 *    data-i18n-key="путь.до.значения" (build.js расставляет их для
 *    меню; шапка и hero получили свои ключи в п.4/аудите после п.4;
 *    футер получит свои — в п.9, когда дойдём до его переделки).
 *  - Для атрибутов (aria-label, title), а не видимого текста, — свой
 *    отдельный атрибут data-i18n-attr-aria-label="путь.до.значения"
 *    и/или data-i18n-attr-title="путь.до.значения". Это специально
 *    отдельный механизм от data-i18n-key (который всегда пишет в
 *    textContent) — у одного элемента может быть и то, и другое
 *    (например, кнопка с иконкой без видимого текста, но с aria-label).
 *  - При переключении языка мы просто проходим по всем таким
 *    элементам и подставляем текст из нужного объекта. Если в выбранном
 *    языке конкретного ключа не оказалось — берём русский как запасной
 *    вариант, чтобы не показывать пустоту из-за опечатки/недостающего
 *    перевода.
 *  - Выбранный язык запоминается в localStorage (ключ "crema_lang"),
 *    чтобы не сбрасывался при обновлении страницы.
 * ------------------------------------------------------------------
 */
(function () {
  var STORAGE_KEY = 'crema_lang';
  var DEFAULT_LANG = window.__CREMA_DEFAULT_LANG__ || 'ru';
  var DATA = window.__CREMA_I18N__ || {};

  function getStoredLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // localStorage может быть недоступен (приватный режим и т.п.)
      return null;
    }
  }

  function storeLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* не критично — просто не сохраняем выбор между визитами */
    }
  }

  // Достаём значение из объекта языка по ключу вида "cart.title"
  function resolveKey(langData, key) {
    var parts = key.split('.');
    var value = langData;
    for (var i = 0; i < parts.length; i++) {
      if (value == null) return undefined;
      value = value[parts[i]];
    }
    return typeof value === 'string' ? value : undefined;
  }

  function applyLanguage(lang) {
    var langData = DATA[lang] || DATA[DEFAULT_LANG] || {};
    var fallbackData = DATA[DEFAULT_LANG] || {};

    var nodes = document.querySelectorAll('[data-i18n-key]');
    nodes.forEach(function (el) {
      var key = el.getAttribute('data-i18n-key');
      var text = resolveKey(langData, key);
      if (text === undefined) {
        text = resolveKey(fallbackData, key);
      }
      if (text !== undefined) {
        el.textContent = text;
      }
    });

    // Атрибуты (aria-label/title) — отдельный проход, см. комментарий сверху файла.
    ['aria-label', 'title'].forEach(function (attrName) {
      var attrNodes = document.querySelectorAll('[data-i18n-attr-' + attrName + ']');
      attrNodes.forEach(function (el) {
        var key = el.getAttribute('data-i18n-attr-' + attrName);
        var text = resolveKey(langData, key);
        if (text === undefined) {
          text = resolveKey(fallbackData, key);
        }
        if (text !== undefined) {
          el.setAttribute(attrName, text);
        }
      });
    });

    var titleText = resolveKey(langData, 'meta.title') || resolveKey(fallbackData, 'meta.title');
    if (titleText !== undefined) {
      document.title = titleText;
    }

    document.documentElement.setAttribute('lang', lang);

    var langButtons = document.querySelectorAll('.lang-option');
    langButtons.forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang') === lang;
      // На мобильном языковые кнопки — это .pill, подсвечиваем так же,
      // как акцентную пилюлю "Полное меню"; на десктопе (пункты внутри
      // выпадающего списка) — своим модификатором.
      btn.classList.toggle('pill--accent', isActive && btn.classList.contains('pill'));
      btn.classList.toggle('lang-option--active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    var currentLabel = document.getElementById('langCurrent');
    if (currentLabel) {
      currentLabel.textContent = lang.toUpperCase();
    }

    storeLang(lang);
    window.CremaI18n.currentLang = lang;

    // Кастомное событие для остальных скриптов (сейчас — js/menu.js, п.6
    // плана): после смены языка нужно, например, заново посчитать, обрезано
    // ли описание товара (scrollHeight меняется от длины текста) и обновить
    // подпись кнопки "ещё"/"свернуть" на новом языке.
    document.dispatchEvent(new CustomEvent('crema:langchange', { detail: { lang: lang } }));
  }

  function closeDesktopDropdown(clickedInsideList) {
    var list = document.getElementById('langList');
    var toggle = document.getElementById('langToggle');
    if (list && !list.hidden && clickedInsideList) {
      list.hidden = true;
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  }

  function init() {
    var initial = getStoredLang() || DEFAULT_LANG;
    if (!DATA[initial]) initial = DEFAULT_LANG;
    applyLanguage(initial);

    var langButtons = document.querySelectorAll('.lang-option');
    langButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-lang');
        if (!lang) return;
        applyLanguage(lang);
        // если кнопку нажали внутри десктопного выпадающего списка — закрываем его
        var list = document.getElementById('langList');
        closeDesktopDropdown(Boolean(list && list.contains(btn)));
      });
    });
  }

  window.CremaI18n = {
    apply: applyLanguage,
    currentLang: DEFAULT_LANG
  };

  document.addEventListener('DOMContentLoaded', init);
})();
