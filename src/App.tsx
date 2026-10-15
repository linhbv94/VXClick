// Ứng dụng chính VXClick — Ultra-compact Macro Recorder & Automation Engine
// Quản lý trạng thái FSM, điều phối cửa sổ nổi, Theme (Dark/Light/System) & Song ngữ (Vi/En)

import { useState, useEffect, useCallback, useRef } from 'react';
import { MainBar } from './components/MainBar';
import { PlaybackMiniBar, type StoppedNoticeInfo } from './components/PlaybackMiniBar';
import { SettingsPopover } from './components/SettingsPopover';
import { AboutModal } from './components/AboutModal';
import { SupportModal } from './components/SupportModal';
import { PermissionModal } from './components/PermissionModal';
import { t } from './i18n/translations';
import type {
  SystemState,
  SettingsState,
  ActiveView,
  PlaybackProgressPayload,
} from './types/macro';
import {
  isTauri,
  DEFAULT_SETTINGS,
  bridgeStartRecording,
  bridgeStopRecording,
  bridgeStartPlayback,
  bridgeStopPlayback,
  bridgeGetSettings,
  bridgeSetSettings,
  bridgeSetAlwaysOnTop,
  bridgeSyncWindowHeight,
  bridgeStartDragging,
  bridgeMinimizeWindow,
  bridgeCloseWindow,
  bridgeGetSystemState,
  bridgeGetSystemPermissions,
  bridgeRequestSystemPermissions,
  bridgeRestartApp,
  bridgeListenStateChanged,
  bridgeListenRecordingEvent,
  bridgeListenPlaybackProgress,
  bridgeListenEmergencyStopped,
} from './services/tauri_bridge';

export function App() {
  const [systemState, setSystemState] = useState<SystemState>('IDLE_EMPTY');
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [recordingElapsed, setRecordingElapsed] = useState<string>('00:00');
  const [playbackProgress, setPlaybackProgress] = useState<
    PlaybackProgressPayload | undefined
  >(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [stoppedNotice, setStoppedNotice] = useState<StoppedNoticeInfo | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef(settings);
  const stoppedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Quản lý Theme: System / Dark / Light
  useEffect(() => {
    const applyTheme = () => {
      const isDark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' &&
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    if (settings.theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  // Phát hiện hệ điều hành macOS / Windows
  const isMac =
    typeof navigator !== 'undefined' &&
    (navigator.platform?.toLowerCase().includes('mac') ||
      navigator.userAgent.toLowerCase().includes('mac'));
  const isWindows =
    typeof navigator !== 'undefined' &&
    (navigator.platform?.toLowerCase().includes('win') ||
      navigator.userAgent.toLowerCase().includes('windows'));

  // Hiển thị thông báo Toast tự tắt
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  }, []);

  // Kiểm tra quyền Trợ năng hệ thống (macOS Accessibility)
  const checkPermissions = useCallback(
    async (silent = false) => {
      setIsCheckingPermission(true);
      try {
        const perm = await bridgeGetSystemPermissions();
        if (perm.is_trusted) {
          setSystemState((prev) =>
            prev === 'PERMISSION_BLOCKED' ? 'IDLE_EMPTY' : prev
          );
          setActiveView((prev) => (prev === 'permission' ? 'main' : prev));
          if (!silent) {
            showToast(t('permission_granted_toast', settings.language));
          }
          return true;
        } else {
          setSystemState('PERMISSION_BLOCKED');
          if (!silent) {
            showToast(t('permission_blocked_title', settings.language));
          }
          return false;
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra quyền hệ thống:', err);
        return false;
      } finally {
        setIsCheckingPermission(false);
      }
    },
    [settings.language, showToast]
  );

  // Khởi tạo cấu hình và đăng ký lắng nghe sự kiện từ backend / mock
  useEffect(() => {
    bridgeGetSettings()
      .then((s) => setSettings(s))
      .catch((e) => console.warn('Lỗi đọc settings:', e));

    bridgeGetSystemState()
      .then((st) => {
        setSystemState(st);
        if (st === 'PERMISSION_BLOCKED') {
          setActiveView('permission');
        }
      })
      .catch((e) => console.warn('Lỗi đọc system state:', e));

    const handleWindowFocus = () => {
      checkPermissions(true);
    };
    window.addEventListener('focus', handleWindowFocus);

    const unlistenState = bridgeListenStateChanged((payload) => {
      setSystemState((prevState) => {
        if (prevState === 'PLAYING' && payload.state === 'IDLE_READY') {
          // Khi phát xong toàn bộ vòng lặp một cách tự nhiên
          setStoppedNotice((prevNotice) => {
            if (!prevNotice) {
              const currentSettings = settingsRef.current;
              const msg = t('status_completed_all', currentSettings.language);
              if (stoppedTimeoutRef.current) {
                clearTimeout(stoppedTimeoutRef.current);
              }
              stoppedTimeoutRef.current = setTimeout(() => {
                setStoppedNotice(null);
              }, 1200);
              return { message: msg, isEsc: false };
            }
            return prevNotice;
          });
        }
        return payload.state;
      });

      if (payload.state !== 'PERMISSION_BLOCKED') {
        setActiveView((prev) => (prev === 'permission' ? 'main' : prev));
      } else {
        setActiveView('permission');
      }
    });

    const unlistenRec = bridgeListenRecordingEvent((payload) => {
      const totalSec = Math.floor(payload.elapsed_ms / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setRecordingElapsed(
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    });

    const unlistenPlay = bridgeListenPlaybackProgress((payload) => {
      setPlaybackProgress(payload);
    });

    const unlistenEmergency = bridgeListenEmergencyStopped((payload) => {
      const currentSettings = settingsRef.current;
      const isDoomsday = currentSettings.continuous;
      const isEsc =
        payload.reason === 'esc' ||
        payload.reason.toLowerCase().includes('esc');
      const message = isEsc
        ? isDoomsday
          ? t('status_stopped_doomsday_esc', currentSettings.language)
          : t('status_stopped_esc', currentSettings.language)
        : payload.reason;

      setStoppedNotice({ message, isEsc });

      if (stoppedTimeoutRef.current) {
        clearTimeout(stoppedTimeoutRef.current);
      }
      stoppedTimeoutRef.current = setTimeout(() => {
        setStoppedNotice(null);
      }, 1400);
    });

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      if (stoppedTimeoutRef.current) {
        clearTimeout(stoppedTimeoutRef.current);
      }
      unlistenState();
      unlistenRec();
      unlistenPlay();
      unlistenEmergency();
    };
  }, [checkPermissions]);

  // Tự động đo kích thước thật của container bằng ResizeObserver và điều chỉnh window size mượt mà
  useEffect(() => {
    if (!shellRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.ceil(
          entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height
        );
        if (height > 0) {
          bridgeSyncWindowHeight(height, activeView === 'main');
        }
      }
    });

    observer.observe(shellRef.current);
    return () => observer.disconnect();
  }, [activeView]);

  // Hành động 1: Ghi / Dừng Ghi Macro (F9)
  const handleToggleRecord = useCallback(async () => {
    if (isWindows) {
      showToast(t('windows_dummy_notice', settings.language));
      return;
    }

    if (systemState === 'PERMISSION_BLOCKED') {
      setActiveView('permission');
      showToast(t('permission_blocked_title', settings.language));
      return;
    }

    if (systemState === 'IDLE_EMPTY' || systemState === 'IDLE_READY') {
      try {
        setActiveView('main');
        setRecordingElapsed('00:00');
        await bridgeStartRecording();
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        showToast(errMsg || 'Lỗi khi bắt đầu ghi');
        if (
          errMsg.includes('quyền') ||
          errMsg.includes('permission') ||
          errMsg.includes('PERMISSION_BLOCKED')
        ) {
          setSystemState('PERMISSION_BLOCKED');
          setActiveView('permission');
        }
      }
    } else if (systemState === 'RECORDING') {
      try {
        const stats = await bridgeStopRecording();
        const msg =
          settings.language === 'en'
            ? `Recorded ${stats.total_events} events (${stats.duration_formatted})`
            : `Đã ghi ${stats.total_events} sự kiện (${stats.duration_formatted})`;
        showToast(msg);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Lỗi khi dừng ghi');
      }
    }
  }, [isWindows, systemState, settings.language, showToast]);

  // Hành động 2: Phát / Dừng Phát Macro (F8)
  const handleTogglePlay = useCallback(async () => {
    if (isWindows) {
      showToast(t('windows_dummy_notice', settings.language));
      return;
    }

    if (systemState === 'IDLE_READY') {
      try {
        setActiveView('main');
        await bridgeStartPlayback({
          speed: settings.play_speed,
          continuous: settings.continuous,
          repeat_count: settings.repeat_count,
        });
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Lỗi khi phát lại');
      }
    } else if (systemState === 'PLAYING') {
      try {
        await bridgeStopPlayback();
        const currentSettings = settingsRef.current;
        const isDoomsday = currentSettings.continuous;
        const message = isDoomsday
          ? t('status_stopped_doomsday_esc', currentSettings.language)
          : t('status_stopped_manual', currentSettings.language);
        setStoppedNotice({ message, isEsc: false });
        if (stoppedTimeoutRef.current) {
          clearTimeout(stoppedTimeoutRef.current);
        }
        stoppedTimeoutRef.current = setTimeout(() => {
          setStoppedNotice(null);
        }, 1200);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Lỗi khi dừng phát');
      }
    }
  }, [systemState, settings, showToast]);

  // Hành động 3: Ghim cửa sổ trên cùng (Always on Top)
  const handleTogglePin = useCallback(async () => {
    const nextVal = !settings.always_on_top;
    const updated = { ...settings, always_on_top: nextVal };
    setSettings(updated);
    try {
      await bridgeSetSettings(updated);
      await bridgeSetAlwaysOnTop(nextVal);
    } catch (err) {
      console.warn('Lỗi cập nhật ghim cửa sổ:', err);
    }
  }, [settings]);

  // Cập nhật cấu hình từ Popover
  const handleUpdateSettings = useCallback(
    async (newSettings: SettingsState) => {
      setSettings(newSettings);
      try {
        await bridgeSetSettings(newSettings);
        if (newSettings.always_on_top !== settings.always_on_top) {
          await bridgeSetAlwaysOnTop(newSettings.always_on_top);
        }
      } catch (err) {
        console.warn('Lỗi lưu cấu hình:', err);
      }
    },
    [settings]
  );

  const inTauri = isTauri();

  const mainBarNode = (
    <MainBar
      systemState={systemState}
      alwaysOnTop={settings.always_on_top}
      isSettingOpen={activeView !== 'main'}
      language={settings.language}
      recordingElapsedFormatted={recordingElapsed}
      playbackProgress={playbackProgress}
      onToggleRecord={handleToggleRecord}
      onTogglePlay={handleTogglePlay}
      onTogglePin={handleTogglePin}
      onToggleSetting={() =>
        setActiveView((prev) => (prev === 'main' ? 'settings' : 'main'))
      }
      onMinimize={() => bridgeMinimizeWindow()}
      onClose={() => bridgeCloseWindow()}
      onStartDrag={bridgeStartDragging}
      isMac={isMac}
      inTauri={inTauri}
    />
  );

  const popoverNode = (
    <>
      {activeView === 'settings' && (
        <SettingsPopover
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenAbout={() => setActiveView('about')}
          onOpenSupport={() => setActiveView('support')}
          onClose={() => setActiveView('main')}
        />
      )}

      {activeView === 'about' && (
        <AboutModal
          language={settings.language}
          onBack={() => setActiveView('settings')}
          onClose={() => setActiveView('main')}
        />
      )}

      {activeView === 'support' && (
        <SupportModal
          language={settings.language}
          onBack={() => setActiveView('settings')}
          onClose={() => setActiveView('main')}
        />
      )}

      {activeView === 'permission' && (
        <PermissionModal
          language={settings.language}
          isChecking={isCheckingPermission}
          onRequestOpenSettings={async () => {
            try {
              await bridgeRequestSystemPermissions();
            } catch (err) {
              console.warn('Lỗi yêu cầu mở quyền:', err);
            }
          }}
          onCheckAgain={() => checkPermissions(false)}
          onRelaunch={() => {
            bridgeRestartApp().catch((err) => console.warn('Lỗi khởi động lại app:', err));
          }}
          onClose={() => setActiveView('main')}
        />
      )}
    </>
  );

  const mainWidget = (
    <div
      ref={shellRef}
      className="widget_shell select-none font-sans"
    >
      {/* MainBar luôn được pin cố định ở trên cùng */}
      {mainBarNode}

      {/* Mini Status Bar tự động mở rộng khi Playback hoặc hiển thị trạng thái dừng */}
      {(systemState === 'PLAYING' || !!stoppedNotice) && activeView === 'main' && (
        <PlaybackMiniBar
          isContinuous={settings.continuous}
          repeatCount={settings.repeat_count}
          progress={playbackProgress}
          language={settings.language}
          onStop={handleTogglePlay}
          stoppedNotice={stoppedNotice}
        />
      )}

      {/* Nội dung popover mở rộng liền mạch nối tiếp bên dưới qua border-t */}
      {activeView !== 'main' && (
        <div className="widget_content animate-in fade-in duration-100">
          {popoverNode}
        </div>
      )}

      {/* Thông báo dạng dải bottom trong main view (tự động expand cửa sổ 62px, không bao giờ che đè nút) */}
      {toastMessage && activeView === 'main' && systemState !== 'PLAYING' && !stoppedNotice && (
        <div className="w-full h-[24px] px-2.5 flex items-center justify-center bg-slate-100/95 dark:bg-slate-950/95 border-t border-cyan-500/30 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 select-none drag-region overflow-hidden animate-in fade-in slide-in-from-top-1">
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Floating toast chỉ dùng khi đang mở các modal (Settings / About / Support / Permission) */}
      {toastMessage && activeView !== 'main' && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in duration-150">
          <div className="px-2.5 py-1 rounded-md bg-slate-900/90 text-slate-100 border border-cyan-500/40 text-[10px] font-medium shadow-xl backdrop-blur-md">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );

  if (inTauri) {
    return mainWidget;
  }

  // Chế độ Live Browser Preview với canvas desktop nổi bật
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start pt-14 bg-slate-100 dark:bg-slate-950 dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] select-none transition-colors">
      <div className="mb-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">
            VXClick — Live Preview
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
            310 × 38px
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {settings.language === 'en' ? (
            <>
              Click buttons or hotkeys <span className="font-mono text-cyan-600 dark:text-cyan-300">F9</span> (Rec) • <span className="font-mono text-emerald-600 dark:text-emerald-300">F8</span> (Play) • <span className="font-mono text-rose-500 dark:text-rose-300">ESC</span> (Stop)
            </>
          ) : (
            <>
              Bấm các nút bên dưới hoặc phím tắt <span className="font-mono text-cyan-600 dark:text-cyan-300">F9</span> (Rec) • <span className="font-mono text-emerald-600 dark:text-emerald-300">F8</span> (Play) • <span className="font-mono text-rose-500 dark:text-rose-300">ESC</span> (Ngắt khẩn cấp)
            </>
          )}
        </p>
      </div>

      {mainWidget}
    </div>
  );
}
export default App;
