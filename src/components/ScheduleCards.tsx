/**
 * components/ScheduleCards.tsx
 * ------------------------------------------------------------------
 * 10.10.2026. Плашки графика с живым статусом — общий компонент для
 * бургер-меню (мобильные) и футера (десктоп): две карточки (бар/напитки и
 * кухня/блюда) с названием, часами и статусом с точкой (зелёная — открыто,
 * серая — закрыто, «Откроется в …»).
 *
 *  kind="delivery" — график ДОСТАВКИ (DEPARTMENT_HOURS: бар 07–22, кухня
 *    09–02), те же часы, что решают, можно ли заказать позицию сейчас;
 *  kind="venue" — график РАБОТЫ ЗАВЕДЕНИЯ (VENUE_HOURS: бар 07–22, кухня
 *    09–22), статус «Ждём гостей».
 *
 * Время — Europe/Chisinau (useNowMinutes). Статус показываем только после
 * гидратации (useCartHydrated): до неё серверная и клиентская разметка
 * могли бы разойтись по времени; место под строку статуса зарезервировано
 * (min-height), поэтому вёрстка не прыгает. Заголовок блока рисует
 * родитель (у бургера и футера они разные).
 * ------------------------------------------------------------------
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { useCartHydrated } from '@/store/cartStore';
import { useNowMinutes } from '@/lib/useNowMinutes';
import {
  DEPARTMENT_HOURS,
  VENUE_HOURS,
  formatMinutes,
  isRangeOpen,
  type DepartmentHoursRange
} from '@/lib/hours';

export type ScheduleKind = 'delivery' | 'venue';

interface ScheduleConfig {
  hours: Record<string, DepartmentHoursRange>;
  cards: { id: string; labelKey: string }[];
  openKey: string;
  closedKey: string;
}

const SCHEDULES: Record<ScheduleKind, ScheduleConfig> = {
  delivery: {
    hours: DEPARTMENT_HOURS,
    cards: [
      { id: 'bar', labelKey: 'header.deliveryBar' },
      { id: 'kitchen', labelKey: 'header.deliveryKitchen' }
    ],
    openKey: 'header.deliveryOpen',
    closedKey: 'header.deliveryClosed'
  },
  venue: {
    hours: VENUE_HOURS,
    cards: [
      { id: 'bar', labelKey: 'schedule.venueBar' },
      { id: 'kitchen', labelKey: 'schedule.venueKitchen' }
    ],
    openKey: 'schedule.venueOpen',
    closedKey: 'schedule.venueClosed'
  }
};

export function ScheduleCards({ kind, className = '' }: { kind: ScheduleKind; className?: string }) {
  const { t } = useI18n();
  const hydrated = useCartHydrated();
  const nowMinutes = useNowMinutes();
  const config = SCHEDULES[kind];

  return (
    <div className={`schedule-grid${className ? ` ${className}` : ''}`}>
      {config.cards.map((card) => {
        const range = config.hours[card.id];
        if (!range) return null;
        const open = hydrated ? isRangeOpen(range, nowMinutes) : null;
        return (
          <div key={card.id} className="schedule-card">
            <span className="schedule-card__label">{t(card.labelKey)}</span>
            <span className="schedule-card__time">
              {formatMinutes(range.openMinutes)}–{formatMinutes(range.closeMinutes)}
            </span>
            <span
              className={`schedule-card__status${open === null ? '' : open ? ' schedule-card__status--open' : ' schedule-card__status--closed'}`}
            >
              {open === null
                ? null
                : open
                  ? t(config.openKey)
                  : t(config.closedKey).replace('{time}', formatMinutes(range.openMinutes))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
