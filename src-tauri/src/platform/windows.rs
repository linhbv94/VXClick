// Nền tảng Windows — Dummy Engine (Sẵn sàng cho việc cài đặt và nâng cấp native hooks sau)
// Cung cấp các kiểu và hàm tương thích để Windows có thể build, đóng gói .exe installer và chạy UI mượt mà

use crate::ledger::ActiveInputLedger;
use crate::types::{MacroAction, MacroEvent, ScreenTopology};

/// Kiểm tra quyền trên Windows (Dummy: luôn trả về true để UI không bị khóa bởi PermissionModal)
pub fn check_accessibility_permission() -> bool {
    true
}

/// Mở cài đặt quyền (No-op trên Windows)
pub fn request_accessibility_permission() {}

/// Lấy thông số topology màn hình giả lập trên Windows
pub fn get_screen_topology() -> ScreenTopology {
    ScreenTopology {
        virtual_width: 1920,
        virtual_height: 1080,
        scale_factor: 1.0,
    }
}

/// Các sự kiện kích hoạt phím tắt toàn cục
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GlobalHotkeyTrigger {
    ToggleRecord,
    TogglePlayback,
    EmergencyStop,
}

/// Bộ thu thập sự kiện Windows (Dummy)
pub struct WindowsEventCapture {
    _dummy: (),
}

impl WindowsEventCapture {
    pub fn start() -> Result<Self, String> {
        Ok(Self { _dummy: () })
    }

    pub fn stop(self) -> Vec<MacroEvent> {
        // Dummy: Trả về danh sách rỗng vì chưa gắn hook tầng thấp trên Windows
        Vec::new()
    }
}

/// Bộ phát sự kiện Windows (Dummy)
pub struct WindowsEventInjector {
    _dummy: (),
}

impl WindowsEventInjector {
    pub fn new() -> Self {
        Self { _dummy: () }
    }

    pub fn inject_action(
        &self,
        _action: &MacroAction,
        _ledger: &mut ActiveInputLedger,
        _last_pos: &mut (i32, i32),
    ) {
        // Dummy: No-op trên Windows
    }

    pub fn flush_hardware_state(&self, _ledger: &mut ActiveInputLedger, _last_pos: (i32, i32)) {
        // Dummy: No-op trên Windows
    }
}

/// Bộ giám sát phím tắt toàn cục Windows (Dummy)
pub struct WindowsGlobalHotkeyMonitor {
    _dummy: (),
}

impl WindowsGlobalHotkeyMonitor {
    pub fn start<F: Fn(GlobalHotkeyTrigger) + Send + 'static>(_callback: F) -> Result<Self, String> {
        // Dummy: Chưa kích hoạt hook toàn cục trên Windows
        Ok(Self { _dummy: () })
    }
}

// Type aliases để engine/mod.rs sử dụng thống nhất giữa macOS và Windows
pub type EventCapture = WindowsEventCapture;
pub type EventInjector = WindowsEventInjector;
pub type GlobalHotkeyMonitor = WindowsGlobalHotkeyMonitor;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_windows_dummy_engine_lifecycle() {
        assert!(check_accessibility_permission());
        let topology = get_screen_topology();
        assert_eq!(topology.virtual_width, 1920);
        assert_eq!(topology.virtual_height, 1080);

        let capture = WindowsEventCapture::start().unwrap();
        let events = capture.stop();
        assert!(events.is_empty());

        let injector = WindowsEventInjector::new();
        let mut ledger = ActiveInputLedger::new();
        let mut last_pos = (0, 0);
        let action = MacroAction::MouseMove { x: 100, y: 100 };
        injector.inject_action(&action, &mut ledger, &mut last_pos);
        injector.flush_hardware_state(&mut ledger, last_pos);

        let monitor = WindowsGlobalHotkeyMonitor::start(|_trig| {}).unwrap();
        drop(monitor);
    }
}
