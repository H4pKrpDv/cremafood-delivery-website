/**
 * components/PrivacyModal.tsx — порт попапа "Политика конфиденциальности"
 * (js/privacy.js + разметка .privacy-overlay/.privacy-modal).
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { useUIStore } from '@/store/uiStore';

export function PrivacyModal() {
  const { t } = useI18n();
  const privacyOpen = useUIStore((s) => s.privacyOpen);
  const closePrivacy = useUIStore((s) => s.closePrivacy);

  if (!privacyOpen) return <div className="privacy-overlay" hidden />;

  return (
    <div
      className="privacy-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePrivacy();
      }}
    >
      <div className="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacyModalTitle">
        <button type="button" className="privacy-modal__close" aria-label={t('common.close')} title={t('common.close')} onClick={closePrivacy}>
          ×
        </button>
        <h2 className="privacy-modal__title" id="privacyModalTitle">
          {t('privacy.title')}
        </h2>
        <p className="privacy-modal__text">{t('privacy.text')}</p>
      </div>
    </div>
  );
}
