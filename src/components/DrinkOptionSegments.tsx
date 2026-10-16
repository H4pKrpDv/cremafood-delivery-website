/**
 * components/DrinkOptionSegments.tsx
 * ------------------------------------------------------------------
 * 18.10.2026. Выбор «основы» напитка — молоко (обычное / кокосовое /
 * миндальное) или кофе (классический / декаф). Сегментированный переключатель:
 * все варианты видны сразу, выбор в одно касание. Это обычная группа
 * radio-кнопок (стрелки на клавиатуре работают «из коробки»), поэтому
 * отдельной ARIA-карусели не нужно.
 *
 * 18.10.2026 (правка по видео): раскладка зависит от ШИРИНЫ САМОГО блока
 * (container query), а не экрана: в корзине блок вложен в строку позиции и
 * узкий — там сегменты выстраиваются столбиком (название слева, пометка и
 * цена справа), поэтому «Миндальное» больше не вылезает за границы кнопки.
 *
 * Под названием варианта — пометка («безлактозное», «без кофеина») и
 * «+10 MDL» для всех вариантов, кроме стандартного. Если у выбранного
 * варианта есть примечание (миндаль — «содержит орехи»), оно показывается
 * под переключателем (aria-live). Компонент «глупый»: значение хранит родитель.
 * Данные: data/menu.json → drinkOptions; тексты: i18n drinkOptions.*.
 * ------------------------------------------------------------------
 */

'use client';

import { useId } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { drinkOptionSettings } from '@/lib/data';
import type { DrinkGroupId } from '@/types/menu';

interface DrinkOptionSegmentsProps {
  group: DrinkGroupId;
  value: string;
  onChange: (next: string) => void;
  /** Компактный вид (редактор в корзине). */
  compact?: boolean;
}

export function DrinkOptionSegments({ group, value, onChange, compact = false }: DrinkOptionSegmentsProps) {
  const { t } = useI18n();
  const uid = useId();
  const settings = drinkOptionSettings[group];
  const options = settings.options;
  const extra = t('drinkOptions.extra').replace('{price}', String(settings.price));
  const note = t(`drinkOptions.${group}.${value}.note`);

  return (
    <fieldset className={`drink-opt drink-opt--n${options.length}${compact ? ' drink-opt--compact' : ''}`}>
      <legend className="drink-opt__legend">{t(`drinkOptions.title.${group}`)}</legend>
      <div className="drink-opt__wrap">
        <div className="drink-opt__seg" style={{ ['--n' as string]: options.length }}>
          {options.map((option) => {
            const checked = option.id === value;
            const isDefault = option.id === settings.default;
            const tag = t(`drinkOptions.${group}.${option.id}.tag`);
            return (
              <label className={`drink-opt__item${checked ? ' drink-opt__item--on' : ''}`} key={option.id}>
                <input
                  type="radio"
                  className="drink-opt__input"
                  name={`${uid}-${group}`}
                  value={option.id}
                  checked={checked}
                  onChange={() => onChange(option.id)}
                />
                <span className="drink-opt__name">{t(`drinkOptions.${group}.${option.id}.name`)}</span>
                <span className="drink-opt__meta">
                  <span className="drink-opt__sub">{tag}</span>
                  <span className="drink-opt__price">{isDefault ? '' : extra}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
      <p className="drink-opt__note" aria-live="polite">
        {note}
      </p>
    </fieldset>
  );
}
