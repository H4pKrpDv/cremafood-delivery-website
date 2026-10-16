/**
 * components/SyrupPicker.tsx
 * ------------------------------------------------------------------
 * 17.10.2026. Выбор сиропов для напитка.
 *
 * mode="row" (страница напитка, «вариант A»): одна строка-кнопка
 * «+ Добавить сироп»; по нажатию раскрывается список чипов (иконка +
 * название, без фото). Выбранные вкусы остаются видны чипами под строкой,
 * даже когда список свёрнут, — их можно убрать крестиком.
 * mode="panel" (правка строки в корзине): только раскрытый список чипов.
 *
 * Правила (данные — data/menu.json → syrups и item.syrups, логика —
 * lib/cartLines.ts): не больше maxPerDrink разных вкусов по одной порции;
 * у позиции с «сиропом в цене» (raf-coffee) выбранный по умолчанию вкус
 * (у raf-coffee — ваниль, у iced-latte — карамель) можно убрать или заменить, а доплата начинается со второй порции.
 * Компонент «глупый»: состояние хранит родитель (value/onChange).
 * ------------------------------------------------------------------
 */

'use client';

import { useId, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { syrupSettings } from '@/lib/data';
import { getItemSyrupDefault, getItemSyrupIncluded, getItemSyrupOptionIds, sanitizeSyrups } from '@/lib/cartLines';
import { SyrupIcon } from './SyrupIcon';

interface SyrupPickerProps {
  itemId: string;
  value: string[];
  onChange: (next: string[]) => void;
  mode?: 'row' | 'panel';
  defaultOpen?: boolean;
}

export function SyrupPicker({ itemId, value, onChange, mode = 'row', defaultOpen = false }: SyrupPickerProps) {
  const { t } = useI18n();
  const uid = useId();
  const [open, setOpen] = useState(defaultOpen);

  const options = getItemSyrupOptionIds(itemId);
  if (!options.length) return null;

  const max = syrupSettings.maxPerDrink;
  const included = getItemSyrupIncluded(itemId);
  const hasDefault = getItemSyrupDefault(itemId).length > 0;
  const selected = sanitizeSyrups(itemId, value);
  const atLimit = selected.length >= max;
  const fmt = (key: string) =>
    t(key)
      .replace('{price}', String(syrupSettings.price))
      .replace('{volume}', String(syrupSettings.volumeMl))
      .replace('{max}', String(max))
      .replace('{name}', getItemSyrupDefault(itemId).map((id) => t(`syrups.option.${id}`) || id).join(', '));
  const name = (id: string) => t(`syrups.option.${id}`) || id;

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (!atLimit) onChange(sanitizeSyrups(itemId, [...selected, id]));
  }

  const panelId = `${uid}-panel`;
  const isOpen = mode === 'panel' || open;

  const panel = (
    <div className="syrup-panel" id={panelId} hidden={!isOpen}>
      {mode === 'panel' || included > 0 || hasDefault ? (
        <p className="syrup-panel__note">{included > 0 ? fmt('syrups.priceNoteIncluded') : fmt('syrups.priceNote')}</p>
      ) : null}
      <div className="syrup-chips" role="group" aria-label={t('syrups.title')}>
        {options.map((id) => {
          const on = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              className="syrup-chip"
              aria-pressed={on}
              disabled={!on && atLimit}
              onClick={() => toggle(id)}
            >
              <SyrupIcon id={id} />
              <span>{name(id)}</span>
            </button>
          );
        })}
      </div>
      {atLimit ? <p className="syrup-panel__limit">{fmt('syrups.limit')}</p> : null}
      <p className="syrup-hint">{t('syrups.hint')}</p>
    </div>
  );

  if (mode === 'panel') return <div className="syrup syrup--panel">{panel}</div>;

  return (
    <div className="syrup">
      <button
        type="button"
        className="syrup-row"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="syrup-row__plus" aria-hidden="true">
          +
        </span>
        <span className="syrup-row__text">
          <span className="syrup-row__title">{hasDefault ? t('syrups.title') : t('syrups.add')}</span>
          <span className="syrup-row__small">{hasDefault ? fmt('syrups.defaultNote') : fmt('syrups.priceNote')}</span>
        </span>
        <span className="syrup-row__chev" aria-hidden="true">
          ⌄
        </span>
      </button>

      {!open && selected.length ? (
        <div className="syrup-selected">
          {selected.map((id) => (
            <span className="syrup-chip syrup-chip--selected" key={id}>
              <SyrupIcon id={id} />
              <span>{name(id)}</span>
              <button type="button" className="syrup-chip__x" aria-label={`${t('syrups.remove')}: ${name(id)}`} onClick={() => toggle(id)}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {panel}
    </div>
  );
}
