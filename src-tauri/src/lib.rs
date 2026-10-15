// VXClick — Native Tauri Engine Core & macOS Native Integration
// Quản lý IPC Commands, Native EventTap / EventPost, Traffic Lights chuẩn macOS

pub mod compressor;
pub mod engine;
pub mod ledger;
pub mod platform;
pub mod types;

use engine::MacroEngine;
use tauri::Manager;
use types::{MacroStats, PermissionStatus, PlaybackConfig, SettingsState};

pub struct AppState {
    pub engine: MacroEngine,
}

#[tauri::command]
fn start_recording(state: tauri::State<'_, AppState>) -> Result<u64, String> {
    state.engine.start_recording()
}

#[tauri::command]
fn stop_recording(session_id: Option<u64>, state: tauri::State<'_, AppState>) -> Result<MacroStats, String> {
    let _ = session_id;
    state.engine.stop_recording()
}

#[tauri::command]
fn start_playback(config: PlaybackConfig, state: tauri::State<'_, AppState>) -> Result<u64, String> {
    state.engine.start_playback(config)
}

#[tauri::command]
fn stop_playback(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.engine.stop_playback()
}

#[tauri::command]
fn get_macro_stats(state: tauri::State<'_, AppState>) -> Result<Option<MacroStats>, String> {
    Ok(state.engine.get_stats())
}

#[tauri::command]
fn get_settings(state: tauri::State<'_, AppState>) -> Result<SettingsState, String> {
    Ok(state.engine.get_settings())
}

#[tauri::command]
fn set_settings(settings: SettingsState, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.engine.set_settings(settings)
}

#[tauri::command]
fn set_always_on_top(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_system_permissions(state: tauri::State<'_, AppState>) -> Result<PermissionStatus, String> {
    Ok(state.engine.get_system_permissions())
}

#[tauri::command]
fn get_system_state(state: tauri::State<'_, AppState>) -> Result<types::SystemState, String> {
    Ok(state.engine.get_state())
}

#[tauri::command]
fn request_system_permissions(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.engine.request_system_permissions();
    Ok(())
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle, state: tauri::State<'_, AppState>) {
    state.engine.shutdown();
    app.restart();
}

#[cfg(target_os = "macos")]
#[allow(deprecated)]
fn sync_mac_traffic_lights(window: &tauri::WebviewWindow) {
    let win = window.clone();
    let win_closure = win.clone();
    let _ = win.run_on_main_thread(move || {
        #[allow(deprecated)]
        use cocoa::base::{id, nil, BOOL, YES};
        #[allow(deprecated)]
        use cocoa::foundation::{NSPoint, NSRect, NSSize};
        use objc::{msg_send, sel, sel_impl};

        if let Ok(ns_win_ptr) = win_closure.ns_window() {
            let ns_window = ns_win_ptr as id;
            unsafe {
                for (i, btn_id) in [0, 1, 2].iter().enumerate() {
                    let btn: id = msg_send![ns_window, standardWindowButton: *btn_id];
                    if btn != nil {
                        if *btn_id == 2 {
                            // Vô hiệu hóa nút Zoom vì kích thước widget cố định
                            let _: () = msg_send![btn, setEnabled: 0_u8];
                            let _: () = msg_send![btn, setHidden: YES];
                            continue;
                        }
                        let is_hidden: BOOL = msg_send![btn, isHidden];
                        if is_hidden == YES {
                            continue;
                        }
                        let superview: id = msg_send![btn, superview];
                        let super_frame: NSRect = if superview != nil {
                            msg_send![superview, frame]
                        } else {
                            msg_send![ns_window, frame]
                        };
                        let _: () = msg_send![btn, setControlSize: 1_u64];
                        let drawing_bounds: NSRect = msg_send![btn, bounds];
                        let target_x = 10.0 + (i as f64) * 20.0;
                        // Thanh MainBar cao 38px, button cao 12px.
                        // Để nút nằm chính giữa trục dọc của thanh 38px:
                        // Khoảng cách từ đỉnh window tới đỉnh nút = (38.0 - 12.0) / 2.0 = 13.0px.
                        // Tọa độ origin.y trong hệ Cocoa Y (hướng từ dưới lên trên):
                        // super_frame.size.height - 13.0 - 12.0 = super_frame.size.height - 25.0!
                        let target_y = super_frame.size.height - 25.0;
                        let target_frame = NSRect {
                            origin: NSPoint { x: target_x, y: target_y },
                            size: NSSize { width: 12.0, height: 12.0 },
                        };
                        let _: () = msg_send![btn, setFrame: target_frame];
                        let _: () = msg_send![btn, setBoundsSize: drawing_bounds.size];
                    }
                }
            }
        }
    });
}

pub fn run() {
    let engine = MacroEngine::new();
    let engine_setup = engine.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            engine: engine.clone(),
        })
        .invoke_handler(tauri::generate_handler![
            get_system_state,
            start_recording,
            stop_recording,
            start_playback,
            stop_playback,
            get_macro_stats,
            get_settings,
            set_settings,
            set_always_on_top,
            get_system_permissions,
            request_system_permissions,
            restart_app,
        ])
        .setup(move |app| {
            engine_setup.set_app_handle(app.handle().clone());

            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(win) = app.get_webview_window("main") {
                    sync_mac_traffic_lights(&win);
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(
                event,
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed
            ) {
                if let Some(state) = window.try_state::<AppState>() {
                    state.engine.shutdown();
                }
            }
            #[cfg(target_os = "macos")]
            {
                if matches!(
                    event,
                    tauri::WindowEvent::Resized(_)
                        | tauri::WindowEvent::Focused(true)
                        | tauri::WindowEvent::ScaleFactorChanged { .. }
                ) {
                    use tauri::Manager;
                    if let Some(win) = window.app_handle().get_webview_window(window.label()) {
                        sync_mac_traffic_lights(&win);
                    }
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running vxclick application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Some(state) = app_handle.try_state::<AppState>() {
                    state.engine.shutdown();
                }
            }
        });
}
