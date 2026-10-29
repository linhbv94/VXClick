// Hộp thoại Giới thiệu phần mềm (About Dialog) cho VXClick Desktop
// Viết lại theo phong cách chuyên nghiệp, súc tích của các ứng dụng họ vx* (vxmedia, vxphotos)

import React from 'react';
import { X, ArrowLeft, ExternalLink, Sparkles, Cpu } from 'lucide-react';
import logoImg from '../assets/logo.png';
import type { LanguageMode } from '../types/macro';
import { t } from '../i18n/translations';

interface AboutModalProps {
  language: LanguageMode;
  onBack: () => void;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ language, onBack, onClose }) => {
  return (
    <div className="w-full p-3.5 text-slate-800 dark:text-slate-200 select-none flex flex-col gap-3 animate-in fade-in duration-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-black/5 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            title={t('back_button', language)}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {t('about_header', language)}
          </span>
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

      {/* App Branding */}
      <div className="flex flex-col items-center justify-center py-0.5 gap-1 text-center">
        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md border border-cyan-500/30 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          <img src={logoImg} alt="VXClick Logo" className="w-full h-full object-cover" />
        </div>
        <div className="text-sm font-bold text-slate-900 dark:text-white tracking-wide mt-0.5">
          {t('app_name', language)}
        </div>
        <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
          {t('app_version', language)}
        </span>
      </div>

      {/* Description */}
      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed text-center px-1">
        {t('app_desc', language)}
      </p>

      {/* Highlights (Điểm nổi bật) */}
      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('highlights_title', language)}</span>
        </div>
        <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
          <li>{t('highlight_1', language)}</li>
          <li>{t('highlight_2', language)}</li>
          <li>{t('highlight_3', language)}</li>
        </ul>
      </div>

      {/* Core Technologies & Metadata */}
      <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <span>{t('tech_title', language)}</span>
        </div>
        <div className="font-mono text-[10px] text-cyan-700 dark:text-cyan-300">
          {t('tech_core', language)}
        </div>
        <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 pt-0.5 border-t border-black/5 dark:border-white/5">
          <span className="text-slate-400">{t('author_label', language)}</span>
          <span className="font-medium text-slate-800 dark:text-slate-100">
            {t('author_name', language)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
          <span className="text-slate-400">{t('source_label', language)}</span>
          <a
            href="https://github.com/linhbv94/VXClick"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-mono text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            <span>linhbv94/VXClick</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
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
