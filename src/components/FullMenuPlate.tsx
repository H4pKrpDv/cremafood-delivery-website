/**
 * components/FullMenuPlate.tsx
 * ------------------------------------------------------------------
 * 10.10.2026. Плашка «Полное меню»: пояснение + кнопка со ссылкой на PDF
 * полного меню. Общая для главной (последний блок, MenuSection) и страницы
 * /menu (MenuPage). Адрес PDF — pdfUrl из menu.json (сейчас
 * /full-menu.pdf → public/full-menu.pdf).
 *
 * PDF открывается в НОВОЙ вкладке (target="_blank"): во встроенном
 * просмотрщике браузера (на мобильных часто без кнопки «назад») посетитель
 * потерял бы страницу. rel="noopener noreferrer" — защита для _blank.
 * ------------------------------------------------------------------
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { menuData } from '@/lib/data';
import { FULL_MENU_CATEGORY_ID } from '@/lib/menuPageRoutes';
import { isFullMenuSubcategory } from '@/types/menu';

export function FullMenuPlate() {
  const { t } = useI18n();
  const sub = menuData.categories
    .find((category) => category.id === FULL_MENU_CATEGORY_ID)
    ?.subcategories.find(isFullMenuSubcategory);
  if (!sub) return null;

  return (
    <div className="full-menu-card">
      <p>{t('subcategories.full-menu.text')}</p>
      <a className="btn btn--primary full-menu-card__btn" href={sub.pdfUrl} target="_blank" rel="noopener noreferrer">
        {t('subcategories.full-menu.buttonText')}
      </a>
    </div>
  );
}
