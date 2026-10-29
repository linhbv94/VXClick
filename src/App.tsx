// Ứng dụng chính VXClick — Ultra-compact Macro Recorder & Automation Engine
// Quản lý trạng thái FSM, điều phối cửa sổ nổi, Theme (System/Dark/Light/OLED) & Song ngữ (Vi/En)

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { MainBar } from './components/MainBar';
import {
  PlaybackMiniBar,
  type StoppedNoticeInfo,
} from './components/PlaybackMiniBar';
import { SettingsPopover } from './components/SettingsPopover';
import { AboutModal } from './components/AboutModal';
import { SupportModal } from './components/SupportModal';
import { PermissionModal } from './components/PermissionModal';
import { t } from './i18n/translations';
import type {
  SystemState,
  SettingsState,
  ActiveView,
  SettingsTabId,
  PlaybackProgressPayload,
  AutoClickProgressPayload,
} from './types/macro';
import {
  isTauri,
  DEFAULT_SETTINGS,
  bridgeStartRecording,
  bridgeStopRecording,
  bridgeStartPlayback,
  bridgeStopPlayback,
  bridgeStartAutoClick,
  bridgeStopAutoClick,
  bridgeGetSettings,
  bridgeSetSettings,
  bridgeSetAlwaysOnTop,
  bridgeSyncWindowHeight,
  bridgeInitWindowConstraints,
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
  bridgeListenAutoClickProgress,
  bridgeListenEmergencyStopped,
} from './services/tauri_bridge';
import {
  useAppUpdater,
  installUpdate,
  restartAfterUpdate,
  checkForUpdates,
  dismissUpdateNotice,
} from './services/app_updater';

export function App() {
  const updateState = useAppUpdater();
  const hasUpdateAvailable =
    updateState.status === 'available' || updateState.status === 'installed';
  const updaterBusy = ['checking', 'downloading', 'installing'].includes(
    updateState.status
  );

  const [systemState, setSystemState] = useState<SystemState>('IDLE_EMPTY');
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>('automation');
  const [recordingElapsed, setRecordingElapsed] = useState<string>('00:00');
  const [playbackProgress, setPlaybackProgress] = useState<
    PlaybackProgressPayload | undefined
  >(undefined);
  const [autoClickProgress, setAutoClickProgress] = useState<
    AutoClickProgressPayload | undefined
  >(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [stoppedNotice, setStoppedNotice] = useState<StoppedNoticeInfo | null>(
    null
  );
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef(settings);
  const systemStateRef = useRef(systemState);
  const stoppedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    systemStateRef.current = systemState;
  }, [systemState]);

  // Quản lý Theme: System / Dark / Light / OLED
  useEffect(() => {
    const applyTheme = () => {
      const isOled = settings.theme === 'oled';
      const isDark =
        settings.theme === 'dark' ||
        isOled ||
        (settings.theme === 'system' &&
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);

      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.classList.toggle('theme-oled', isOled);
    };

    applyTheme();

    if (settings.theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  // Đồng bộ ngôn ngữ / theme khi có thay đổi từ cửa sổ khác qua localStorage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'vxclick_settings_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Partial<SettingsState>;
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Lắng nghe phím tắt ⌘, / Ctrl+, và sự kiện từ native menu Settings…
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setActiveView('settings');
      }
    };
    window.addEventListener('keydown', onKeyDown);

    let unlistenMenu: (() => void) | null = null;
    if (isTauri()) {
      import('@tauri-apps/api/event')
        .then(({ listen }) =>
          listen('vxclick://open-settings', () => {
            setActiveView('settings');
          })
        )
        .then((u) => {
          unlistenMenu = u;
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (unlistenMenu) unlistenMenu();
    };
  }, []);

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
            showToast(t('permission_granted_toast', settingsRef.current.language));
          }
          return true;
        } else {
          setSystemState('PERMISSION_BLOCKED');
          if (!silent) {
            showToast(t('permission_blocked_title', settingsRef.current.language));
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
    [showToast]
  );

  // Khởi tạo cấu hình và đăng ký lắng nghe sự kiện từ backend / mock
  useEffect(() => {
    bridgeInitWindowConstraints();

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
        } else if (
          prevState === 'AUTOCLICKING' &&
          (payload.state === 'IDLE_READY' || payload.state === 'IDLE_EMPTY')
        ) {
          setStoppedNotice((prevNotice) => {
            if (!prevNotice) {
              const currentSettings = settingsRef.current;
              const msg = t(
                'status_autoclick_completed',
                currentSettings.language
              );
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

    const unlistenAutoClick = bridgeListenAutoClickProgress((payload) => {
      setAutoClickProgress(payload);
    });

    const unlistenEmergency = bridgeListenEmergencyStopped((payload) => {
      const currentSettings = settingsRef.current;
      const isDoomsday = currentSettings.continuous;
      const currentSt = systemStateRef.current;
      const isEsc =
        payload.reason === 'esc' ||
        payload.reason.toLowerCase().includes('esc');
      const message = isEsc
        ? currentSt === 'AUTOCLICKING'
          ? t('status_stopped_autoclick_esc', currentSettings.language)
          : isDoomsday
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
      unlistenAutoClick();
      unlistenEmergency();
    };
  }, [checkPermissions]);

  // Tự động đo kích thước thật của container bằng ResizeObserver và điều chỉnh window size mượt mà
  useEffect(() => {
    if (!shellRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.ceil(
          entry.borderBoxSize?.[0]?.blockSize ??
            entry.target.getBoundingClientRect().height
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
  }, [isWindows, systemState, settings, showToast]);

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

  // Hành động 4: Bật / Dừng Auto Click (⌥⇧⌘C / Ctrl+Alt+Shift+C)
  const handleToggleAutoClick = useCallback(async () => {
    if (isWindows) {
      showToast(t('windows_dummy_notice', settings.language));
      return;
    }

    if (systemState === 'PERMISSION_BLOCKED') {
      setActiveView('permission');
      showToast(t('permission_blocked_title', settings.language));
      return;
    }

    if (systemState === 'AUTOCLICKING') {
      try {
        await bridgeStopAutoClick();
        const currentSettings = settingsRef.current;
        const message = t(
          'status_stopped_autoclick_manual',
          currentSettings.language
        );
        setStoppedNotice({ message, isEsc: false });
        if (stoppedTimeoutRef.current) {
          clearTimeout(stoppedTimeoutRef.current);
        }
        stoppedTimeoutRef.current = setTimeout(() => {
          setStoppedNotice(null);
        }, 1200);
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : 'Lỗi khi dừng auto click'
        );
      }
    } else if (systemState === 'IDLE_EMPTY' || systemState === 'IDLE_READY') {
      try {
        setActiveView('main');
        setAutoClickProgress(undefined);
        await bridgeStartAutoClick({
          interval_ms: settings.autoclick_interval_ms,
          button: settings.autoclick_button,
          until_stopped: settings.autoclick_until_stopped,
          repeat_count: settings.autoclick_repeat_count,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        showToast(errMsg || 'Lỗi khi bắt đầu auto click');
      }
    }
  }, [isWindows, systemState, settings, showToast]);

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
  const lang = settings.language;

  const mainBarNode = (
    <MainBar
      systemState={systemState}
      alwaysOnTop={settings.always_on_top}
      isSettingOpen={activeView !== 'main'}
      language={settings.language}
      recordingElapsedFormatted={recordingElapsed}
      playbackProgress={playbackProgress}
      autoClickCount={autoClickProgress?.current_clicks}
      hasUpdateAvailable={hasUpdateAvailable}
      onToggleRecord={handleToggleRecord}
      onTogglePlay={handleTogglePlay}
      onToggleAutoClick={handleToggleAutoClick}
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
          activeTab={settingsTab}
          onTabChange={setSettingsTab}
          onUpdateSettings={handleUpdateSettings}
          onOpenAbout={() => setSettingsTab('about')}
          onOpenSupport={() => setSettingsTab('support')}
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
            bridgeRestartApp().catch((err) =>
              console.warn('Lỗi khởi động lại app:', err)
            );
          }}
          onClose={() => setActiveView('main')}
        />
      )}
    </>
  );

  // Card thông báo cập nhật trực tiếp (AU-01..AU-04) gắn ở root widget khi có bản cập nhật mới
  const showUpdateNoticeCard =
    updateState.noticeVisible &&
    activeView === 'main' &&
    ['available', 'downloading', 'installing', 'installed', 'error'].includes(
      updateState.status
    );

  const mainWidget = (
    <div ref={shellRef} className="widget_shell select-none font-sans">
      {/* MainBar luôn được pin cố định ở trên cùng */}
      {mainBarNode}

      {/* Mini Status Bar tự động mở rộng khi Playback hoặc Auto Click hoặc hiển thị trạng thái dừng */}
      {(systemState === 'PLAYING' ||
        systemState === 'AUTOCLICKING' ||
        !!stoppedNotice) &&
        activeView === 'main' && (
          <PlaybackMiniBar
            mode={systemState === 'AUTOCLICKING' ? 'autoclick' : 'playback'}
            isContinuous={settings.continuous}
            repeatCount={settings.repeat_count}
            progress={playbackProgress}
            autoclickProgress={autoClickProgress}
            autoclickUntilStopped={settings.autoclick_until_stopped}
            autoclickRepeatCount={settings.autoclick_repeat_count}
            language={settings.language}
            onStop={
              systemState === 'AUTOCLICKING'
                ? handleToggleAutoClick
                : handleTogglePlay
            }
            stoppedNotice={stoppedNotice}
          />
        )}

      {/* Card thông báo cập nhật trực tiếp với CTA "Cập nhật & khởi động lại" */}
      {showUpdateNoticeCard && (
        <div
          role="status"
          aria-live="polite"
          data-vx-update-notice
          className="w-full p-3 border-t border-cyan-500/30 bg-slate-100/95 dark:bg-slate-950/95 flex flex-col gap-2 text-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-700 dark:text-cyan-300">
              {updateState.status === 'installed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : updateState.status === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              )}
              <span>
                {updateState.status === 'installed'
                  ? t('update_installed', lang)
                  : updateState.status === 'error'
                  ? t('update_error', lang)
                  : `${t('update_available', lang)} v${updateState.version ?? ''}`}
              </span>
            </div>
            {!updaterBusy && (
              <button
                type="button"
                onClick={dismissUpdateNotice}
                title={t('update_notice_dismiss', lang)}
                aria-label={t('update_notice_dismiss', lang)}
                className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {updateState.status === 'available' && (
            <>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('update_available_desc', lang)}
              </p>
              <button
                type="button"
                disabled={updaterBusy}
                onClick={() => void installUpdate()}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('update_install_btn', lang)}</span>
              </button>
            </>
          )}

          {updateState.status === 'downloading' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span>{t('update_downloading', lang)}</span>
                {updateState.progress !== undefined && (
                  <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                    {updateState.progress}%
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full transition-all duration-150"
                  style={{ width: `${updateState.progress ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {updateState.status === 'installing' && (
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-500" />
              <span>{t('update_installing', lang)}</span>
            </div>
          )}

          {updateState.status === 'installed' && (
            <button
              type="button"
              onClick={() => void restartAfterUpdate()}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('update_restart_btn', lang)}</span>
            </button>
          )}

          {updateState.status === 'error' && (
            <div className="flex items-center justify-between gap-2">
              {updateState.error && (
                <span className="text-[10px] font-mono text-slate-500 truncate">
                  {updateState.error}
                </span>
              )}
              <button
                type="button"
                onClick={() => void checkForUpdates(true)}
                className="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-[11px] font-medium text-cyan-600 dark:text-cyan-400 shrink-0"
              >
                {t('update_retry_btn', lang)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Nội dung popover mở rộng liền mạch nối tiếp bên dưới qua border-t */}
      {activeView !== 'main' && (
        <div className="widget_content animate-in fade-in duration-100">
          {popoverNode}
        </div>
      )}

      {/* Thông báo dạng dải bottom trong main view */}
      {toastMessage &&
        activeView === 'main' &&
        systemState !== 'PLAYING' &&
        systemState !== 'AUTOCLICKING' &&
        !stoppedNotice && (
          <div className="w-full h-[24px] px-2.5 flex items-center justify-center bg-slate-100/95 dark:bg-slate-950/95 border-t border-cyan-500/30 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 select-none drag-region overflow-hidden animate-in fade-in slide-in-from-top-1">
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

      {/* Floating toast chỉ dùng khi đang mở các modal */}
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
            360 × 38px
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {settings.language === 'en' ? (
            <>
              Click buttons or hotkeys{' '}
              <span className="font-mono text-cyan-600 dark:text-cyan-300">
                ⌥⇧⌘R
              </span>{' '}
              (Rec) •{' '}
              <span className="font-mono text-emerald-600 dark:text-emerald-300">
                ⌥⇧⌘P
              </span>{' '}
              (Play) •{' '}
              <span className="font-mono text-amber-500 dark:text-amber-400">
                ⌥⇧⌘C
              </span>{' '}
              (Auto Click) •{' '}
              <span className="font-mono text-rose-500 dark:text-rose-300">
                ESC
              </span>{' '}
              (Stop)
            </>
          ) : (
            <>
              Bấm các nút bên dưới hoặc phím tắt{' '}
              <span className="font-mono text-cyan-600 dark:text-cyan-300">
                ⌥⇧⌘R
              </span>{' '}
              (Rec) •{' '}
              <span className="font-mono text-emerald-600 dark:text-emerald-300">
                ⌥⇧⌘P
              </span>{' '}
              (Play) •{' '}
              <span className="font-mono text-amber-500 dark:text-amber-400">
                ⌥⇧⌘C
              </span>{' '}
              (Auto Click) •{' '}
              <span className="font-mono text-rose-500 dark:text-rose-300">
                ESC
              </span>{' '}
              (Ngắt khẩn cấp)
            </>
          )}
        </p>
      </div>

      {mainWidget}
    </div>
  );
}
export default App;
