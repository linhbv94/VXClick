// Thanh điều khiển chính Single-Row Widget (310px x 38px) cho VXClick
// Hỗ trợ Dark/Light Theme & Song ngữ Vi/En theo chuẩn các ứng dụng vx*

import React from 'react';
import {
  Play,
  Square,
  Pin,
  PinOff,
  Settings2,
  Minus,
  X,
  GripVertical,
} from 'lucide-react';
import type { SystemState, PlaybackProgressPayload, LanguageMode } from '../types/macro';
import { t } from '../i18n/translations';

interface MainBarProps {
  systemState: SystemState;
  alwaysOnTop: boolean;
  isSettingOpen: boolean;
  language: LanguageMode;
  recordingElapsedFormatted?: string;
  playbackProgress?: PlaybackProgressPayload;
  hasUpdateAvailable?: boolean;
  onToggleRecord: () => void;
  onTogglePlay: () => void;
  onTogglePin: () => void;
  onToggleSetting: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onStartDrag?: () => void;
  isMac?: boolean;
  inTauri?: boolean;
}

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

export const MainBar: React.FC<MainBarProps> = ({
  systemState,
  alwaysOnTop,
  isSettingOpen,
  language,
  recordingElapsedFormatted,
  playbackProgress,
  hasUpdateAvailable = false,
  onToggleRecord,
  onTogglePlay,
  onTogglePin,
  onToggleSetting,
  onMinimize,
  onClose,
  onStartDrag,
  isMac = true,
  inTauri = false,
}) => {
  const isRecording = systemState === 'RECORDING';
  const isPlaying = systemState === 'PLAYING';
  const isPermissionBlocked = systemState === 'PERMISSION_BLOCKED';
  const hasMacro = systemState === 'IDLE_READY' || isPlaying;

  return (
    <header
      className="widget_bar relative w-full h-[38px] px-2 flex items-center justify-between select-none overflow-hidden drag-region"
      style={dragStyle}
    >
      {/* Cụm trái: Khoảng trống cho Traffic Lights native (macOS) + Tay nắm kéo (Drag Handle) */}
      <div className="flex items-center gap-1 shrink-0">
        {isMac ? (
          inTauri ? (
            // Trong Tauri trên macOS: Chừa đúng vùng đệm 54x38px căn chuẩn với Traffic Lights native macOS
            <div
              className="w-[54px] h-[38px] shrink-0 drag-region cursor-default"
              style={dragStyle}
              title={t('traffic_lights_title', language)}
            />
          ) : (
            // Khi xem trước trên trình duyệt ngoài Tauri: hiển thị 3 nút mô phỏng
            <div className="flex items-center gap-1.5 pl-1 pr-1.5 no-drag" style={noDragStyle}>
              <button
                type="button"
                onClick={onClose}
                title={t('close_title', language)}
                className="w-2.5 h-2.5 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors shadow-xs"
              />
              <button
                type="button"
                onClick={onMinimize}
                title={t('minimize_title', language)}
                className="w-2.5 h-2.5 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors shadow-xs"
              />
              <div
                title="Cố định kích thước (Zoom disabled)"
                className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700/60 cursor-not-allowed"
              />
            </div>
          )
        ) : null}

        {/* Tay nắm kéo cửa sổ (Drag Handle) kích hoạt kéo native hệ điều hành */}
        <div
          className="flex items-center text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-1 py-1 cursor-grab active:cursor-grabbing drag-region transition-colors"
          style={dragStyle}
          onMouseDown={(e) => {
            if (e.button === 0) {
              onStartDrag?.();
            }
          }}
          title={t('drag_handle_title', language)}
        >
          <GripVertical className="w-3.5 h-3.5 opacity-75 hover:opacity-100" />
        </div>
      </div>

      {/* 4 Nút Hành động Cốt lõi (Core Action Buttons) */}
      <div className="flex items-center gap-1 no-drag" style={noDragStyle}>
        {/* Nút 1: Rec (F9 / Cmd+Option+R) */}
        <button
          type="button"
          onClick={onToggleRecord}
          disabled={isPlaying}
          title={
            isPermissionBlocked
              ? t('permission_blocked_title', language)
              : isRecording
              ? t('rec_stop_title', language)
              : t('rec_start_title', language)
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${
            isRecording
              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 shadow-xs shadow-rose-500/20'
              : isPlaying
              ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-500'
              : isPermissionBlocked
              ? 'opacity-40 hover:opacity-80 text-slate-400 dark:text-slate-500 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5'
              : 'hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 border border-transparent'
          }`}
        >
          {isRecording ? (
            <>
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 animate-pulse shadow-sm shadow-rose-500/80" />
              <span className="font-mono text-[11px] font-semibold">
                {recordingElapsedFormatted || t('stop_button', language)}
              </span>
            </>
          ) : isPermissionBlocked ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 opacity-60" />
              <span>{t('rec_button', language)}</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/60" />
              <span>{t('rec_button', language)}</span>
            </>
          )}
        </button>

        {/* Nút 2: Play (F8 / Cmd+Option+P) */}
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!hasMacro && !isPlaying}
          title={
            isPlaying
              ? t('play_stop_title', language)
              : hasMacro
              ? t('play_start_title', language)
              : t('play_no_macro', language)
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${
            isPlaying
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 shadow-xs shadow-emerald-500/20'
              : hasMacro
              ? 'hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 border border-transparent'
              : 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-500'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-2.5 h-2.5 fill-emerald-500 dark:fill-emerald-400 text-emerald-500 dark:text-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] font-semibold">{t('stop_button', language)}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-current" />
              <span>{t('play_button', language)}</span>
            </>
          )}
        </button>

        {/* Nút 3: Pin (Always on Top Toggle) */}
        <button
          type="button"
          onClick={onTogglePin}
          title={alwaysOnTop ? t('pin_on_title', language) : t('pin_off_title', language)}
          className={`p-1.5 rounded-lg text-xs transition-all active:scale-95 border ${
            alwaysOnTop
              ? 'text-cyan-700 bg-cyan-500/20 border-cyan-500/40 dark:text-cyan-300 dark:bg-cyan-500/20 dark:border-cyan-400/40 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5 border-transparent'
          }`}
        >
          {alwaysOnTop ? (
            <Pin className="w-3.5 h-3.5 rotate-45 text-cyan-600 dark:text-cyan-300" />
          ) : (
            <PinOff className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Nút 4: Setting Dropdown Trigger */}
        <button
          type="button"
          onClick={onToggleSetting}
          title={
            hasUpdateAvailable
              ? t('settings_update_available_title', language)
              : t('settings_title', language)
          }
          className={`relative p-1.5 rounded-lg text-xs transition-all active:scale-95 border ${
            isSettingOpen
              ? 'text-cyan-700 bg-cyan-500/20 border-cyan-500/40 dark:text-cyan-300 dark:bg-white/10 dark:border-white/20'
              : hasUpdateAvailable
              ? 'text-cyan-600 dark:text-cyan-300 bg-cyan-500/15 border-cyan-500/40 shadow-xs shadow-cyan-400/40 ring-1 ring-cyan-400/30'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5 border-transparent'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          {hasUpdateAvailable && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 ring-1.5 ring-white dark:ring-slate-900" />
            </span>
          )}
        </button>
      </div>

      {/* Cụm phải cho Windows (khi không phải Mac) */}
      {!isMac && (
        <div className="flex items-center gap-1 no-drag pl-1" style={noDragStyle}>
          <button
            type="button"
            onClick={onMinimize}
            title={t('minimize_title', language)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title={t('close_title', language)}
            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Thanh Tiến trình Phát lại 2px dưới đáy widget */}
      {isPlaying && playbackProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-200 dark:bg-slate-800 pointer-events-none">
          <div
            className="h-full bg-cyan-500 dark:bg-cyan-400 transition-all duration-75 ease-linear shadow-xs shadow-cyan-400"
            style={{ width: `${playbackProgress.pct}%` }}
          />
        </div>
      )}
    </header>
  );
};
