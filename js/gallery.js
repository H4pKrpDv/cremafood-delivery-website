/**
 * js/gallery.js
 * ------------------------------------------------------------------
 * Карусель-баннер в hero (Этап 1, п.5 плана):
 *  - автопрокрутка каждые ~7 секунд;
 *  - стрелки влево/вправо (клик);
 *  - свайп на мобильном (touch-события);
 *  - точки-индикаторы (клик — переход на конкретный слайд);
 *  - зацикленная — после последнего слайда снова первый, и обратно;
 *  - автопрокрутка приостанавливается при наведении/фокусе (десктоп) и
 *    во время самого свайпа, а после любого ручного переключения
 *    (стрелка/точка/свайп) таймер запускается заново с нуля, чтобы не
 *    "перебивать" пользователя сразу следующим автопереключением.
 *
 * Слайды — статичные плейсхолдеры в build/template.html (сейчас 4 шт.,
 * цветные градиенты вместо реальных фото — см. комментарий в CSS).
 * Подписи слайдов локализуются как обычно через data-i18n-key
 * (см. js/i18n.js) — этот скрипт только двигает трек и не трогает текст.
 * ------------------------------------------------------------------
 */
(function () {
  var AUTOPLAY_MS = 7000;
  var SWIPE_THRESHOLD_PX = 40;

  function initCarousel() {
    var root = document.getElementById('heroCarousel');
    var track = document.getElementById('heroCarouselTrack');
    if (!root || !track) return;

    var slides = Array.prototype.slice.call(track.querySelectorAll('.hero__carousel-slide'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('.hero__carousel-dot'));
    var prevBtn = document.getElementById('heroCarouselPrev');
    var nextBtn = document.getElementById('heroCarouselNext');
    var count = slides.length;
    if (count === 0) return;

    var index = 0;
    var timerId = null;

    function render() {
      track.style.transform = 'translateX(-' + index * 100 + '%)';
      dots.forEach(function (dot, i) {
        var isActive = i === index;
        dot.classList.toggle('hero__carousel-dot--active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    function goTo(newIndex) {
      // % в JS может дать отрицательный остаток (например -1 % 4 === -1),
      // поэтому оборачиваем через двойной модуль, чтобы индекс всегда
      // оставался в диапазоне [0, count).
      index = ((newIndex % count) + count) % count;
      render();
    }

    function goNext() {
      goTo(index + 1);
    }

    function goPrev() {
      goTo(index - 1);
    }

    function startAutoplay() {
      stopAutoplay();
      timerId = window.setInterval(goNext, AUTOPLAY_MS);
    }

    function stopAutoplay() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    }

    // Любое ручное переключение — таймер стартует заново, а не продолжает
    // старый отсчёт (иначе автопрокрутка могла бы сработать почти сразу
    // после ручного клика/свайпа, что выглядит как баг).
    function restartAutoplay() {
      startAutoplay();
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goPrev();
        restartAutoplay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goNext();
        restartAutoplay();
      });
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        goTo(i);
        restartAutoplay();
      });
    });

    // Пауза на наведении/фокусе клавиатурой (десктоп) — чтобы не
    // переключало слайд прямо во время чтения подписи.
    root.addEventListener('mouseenter', stopAutoplay);
    root.addEventListener('mouseleave', startAutoplay);
    root.addEventListener('focusin', stopAutoplay);
    root.addEventListener('focusout', startAutoplay);

    // Свайп (touch) — на мобильном экране стрелки маленькие, свайп —
    // основной способ переключения слайдов.
    var touchStartX = null;

    root.addEventListener(
      'touchstart',
      function (event) {
        touchStartX = event.touches[0].clientX;
        stopAutoplay();
      },
      { passive: true }
    );

    root.addEventListener('touchend', function (event) {
      if (touchStartX === null) return;
      var deltaX = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
        if (deltaX < 0) {
          goNext();
        } else {
          goPrev();
        }
      }
      touchStartX = null;
      restartAutoplay();
    });

    render();
    startAutoplay();
  }

  document.addEventListener('DOMContentLoaded', initCarousel);
})();
