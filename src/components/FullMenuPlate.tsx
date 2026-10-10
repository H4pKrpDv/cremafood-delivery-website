/**
 * components/FullMenuPlate.tsx
 * ------------------------------------------------------------------
 * 10.10.2026. Плашка «Полное меню» на главной (последний блок, MenuSection):
 * пояснение + кнопка-ссылка на страницу /full-menu.
 *
 * 10.10.2026 (позже): раньше кнопка вела на PDF в новой вкладке; теперь
 * на странице «Полное меню» есть онлайн-просмотр страниц меню (слайдер,
 * components/MenuViewer.tsx), поэтому это обычная внутренняя ссылка — без
 * target="_blank", посетитель остаётся на сайте. Поле pdfUrl в menu.json
 * больше не используется (оставлено на случай кнопки «Скачать PDF»).
 * ------------------------------------------------------------------
 */

'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import { getMenuPagePathname } from '@/lib/menuPageRoutes';

export function FullMenuPlate() {
  const { t, lang } = useI18n();

  return (
    <div className="full-menu-card">
      <p>{t('subcategories.full-menu.text')}</p>
      <Link className="btn btn--primary full-menu-card__btn" href={getMenuPagePathname(lang)} prefetch={false}>
        {t('subcategories.full-menu.buttonText')}
      </Link>
    </div>
  );
}
