// Bảng Cài đặt Nhanh (Settings Popover) nối tiếp liền mạch từ thanh MainBar
// Hỗ trợ Tốc độ phát, Lặp vô tận, Lặp theo vòng, Always on Top, Giao diện (Dark/Light/System) & Song ngữ (Vi/En)

import React, { useState } from 'react';
import {
  X,
  Coffee,
  Info,
  ChevronRight,
  Plus,
  Minus,
  Sun,
  Moon,
  Laptop,
  Languages,
} from 'lucide-react';
import type { SettingsState, ThemeMode, LanguageMode } from '../types/macro';
import { t } from '../i18n/translations';

interface SettingsPopoverProps {
  settings: SettingsState;
  onUpdateSettings: (newSettings: SettingsState) => void;
  onOpenAbout: () => void;
  onOpenSupport: () => void;
  onClose: () => void;
}

const SPEED_PRESETS = [0.5, 1.0, 2.0, 5.0, 10.0];

export const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  settings,
  onUpdateSettings,
  onOpenAbout,
  onOpenSupport,
  onClose,
}) => {
  const lang = settings.language;
  const [isCustomSpeed, setIsCustomSpeed] = useState(
    !SPEED_PRESETS.includes(settings.play_speed)
  );

  const handleSpeedPreset = (speed: number) => {
    setIsCustomSpeed(false);
    onUpdateSettings({ ...settings, play_speed: speed });
  };

  const handleCustomSpeedChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      onUpdateSettings({ ...settings, play_speed: Math.round(num * 10) / 10 });
    }
  };

  const handleContinuousToggle = () => {
    onUpdateSettings({ ...settings, continuous: !settings.continuous });
  };

  const handleAlwaysOnTopToggle = () => {
    onUpdateSettings({ ...settings, always_on_top: !settings.always_on_top });
  };

  const handleThemeChange = (theme: ThemeMode) => {
    onUpdateSettings({ ...settings, theme });
  };

  const handleLanguageChange = (language: LanguageMode) => {
    onUpdateSettings({ ...settings, language });
  };

  const handleRepeatStep = (delta: number) => {
    const nextCount = Math.max(1, Math.min(9999, settings.repeat_count + delta));
    onUpdateSettings({ ...settings, repeat_count: nextCount });
  };

  const handleRepeatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      onUpdateSettings({ ...settings, repeat_count: Math.min(9999, val) });
    }
  };

  return (
    <div className="w-full p-3 text-slate-800 dark:text-slate-200 select-none flex flex-col gap-2.5 animate-in fade-in duration-100">
      {/* Tiêu đề & Nút đóng */}
      <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 tracking-wide">
          {t('settings_header', lang)}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-black/5 dark:hover:text-slate-100 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mục 1: Tốc độ phát lại (Play Speed) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>{t('speed_label', lang)}</span>
          <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
            {settings.play_speed.toFixed(1)}x
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {SPEED_PRESETS.map((preset) => {
            const isSelected = !isCustomSpeed && settings.play_speed === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSpeedPreset(preset)}
                className={`py-1 text-[11px] font-mono rounded-md font-medium transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs shadow-cyan-400/50'
                    : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                }`}
              >
                {preset}x
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsCustomSpeed(true)}
            className={`py-1 text-[10px] rounded-md font-medium transition-all ${
              isCustomSpeed
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {t('speed_custom', lang)}
          </button>
        </div>

        {isCustomSpeed && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('speed_custom_label', lang)}
            </span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              value={settings.play_speed}
              onChange={(e) => handleCustomSpeedChange(e.target.value)}
              className="w-20 px-2 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-cyan-600 dark:text-cyan-300 focus:outline-none focus:border-cyan-400"
            />
          </div>
        )}
      </div>

      {/* Mục 2: Lặp vô tận (Continuous Playback) */}
      <div className="flex items-center justify-between py-1 border-t border-black/5 dark:border-white/5">
        <div>
          <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
            {t('continuous_label', lang)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {t('continuous_desc', lang)}
          </div>
        </div>
        <button
          type="button"
          onClick={handleContinuousToggle}
          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
            settings.continuous ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
              settings.continuous ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Mục 3: Số lần lặp lại (Repeat Count) */}
      <div
        className={`flex items-center justify-between py-1 transition-opacity ${
          settings.continuous ? 'opacity-40 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div>
          <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
            {t('repeat_label', lang)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {settings.continuous
              ? t('repeat_continuous_active', lang)
              : t('repeat_limit_desc', lang)}
          </div>
        </div>

        <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => handleRepeatStep(-1)}
            disabled={settings.continuous || settings.repeat_count <= 1}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-30"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min="1"
            max="9999"
            disabled={settings.continuous}
            value={settings.repeat_count}
            onChange={handleRepeatChange}
            className="w-10 text-center font-mono text-xs bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleRepeatStep(1)}
            disabled={settings.continuous || settings.repeat_count >= 9999}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-30"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Mục 4: Luôn nổi trên cùng (Always on Top) */}
      <div className="flex items-center justify-between py-1 border-t border-black/5 dark:border-white/5">
        <div>
          <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
            {t('always_on_top_label', lang)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {t('always_on_top_desc', lang)}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAlwaysOnTopToggle}
          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
            settings.always_on_top ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
              settings.always_on_top ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Mục 5: Giao diện (Theme: System / Dark / Light) */}
      <div className="flex items-center justify-between py-1 border-t border-black/5 dark:border-white/5">
        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
          {t('theme_label', lang)}
        </span>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            title={t('theme_system', lang)}
            className={`p-1 rounded-md text-xs flex items-center gap-1 transition-all ${
              settings.theme === 'system'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-300 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3 h-3" />
            <span className="text-[10px]">{t('theme_system', lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            title={t('theme_dark', lang)}
            className={`p-1 rounded-md text-xs flex items-center gap-1 transition-all ${
              settings.theme === 'dark'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-300 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Moon className="w-3 h-3" />
            <span className="text-[10px]">{t('theme_dark', lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            title={t('theme_light', lang)}
            className={`p-1 rounded-md text-xs flex items-center gap-1 transition-all ${
              settings.theme === 'light'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-300 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sun className="w-3 h-3" />
            <span className="text-[10px]">{t('theme_light', lang)}</span>
          </button>
        </div>
      </div>

      {/* Mục 6: Ngôn ngữ (Language: Tiếng Việt / English) */}
      <div className="flex items-center justify-between py-1 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
          <Languages className="w-3.5 h-3.5 text-slate-400" />
          <span>{t('language_label', lang)}</span>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => handleLanguageChange('vi')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
              settings.language === 'vi'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-300 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Tiếng Việt
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
              settings.language === 'en'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-300 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Đường kẻ phân cách & Menu phụ */}
      <div className="flex flex-col gap-0.5 pt-1.5 border-t border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={onOpenAbout}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{t('about_menu_item', lang)}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors" />
        </button>

        <button
          type="button"
          onClick={onOpenSupport}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200 hover:bg-amber-500/10 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Coffee className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{t('support_menu_item', lang)}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-amber-500/60 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors" />
        </button>
      </div>
    </div>
  );
};
