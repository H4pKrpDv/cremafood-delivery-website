/**
 * components/BackToTop.tsx — порт кнопки "наверх" из js/main.js
 * (initBackToTop): появляется после прокрутки на один экран вниз.
 */

'use client';

import { useEffect, useState } from 'react';

// Примечание: в нативной версии (build/template.html) у этой кнопки нет
// data-i18n-key — aria-label/title зашиты как "Наверх" на всех языках,
// перенесено как есть.
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const threshold = window.innerHeight;
    function onScroll() {
      setVisible(window.scrollY > threshold);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`back-to-top${visible ? ' back-to-top--visible' : ''}`}
      aria-label="Наверх"
      title="Наверх"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
