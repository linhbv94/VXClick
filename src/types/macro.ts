// Định nghĩa Type-Safe Schema cho VXClick theo API & Feature Flow Spec

export type SystemState =
  | 'UNINITIALIZED'
  | 'IDLE_EMPTY'
  | 'PERMISSION_BLOCKED'
  | 'RECORDING'
  | 'IDLE_READY'
  | 'PLAYING'
  | 'AUTOCLICKING'
  | 'EMERGENCY_STOPPED';

export type MouseBtn = 'Left' | 'Right' | 'Middle' | 'X1' | 'X2';

export type MacroAction =
  | { type: 'MouseDown'; payload: { button: MouseBtn; x: number; y: number } }
  | { type: 'MouseUp'; payload: { button: MouseBtn; x: number; y: number } }
  | { type: 'MouseMove'; payload: { x: number; y: number } }
  | { type: 'MouseScroll'; payload: { delta_x: number; delta_y: number } }
  | { type: 'KeyDown'; payload: { key_code: number; modifiers: number } }
  | { type: 'KeyUp'; payload: { key_code: number; modifiers: number } };

export interface MacroEvent {
  timestamp_us: number;
  action: MacroAction;
}

export interface ScreenTopology {
  virtual_width: number;
  virtual_height: number;
  scale_factor: number;
}

export interface MacroTimeline {
  version: number;
  created_at: string;
  duration_us: number;
  event_count: number;
  screen_topology: ScreenTopology;
  events: MacroEvent[];
}

export type ThemeMode = 'system' | 'dark' | 'light';
export type LanguageMode = 'vi' | 'en';

export interface SettingsState {
  play_speed: number;
  continuous: boolean;
  repeat_count: number;
  always_on_top: boolean;
  theme: ThemeMode;
  language: LanguageMode;
  autoclick_interval_ms: number;
  autoclick_button: MouseBtn;
  autoclick_until_stopped: boolean;
  autoclick_repeat_count: number;
}

export interface PlaybackConfig {
  speed: number;
  continuous: boolean;
  repeat_count: number;
}

export interface AutoClickConfig {
  interval_ms: number;
  button: MouseBtn;
  until_stopped: boolean;
  repeat_count: number;
}

export interface MacroStats {
  total_events: number;
  clicks_count: number;
  keys_count: number;
  duration_formatted: string;
}

export interface PermissionStatus {
  is_trusted: boolean;
  input_monitoring: boolean;
}

export interface StateChangedPayload {
  state: SystemState;
  session_id: number;
  revision: number;
}

export interface RecordingProgressPayload {
  count: number;
  elapsed_ms: number;
}

export interface PlaybackProgressPayload {
  loop: number;
  total: number;
  pct: number;
}

export interface AutoClickProgressPayload {
  current_clicks: number;
  total_clicks: number;
  pct: number;
}

export interface EmergencyStoppedPayload {
  reason: string;
  timestamp: number;
}

export type ActiveView = 'main' | 'settings' | 'about' | 'support' | 'permission';
