// Mini Status Bar tự động mở rộng (expand) xuống dưới khi Playback
// Hỗ trợ 2 chế độ: Lặp X lần (tiến trình %) & Lặp đến tận thế (nhắc nhở phím ESC)
// Hỗ trợ Dark/Light Theme & Song ngữ Vi/En

import React from 'react';
import { Repeat, Infinity as InfinityIcon, Square, MousePointer2 } from 'lucide-react';
import type { PlaybackProgressPayload, AutoClickProgressPayload, LanguageMode } from '../types/macro';
import { t } from '../i18n/translations';

export interface StoppedNoticeInfo {
  message: string;
  isEsc?: boolean;
}

interface PlaybackMiniBarProps {
  isContinuous: boolean;
  repeatCount: number;
  progress?: PlaybackProgressPayload;
  autoclickProgress?: AutoClickProgressPayload;
  autoclickUntilStopped?: boolean;
  autoclickRepeatCount?: number;
  mode?: 'playback' | 'autoclick';
  language: LanguageMode;
  onStop: () => void;
  stoppedNotice?: StoppedNoticeInfo | null;
}

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

export const PlaybackMiniBar: React.FC<PlaybackMiniBarProps> = ({
  isContinuous,
  repeatCount,
  progress,
  autoclickProgress,
  autoclickUntilStopped,
  autoclickRepeatCount,
  mode = 'playback',
  language,
  onStop,
  stoppedNotice,
}) => {
  // Nếu có thông báo đã dừng, hiển thị ngay trên MiniBar với định dạng gọn gàng
  if (stoppedNotice) {
    return (
      <div
        className="w-full h-[24px] px-2.5 flex items-center justify-between bg-slate-100/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800 text-[10.5px] select-none drag-region overflow-hidden transition-all duration-150 animate-in fade-in"
        style={dragStyle}
      >
        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          <Square className="w-2.5 h-2.5 fill-rose-500 text-rose-500 shrink-0" />
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
            {stoppedNotice.message}
          </span>
        </div>

        {stoppedNotice.isEsc && (
          <span
            className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono font-bold text-[9px] border border-slate-300 dark:border-slate-700 shrink-0"
            title="Được dừng bởi phím ESC"
          >
            ESC
          </span>
        )}
      </div>
    );
  }

  // Chế độ Auto Click
  if (mode === 'autoclick') {
    const isUntilStopped = autoclickUntilStopped !== undefined ? autoclickUntilStopped : isContinuous;
    const currentClicks = autoclickProgress?.current_clicks ?? 0;
    const totalClicks = isUntilStopped ? 0 : (autoclickProgress?.total_clicks ?? autoclickRepeatCount ?? repeatCount);
    const overallPct = autoclickProgress?.pct ?? (totalClicks > 0 ? (currentClicks / totalClicks) * 100 : 0);

    return (
      <div
        className="w-full h-[24px] px-2.5 flex items-center justify-between bg-slate-100/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800 text-[10.5px] select-none drag-region overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-top-1"
        style={dragStyle}
      >
        {isUntilStopped ? (
          // Auto click lặp đến khi dừng
          <>
            <div className="flex items-center gap-1.5 min-w-0 pr-1">
              <MousePointer2 className="w-3.5 h-3.5 fill-current text-amber-500 dark:text-amber-400 shrink-0 animate-pulse" />
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                {t('status_autoclick_loop', language)}
                {currentClicks > 0 && (
                  <span className="font-mono ml-1 text-slate-400 dark:text-slate-500 font-semibold">
                    #{currentClicks}
                  </span>
                )}
              </span>
            </div>

            <div
              className="flex items-center gap-1 shrink-0 no-drag"
              style={noDragStyle}
              title={t('autoclick_stop_title', language)}
            >
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {t('status_esc_to_stop', language)}
              </span>
              <button
                type="button"
                onClick={onStop}
                className="px-1 py-0.2 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-500 dark:text-rose-400 font-mono font-bold text-[9.5px] border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                title="Nhấn để dừng auto click"
              >
                ESC
              </button>
            </div>
          </>
        ) : (
          // Auto click theo số lần hữu hạn
          <>
            <div className="flex items-center gap-1.5 min-w-0 pr-1">
              <MousePointer2 className="w-3 h-3 fill-current text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                {t('status_autoclick_progress', language)}{' '}
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {currentClicks}
                </span>{' '}
                /{' '}
                <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                  {totalClicks}
                </span>{' '}
                {t('status_autoclick_times', language)}
              </span>
            </div>

            <div
              className="flex items-center gap-1.5 shrink-0 no-drag"
              style={noDragStyle}
            >
              {/* Thanh tiến trình mini 60px */}
              <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 shadow-inner">
                <div
                  className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all duration-100 ease-out shadow-xs"
                  style={{ width: `${Math.max(4, Math.min(100, overallPct))}%` }}
                />
              </div>

              {/* Số phần trăm */}
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 w-7 text-right">
                {Math.round(overallPct)}%
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Chế độ Playback Macro
  // Xác định số vòng lặp và tiến độ (QA06)
  // Phân biệt rõ vòng đang chạy (currentRunningLoop: #1, #2...) và số vòng đã hoàn tất (completedLoops: 0, 1...)
  const currentRunningLoop = progress && progress.loop > 0 ? progress.loop : 1;
  const completedLoops = progress && progress.loop > 0 ? progress.loop - 1 : 0;
  const totalLoops =
    progress && progress.total > 0
      ? progress.total
      : isContinuous
      ? 0
      : Math.max(1, repeatCount);

  // Tính phần trăm tiến trình tổng thể khi lặp X lần
  const currentPct = progress?.pct ?? 0;
  const overallPct =
    totalLoops > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((completedLoops + currentPct / 100) / totalLoops) * 100
          )
        )
      : 0;

  return (
    <div
      className="w-full h-[24px] px-2.5 flex items-center justify-between bg-slate-100/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800 text-[10.5px] select-none drag-region overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-top-1"
      style={dragStyle}
    >
      {isContinuous ? (
        // Case 1: Lặp đến tận thế (Continuous Playback)
        <>
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <InfinityIcon className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0 animate-pulse" />
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
              {t('status_continuous_loop', language)}
              {currentRunningLoop > 0 && (
                <span className="font-mono ml-1 text-slate-400 dark:text-slate-500 font-semibold">
                  #{currentRunningLoop}
                </span>
              )}
            </span>
          </div>

          <div
            className="flex items-center gap-1 shrink-0 no-drag"
            style={noDragStyle}
            title={t('status_continuous_tooltip', language)}
          >
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {t('status_esc_to_stop', language)}
            </span>
            <button
              type="button"
              onClick={onStop}
              className="px-1 py-0.2 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-500 dark:text-rose-400 font-mono font-bold text-[9.5px] border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
              title="Nhấn để dừng phát lại"
            >
              ESC
            </button>
          </div>
        </>
      ) : (
        // Case 2: Lặp X lần (Finite Loops with Progress)
        <>
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <Repeat className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
              {t('status_loop_progress', language)}{' '}
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {completedLoops}
              </span>{' '}
              /{' '}
              <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                {totalLoops}
              </span>{' '}
              {t('status_loop_times', language)}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 shrink-0 no-drag"
            style={noDragStyle}
          >
            {/* Thanh tiến trình mini 60px */}
            <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 shadow-inner">
              <div
                className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-100 ease-out shadow-xs"
                style={{ width: `${Math.max(4, overallPct)}%` }}
              />
            </div>

            {/* Số phần trăm */}
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 w-7 text-right">
              {Math.round(overallPct)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
};
