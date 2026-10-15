// Tauri IPC Bridge & Mock Simulator Fallback cho VXClick
// Đảm bảo hoạt động mượt mà cả trong Tauri v2 Desktop và Web Browser Preview

import type {
  SystemState,
  SettingsState,
  PlaybackConfig,
  MacroStats,
  PermissionStatus,
  StateChangedPayload,
  RecordingProgressPayload,
  PlaybackProgressPayload,
  EmergencyStoppedPayload,
} from '../types/macro';

// Kiểm tra xem ứng dụng có đang chạy trong môi trường Tauri v2 hay không
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Cấu hình mặc định của ứng dụng
export const DEFAULT_SETTINGS: SettingsState = {
  play_speed: 1.0,
  continuous: false,
  repeat_count: 1,
  always_on_top: true,
  theme: 'system',
  language: 'vi',
};

// Lưu trữ cấu hình trong LocalStorage làm cache/mock
const STORAGE_KEY_SETTINGS = 'vxclick_settings_v1';
const loadStoredSettings = (): SettingsState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Lỗi đọc settings từ localStorage:', e);
  }
  return DEFAULT_SETTINGS;
};

const saveStoredSettings = (settings: SettingsState) => {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Lỗi lưu settings vào localStorage:', e);
  }
};

// ==========================================
// MOCK SIMULATOR ENGINE (Khi chạy trong trình duyệt)
// ==========================================
class MockMacroEngine {
  private currentState: SystemState = 'IDLE_EMPTY';
  private currentSessionId: number = 0;
  private currentRevision: number = 0;
  private settings: SettingsState = loadStoredSettings();
  private macroStats: MacroStats | null = null;

  private recordTimer: number | null = null;
  private recordStartTime: number = 0;
  private recordedCount: number = 0;

  private playbackTimer: number | null = null;
  private playbackCurrentLoop: number = 1;

  // Listeners
  private stateChangedListeners: Array<(payload: StateChangedPayload) => void> = [];
  private recordingListeners: Array<(payload: RecordingProgressPayload) => void> = [];
  private playbackListeners: Array<(payload: PlaybackProgressPayload) => void> = [];
  private emergencyListeners: Array<(payload: EmergencyStoppedPayload) => void> = [];

  constructor() {
    this.setupBrowserHotkeys();
  }

  private setupBrowserHotkeys() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      // Hotkey Rec: F9 hoặc Cmd+Opt+Shift+R / Ctrl+Alt+Shift+R
      const isRecKey =
        e.key === 'F9' ||
        ((e.metaKey || e.ctrlKey) && e.altKey && e.code === 'KeyR') ||
        ((e.metaKey || e.altKey) && e.code === 'KeyR');
      if (isRecKey) {
        e.preventDefault();
        if (this.currentState === 'IDLE_EMPTY' || this.currentState === 'IDLE_READY') {
          this.startRecording();
        } else if (this.currentState === 'RECORDING') {
          this.stopRecording();
        }
      }

      // Hotkey Play: F8 hoặc Cmd+Opt+Shift+P / Ctrl+Alt+Shift+P
      const isPlayKey =
        e.key === 'F8' ||
        ((e.metaKey || e.ctrlKey) && e.altKey && e.code === 'KeyP') ||
        ((e.metaKey || e.altKey) && e.code === 'KeyP');
      if (isPlayKey) {
        e.preventDefault();
        if (this.currentState === 'IDLE_READY') {
          this.startPlayback({
            speed: this.settings.play_speed,
            continuous: this.settings.continuous,
            repeat_count: this.settings.repeat_count,
          });
        } else if (this.currentState === 'PLAYING') {
          this.stopPlayback();
        }
      }

      // Hotkey ESC: Failsafe khẩn cấp khi đang phát lại
      if (e.key === 'Escape' && this.currentState === 'PLAYING') {
        e.preventDefault();
        this.triggerEmergencyStop('Nhấn phím cứng ESC ngắt khẩn cấp');
      }
    });
  }

  private notifyState(state: SystemState) {
    this.currentState = state;
    this.currentRevision++;
    const payload: StateChangedPayload = {
      state: this.currentState,
      session_id: this.currentSessionId,
      revision: this.currentRevision,
    };
    this.stateChangedListeners.forEach((cb) => cb(payload));
  }

  async startRecording(): Promise<number> {
    if (this.currentState === 'PLAYING') {
      throw new Error('Không thể bắt đầu ghi khi đang phát lại');
    }
    this.currentSessionId = Date.now();
    this.recordStartTime = Date.now();
    this.recordedCount = 0;
    this.notifyState('RECORDING');

    if (this.recordTimer) clearInterval(this.recordTimer);
    this.recordTimer = window.setInterval(() => {
      // Giả lập thu thập sự kiện chuột & bàn phím
      this.recordedCount += Math.floor(Math.random() * 4) + 1;
      const elapsed = Date.now() - this.recordStartTime;
      this.recordingListeners.forEach((cb) =>
        cb({ count: this.recordedCount, elapsed_ms: elapsed })
      );
    }, 200);

    return this.currentSessionId;
  }

  async stopRecording(): Promise<MacroStats> {
    if (this.recordTimer) {
      clearInterval(this.recordTimer);
      this.recordTimer = null;
    }
    const elapsedSec = Math.max(1, Math.round((Date.now() - this.recordStartTime) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    const durationFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    this.macroStats = {
      total_events: Math.max(12, this.recordedCount),
      clicks_count: Math.round(this.recordedCount * 0.4),
      keys_count: Math.round(this.recordedCount * 0.6),
      duration_formatted: durationFormatted,
    };

    this.notifyState('IDLE_READY');
    return this.macroStats;
  }

  async startPlayback(config: PlaybackConfig): Promise<number> {
    if (this.currentState !== 'IDLE_READY') {
      throw new Error('Chưa có kịch bản macro sẵn sàng để phát lại');
    }
    this.notifyState('PLAYING');
    this.playbackCurrentLoop = 1;

    const baseDurationMs = 2500 / Math.max(0.1, config.speed);
    const totalLoops = config.continuous ? 0 : Math.max(1, config.repeat_count);
    const startTime = Date.now();

    if (this.playbackTimer) clearInterval(this.playbackTimer);

    this.playbackTimer = window.setInterval(() => {
      const now = Date.now();
      const loopElapsed = (now - startTime) % baseDurationMs;
      const pct = (loopElapsed / baseDurationMs) * 100;
      const currentLoopIndex = Math.floor((now - startTime) / baseDurationMs) + 1;

      if (!config.continuous && currentLoopIndex > totalLoops) {
        // Hoàn tất mọi vòng lặp
        this.stopPlayback();
        return;
      }

      this.playbackCurrentLoop = currentLoopIndex;
      this.playbackListeners.forEach((cb) =>
        cb({
          loop: this.playbackCurrentLoop,
          total: totalLoops,
          pct: Math.min(100, Math.max(0, pct)),
        })
      );
    }, 32);

    return this.currentSessionId;
  }

  async stopPlayback(): Promise<void> {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.playbackListeners.forEach((cb) => cb({ loop: 0, total: 0, pct: 0 }));
    this.notifyState('IDLE_READY');
  }

  triggerEmergencyStop(reason: string) {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.playbackListeners.forEach((cb) => cb({ loop: 0, total: 0, pct: 0 }));
    this.notifyState('EMERGENCY_STOPPED');
    this.emergencyListeners.forEach((cb) =>
      cb({ reason, timestamp: Date.now() })
    );

    // Tự động khôi phục sau 500ms về IDLE_READY
    setTimeout(() => {
      if (this.currentState === 'EMERGENCY_STOPPED') {
        this.notifyState('IDLE_READY');
      }
    }, 500);
  }

  getSettings(): SettingsState {
    return { ...this.settings };
  }

  setSettings(newSettings: SettingsState) {
    this.settings = { ...newSettings };
    saveStoredSettings(this.settings);
  }

  getMacroStats(): MacroStats | null {
    return this.macroStats;
  }

  getState(): SystemState {
    return this.currentState;
  }

  onStateChanged(cb: (payload: StateChangedPayload) => void) {
    this.stateChangedListeners.push(cb);
  }

  onRecordingEvent(cb: (payload: RecordingProgressPayload) => void) {
    this.recordingListeners.push(cb);
  }

  onPlaybackProgress(cb: (payload: PlaybackProgressPayload) => void) {
    this.playbackListeners.push(cb);
  }

  onEmergencyStopped(cb: (payload: EmergencyStoppedPayload) => void) {
    this.emergencyListeners.push(cb);
  }
}

const mockEngine = new MockMacroEngine();

// ==========================================
// EXPORT CÁC HÀM GIAO TIẾP TẬP TRUNG (BRIDGE API)
// ==========================================

export async function bridgeStartRecording(): Promise<number> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<number>('start_recording');
  }
  return mockEngine.startRecording();
}

export async function bridgeStopRecording(): Promise<MacroStats> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<MacroStats>('stop_recording', { sessionId: 0 });
  }
  return mockEngine.stopRecording();
}

export async function bridgeStartPlayback(config: PlaybackConfig): Promise<number> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<number>('start_playback', { config });
  }
  return mockEngine.startPlayback(config);
}

export async function bridgeStopPlayback(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<void>('stop_playback');
  }
  return mockEngine.stopPlayback();
}

export async function bridgeGetSettings(): Promise<SettingsState> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<SettingsState>('get_settings');
  }
  return mockEngine.getSettings();
}

export async function bridgeSetSettings(settings: SettingsState): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke<void>('set_settings', { settings });
  }
  mockEngine.setSettings(settings);
}

export async function bridgeSetAlwaysOnTop(enabled: boolean): Promise<void> {
  if (isTauri()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setAlwaysOnTop(enabled);
  }
}

export async function bridgeSetWindowSize(width: number, height: number): Promise<void> {
  if (isTauri()) {
    const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setSize(new LogicalSize(width, height));
  }
}

export async function bridgeStartDragging(): Promise<void> {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.warn('Lỗi kích hoạt startDragging:', err);
    }
  }
}

let accumulatedUpShift = 0;

export async function bridgeSyncWindowHeight(
  targetHeight: number,
  isMainBar: boolean
): Promise<void> {
  if (!isTauri()) return;

  try {
    const { getCurrentWindow, currentMonitor, LogicalPosition, LogicalSize } =
      await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    const monitor = await currentMonitor();
    const scale = monitor?.scaleFactor || window.devicePixelRatio || 1;

    const outerPos = await win.outerPosition();
    const outerSize = await win.outerSize();
    const currentLogicalY = outerPos.y / scale;
    const currentLogicalX = outerPos.x / scale;
    const currentLogicalHeight = outerSize.height / scale;

    if (isMainBar) {
      // Đang ở chế độ thanh MainBar (cao 38px hoặc 62px nếu có playback mini status bar)
      if (accumulatedUpShift > 0) {
        const restoredY = currentLogicalY + accumulatedUpShift;
        accumulatedUpShift = 0;
        await win.setPosition(new LogicalPosition(currentLogicalX, restoredY));
      }
      const finalH = Math.max(38, targetHeight);
      await win.setSize(new LogicalSize(310, finalH));
      return;
    }

    // Đang ở trạng thái mở rộng (Settings / About / Support)
    const monitorHeight = monitor ? monitor.size.height / scale : window.screen.availHeight;
    const monitorY = monitor ? monitor.position.y / scale : 0;
    const dockMargin = 70; // Tránh Dock macOS và mép dưới màn hình
    const maxBottom = monitorY + monitorHeight - dockMargin;

    const heightDiff = targetHeight - currentLogicalHeight;

    if (accumulatedUpShift > 0) {
      // Đang trong chế độ expand-up từ trước (ví dụ chuyển từ Settings sang Support)
      if (Math.abs(heightDiff) >= 1) {
        const newY = currentLogicalY - heightDiff;
        accumulatedUpShift += heightDiff;
        await win.setPosition(
          new LogicalPosition(currentLogicalX, Math.max(monitorY + 25, newY))
        );
        await win.setSize(new LogicalSize(310, targetHeight));
      }
    } else {
      // Kiểm tra xem nếu nở xuống dưới thì có chạm đáy không
      const projectedBottom = currentLogicalY + targetHeight;
      if (projectedBottom > maxBottom) {
        // Cần nở lên trên
        const shift = targetHeight - 38;
        const newY = Math.max(monitorY + 25, currentLogicalY - shift);
        accumulatedUpShift = currentLogicalY - newY;
        await win.setPosition(new LogicalPosition(currentLogicalX, newY));
        await win.setSize(new LogicalSize(310, targetHeight));
      } else {
        // Nở xuống bình thường
        accumulatedUpShift = 0;
        await win.setSize(new LogicalSize(310, targetHeight));
      }
    }
  } catch (err) {
    console.warn('Lỗi đồng bộ kích thước cửa sổ:', err);
  }
}

export async function bridgeExpandWindow(targetHeight: number): Promise<'up' | 'down'> {
  await bridgeSyncWindowHeight(targetHeight, false);
  return accumulatedUpShift > 0 ? 'up' : 'down';
}

export async function bridgeCollapseWindow(
  _previousDirection?: 'up' | 'down',
  _previousHeight?: number
): Promise<void> {
  await bridgeSyncWindowHeight(38, true);
}

export async function bridgeMinimizeWindow(): Promise<void> {
  if (isTauri()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  }
}

export async function bridgeCloseWindow(): Promise<void> {
  if (isTauri()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  }
}

export async function bridgeGetSystemState(): Promise<SystemState> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<SystemState>('get_system_state');
  }
  return mockEngine.getState();
}

export async function bridgeGetSystemPermissions(): Promise<PermissionStatus> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<PermissionStatus>('get_system_permissions');
  }
  return { is_trusted: true, input_monitoring: true };
}

export async function bridgeRequestSystemPermissions(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke<void>('request_system_permissions');
  }
}

export async function bridgeRestartApp(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke<void>('restart_app');
  } else {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}

// Lắng nghe các sự kiện thời gian thực
export function bridgeListenStateChanged(cb: (payload: StateChangedPayload) => void): () => void {
  if (isTauri()) {
    let unlistenFn: (() => void) | null = null;
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<StateChangedPayload>('macro://state_changed', (e) => cb(e.payload)).then(
        (u) => {
          unlistenFn = u;
        }
      );
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }
  mockEngine.onStateChanged(cb);
  return () => {};
}

export function bridgeListenRecordingEvent(
  cb: (payload: RecordingProgressPayload) => void
): () => void {
  if (isTauri()) {
    let unlistenFn: (() => void) | null = null;
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<RecordingProgressPayload>('macro://recording_event', (e) =>
        cb(e.payload)
      ).then((u) => {
        unlistenFn = u;
      });
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }
  mockEngine.onRecordingEvent(cb);
  return () => {};
}

export function bridgeListenPlaybackProgress(
  cb: (payload: PlaybackProgressPayload) => void
): () => void {
  if (isTauri()) {
    let unlistenFn: (() => void) | null = null;
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<PlaybackProgressPayload>('macro://playback_progress', (e) =>
        cb(e.payload)
      ).then((u) => {
        unlistenFn = u;
      });
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }
  mockEngine.onPlaybackProgress(cb);
  return () => {};
}

export function bridgeListenEmergencyStopped(
  cb: (payload: EmergencyStoppedPayload) => void
): () => void {
  if (isTauri()) {
    let unlistenFn: (() => void) | null = null;
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<EmergencyStoppedPayload>('macro://emergency_stopped', (e) =>
        cb(e.payload)
      ).then((u) => {
        unlistenFn = u;
      });
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }
  mockEngine.onEmergencyStopped(cb);
  return () => {};
}
