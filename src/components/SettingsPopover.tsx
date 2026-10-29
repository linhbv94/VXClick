import type {SettingsState,ThemeMode,LanguageMode} from '../types/macro';
import {SettingsShell,GeneralSettings,UpdatesSettings,AboutSettings,SupportSettings,commonSettingsTabs,UpdateStatus} from './shared/settings_ui';

// Bảng Cài đặt (Settings Popover) nối tiếp liền mạch từ thanh MainBar
// Tuân thủ chuẩn Settings toàn suite VX:
// - 4 tab chung bắt buộc: General (Chung), Updates (Cập nhật), About (Giới thiệu), Support (Ủng hộ)
// - Tab riêng theo nghiệp vụ: Automation (Tác vụ: Playback, Auto Click, Always on Top)
// - Tab General chỉ gồm đúng 2 section: G1 Theme & Colors (4 radio cards 2 cột) -> G2 Display Language (2 radio ngang)

import {useState} from 'react';
import {Plus,Minus,MousePointer2,Sliders} from 'lucide-react';
import {SettingsTabId} from '../types/macro';
import { DEFAULT_SETTINGS } from '../services/tauri_bridge';
import { t } from '../i18n/translations';
import {
  useAppUpdater,
  checkForUpdates,
  installUpdate,
  restartAfterUpdate,
  appVersion,
} from '../services/app_updater';
import logoImg from '../assets/logo.png';
import qrCode from '../assets/qr.png';

interface SettingsPopoverProps {
  settings: SettingsState;
  activeTab?: SettingsTabId;
  onTabChange?: (tab: SettingsTabId) => void;
  onUpdateSettings: (newSettings: SettingsState) => void;
  onOpenAbout?: () => void;
  onOpenSupport?: () => void;
  onClose: () => void;
}

const SPEED_PRESETS = [0.5, 1.0, 2.0, 5.0, 10.0];
const INTERVAL_PRESETS = [50, 100, 200, 500, 1000];



export const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  settings,
  activeTab: controlledTab,
  onTabChange,
  onUpdateSettings,
  onClose,
}) => {
  const [internalTab, setInternalTab] = useState<SettingsTabId>('automation');
  const currentTab = controlledTab ?? internalTab;
  const setTab = (tab: SettingsTabId) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const lang = settings.language;
  const updateState = useAppUpdater();



  const [isCustomSpeed, setIsCustomSpeed] = useState(
    !SPEED_PRESETS.includes(settings.play_speed)
  );
  const [isCustomInterval, setIsCustomInterval] = useState(
    !INTERVAL_PRESETS.includes(settings.autoclick_interval_ms)
  );

  const handleSpeedPreset = (speed: number) => {
    setIsCustomSpeed(false);
    onUpdateSettings({ ...settings, play_speed: speed });
  };

  const handleIntervalPreset = (interval: number) => {
    setIsCustomInterval(false);
    onUpdateSettings({ ...settings, autoclick_interval_ms: interval });
  };

  const handleCustomIntervalChange = (val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      onUpdateSettings({
        ...settings,
        autoclick_interval_ms: Math.min(60000, num),
      });
    }
  };

  const handleCustomSpeedChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      onUpdateSettings({
        ...settings,
        play_speed: Math.round(num * 10) / 10,
      });
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
    const nextCount = Math.max(
      1,
      Math.min(9999, settings.repeat_count + delta)
    );
    onUpdateSettings({ ...settings, repeat_count: nextCount });
  };

  const handleRepeatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      onUpdateSettings({ ...settings, repeat_count: Math.min(9999, val) });
    }
  };

  const handleAutoClickButtonChange = (button: 'Left' | 'Right') => {
    onUpdateSettings({ ...settings, autoclick_button: button });
  };

  const handleAutoClickUntilStoppedToggle = () => {
    onUpdateSettings({
      ...settings,
      autoclick_until_stopped: !settings.autoclick_until_stopped,
    });
  };

  const handleAutoClickRepeatStep = (delta: number) => {
    const nextCount = Math.max(
      1,
      Math.min(999999, settings.autoclick_repeat_count + delta)
    );
    onUpdateSettings({ ...settings, autoclick_repeat_count: nextCount });
  };

  const handleAutoClickRepeatChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      onUpdateSettings({
        ...settings,
        autoclick_repeat_count: Math.min(999999, val),
      });
    }
  };

  const handleResetDefaults = () => {
    // Giữ ngôn ngữ đang chọn theo đúng ST-08
    const resetState: SettingsState = {
      ...DEFAULT_SETTINGS,
      language: settings.language,
    };
    setIsCustomSpeed(false);
    setIsCustomInterval(false);
    onUpdateSettings(resetState);
  };

return (<SettingsShell theme={settings.theme} appName="VXClick" language={lang} tabs={[{id:'automation',label:t('tab_automation', lang),icon:<MousePointer2 size={16}/>} , ...commonSettingsTabs(lang)]} activeTab={currentTab} onTabChange={id=>setTab(id as SettingsTabId)} onClose={onClose} onReset={handleResetDefaults} compact  >{currentTab === 'automation' && (<div className="flex flex-col gap-2.5 py-0.5">
          {/* Header nhóm Playback */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
            <Sliders className="w-3.5 h-3.5" />
            <span>{t('playback_section_header', lang)}</span>
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
                const isSelected =
                  !isCustomSpeed && settings.play_speed === preset;
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
                settings.continuous
                  ? 'bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-700'
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
              settings.continuous
                ? 'opacity-40 pointer-events-none'
                : 'opacity-100'
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

          {/* Phân cách / Header nhóm Auto Click */}
          <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <MousePointer2 className="w-3.5 h-3.5 fill-current text-current" />
              <span>{t('autoclick_section_header', lang)}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              ⌥⇧⌘C
            </span>
          </div>

          {/* Auto Click: Chu kỳ nhấp (Click Interval) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>{t('autoclick_interval_label', lang)}</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                {settings.autoclick_interval_ms} ms
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {INTERVAL_PRESETS.map((preset) => {
                const isSelected =
                  !isCustomInterval && settings.autoclick_interval_ms === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleIntervalPreset(preset)}
                    className={`py-1 text-[11px] font-mono rounded-md font-medium transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs shadow-amber-400/50'
                        : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                    }`}
                  >
                    {preset >= 1000 ? `${preset / 1000}s` : `${preset}ms`}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsCustomInterval(true)}
                className={`py-1 text-[11px] rounded-md font-medium transition-all ${
                  isCustomInterval
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs shadow-amber-400/50'
                    : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                }`}
              >
                {t('speed_custom', lang)}
              </button>
            </div>
            {isCustomInterval && (
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="range"
                  min="10"
                  max="5000"
                  step="10"
                  value={settings.autoclick_interval_ms}
                  onChange={(e) => handleCustomIntervalChange(e.target.value)}
                  className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="10"
                    max="60000"
                    value={settings.autoclick_interval_ms}
                    onChange={(e) => handleCustomIntervalChange(e.target.value)}
                    className="w-16 px-1.5 py-0.5 text-right font-mono text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400">ms</span>
                </div>
              </div>
            )}
          </div>

          {/* Auto Click: Phím chuột (Mouse Button: Left / Right) */}
          <div className="flex items-center justify-between py-1 border-t border-black/5 dark:border-white/5">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              {t('autoclick_button_label', lang)}
            </span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleAutoClickButtonChange('Left')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  settings.autoclick_button === 'Left'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t('autoclick_button_left', lang)}
              </button>
              <button
                type="button"
                onClick={() => handleAutoClickButtonChange('Right')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  settings.autoclick_button === 'Right'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t('autoclick_button_right', lang)}
              </button>
            </div>
          </div>

          {/* Auto Click: Lặp lại (Repeat: Cho đến khi dừng / Số lần) */}
          <div className="flex items-center justify-between py-1 border-t border-black/5 dark:border-white/5">
            <div>
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {t('autoclick_until_stopped_label', lang)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {t('autoclick_until_stopped_desc', lang)}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoClickUntilStoppedToggle}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                settings.autoclick_until_stopped
                  ? 'bg-amber-500'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                  settings.autoclick_until_stopped
                    ? 'translate-x-4'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto Click: Số lần lặp (nếu không lặp vô hạn) */}
          <div
            className={`flex items-center justify-between py-1 transition-opacity ${
              settings.autoclick_until_stopped
                ? 'opacity-40 pointer-events-none'
                : 'opacity-100'
            }`}
          >
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              {t('autoclick_repeat_label', lang)}
            </span>
            <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 overflow-hidden">
              <button
                type="button"
                onClick={() => handleAutoClickRepeatStep(-10)}
                disabled={
                  settings.autoclick_until_stopped ||
                  settings.autoclick_repeat_count <= 1
                }
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-30"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                min="1"
                max="999999"
                disabled={settings.autoclick_until_stopped}
                value={settings.autoclick_repeat_count}
                onChange={handleAutoClickRepeatChange}
                className="w-14 text-center font-mono text-xs bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAutoClickRepeatStep(10)}
                disabled={
                  settings.autoclick_until_stopped ||
                  settings.autoclick_repeat_count >= 999999
                }
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-30"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Hành vi cửa sổ: Luôn nổi trên cùng (Always on Top) */}
          <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
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
                settings.always_on_top
                  ? 'bg-cyan-500'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                  settings.always_on_top ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>)}
{currentTab === 'general' && <GeneralSettings language={lang} theme={settings.theme} themes={['system','dark','light','oled']} onThemeChange={handleThemeChange} onLanguageChange={handleLanguageChange} />}
{currentTab === 'updates' && <UpdatesSettings language={lang} version={appVersion}><UpdateStatus language={lang} update={updateState} onCheck={()=>checkForUpdates(true)} onInstall={installUpdate} onRestart={restartAfterUpdate}/></UpdatesSettings>}
{currentTab === 'about' && <AboutSettings language={lang} appName="VXClick" version={appVersion}  description={t('app_desc', lang)} repository="https://github.com/linhbv94/VXClick" icon={<img src={logoImg} alt=""/>} technologies={[t('tech_core', lang)]} />}
{currentTab === 'support' && <SupportSettings language={lang} qrSource={qrCode}/>}</SettingsShell>);
};
