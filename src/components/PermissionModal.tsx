// Modal hướng dẫn cấp quyền Trợ năng (macOS Accessibility Permission) cho VXClick
// Thiết kế tinh tế, hỗ trợ Dark/Light Theme & Song ngữ Vi/En

import React from 'react';
import { X, ShieldAlert, ExternalLink, RefreshCw, CheckCircle2, RotateCw } from 'lucide-react';
import type { LanguageMode } from '../types/macro';
import { t } from '../i18n/translations';

interface PermissionModalProps {
  language: LanguageMode;
  isChecking?: boolean;
  onRequestOpenSettings: () => void;
  onCheckAgain: () => void;
  onRelaunch: () => void;
  onClose: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  language,
  isChecking = false,
  onRequestOpenSettings,
  onCheckAgain,
  onRelaunch,
  onClose,
}) => {
  return (
    <div className="w-full p-3.5 text-slate-800 dark:text-slate-200 select-none flex flex-col gap-2.5 animate-in fade-in duration-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {t('permission_header', language)}
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

      {/* Badge & Description */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            {t('permission_badge', language)}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          {t('permission_desc', language)}
        </p>
      </div>

      {/* 3 Bước Hướng dẫn Trực quan */}
      <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-col gap-2 text-[11px]">
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{t('permission_step_title', language)}</span>
        </div>
        <div className="space-y-1.5 pl-1 text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
              1
            </span>
            <span>{t('permission_step_1', language)}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
              2
            </span>
            <span>{t('permission_step_2', language)}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
              3
            </span>
            <span>{t('permission_step_3', language)}</span>
          </div>
        </div>
      </div>

      {/* Auto-checking indicator */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 italic">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
        <span>{t('permission_checking_hint', language)}</span>
      </div>

      {/* Action Buttons: 2 Cột cân đối */}
      <div className="pt-1 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onRequestOpenSettings}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-all active:scale-[0.98]"
            title={t('permission_open_btn', language)}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="truncate">{t('permission_open_btn', language)}</span>
          </button>

          <button
            type="button"
            onClick={onRelaunch}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-sm transition-all active:scale-[0.98]"
            title={t('permission_relaunch_hint', language)}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="truncate">{t('permission_relaunch_btn', language)}</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            onClick={onCheckAgain}
            disabled={isChecking}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{t('permission_check_btn', language)}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
          >
            {t('back_button', language)}
          </button>
        </div>
      </div>
    </div>
  );
};
