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
    AUTOCLICKING,
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
pub struct AutoClickConfig {
    pub interval_ms: u64,
    pub button: MouseBtn,
    pub until_stopped: bool,
    pub repeat_count: u32,
}

impl AutoClickConfig {
    pub fn validate(&self) -> Result<(), String> {
        if !(10..=60_000).contains(&self.interval_ms) {
            return Err("Chu kỳ nhấp phải từ 10 đến 60000 ms.".into());
        }
        if !matches!(self.button, MouseBtn::Left | MouseBtn::Right) {
            return Err("Auto Click chỉ hỗ trợ chuột trái hoặc phải.".into());
        }
        if !self.until_stopped && !(1..=999_999).contains(&self.repeat_count) {
            return Err("Số lần nhấp phải từ 1 đến 999999.".into());
        }
        Ok(())
    }
}

impl Default for AutoClickConfig {
    fn default() -> Self {
        Self {
            interval_ms: 100,
            button: MouseBtn::Left,
            until_stopped: true,
            repeat_count: 100,
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
    #[serde(default = "default_autoclick_interval_ms")]
    pub autoclick_interval_ms: u64,
    #[serde(default = "default_autoclick_button")]
    pub autoclick_button: MouseBtn,
    #[serde(default = "default_autoclick_until_stopped")]
    pub autoclick_until_stopped: bool,
    #[serde(default = "default_autoclick_repeat_count")]
    pub autoclick_repeat_count: u32,
}

fn default_theme() -> String {
    "system".to_string()
}

fn default_language() -> String {
    "vi".to_string()
}

fn default_autoclick_interval_ms() -> u64 {
    100
}

fn default_autoclick_button() -> MouseBtn {
    MouseBtn::Left
}

fn default_autoclick_until_stopped() -> bool {
    true
}

fn default_autoclick_repeat_count() -> u32 {
    100
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
            autoclick_interval_ms: 100,
            autoclick_button: MouseBtn::Left,
            autoclick_until_stopped: true,
            autoclick_repeat_count: 100,
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
pub struct AutoClickProgressPayload {
    pub current_clicks: u32,
    pub total_clicks: u32,
    pub pct: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyStoppedPayload {
    pub reason: String,
    pub timestamp: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn autoclick_rejects_overflow_and_invalid_inputs_before_start() {
        let mut cfg = AutoClickConfig::default();
        assert!(cfg.validate().is_ok());
        cfg.interval_ms = u64::MAX;
        assert!(cfg.validate().is_err());
        cfg.interval_ms = 9;
        assert!(cfg.validate().is_err());
        cfg.interval_ms = 10;
        cfg.button = MouseBtn::X1;
        assert!(cfg.validate().is_err());
        cfg.button = MouseBtn::Right;
        cfg.until_stopped = false;
        cfg.repeat_count = 0;
        assert!(cfg.validate().is_err());
        cfg.repeat_count = 999_999;
        assert!(cfg.validate().is_ok());
    }

    #[test]
    fn test_settings_state_backward_compatibility() {
        // Cấu hình JSON từ phiên bản cũ v1.0.3 không có trường autoclick
        let old_json = r#"{
            "play_speed": 2.0,
            "continuous": true,
            "repeat_count": 5,
            "always_on_top": true,
            "theme": "dark",
            "language": "en"
        }"#;

        let parsed: SettingsState = serde_json::from_str(old_json).expect("Must parse legacy JSON");
        assert_eq!(parsed.play_speed, 2.0);
        assert_eq!(parsed.continuous, true);
        assert_eq!(parsed.repeat_count, 5);
        assert_eq!(parsed.autoclick_interval_ms, 100);
        assert_eq!(parsed.autoclick_button, MouseBtn::Left);
        assert_eq!(parsed.autoclick_until_stopped, true);
        assert_eq!(parsed.autoclick_repeat_count, 100);
    }

    #[test]
    fn test_settings_state_full_roundtrip() {
        let mut settings = SettingsState::default();
        settings.autoclick_interval_ms = 50;
        settings.autoclick_button = MouseBtn::Right;
        settings.autoclick_until_stopped = false;
        settings.autoclick_repeat_count = 250;

        let json = serde_json::to_string(&settings).expect("Must serialize");
        let restored: SettingsState = serde_json::from_str(&json).expect("Must deserialize");
        assert_eq!(restored.autoclick_interval_ms, 50);
        assert_eq!(restored.autoclick_button, MouseBtn::Right);
        assert_eq!(restored.autoclick_until_stopped, false);
        assert_eq!(restored.autoclick_repeat_count, 250);
    }
}
