// Bộ Điều Phối Động Cơ Macro (Macro Engine Coordinator) & FSM State Machine
// Quản lý toàn bộ vòng đời: Quyền -> Ghi -> Nén -> Lưu RAM -> Phát lại -> Ngắt khẩn cấp

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Condvar, Mutex, RwLock};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, Manager};

use crate::compressor::{compress_macro_events, WindowRect};
use crate::ledger::ActiveInputLedger;
use crate::platform::{
    check_accessibility_permission, get_current_mouse_location, get_screen_topology,
    request_accessibility_permission, EventCapture, EventInjector, GlobalHotkeyMonitor,
    GlobalHotkeyTrigger,
};
use crate::types::{
    AutoClickConfig, AutoClickProgressPayload, EmergencyStoppedPayload, MacroAction, MacroStats,
    MacroTimeline, PermissionStatus, PlaybackConfig, PlaybackProgressPayload,
    RecordingProgressPayload, SettingsState, StateChangedPayload, SystemState,
};

fn autoclick_start_allowed(state: SystemState) -> bool {
    matches!(state, SystemState::IDLE_EMPTY | SystemState::IDLE_READY)
}

pub struct EngineState {
    pub current_state: SystemState,
    pub session_id: u64,
    pub revision: u64,
    pub timeline: Option<MacroTimeline>,
    pub stats: Option<MacroStats>,
    pub settings: SettingsState,
    pub capture_session: Option<EventCapture>,
    pub capture_stop_flag: Arc<AtomicBool>,
    pub playback_abort_pair: Arc<(Mutex<bool>, Condvar)>,
    pub playback_worker: Option<std::thread::JoinHandle<()>>,
    pub is_shutting_down: Arc<AtomicBool>,
    pub app_handle: Option<AppHandle>,
    pub settings_path: Option<PathBuf>,
}

#[derive(Clone)]
pub struct MacroEngine {
    inner: Arc<RwLock<EngineState>>,
    _hotkey_monitor: Arc<Mutex<Option<GlobalHotkeyMonitor>>>,
}

impl MacroEngine {
    pub fn new() -> Self {
        let is_trusted = check_accessibility_permission();
        let initial_state = if is_trusted {
            SystemState::IDLE_EMPTY
        } else {
            SystemState::PERMISSION_BLOCKED
        };

        let engine = Self {
            inner: Arc::new(RwLock::new(EngineState {
                current_state: initial_state,
                session_id: 0,
                revision: 0,
                timeline: None,
                stats: None,
                settings: SettingsState::default(),
                capture_session: None,
                capture_stop_flag: Arc::new(AtomicBool::new(false)),
                playback_abort_pair: Arc::new((Mutex::new(false), Condvar::new())),
                playback_worker: None,
                is_shutting_down: Arc::new(AtomicBool::new(false)),
                app_handle: None,
                settings_path: None,
            })),
            _hotkey_monitor: Arc::new(Mutex::new(None)),
        };

        engine
    }

    pub fn set_app_handle(&self, handle: AppHandle) {
        let mut state = self.inner.write().unwrap();
        state.app_handle = Some(handle.clone());

        // Đường dẫn lưu settings.json
        if let Ok(app_dir) = handle.path().app_config_dir() {
            let _ = fs::create_dir_all(&app_dir);
            let path = app_dir.join("settings.json");
            state.settings_path = Some(path.clone());
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(loaded) = serde_json::from_str::<SettingsState>(&content) {
                    state.settings = loaded;
                }
            }
        }

        drop(state);

        // Khởi động Global Hotkeys Monitor nếu đã đủ quyền
        self.init_global_hotkeys();

        // Khởi động luồng giám sát quyền Accessibility tự động
        self.init_permission_watcher();
    }

    fn init_permission_watcher(&self) {
        let engine_clone = self.clone();
        std::thread::spawn(move || {
            loop {
                std::thread::sleep(Duration::from_millis(800));
                let is_trusted = check_accessibility_permission();
                let current_state = engine_clone.get_state();

                if current_state == SystemState::PERMISSION_BLOCKED && is_trusted {
                    let mut state = engine_clone.inner.write().unwrap();
                    state.current_state = if state.timeline.is_some() {
                        SystemState::IDLE_READY
                    } else {
                        SystemState::IDLE_EMPTY
                    };
                    engine_clone.emit_state_changed(&mut state);
                    drop(state);
                    engine_clone.init_global_hotkeys();
                } else if (current_state == SystemState::PLAYING || current_state == SystemState::AUTOCLICKING) && !is_trusted {
                    // QA05: Bị thu hồi quyền trong lúc Playback hoặc Auto Click -> Kích hoạt ngắt khẩn cấp và xả input
                    engine_clone.trigger_emergency_stop("permission_revoked");
                    let mut state = engine_clone.inner.write().unwrap();
                    state.current_state = SystemState::PERMISSION_BLOCKED;
                    engine_clone.emit_state_changed(&mut state);
                } else if current_state == SystemState::RECORDING && !is_trusted {
                    // QA05: Bị thu hồi quyền trong lúc Recording -> Dừng capture an toàn
                    let _ = engine_clone.stop_recording();
                    let mut state = engine_clone.inner.write().unwrap();
                    state.current_state = SystemState::PERMISSION_BLOCKED;
                    engine_clone.emit_state_changed(&mut state);
                } else if (current_state == SystemState::IDLE_EMPTY || current_state == SystemState::IDLE_READY) && !is_trusted {
                    let mut state = engine_clone.inner.write().unwrap();
                    state.current_state = SystemState::PERMISSION_BLOCKED;
                    engine_clone.emit_state_changed(&mut state);
                }
            }
        });
    }

    fn init_global_hotkeys(&self) {
        let mut guard = self._hotkey_monitor.lock().unwrap();
        if guard.is_some() {
            return;
        }

        let engine_clone = self.clone();
        if let Ok(monitor) = GlobalHotkeyMonitor::start(move |trigger| {
            match trigger {
                GlobalHotkeyTrigger::ToggleRecord => {
                    let current = engine_clone.get_state();
                    if current == SystemState::IDLE_EMPTY || current == SystemState::IDLE_READY {
                        let _ = engine_clone.start_recording();
                    } else if current == SystemState::RECORDING {
                        let _ = engine_clone.stop_recording();
                    }
                }
                GlobalHotkeyTrigger::TogglePlayback => {
                    let current = engine_clone.get_state();
                    if current == SystemState::IDLE_READY {
                        let settings = engine_clone.get_settings();
                        let config = PlaybackConfig {
                            speed: settings.play_speed,
                            continuous: settings.continuous,
                            repeat_count: settings.repeat_count,
                        };
                        let _ = engine_clone.start_playback(config);
                    } else if current == SystemState::PLAYING {
                        let _ = engine_clone.stop_playback();
                    }
                }
                GlobalHotkeyTrigger::ToggleAutoClick => {
                    let current = engine_clone.get_state();
                    if current == SystemState::IDLE_EMPTY || current == SystemState::IDLE_READY {
                        let settings = engine_clone.get_settings();
                        let config = AutoClickConfig {
                            interval_ms: settings.autoclick_interval_ms,
                            button: settings.autoclick_button,
                            until_stopped: settings.autoclick_until_stopped,
                            repeat_count: settings.autoclick_repeat_count,
                        };
                        let _ = engine_clone.start_autoclick(Some(config));
                    } else if current == SystemState::AUTOCLICKING {
                        let _ = engine_clone.stop_autoclick();
                    }
                }
                GlobalHotkeyTrigger::EmergencyStop => {
                    engine_clone.trigger_emergency_stop("esc");
                }
            }
        }) {
            *guard = Some(monitor);
        }
    }

    pub fn get_state(&self) -> SystemState {
        self.inner.read().unwrap().current_state
    }

    fn emit_state_changed(&self, state: &mut EngineState) {
        state.revision += 1;
        let payload = StateChangedPayload {
            state: state.current_state,
            session_id: state.session_id,
            revision: state.revision,
        };
        if let Some(app) = &state.app_handle {
            let _ = app.emit("macro://state_changed", &payload);
        }
    }

    pub fn get_system_permissions(&self) -> PermissionStatus {
        let is_trusted = check_accessibility_permission();
        let current = self.get_state();
        if current == SystemState::PERMISSION_BLOCKED && is_trusted {
            let mut state = self.inner.write().unwrap();
            state.current_state = if state.timeline.is_some() {
                SystemState::IDLE_READY
            } else {
                SystemState::IDLE_EMPTY
            };
            self.emit_state_changed(&mut state);
            drop(state);
            self.init_global_hotkeys();
        } else if (current == SystemState::IDLE_EMPTY || current == SystemState::IDLE_READY) && !is_trusted {
            let mut state = self.inner.write().unwrap();
            state.current_state = SystemState::PERMISSION_BLOCKED;
            self.emit_state_changed(&mut state);
        }

        PermissionStatus {
            is_trusted,
            input_monitoring: is_trusted,
        }
    }

    pub fn request_system_permissions(&self) {
        request_accessibility_permission();
    }

    pub fn get_settings(&self) -> SettingsState {
        self.inner.read().unwrap().settings.clone()
    }

    pub fn set_settings(&self, new_settings: SettingsState) -> Result<(), String> {
        let mut state = self.inner.write().unwrap();
        state.settings = new_settings.clone();
        if let Some(path) = &state.settings_path {
            if let Ok(json) = serde_json::to_string_pretty(&new_settings) {
                let _ = fs::write(path, json);
            }
        }
        Ok(())
    }

    pub fn get_stats(&self) -> Option<MacroStats> {
        self.inner.read().unwrap().stats.clone()
    }

    // ==========================================
    // 1. LUỒNG BẮT ĐẦU / DỪNG GHI (RECORDING)
    // ==========================================

    pub fn start_recording(&self) -> Result<u64, String> {
        if cfg!(target_os = "windows") {
            return Err("Windows hiện chỉ có giao diện và cập nhật; engine chưa khả dụng.".into());
        }
        let mut state = self.inner.write().unwrap();

        if state.is_shutting_down.load(Ordering::SeqCst) {
            return Err("Ứng dụng đang trong tiến trình đóng.".to_string());
        }

        if !check_accessibility_permission() {
            state.current_state = SystemState::PERMISSION_BLOCKED;
            self.emit_state_changed(&mut state);
            return Err("Cần cấp quyền Trợ năng (Accessibility) để ghi thao tác.".to_string());
        }

        if state.current_state == SystemState::PLAYING || state.current_state == SystemState::AUTOCLICKING {
            return Err("Không thể bắt đầu ghi khi đang phát lại macro hoặc auto click.".to_string());
        }

        // Khởi tạo capture session native
        let capture = EventCapture::start().map_err(|e| e.to_string())?;

        let session_id = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        state.session_id = session_id;
        state.current_state = SystemState::RECORDING;
        state.capture_session = Some(capture);
        state.capture_stop_flag = Arc::new(AtomicBool::new(false));

        self.emit_state_changed(&mut state);

        // Bắt đầu luồng ticker phát tiến trình recording_event (mỗi 200ms)
        let app_handle_opt = state.app_handle.clone();
        let stop_flag = state.capture_stop_flag.clone();
        let t0 = Instant::now();

        std::thread::spawn(move || {
            while !stop_flag.load(Ordering::Relaxed) {
                std::thread::sleep(Duration::from_millis(200));
                if stop_flag.load(Ordering::Relaxed) {
                    break;
                }
                if let Some(app) = &app_handle_opt {
                    let elapsed_ms = t0.elapsed().as_millis() as u64;
                    let _ = app.emit(
                        "macro://recording_event",
                        RecordingProgressPayload {
                            count: 0, // Frontend tự đếm hoặc cập nhật
                            elapsed_ms,
                        },
                    );
                }
            }
        });

        Ok(session_id)
    }

    pub fn stop_recording(&self) -> Result<MacroStats, String> {
        let mut state = self.inner.write().unwrap();

        if state.current_state != SystemState::RECORDING {
            if let Some(stats) = &state.stats {
                return Ok(stats.clone());
            }
            return Err("Không có phiên ghi nào đang chạy.".to_string());
        }

        // Dừng luồng ticker
        state.capture_stop_flag.store(true, Ordering::Relaxed);

        // Lấy tọa độ cửa sổ VXClick để lọc Self-Exclusion
        let window_bounds = state.app_handle.as_ref().and_then(|app| {
            app.get_webview_window("main").and_then(|win| {
                let pos = win.outer_position().ok()?;
                let size = win.outer_size().ok()?;
                let scale = win.scale_factor().unwrap_or(2.0);
                let min_x = pos.x as f64 / scale;
                let min_y = pos.y as f64 / scale;
                let max_x = min_x + size.width as f64 / scale;
                let max_y = min_y + size.height as f64 / scale;
                Some(WindowRect { min_x, min_y, max_x, max_y })
            })
        });

        let (raw_events, overflowed) = if let Some(capture) = state.capture_session.take() {
            capture.stop()
        } else {
            (Vec::new(), false)
        };

        // QA02 (P1): Cơ chế overflow fail-closed: nếu hàng đợi bị đầy (>10.000 sự kiện),
        // lập tức hủy bản ghi không trọn vẹn để bảo vệ an toàn phần cứng người dùng
        if overflowed {
            state.current_state = SystemState::IDLE_EMPTY;
            state.timeline = None;
            state.stats = None;
            self.emit_state_changed(&mut state);

            if let Some(app) = &state.app_handle {
                let _ = app.emit(
                    "macro://overflow_error",
                    serde_json::json!({
                        "message": "Bộ nhớ đệm ghi sự kiện bị đầy (>10.000 sự kiện). Bản ghi không đầy đủ và đã bị hủy an toàn."
                    }),
                );
            }
            return Err("Bộ nhớ đệm ghi sự kiện bị đầy (>10.000 sự kiện). Bản ghi không đầy đủ và đã bị hủy an toàn.".to_string());
        }

        // Nén thích ứng và tự loại trừ click vào thanh VXClick
        let compressed = compress_macro_events(&raw_events, window_bounds);

        if compressed.is_empty() {
            state.current_state = SystemState::IDLE_EMPTY;
            state.timeline = None;
            state.stats = None;
            self.emit_state_changed(&mut state);
            return Err("Không có thao tác hợp lệ nào được ghi.".to_string());
        }

        let duration_us = compressed.last().map(|e| e.timestamp_us).unwrap_or(0);
        let clicks_count = compressed
            .iter()
            .filter(|e| matches!(e.action, MacroAction::MouseDown { .. }))
            .count();
        let keys_count = compressed
            .iter()
            .filter(|e| matches!(e.action, MacroAction::KeyDown { .. }))
            .count();

        let total_secs = (duration_us / 1_000_000).max(1);
        let mins = total_secs / 60;
        let secs = total_secs % 60;
        let duration_formatted = format!("{:02}:{:02}", mins, secs);

        let stats = MacroStats {
            total_events: compressed.len(),
            clicks_count,
            keys_count,
            duration_formatted,
        };

        let topology = get_screen_topology();
        let timeline = MacroTimeline {
            version: 1,
            created_at: chrono::Utc::now().to_rfc3339(),
            duration_us,
            event_count: compressed.len(),
            screen_topology: topology,
            events: compressed,
        };

        state.timeline = Some(timeline);
        state.stats = Some(stats.clone());
        state.current_state = SystemState::IDLE_READY;

        self.emit_state_changed(&mut state);

        Ok(stats)
    }

    // ==========================================
    // 2. LUỒNG PHÁT LẠI (PLAYBACK) & CANCELLABLE TIMER
    // ==========================================

    pub fn start_playback(&self, config: PlaybackConfig) -> Result<u64, String> {
        if cfg!(target_os = "windows") {
            return Err("Windows hiện chỉ có giao diện và cập nhật; engine chưa khả dụng.".into());
        }
        let old_worker = {
            let mut state = self.inner.write().unwrap();
            if state.is_shutting_down.load(Ordering::SeqCst) {
                return Err("Ứng dụng đang trong tiến trình đóng.".to_string());
            }
            if state.current_state != SystemState::IDLE_READY {
                if state.current_state == SystemState::AUTOCLICKING {
                    return Err("Không thể phát lại khi đang auto click.".to_string());
                }
                return Err("Chưa có kịch bản macro sẵn sàng trong RAM.".to_string());
            }
            state.playback_worker.take()
        };

        // Dọn dẹp worker cũ ngoài RwLock để tránh deadlock với on_playback_ended
        if let Some(w) = old_worker {
            let _ = w.join();
        }

        let mut state = self.inner.write().unwrap();

        if state.is_shutting_down.load(Ordering::SeqCst) {
            return Err("Ứng dụng đang trong tiến trình đóng.".to_string());
        }

        if state.current_state != SystemState::IDLE_READY {
            return Err("Chưa có kịch bản macro sẵn sàng trong RAM.".to_string());
        }

        let timeline = match &state.timeline {
            Some(t) if !t.events.is_empty() => t.clone(),
            _ => return Err("Kịch bản macro rỗng.".to_string()),
        };

        let session_id = state.session_id;
        state.current_state = SystemState::PLAYING;

        // Reset cờ ngắt
        let abort_pair = Arc::new((Mutex::new(false), Condvar::new()));
        state.playback_abort_pair = abort_pair.clone();

        self.emit_state_changed(&mut state);

        let app_handle_opt = state.app_handle.clone();
        let engine_clone = self.clone();

        let speed = config.speed.max(0.1);
        let total_loops = if config.continuous {
            0
        } else {
            config.repeat_count.max(1)
        };

        let worker_handle = std::thread::spawn(move || {
            let injector = EventInjector::new();
            let mut ledger = ActiveInputLedger::new();
            let mut last_pos = (0, 0);

            let (lock, cvar) = &*abort_pair;
            let mut current_loop = 1;
            let mut was_aborted = false;

            'outer_loop: loop {
                if total_loops > 0 && current_loop > total_loops {
                    break 'outer_loop;
                }

                let loop_t0 = Instant::now();
                let loop_duration_us = (timeline.duration_us as f64 / speed as f64) as u64;

                for event in &timeline.events {
                    // Kiểm tra cờ dừng khẩn cấp
                    if *lock.lock().unwrap() {
                        was_aborted = true;
                        break 'outer_loop;
                    }

                    let target_us = (event.timestamp_us as f64 / speed as f64) as u64;
                    let target_instant = loop_t0 + Duration::from_micros(target_us);

                    // Bộ định thời lai: Condvar wait khi cách xa + Spin-wait 300 micro-giây cuối
                    while Instant::now() < target_instant {
                        if *lock.lock().unwrap() {
                            was_aborted = true;
                            break 'outer_loop;
                        }

                        let remaining = target_instant.saturating_duration_since(Instant::now());
                        if remaining > Duration::from_millis(3) {
                            let sleep_slice = remaining - Duration::from_millis(1);
                            let guard = lock.lock().unwrap();
                            let _ = cvar.wait_timeout(guard, sleep_slice);
                        } else if remaining > Duration::from_micros(300) {
                            std::thread::yield_now();
                        } else {
                            std::hint::spin_loop();
                        }
                    }

                    // Tái hiện sự kiện
                    injector.inject_action(&event.action, &mut ledger, &mut last_pos);

                    // Bắn tiến trình playback (throttled)
                    if let Some(app) = &app_handle_opt {
                        let elapsed_us = loop_t0.elapsed().as_micros() as u64;
                        let pct = if loop_duration_us > 0 {
                            ((elapsed_us as f32 / loop_duration_us as f32) * 100.0).clamp(0.0, 100.0)
                        } else {
                            100.0
                        };

                        let _ = app.emit(
                            "macro://playback_progress",
                            PlaybackProgressPayload {
                                loop_index: current_loop,
                                total: total_loops,
                                pct,
                            },
                        );
                    }
                }

                current_loop += 1;
            }

            // Xả sạch phần cứng an toàn
            injector.flush_hardware_state(&mut ledger, last_pos);

            // Xóa tiến trình về 0
            if let Some(app) = &app_handle_opt {
                let _ = app.emit(
                    "macro://playback_progress",
                    PlaybackProgressPayload {
                        loop_index: 0,
                        total: 0,
                        pct: 0.0,
                    },
                );
            }

            engine_clone.on_playback_ended(was_aborted);
        });

        state.playback_worker = Some(worker_handle);

        Ok(session_id)
    }

    pub fn stop_playback(&self) -> Result<(), String> {
        let state = self.inner.read().unwrap();
        if state.current_state == SystemState::PLAYING {
            let (lock, cvar) = &*state.playback_abort_pair;
            *lock.lock().unwrap() = true;
            cvar.notify_all();
        }
        Ok(())
    }

    // ==========================================
    // 3. LUỒNG AUTO CLICK (TỰ ĐỘNG NHẤP CHUỘT)
    // ==========================================

    pub fn start_autoclick(&self, config_opt: Option<AutoClickConfig>) -> Result<u64, String> {
        if cfg!(target_os = "windows") {
            return Err("Windows hiện chỉ có giao diện và cập nhật; engine chưa khả dụng.".into());
        }
        let old_worker = {
            let mut state = self.inner.write().unwrap();
            if state.is_shutting_down.load(Ordering::SeqCst) {
                return Err("Ứng dụng đang trong tiến trình đóng.".to_string());
            }
            if !autoclick_start_allowed(state.current_state) {
                return Err(format!("Không thể bắt đầu Auto Click ở trạng thái {:?}", state.current_state));
            }
            if !check_accessibility_permission() {
                state.current_state = SystemState::PERMISSION_BLOCKED;
                self.emit_state_changed(&mut state);
                return Err("Cần cấp quyền Trợ năng (Accessibility) để tự động nhấp chuột.".to_string());
            }
            state.playback_worker.take()
        };

        if let Some(w) = old_worker {
            let _ = w.join();
        }

        let mut state = self.inner.write().unwrap();
        if state.is_shutting_down.load(Ordering::SeqCst) {
            return Err("Ứng dụng đang trong tiến trình đóng.".to_string());
        }

        if !autoclick_start_allowed(state.current_state) {
            return Err(format!("Không thể bắt đầu Auto Click ở trạng thái {:?}", state.current_state));
        }

        if !check_accessibility_permission() {
            state.current_state = SystemState::PERMISSION_BLOCKED;
            self.emit_state_changed(&mut state);
            return Err("Cần cấp quyền Trợ năng (Accessibility) để tự động nhấp chuột.".to_string());
        }

        let config = config_opt.unwrap_or_else(|| AutoClickConfig {
            interval_ms: state.settings.autoclick_interval_ms,
            button: state.settings.autoclick_button,
            until_stopped: state.settings.autoclick_until_stopped,
            repeat_count: state.settings.autoclick_repeat_count,
        });

        let session_id = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        config.validate()?;
        let session_id = session_id.max(state.session_id.saturating_add(1));
        state.session_id = session_id;
        state.current_state = SystemState::AUTOCLICKING;

        let abort_pair = Arc::new((Mutex::new(false), Condvar::new()));
        state.playback_abort_pair = abort_pair.clone();

        self.emit_state_changed(&mut state);

        let app_handle_opt = state.app_handle.clone();
        let engine_clone = self.clone();

        let interval_ms = config.interval_ms.max(10);
        let target_button = config.button;
        let until_stopped = config.until_stopped;
        let total_clicks = if until_stopped { 0 } else { config.repeat_count.max(1) };

        let worker_handle = std::thread::spawn(move || {
            let injector = EventInjector::new();
            let mut ledger = ActiveInputLedger::new();
            let mut last_pos = (0, 0);

            let (lock, cvar) = &*abort_pair;
            let mut current_click = 0u32;
            let mut was_aborted = false;
            let mut last_progress_emit = Instant::now();

            'click_loop: loop {
                // 1. Kiểm tra cờ abort trước khi thực hiện nhấp
                {
                    let guard = match lock.lock() {
                        Ok(g) => g,
                        Err(e) => e.into_inner(),
                    };
                    if *guard {
                        was_aborted = true;
                        break 'click_loop;
                    }
                }

                if !until_stopped && current_click >= total_clicks {
                    break 'click_loop;
                }

                // 2. Lấy tọa độ con trỏ chuột thời gian thực từ OS
                let (cur_x, cur_y) = match get_current_mouse_location() {
                    Some(loc) => loc,
                    None => {
                        // Nếu không đọc được vị trí (ví dụ trên Windows dummy hoặc khi màn hình khóa),
                        // chờ ngắn có thể hủy được rồi thử lại, tuyệt đối KHÔNG click bừa vào (0, 0)
                        let mut guard = match lock.lock() {
                            Ok(g) => g,
                            Err(e) => e.into_inner(),
                        };
                        if *guard {
                            was_aborted = true;
                            break 'click_loop;
                        }
                        let wait_dur = Duration::from_millis(50);
                        let deadline = Instant::now() + wait_dur;
                        while !*guard {
                            let now = Instant::now();
                            if now >= deadline {
                                break;
                            }
                            let rem = deadline - now;
                            match cvar.wait_timeout(guard, rem) {
                                Ok((g, _)) => guard = g,
                                Err(e) => guard = e.into_inner().0,
                            }
                        }
                        if *guard {
                            was_aborted = true;
                            break 'click_loop;
                        }
                        continue 'click_loop;
                    }
                };

                // 3. MouseDown
                injector.inject_action(
                    &MacroAction::MouseDown {
                        button: target_button,
                        x: cur_x,
                        y: cur_y,
                    },
                    &mut ledger,
                    &mut last_pos,
                );

                // 4. Giữ chuột 10ms có thể hủy tức thì bằng Condvar (thay vì thread::sleep không thể hủy)
                let mut hold_guard = match lock.lock() {
                    Ok(g) => g,
                    Err(e) => e.into_inner(),
                };
                if !*hold_guard {
                    let hold_deadline = Instant::now() + Duration::from_millis(10);
                    while !*hold_guard {
                        let now = Instant::now();
                        if now >= hold_deadline {
                            break;
                        }
                        let rem = hold_deadline - now;
                        match cvar.wait_timeout(hold_guard, rem) {
                            Ok((g, _)) => hold_guard = g,
                            Err(e) => hold_guard = e.into_inner().0,
                        }
                    }
                }

                // 5. LUÔN LUÔN inject MouseUp tại cùng tọa độ để giải phóng chuột an toàn
                injector.inject_action(
                    &MacroAction::MouseUp {
                        button: target_button,
                        x: cur_x,
                        y: cur_y,
                    },
                    &mut ledger,
                    &mut last_pos,
                );

                if *hold_guard {
                    was_aborted = true;
                    break 'click_loop;
                }
                drop(hold_guard);

                current_click += 1;

                // 6. Tiết lưu (Throttled 100ms) khi phát sự kiện tiến độ để bảo vệ luồng IPC
                let is_last_click = !until_stopped && current_click >= total_clicks;
                if last_progress_emit.elapsed() >= Duration::from_millis(100) || is_last_click {
                    last_progress_emit = Instant::now();
                    if let Some(app) = &app_handle_opt {
                        let pct = if total_clicks > 0 {
                            ((current_click as f32 / total_clicks as f32) * 100.0).clamp(0.0, 100.0)
                        } else {
                            0.0
                        };
                        let _ = app.emit(
                            "macro://autoclick_progress",
                            AutoClickProgressPayload {
                                current_clicks: current_click,
                                total_clicks,
                                pct,
                            },
                        );
                    }
                }

                if is_last_click {
                    break 'click_loop;
                }

                // 7. Chờ hết chu kỳ interval còn lại với vòng lặp predicate bảo đảm không bao giờ miss notification
                let mut guard = match lock.lock() {
                    Ok(g) => g,
                    Err(e) => e.into_inner(),
                };
                if *guard {
                    was_aborted = true;
                    break 'click_loop;
                }

                let sleep_duration = Duration::from_millis(interval_ms.saturating_sub(10).max(1));
                let deadline = Instant::now() + sleep_duration;
                while !*guard {
                    let now = Instant::now();
                    if now >= deadline {
                        break;
                    }
                    let rem = deadline - now;
                    match cvar.wait_timeout(guard, rem) {
                        Ok((g, _)) => guard = g,
                        Err(e) => guard = e.into_inner().0,
                    }
                }
                if *guard {
                    was_aborted = true;
                    break 'click_loop;
                }
            }

            // Xả toàn bộ trạng thái phần cứng dở dang
            injector.flush_hardware_state(&mut ledger, last_pos);

            // Bắn tiến độ cuối cùng bảo toàn số current_clicks thật (không xóa về 0)
            if let Some(app) = &app_handle_opt {
                let pct = if total_clicks > 0 {
                    ((current_click as f32 / total_clicks as f32) * 100.0).clamp(0.0, 100.0)
                } else {
                    0.0
                };
                let _ = app.emit(
                    "macro://autoclick_progress",
                    AutoClickProgressPayload {
                        current_clicks: current_click,
                        total_clicks,
                        pct,
                    },
                );
            }

            engine_clone.on_autoclick_ended(session_id, was_aborted);
        });

        state.playback_worker = Some(worker_handle);

        Ok(session_id)
    }

    pub fn stop_autoclick(&self) -> Result<(), String> {
        let state = self.inner.read().unwrap();
        if state.current_state == SystemState::AUTOCLICKING {
            let (lock, cvar) = &*state.playback_abort_pair;
            *lock.lock().unwrap() = true;
            cvar.notify_all();
        }
        Ok(())
    }

    fn on_autoclick_ended(&self, session_id: u64, was_aborted: bool) {
        let mut state = self.inner.write().unwrap();
        if state.session_id == session_id && state.current_state == SystemState::AUTOCLICKING {
            state.current_state = if state.timeline.is_some() {
                SystemState::IDLE_READY
            } else {
                SystemState::IDLE_EMPTY
            };
            self.emit_state_changed(&mut state);
        }
        let _ = was_aborted;
    }

    pub fn trigger_emergency_stop(&self, reason: &str) {
        let mut state = self.inner.write().unwrap();
        if state.current_state == SystemState::PLAYING || state.current_state == SystemState::AUTOCLICKING {
            let (lock, cvar) = &*state.playback_abort_pair;
            *lock.lock().unwrap() = true;
            cvar.notify_all();

            state.current_state = SystemState::EMERGENCY_STOPPED;
            self.emit_state_changed(&mut state);

            if let Some(app) = &state.app_handle {
                let _ = app.emit(
                    "macro://emergency_stopped",
                    EmergencyStoppedPayload {
                        reason: reason.to_string(),
                        timestamp: chrono::Utc::now().timestamp_millis() as u64,
                    },
                );
            }

            // Tự động khôi phục về IDLE_READY sau 500ms
            let inner_clone = self.inner.clone();
            let app_handle_opt = state.app_handle.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(500));
                let mut guard = inner_clone.write().unwrap();
                if guard.current_state == SystemState::EMERGENCY_STOPPED {
                    guard.current_state = if guard.timeline.is_some() {
                        SystemState::IDLE_READY
                    } else {
                        SystemState::IDLE_EMPTY
                    };
                    guard.revision += 1;
                    let payload = StateChangedPayload {
                        state: guard.current_state,
                        session_id: guard.session_id,
                        revision: guard.revision,
                    };
                    if let Some(app) = &app_handle_opt {
                        let _ = app.emit("macro://state_changed", &payload);
                    }
                }
            });
        }
    }

    fn on_playback_ended(&self, was_aborted: bool) {
        let mut state = self.inner.write().unwrap();
        if state.current_state == SystemState::PLAYING {
            state.current_state = SystemState::IDLE_READY;
            self.emit_state_changed(&mut state);
        } else if state.current_state == SystemState::EMERGENCY_STOPPED {
            // Giữ trạng thái EMERGENCY_STOPPED cho timer khôi phục
        }
        let _ = was_aborted;
    }

    /// QA04: Cơ chế đóng / restart an toàn: Abort worker, chờ join và xả sạch hardware ledger
    pub fn shutdown(&self) {
        let worker_handle = {
            let mut state = self.inner.write().unwrap();
            state.is_shutting_down.store(true, Ordering::SeqCst);

            // Dừng capture session nếu đang ghi
            if let Some(capture) = state.capture_session.take() {
                let _ = capture.stop();
            }

            // Kích hoạt cờ ngắt playback nếu đang phát lại
            let (lock, cvar) = &*state.playback_abort_pair;
            *lock.lock().unwrap() = true;
            cvar.notify_all();

            state.playback_worker.take()
        };

        // Chờ playback worker kết thúc và xả hardware state (không giữ RwLock để tránh deadlock)
        if let Some(h) = worker_handle {
            let _ = h.join();
        }

        // Dừng global hotkey monitor
        if let Some(monitor) = self._hotkey_monitor.lock().unwrap().take() {
            monitor.stop();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn autoclick_waits_for_emergency_recovery_and_rejects_busy_states() {
        assert!(autoclick_start_allowed(SystemState::IDLE_EMPTY));
        assert!(autoclick_start_allowed(SystemState::IDLE_READY));
        for state in [SystemState::RECORDING, SystemState::PLAYING,
                      SystemState::AUTOCLICKING, SystemState::PERMISSION_BLOCKED,
                      SystemState::EMERGENCY_STOPPED] {
            assert!(!autoclick_start_allowed(state));
        }
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn dummy_backend_rejects_actions_without_changing_state() {
        let engine = MacroEngine::new();
        let initial = engine.get_state();
        assert!(engine.start_recording().is_err());
        assert!(engine.start_playback(PlaybackConfig {speed:1.0,continuous:false,repeat_count:1}).is_err());
        assert!(engine.start_autoclick(Some(AutoClickConfig::default())).is_err());
        assert_eq!(engine.get_state(), initial);
    }

    #[test]
    fn test_autoclick_ended_preserves_ready_state_when_timeline_exists() {
        let engine = MacroEngine::new();
        let session_id = 12345;
        {
            let mut state = engine.inner.write().unwrap();
            state.session_id = session_id;
            state.current_state = SystemState::AUTOCLICKING;
            state.timeline = Some(MacroTimeline {
                version: 1,
                created_at: "2026-10-27T00:00:00Z".to_string(),
                duration_us: 1000,
                event_count: 2,
                screen_topology: crate::types::ScreenTopology {
                    virtual_width: 1920,
                    virtual_height: 1080,
                    scale_factor: 2.0,
                },
                events: vec![],
            });
        }

        engine.on_autoclick_ended(session_id, false);

        let state = engine.inner.read().unwrap();
        assert_eq!(state.current_state, SystemState::IDLE_READY);
    }

    #[test]
    fn test_autoclick_ended_recovers_empty_state_when_no_timeline() {
        let engine = MacroEngine::new();
        let session_id = 99999;
        {
            let mut state = engine.inner.write().unwrap();
            state.session_id = session_id;
            state.current_state = SystemState::AUTOCLICKING;
            state.timeline = None;
        }

        engine.on_autoclick_ended(session_id, false);

        let state = engine.inner.read().unwrap();
        assert_eq!(state.current_state, SystemState::IDLE_EMPTY);
    }

    #[test]
    fn test_autoclick_ended_ignores_stale_session_id() {
        let engine = MacroEngine::new();
        let current_session_id = 55555;
        let stale_session_id = 11111;
        {
            let mut state = engine.inner.write().unwrap();
            state.session_id = current_session_id;
            state.current_state = SystemState::AUTOCLICKING;
        }

        engine.on_autoclick_ended(stale_session_id, false);

        let state = engine.inner.read().unwrap();
        // Không bị đổi trạng thái vì session_id đã lỗi thời
        assert_eq!(state.current_state, SystemState::AUTOCLICKING);
    }
}
