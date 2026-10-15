// Định nghĩa Type-Safe Schema cho VXClick theo API & Feature Flow Spec

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum SystemState {
    UNINITIALIZED,
    IDLE_EMPTY,
    PERMISSION_BLOCKED,
    RECORDING,
    IDLE_READY,
    PLAYING,
    EMERGENCY_STOPPED,
}

impl Default for SystemState {
    fn default() -> Self {
        SystemState::IDLE_EMPTY
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MouseBtn {
    Left,
    Right,
    Middle,
    X1,
    X2,
}

pub const MOD_SHIFT: u8 = 1 << 0;
pub const MOD_CTRL: u8 = 1 << 1;
pub const MOD_ALT: u8 = 1 << 2;
pub const MOD_CMD: u8 = 1 << 3;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum MacroAction {
    MouseDown { button: MouseBtn, x: i32, y: i32 },
    MouseUp { button: MouseBtn, x: i32, y: i32 },
    MouseMove { x: i32, y: i32 },
    MouseScroll { delta_x: i32, delta_y: i32 },
    KeyDown { key_code: u16, modifiers: u8 },
    KeyUp { key_code: u16, modifiers: u8 },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MacroEvent {
    pub timestamp_us: u64,
    pub action: MacroAction,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScreenTopology {
    pub virtual_width: i32,
    pub virtual_height: i32,
    pub scale_factor: f32,
}

impl Default for ScreenTopology {
    fn default() -> Self {
        Self {
            virtual_width: 1920,
            virtual_height: 1080,
            scale_factor: 2.0,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MacroTimeline {
    pub version: u32,
    pub created_at: String,
    pub duration_us: u64,
    pub event_count: usize,
    pub screen_topology: ScreenTopology,
    pub events: Vec<MacroEvent>,
}

impl Default for MacroTimeline {
    fn default() -> Self {
        Self {
            version: 1,
            created_at: String::new(),
            duration_us: 0,
            event_count: 0,
            screen_topology: ScreenTopology::default(),
            events: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MacroStats {
    pub total_events: usize,
    pub clicks_count: usize,
    pub keys_count: usize,
    pub duration_formatted: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlaybackConfig {
    pub speed: f32,
    pub continuous: bool,
    pub repeat_count: u32,
}

impl Default for PlaybackConfig {
    fn default() -> Self {
        Self {
            speed: 1.0,
            continuous: false,
            repeat_count: 1,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SettingsState {
    pub play_speed: f32,
    pub continuous: bool,
    pub repeat_count: u32,
    pub always_on_top: bool,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_language")]
    pub language: String,
}

fn default_theme() -> String {
    "system".to_string()
}

fn default_language() -> String {
    "vi".to_string()
}

impl Default for SettingsState {
    fn default() -> Self {
        Self {
            play_speed: 1.0,
            continuous: false,
            repeat_count: 1,
            always_on_top: true,
            theme: "system".to_string(),
            language: "vi".to_string(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct PermissionStatus {
    pub is_trusted: bool,
    pub input_monitoring: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateChangedPayload {
    pub state: SystemState,
    pub session_id: u64,
    pub revision: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingProgressPayload {
    pub count: usize,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackProgressPayload {
    #[serde(rename = "loop")]
    pub loop_index: u32,
    pub total: u32,
    pub pct: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyStoppedPayload {
    pub reason: String,
    pub timestamp: u64,
}
