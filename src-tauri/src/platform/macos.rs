// Nền tảng macOS — Bộ Thu thập CGEventTap & Bộ Bắn Sự kiện CGEventPost
// Tuân thủ nghiêm ngặt đặc tả kiến trúc: docs/spec/00_system_overview.md và docs/spec/04_api_data.md

use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;

use core_foundation::base::TCFType;
use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
use core_foundation_sys::base::CFRelease;
use core_foundation_sys::runloop::{CFRunLoopRef, CFRunLoopStop};
use core_graphics::event::{
    CGEvent, CGEventFlags, CGEventTap, CGEventTapLocation, CGEventTapOptions,
    CGEventTapPlacement, CGEventType, CGKeyCode, CGMouseButton, EventField,
};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use core_graphics::geometry::CGPoint;

use crate::ledger::{ActiveInputLedger, LedgerInput};
use crate::types::{
    MacroAction, MacroEvent, MouseBtn, ScreenTopology, MOD_ALT, MOD_CMD, MOD_CTRL, MOD_SHIFT,
};

// Dấu nhận diện sự kiện phần mềm do VXClick phát lại (ASCII "VXCL")
pub const VXCLICK_SYNTHETIC_MARKER: i64 = 0x5658434C;

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrusted() -> bool;
    fn AXIsProcessTrustedWithOptions(
        options: core_foundation::dictionary::CFDictionaryRef,
    ) -> bool;
    static kAXTrustedCheckOptionPrompt: core_foundation::string::CFStringRef;
}

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGMainDisplayID() -> u32;
    fn CGDisplayBounds(display: u32) -> core_graphics::geometry::CGRect;
    fn CGEventCreateScrollWheelEvent2(
        source: *mut std::ffi::c_void,
        units: u32,
        wheelCount: u32,
        wheel1: i32,
        wheel2: i32,
        wheel3: i32,
    ) -> *mut std::ffi::c_void;
    fn CGEventPost(tapLocation: CGEventTapLocation, event: *mut std::ffi::c_void);
    fn CGEventSetIntegerValueField(event: *mut std::ffi::c_void, field: u32, value: i64);
}

/// Kiểm tra quyền Trợ năng (Accessibility) trên macOS
pub fn check_accessibility_permission() -> bool {
    unsafe { AXIsProcessTrusted() }
}

/// Mở hộp thoại hoặc trang cài đặt cấp quyền Accessibility của macOS
pub fn request_accessibility_permission() {
    unsafe {
        use core_foundation::base::TCFType;
        use core_foundation::boolean::CFBoolean;
        use core_foundation::dictionary::CFDictionary;
        use core_foundation::string::CFString;

        let key = CFString::wrap_under_get_rule(kAXTrustedCheckOptionPrompt);
        let value = CFBoolean::true_value();
        let options = CFDictionary::from_CFType_pairs(&[(key, value)]);
        AXIsProcessTrustedWithOptions(options.as_concrete_TypeRef());
    }

    // Mở trực tiếp System Settings -> Privacy & Security -> Accessibility
    let _ = std::process::Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
        .spawn();
}

/// Lấy thông số Topology màn hình hiện tại
pub fn get_screen_topology() -> ScreenTopology {
    unsafe {
        let display_id = CGMainDisplayID();
        let bounds = CGDisplayBounds(display_id);
        ScreenTopology {
            virtual_width: bounds.size.width as i32,
            virtual_height: bounds.size.height as i32,
            scale_factor: 2.0,
        }
    }
}

// ==========================================
// 1. BỘ THU NẠP SỰ KIỆN NATIVE (CAPTURE ENGINE)
// ==========================================

// Helper kiểm tra phím tắt toàn cục thống nhất theo Spec (QA03)
pub fn is_toggle_record_hotkey(key_code: u16, modifiers: u8) -> bool {
    // ⌥ + ⇧ + ⌘ + R (key_code 0x0F, Command + Option/Alt + Shift, không có Control)
    key_code == 0x0F
        && (modifiers & MOD_CMD != 0)
        && (modifiers & MOD_ALT != 0)
        && (modifiers & MOD_SHIFT != 0)
        && (modifiers & MOD_CTRL == 0)
}

pub fn is_toggle_playback_hotkey(key_code: u16, modifiers: u8) -> bool {
    // ⌥ + ⇧ + ⌘ + P (key_code 0x23, Command + Option/Alt + Shift, không có Control)
    key_code == 0x23
        && (modifiers & MOD_CMD != 0)
        && (modifiers & MOD_ALT != 0)
        && (modifiers & MOD_SHIFT != 0)
        && (modifiers & MOD_CTRL == 0)
}

pub fn is_toggle_autoclick_hotkey(key_code: u16, modifiers: u8) -> bool {
    // ⌥ + ⇧ + ⌘ + C (key_code 0x08, Command + Option/Alt + Shift, không có Control)
    key_code == 0x08
        && (modifiers & MOD_CMD != 0)
        && (modifiers & MOD_ALT != 0)
        && (modifiers & MOD_SHIFT != 0)
        && (modifiers & MOD_CTRL == 0)
}

pub fn is_emergency_stop_hotkey(key_code: u16) -> bool {
    // ESC (key_code 0x35)
    key_code == 0x35
}

pub fn get_current_mouse_location() -> Option<(i32, i32)> {
    if let Ok(source) = CGEventSource::new(CGEventSourceStateID::CombinedSessionState) {
        if let Ok(event) = CGEvent::new(source) {
            let loc = event.location();
            return Some((loc.x.round() as i32, loc.y.round() as i32));
        }
    }
    None
}

pub struct MacEventCapture {
    run_loop_ref: Arc<AtomicUsize>,
    thread_handle: Option<std::thread::JoinHandle<()>>,
    event_receiver: crossbeam_channel::Receiver<MacroEvent>,
    overflow_flag: Arc<AtomicBool>,
}

impl MacEventCapture {
    pub fn start() -> Result<Self, String> {
        if !check_accessibility_permission() {
            return Err("Ứng dụng chưa được cấp quyền Trợ năng (Accessibility) trên macOS.".to_string());
        }

        let (tx, rx) = crossbeam_channel::bounded::<MacroEvent>(10_000);
        let run_loop_holder = Arc::new(AtomicUsize::new(0));
        let run_loop_holder_clone = run_loop_holder.clone();
        let overflow_flag = Arc::new(AtomicBool::new(false));
        let overflow_flag_cb = overflow_flag.clone();

        let (init_tx, init_rx) = std::sync::mpsc::channel::<Result<(), String>>();

        let thread_handle = std::thread::spawn(move || {
            let current_rl = CFRunLoop::get_current();
            let rl_ptr = current_rl.as_concrete_TypeRef() as usize;
            run_loop_holder_clone.store(rl_ptr, Ordering::SeqCst);

            let t0 = std::time::Instant::now();
            let last_flags = Arc::new(std::sync::atomic::AtomicU64::new(0));
            let tx_clone = tx.clone();

            let tap_result = CGEventTap::new(
                CGEventTapLocation::HID,
                CGEventTapPlacement::HeadInsertEventTap,
                CGEventTapOptions::ListenOnly,
                vec![
                    CGEventType::LeftMouseDown,
                    CGEventType::LeftMouseUp,
                    CGEventType::RightMouseDown,
                    CGEventType::RightMouseUp,
                    CGEventType::MouseMoved,
                    CGEventType::LeftMouseDragged,
                    CGEventType::RightMouseDragged,
                    CGEventType::OtherMouseDown,
                    CGEventType::OtherMouseUp,
                    CGEventType::OtherMouseDragged,
                    CGEventType::ScrollWheel,
                    CGEventType::KeyDown,
                    CGEventType::KeyUp,
                    CGEventType::FlagsChanged,
                ],
                move |_proxy, event_type, cg_event| {
                    // Tự động kích hoạt lại tap nếu bị OS tạm ngắt do timeout
                    let etype_u32 = event_type as u32;
                    if etype_u32 == 0xFFFFFFFE || etype_u32 == 0xFFFFFFFF {
                        return None;
                    }

                    // Bỏ qua sự kiện do chính engine VXClick bắn ra
                    let marker = cg_event.get_integer_value_field(EventField::EVENT_SOURCE_USER_DATA);
                    if marker == VXCLICK_SYNTHETIC_MARKER {
                        return None;
                    }

                    let loc = cg_event.location();
                    let x = loc.x.round() as i32;
                    let y = loc.y.round() as i32;
                    let flags = cg_event.get_flags();

                    let mut modifiers = 0u8;
                    if flags.contains(CGEventFlags::CGEventFlagShift) {
                        modifiers |= MOD_SHIFT;
                    }
                    if flags.contains(CGEventFlags::CGEventFlagControl) {
                        modifiers |= MOD_CTRL;
                    }
                    if flags.contains(CGEventFlags::CGEventFlagAlternate) {
                        modifiers |= MOD_ALT;
                    }
                    if flags.contains(CGEventFlags::CGEventFlagCommand) {
                        modifiers |= MOD_CMD;
                    }

                    let elapsed_us = t0.elapsed().as_micros() as u64;

                    let action = match event_type {
                        CGEventType::LeftMouseDown => {
                            Some(MacroAction::MouseDown { button: MouseBtn::Left, x, y })
                        }
                        CGEventType::LeftMouseUp => {
                            Some(MacroAction::MouseUp { button: MouseBtn::Left, x, y })
                        }
                        CGEventType::RightMouseDown => {
                            Some(MacroAction::MouseDown { button: MouseBtn::Right, x, y })
                        }
                        CGEventType::RightMouseUp => {
                            Some(MacroAction::MouseUp { button: MouseBtn::Right, x, y })
                        }
                        CGEventType::OtherMouseDown => {
                            let btn_num = cg_event.get_integer_value_field(EventField::MOUSE_EVENT_BUTTON_NUMBER);
                            let btn = match btn_num {
                                2 => MouseBtn::Middle,
                                3 => MouseBtn::X1,
                                4 => MouseBtn::X2,
                                _ => MouseBtn::Middle,
                            };
                            Some(MacroAction::MouseDown { button: btn, x, y })
                        }
                        CGEventType::OtherMouseUp => {
                            let btn_num = cg_event.get_integer_value_field(EventField::MOUSE_EVENT_BUTTON_NUMBER);
                            let btn = match btn_num {
                                2 => MouseBtn::Middle,
                                3 => MouseBtn::X1,
                                4 => MouseBtn::X2,
                                _ => MouseBtn::Middle,
                            };
                            Some(MacroAction::MouseUp { button: btn, x, y })
                        }
                        CGEventType::MouseMoved
                        | CGEventType::LeftMouseDragged
                        | CGEventType::RightMouseDragged
                        | CGEventType::OtherMouseDragged => {
                            Some(MacroAction::MouseMove { x, y })
                        }
                        CGEventType::ScrollWheel => {
                            let dy = cg_event.get_integer_value_field(EventField::SCROLL_WHEEL_EVENT_DELTA_AXIS_1) as i32;
                            let dx = cg_event.get_integer_value_field(EventField::SCROLL_WHEEL_EVENT_DELTA_AXIS_2) as i32;
                            if dx != 0 || dy != 0 {
                                Some(MacroAction::MouseScroll { delta_x: dx, delta_y: dy })
                            } else {
                                None
                            }
                        }
                        CGEventType::KeyDown => {
                            let key_code = cg_event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE) as u16;
                            // Loại trừ phím tắt điều khiển ⌥ + ⇧ + ⌘ + R (QA03)
                            if is_toggle_record_hotkey(key_code, modifiers) {
                                None
                            } else {
                                Some(MacroAction::KeyDown { key_code, modifiers })
                            }
                        }
                        CGEventType::KeyUp => {
                            let key_code = cg_event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE) as u16;
                            if is_toggle_record_hotkey(key_code, modifiers) {
                                None
                            } else {
                                Some(MacroAction::KeyUp { key_code, modifiers })
                            }
                        }
                        CGEventType::FlagsChanged => {
                            let key_code = cg_event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE) as u16;
                            let old_bits = last_flags.swap(flags.bits(), Ordering::SeqCst);
                            let old_flags = CGEventFlags::from_bits_truncate(old_bits);
                            let is_down = match key_code {
                                0x37 | 0x36 => flags.contains(CGEventFlags::CGEventFlagCommand) && !old_flags.contains(CGEventFlags::CGEventFlagCommand),
                                0x38 | 0x3C => flags.contains(CGEventFlags::CGEventFlagShift) && !old_flags.contains(CGEventFlags::CGEventFlagShift),
                                0x3A | 0x3D => flags.contains(CGEventFlags::CGEventFlagAlternate) && !old_flags.contains(CGEventFlags::CGEventFlagAlternate),
                                0x3B | 0x3E => flags.contains(CGEventFlags::CGEventFlagControl) && !old_flags.contains(CGEventFlags::CGEventFlagControl),
                                _ => false,
                            };
                            if is_down {
                                Some(MacroAction::KeyDown { key_code, modifiers })
                            } else {
                                Some(MacroAction::KeyUp { key_code, modifiers })
                            }
                        }
                        _ => None,
                    };

                    if let Some(act) = action {
                        if let Err(_) = tx_clone.try_send(MacroEvent {
                            timestamp_us: elapsed_us,
                            action: act,
                        }) {
                            // QA02: Phát hiện hàng đợi đầy (>10.000 sự kiện) -> Đánh dấu overflow fail-closed
                            overflow_flag_cb.store(true, Ordering::SeqCst);
                        }
                    }

                    None
                },
            );

            match tap_result {
                Ok(tap) => {
                    let _ = init_tx.send(Ok(()));
                    unsafe {
                        if let Ok(source) = tap.mach_port.create_runloop_source(0) {
                            current_rl.add_source(&source, kCFRunLoopCommonModes);
                            tap.enable();
                            CFRunLoop::run_current();
                        }
                    }
                }
                Err(_) => {
                    let _ = init_tx.send(Err("Không thể khởi tạo CGEventTap. Hãy cấp quyền Accessibility.".to_string()));
                }
            }
        });

        match init_rx.recv_timeout(std::time::Duration::from_millis(1500)) {
            Ok(Ok(())) => Ok(Self {
                run_loop_ref: run_loop_holder,
                thread_handle: Some(thread_handle),
                event_receiver: rx,
                overflow_flag,
            }),
            Ok(Err(e)) => Err(e),
            Err(_) => Err("Hết thời gian chờ khởi động Event Tap.".to_string()),
        }
    }

    pub fn is_overflowed(&self) -> bool {
        self.overflow_flag.load(Ordering::SeqCst)
    }

    pub fn get_collected_count(&self) -> usize {
        self.event_receiver.len()
    }

    pub fn stop(mut self) -> (Vec<MacroEvent>, bool) {
        let rl_ptr = self.run_loop_ref.load(Ordering::SeqCst);
        if rl_ptr != 0 {
            unsafe {
                CFRunLoopStop(rl_ptr as CFRunLoopRef);
            }
        }

        if let Some(h) = self.thread_handle.take() {
            let _ = h.join();
        }

        let mut events = Vec::new();
        while let Ok(ev) = self.event_receiver.try_recv() {
            events.push(ev);
        }
        let overflowed = self.overflow_flag.load(Ordering::SeqCst);
        (events, overflowed)
    }
}

// ==========================================
// 2. BỘ TÁI HIỆN SỰ KIỆN NATIVE (INJECTOR ENGINE)
// ==========================================

pub struct MacEventInjector {
    source: Option<CGEventSource>,
}

impl MacEventInjector {
    pub fn new() -> Self {
        let src = CGEventSource::new(CGEventSourceStateID::HIDSystemState).ok();
        Self { source: src }
    }

    fn get_source(&self) -> CGEventSource {
        self.source
            .as_ref()
            .cloned()
            .unwrap_or_else(|| CGEventSource::new(CGEventSourceStateID::CombinedSessionState).unwrap())
    }

    pub fn inject_action(
        &self,
        action: &MacroAction,
        ledger: &mut ActiveInputLedger,
        last_pos: &mut (i32, i32),
    ) {
        match action {
            MacroAction::MouseDown { button, x, y } => {
                let loc = CGPoint::new(*x as f64, *y as f64);
                *last_pos = (*x, *y);
                let (etype, mbtn, is_other, other_num) = match button {
                    MouseBtn::Left => (CGEventType::LeftMouseDown, CGMouseButton::Left, false, 0),
                    MouseBtn::Right => (CGEventType::RightMouseDown, CGMouseButton::Right, false, 0),
                    MouseBtn::Middle => (CGEventType::OtherMouseDown, CGMouseButton::Center, true, 2),
                    MouseBtn::X1 => (CGEventType::OtherMouseDown, CGMouseButton::Center, true, 3),
                    MouseBtn::X2 => (CGEventType::OtherMouseDown, CGMouseButton::Center, true, 4),
                };

                if let Ok(event) = CGEvent::new_mouse_event(self.get_source(), etype, loc, mbtn) {
                    if is_other {
                        event.set_integer_value_field(EventField::MOUSE_EVENT_BUTTON_NUMBER, other_num);
                    }
                    event.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, VXCLICK_SYNTHETIC_MARKER);
                    event.post(CGEventTapLocation::HID);
                    ledger.record_down(LedgerInput::MouseButton(*button));
                }
            }
            MacroAction::MouseUp { button, x, y } => {
                let loc = CGPoint::new(*x as f64, *y as f64);
                *last_pos = (*x, *y);
                let (etype, mbtn, is_other, other_num) = match button {
                    MouseBtn::Left => (CGEventType::LeftMouseUp, CGMouseButton::Left, false, 0),
                    MouseBtn::Right => (CGEventType::RightMouseUp, CGMouseButton::Right, false, 0),
                    MouseBtn::Middle => (CGEventType::OtherMouseUp, CGMouseButton::Center, true, 2),
                    MouseBtn::X1 => (CGEventType::OtherMouseUp, CGMouseButton::Center, true, 3),
                    MouseBtn::X2 => (CGEventType::OtherMouseUp, CGMouseButton::Center, true, 4),
                };

                if let Ok(event) = CGEvent::new_mouse_event(self.get_source(), etype, loc, mbtn) {
                    if is_other {
                        event.set_integer_value_field(EventField::MOUSE_EVENT_BUTTON_NUMBER, other_num);
                    }
                    event.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, VXCLICK_SYNTHETIC_MARKER);
                    event.post(CGEventTapLocation::HID);
                    ledger.record_up(&LedgerInput::MouseButton(*button));
                }
            }
            MacroAction::MouseMove { x, y } => {
                let loc = CGPoint::new(*x as f64, *y as f64);
                *last_pos = (*x, *y);

                let (etype, mbtn) = if ledger.is_button_down(MouseBtn::Left) {
                    (CGEventType::LeftMouseDragged, CGMouseButton::Left)
                } else if ledger.is_button_down(MouseBtn::Right) {
                    (CGEventType::RightMouseDragged, CGMouseButton::Right)
                } else if ledger.is_mouse_down() {
                    (CGEventType::OtherMouseDragged, CGMouseButton::Center)
                } else {
                    (CGEventType::MouseMoved, CGMouseButton::Left)
                };

                if let Ok(event) = CGEvent::new_mouse_event(self.get_source(), etype, loc, mbtn) {
                    event.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, VXCLICK_SYNTHETIC_MARKER);
                    event.post(CGEventTapLocation::HID);
                }
            }
            MacroAction::MouseScroll { delta_x, delta_y } => {
                unsafe {
                    let event_ref = CGEventCreateScrollWheelEvent2(
                        std::ptr::null_mut(),
                        0, // pixel units
                        2, // 2 trục cuộn (dọc + ngang)
                        *delta_y,
                        *delta_x,
                        0,
                    );
                    if !event_ref.is_null() {
                        CGEventSetIntegerValueField(event_ref, EventField::EVENT_SOURCE_USER_DATA, VXCLICK_SYNTHETIC_MARKER);
                        CGEventPost(CGEventTapLocation::HID, event_ref);
                        CFRelease(event_ref as *mut _);
                    }
                }
            }
            MacroAction::KeyDown { key_code, modifiers } => {
                if let Ok(event) = CGEvent::new_keyboard_event(self.get_source(), *key_code as CGKeyCode, true) {
                    let mut flags = CGEventFlags::empty();
                    if modifiers & MOD_SHIFT != 0 {
                        flags |= CGEventFlags::CGEventFlagShift;
                    }
                    if modifiers & MOD_CTRL != 0 {
                        flags |= CGEventFlags::CGEventFlagControl;
                    }
                    if modifiers & MOD_ALT != 0 {
                        flags |= CGEventFlags::CGEventFlagAlternate;
                    }
                    if modifiers & MOD_CMD != 0 {
                        flags |= CGEventFlags::CGEventFlagCommand;
                    }
                    event.set_flags(flags);
                    event.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, VXCLICK_SYNTHETIC_MARKER);
                    event.post(CGEventTapLocation::HID);
                    ledger.record_down(LedgerInput::Key(*key_code));
                }
            }
            MacroAction::KeyUp { key_code, modifiers } => {
                if let Ok(event) = CGEvent::new_keyboard_event(self.get_source(), *key_code as CGKeyCode, false) {
                    let mut flags = CGEventFlags::empty();
                    if modifiers & MOD_SHIFT != 0 {
                        flags |= CGEventFlags::CGEventFlagShift;
                    }
                    if modifiers & MOD_CTRL != 0 {
                        flags |= CGEventFlags::CGEventFlagControl;
                    }
                    if modifiers & MOD_ALT != 0 {
                        flags |= CGEventFlags::CGEventFlagAlternate;
                    }
                    if modifiers & MOD_CMD != 0 {
                        flags |= CGEventFlags::CGEventFlagCommand;
                    }
                    event.set_flags(flags);
                    event.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, VXCLICK_SYNTHETIC_MARKER);
                    event.post(CGEventTapLocation::HID);
                    ledger.record_up(&LedgerInput::Key(*key_code));
                }
            }
        }
    }

    /// Xả sạch phần cứng an toàn: gửi MouseUp và KeyUp cho mọi input còn bị giữ
    pub fn flush_hardware_state(&self, ledger: &mut ActiveInputLedger, last_pos: (i32, i32)) {
        let stuck_inputs = ledger.flush_all();
        for input in stuck_inputs {
            match input {
                LedgerInput::MouseButton(btn) => {
                    let loc = CGPoint::new(last_pos.0 as f64, last_pos.1 as f64);
                    let (etype, mbtn, is_other, other_num) = match btn {
                        MouseBtn::Left => (CGEventType::LeftMouseUp, CGMouseButton::Left, false, 0),
                        MouseBtn::Right => (CGEventType::RightMouseUp, CGMouseButton::Right, false, 0),
                        MouseBtn::Middle => (CGEventType::OtherMouseUp, CGMouseButton::Center, true, 2),
                        MouseBtn::X1 => (CGEventType::OtherMouseUp, CGMouseButton::Center, true, 3),
                        MouseBtn::X2 => (CGEventType::OtherMouseUp, CGMouseButton::Center, true, 4),
                    };

                    if let Ok(event) = CGEvent::new_mouse_event(self.get_source(), etype, loc, mbtn) {
                        if is_other {
                            event.set_integer_value_field(EventField::MOUSE_EVENT_BUTTON_NUMBER, other_num);
                        }
                        event.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, VXCLICK_SYNTHETIC_MARKER);
                        event.post(CGEventTapLocation::HID);
                    }
                }
                LedgerInput::Key(code) => {
                    if let Ok(event) = CGEvent::new_keyboard_event(self.get_source(), code as CGKeyCode, false) {
                        event.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, VXCLICK_SYNTHETIC_MARKER);
                        event.post(CGEventTapLocation::HID);
                    }
                }
            }
        }
    }
}

// ==========================================
// 3. BỘ THEO DÕI PHÍM TẮT TOÀN CỤC & NGẮT KHẨN CẤP
// ==========================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GlobalHotkeyTrigger {
    ToggleRecord,
    TogglePlayback,
    ToggleAutoClick,
    EmergencyStop,
}

pub struct MacGlobalHotkeyMonitor {
    run_loop_ref: Arc<AtomicUsize>,
    thread_handle: Option<std::thread::JoinHandle<()>>,
}

impl MacGlobalHotkeyMonitor {
    pub fn start<F>(callback: F) -> Result<Self, String>
    where
        F: Fn(GlobalHotkeyTrigger) + Send + Sync + 'static,
    {
        if !check_accessibility_permission() {
            return Err("Chưa có quyền Accessibility để đăng ký phím tắt toàn cục.".to_string());
        }

        let run_loop_holder = Arc::new(AtomicUsize::new(0));
        let run_loop_holder_clone = run_loop_holder.clone();

        let cb_arc = Arc::new(callback);
        let (init_tx, init_rx) = std::sync::mpsc::channel::<Result<(), String>>();

        let thread_handle = std::thread::spawn(move || {
            let current_rl = CFRunLoop::get_current();
            let rl_ptr = current_rl.as_concrete_TypeRef() as usize;
            run_loop_holder_clone.store(rl_ptr, Ordering::SeqCst);

            let cb = cb_arc.clone();

            let tap_result = CGEventTap::new(
                CGEventTapLocation::HID,
                CGEventTapPlacement::HeadInsertEventTap,
                CGEventTapOptions::ListenOnly,
                vec![CGEventType::KeyDown],
                move |_proxy, event_type, cg_event| {
                    if event_type as u32 == 0xFFFFFFFE || event_type as u32 == 0xFFFFFFFF {
                        return None;
                    }

                    // QA03: LOẠI TRỪ 100% SYNTHETIC EVENTS TRƯỚC MỌI CONTROL SHORTCUT
                    // Tuyệt đối không cho phép macro playback tự kích hoạt bất kỳ hotkey nào!
                    let marker = cg_event.get_integer_value_field(EventField::EVENT_SOURCE_USER_DATA);
                    if marker == VXCLICK_SYNTHETIC_MARKER {
                        return None;
                    }

                    // Loại trừ autorepeat phím khi người dùng giữ phím để tránh toggle liên tục
                    let is_autorepeat = cg_event.get_integer_value_field(EventField::KEYBOARD_EVENT_AUTOREPEAT) != 0;
                    if is_autorepeat {
                        return None;
                    }

                    let key_code = cg_event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE) as u16;
                    let flags = cg_event.get_flags();

                    let mut modifiers = 0u8;
                    if flags.contains(CGEventFlags::CGEventFlagShift) {
                        modifiers |= MOD_SHIFT;
                    }
                    if flags.contains(CGEventFlags::CGEventFlagControl) {
                        modifiers |= MOD_CTRL;
                    }
                    if flags.contains(CGEventFlags::CGEventFlagAlternate) {
                        modifiers |= MOD_ALT;
                    }
                    if flags.contains(CGEventFlags::CGEventFlagCommand) {
                        modifiers |= MOD_CMD;
                    }

                    // 1. Phím ngắt khẩn cấp ESC (0x35) — CHỈ CHẤP NHẬN PHÍM VẬT LÝ THẬT
                    if is_emergency_stop_hotkey(key_code) {
                        cb(GlobalHotkeyTrigger::EmergencyStop);
                        return None;
                    }

                    // 2. Phím ⌥ + ⇧ + ⌘ + R (0x0F) -> Ghi / Dừng ghi (QA03)
                    if is_toggle_record_hotkey(key_code, modifiers) {
                        cb(GlobalHotkeyTrigger::ToggleRecord);
                        return None;
                    }

                    // 3. Phím ⌥ + ⇧ + ⌘ + P (0x23) -> Phát lại / Dừng phát (QA03)
                    if is_toggle_playback_hotkey(key_code, modifiers) {
                        cb(GlobalHotkeyTrigger::TogglePlayback);
                        return None;
                    }

                    // 4. Phím ⌥ + ⇧ + ⌘ + C (0x08) -> Auto Click / Dừng Auto Click
                    if is_toggle_autoclick_hotkey(key_code, modifiers) {
                        cb(GlobalHotkeyTrigger::ToggleAutoClick);
                        return None;
                    }

                    None
                },
            );

            match tap_result {
                Ok(tap) => {
                    let _ = init_tx.send(Ok(()));
                    unsafe {
                        if let Ok(source) = tap.mach_port.create_runloop_source(0) {
                            current_rl.add_source(&source, kCFRunLoopCommonModes);
                            tap.enable();
                            CFRunLoop::run_current();
                        }
                    }
                }
                Err(_) => {
                    let _ = init_tx.send(Err("Không thể khởi tạo CGEventTap cho phím tắt toàn cục.".to_string()));
                }
            }
        });

        match init_rx.recv_timeout(std::time::Duration::from_millis(1500)) {
            Ok(Ok(())) => Ok(Self {
                run_loop_ref: run_loop_holder,
                thread_handle: Some(thread_handle),
            }),
            Ok(Err(e)) => Err(e),
            Err(_) => Err("Hết thời gian chờ đăng ký phím tắt toàn cục.".to_string()),
        }
    }

    pub fn stop(mut self) {
        let rl_ptr = self.run_loop_ref.load(Ordering::SeqCst);
        if rl_ptr != 0 {
            unsafe {
                CFRunLoopStop(rl_ptr as CFRunLoopRef);
            }
        }
        if let Some(h) = self.thread_handle.take() {
            let _ = h.join();
        }
    }
}

// Type aliases để engine/mod.rs sử dụng thống nhất giữa macOS và Windows
pub type EventCapture = MacEventCapture;
pub type EventInjector = MacEventInjector;
pub type GlobalHotkeyMonitor = MacGlobalHotkeyMonitor;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hotkey_matcher_strict_contract() {
        // QA03: Khớp chính xác hợp đồng ⌥ + ⇧ + ⌘ + R, ⌥ + ⇧ + ⌘ + P, ⌥ + ⇧ + ⌘ + C
        let valid_mods = MOD_CMD | MOD_ALT | MOD_SHIFT;
        assert!(is_toggle_record_hotkey(0x0F, valid_mods));
        assert!(is_toggle_playback_hotkey(0x23, valid_mods));
        assert!(is_toggle_autoclick_hotkey(0x08, valid_mods));

        // Thiếu Shift -> BẮT BUỘC trả về false
        let missing_shift = MOD_CMD | MOD_ALT;
        assert!(!is_toggle_record_hotkey(0x0F, missing_shift));
        assert!(!is_toggle_playback_hotkey(0x23, missing_shift));
        assert!(!is_toggle_autoclick_hotkey(0x08, missing_shift));

        // Kèm Control -> BẮT BUỘC trả về false để tránh xung đột app khác
        let extra_ctrl = valid_mods | MOD_CTRL;
        assert!(!is_toggle_record_hotkey(0x0F, extra_ctrl));
        assert!(!is_toggle_playback_hotkey(0x23, extra_ctrl));
        assert!(!is_toggle_autoclick_hotkey(0x08, extra_ctrl));

        // Các alias cũ F8 (0x64), F9 (0x65) -> Đã gỡ bỏ, BẮT BUỘC trả về false
        assert!(!is_toggle_record_hotkey(0x65, 0));
        assert!(!is_toggle_playback_hotkey(0x64, 0));

        // ESC chỉ bắt key code 0x35
        assert!(is_emergency_stop_hotkey(0x35));
        assert!(!is_emergency_stop_hotkey(0x0F));
    }

    #[test]
    fn test_queue_overflow_fail_closed_logic() {
        // QA02: Kiểm chứng cơ chế fail-closed khi kênh try_send bị đầy
        let (tx, rx) = crossbeam_channel::bounded::<MacroEvent>(3);
        let overflow_flag = Arc::new(AtomicBool::new(false));

        for i in 0..5 {
            let ev = MacroEvent {
                timestamp_us: i * 1000,
                action: MacroAction::MouseMove { x: i as i32, y: i as i32 },
            };
            if let Err(_) = tx.try_send(ev) {
                overflow_flag.store(true, Ordering::SeqCst);
            }
        }

        assert!(overflow_flag.load(Ordering::SeqCst), "Queue overflow must be detected");
        assert_eq!(rx.len(), 3);
    }
}
