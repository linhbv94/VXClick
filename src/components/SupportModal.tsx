// Hộp thoại Ủng hộ Tác giả (Support Author Modal) với mã VietQR căn giữa chuẩn
// Hỗ trợ song ngữ Vi/En & Dark/Light Theme

import React from 'react';
import { X, ArrowLeft, Coffee, Heart } from 'lucide-react';
import qrCode from '../assets/qr.png';
import type { LanguageMode } from '../types/macro';
import { t } from '../i18n/translations';

interface SupportModalProps {
  language: LanguageMode;
  onBack: () => void;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ language, onBack, onClose }) => {
  return (
    <div className="w-full p-3.5 text-slate-800 dark:text-slate-200 select-none flex flex-col gap-2.5 animate-in fade-in duration-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-md text-amber-600 hover:text-amber-800 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
            title={t('back_button', language)}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">
              {t('support_header', language)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-black/5 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
          title={t('close_title', language)}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Heartfelt Message */}
      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed text-center px-1">
        {t('support_message', language)}
      </p>

      {/* Card Mã QR VietQR Vietcombank Căn giữa Sắc nét */}
      <div className="flex flex-col items-center justify-center my-0.5">
        <div className="p-2 rounded-xl bg-white shadow-md border border-amber-400/40 flex flex-col items-center justify-center">
          <img
            src={qrCode}
            alt={t('support_qr_alt', language)}
            className="w-44 h-44 object-contain rounded-lg"
          />
          <span className="text-[10px] font-semibold text-emerald-800 mt-1.5 font-mono tracking-wider">
            {t('support_qr_caption', language)}
          </span>
        </div>
      </div>

      {/* Warm Footer Message */}
      <div className="flex items-center justify-center gap-1 text-[11px] text-amber-600 dark:text-amber-400/90 font-medium">
        <span>{t('support_wish', language)}</span>
        <Heart className="w-3 h-3 fill-rose-500 text-rose-500 inline" />
      </div>

      {/* Footer Back Button */}
      <div className="pt-0.5 flex justify-end">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
        >
          {t('back_button', language)}
        </button>
      </div>
    </div>
  );
};
