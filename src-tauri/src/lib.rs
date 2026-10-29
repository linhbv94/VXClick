// VXClick — Native Tauri Engine Core & macOS Native Integration
// Quản lý IPC Commands, Native EventTap / EventPost, Traffic Lights chuẩn macOS

pub mod compressor;
pub mod engine;
pub mod ledger;
pub mod platform;
pub mod types;

use engine::MacroEngine;
use tauri::Manager;
use types::{AutoClickConfig, MacroStats, PermissionStatus, PlaybackConfig, SettingsState};

pub struct AppState {
    pub engine: MacroEngine,
}

#[tauri::command]
fn prepare_app_update(window: tauri::WebviewWindow, state: tauri::State<'_, AppState>) -> Result<(), String> {
    if window.label() != "main" { return Err("scope_mismatch".into()); }
    state.engine.prepare_app_update()
}
#[tauri::command]
fn cancel_app_update(window: tauri::WebviewWindow, state: tauri::State<'_, AppState>) -> Result<(), String> {
    if window.label() != "main" { return Err("scope_mismatch".into()); }
    state.engine.cancel_app_update(); Ok(())
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
fn start_autoclick(config: Option<AutoClickConfig>, state: tauri::State<'_, AppState>) -> Result<u64, String> {
    state.engine.start_autoclick(config)
}

#[tauri::command]
fn stop_autoclick(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.engine.stop_autoclick()
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
fn set_settings(
    app: tauri::AppHandle,
    settings: SettingsState,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let lang = settings.language.clone();
    state.engine.set_settings(settings)?;
    #[cfg(target_os = "macos")]
    rebuild_mac_app_menu(&app, &lang);
    #[cfg(not(target_os = "macos"))]
    let _ = app;
    Ok(())
}

#[tauri::command]
fn set_always_on_top(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    if let Some(win) = window.app_handle().get_webview_window(window.label()) {
        sync_mac_space_behavior(&win);
    }
    Ok(())
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

// AppKit defaults floating windows to transient/ignored by Mission Control.
// Pin controls level only; the main widget remains a managed application window.
#[cfg(target_os = "macos")]
fn managed_space_behavior(current: u64) -> u64 {
    const MANAGED: u64 = 1 << 2;
    const PARTICIPATES_IN_CYCLE: u64 = 1 << 5;
    const EXCLUDED: u64 = (1 << 0) | (1 << 1) | (1 << 3) | (1 << 4) | (1 << 6);
    (current & !EXCLUDED) | MANAGED | PARTICIPATES_IN_CYCLE
}

#[cfg(target_os = "macos")]
#[allow(deprecated)]
fn sync_mac_space_behavior(window: &tauri::WebviewWindow) {
    let native_window = window.clone();
    let _ = window.run_on_main_thread(move || {
        use cocoa::base::id;
        use objc::{msg_send, sel, sel_impl};
        if let Ok(ptr) = native_window.ns_window() {
            unsafe {
                let ns_window = ptr as id;
                let current: u64 = msg_send![ns_window, collectionBehavior];
                let desired = managed_space_behavior(current);
                let _: () = msg_send![ns_window, setCollectionBehavior: desired];
            }
        }
    });
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
        use cocoa::foundation::{NSPoint, NSRect};
        use objc::{class, msg_send, sel, sel_impl};

        if let Ok(ns_win_ptr) = win_closure.ns_window() {
            let ns_window = ns_win_ptr as id;
            unsafe {
                let style_mask: u64 = msg_send![ns_window, styleMask];
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
                        // Native geometry depends on SDK/OS; preserve the SDK27.0 AppKit reference.
                        // Restore pristine AppKit geometry, never scale the bezel to 12x12.
                        let reference: id = msg_send![class!(NSWindow),
                            standardWindowButton: *btn_id forStyleMask: style_mask];
                        if reference == nil {
                            continue;
                        }
                        let reference_frame: NSRect = msg_send![reference, frame];
                        let reference_bounds: NSRect = msg_send![reference, bounds];
                        let control_size: u64 = msg_send![reference, controlSize];
                        let _: () = msg_send![btn, setControlSize: control_size];
                        // Align against the web content toolbar, not AppKit titlebar metrics.
                        // convertPoint handles the native parent hierarchy and flipped coordinates.
                        let content_view: id = msg_send![ns_window, contentView];
                        let superview: id = msg_send![btn, superview];
                        if content_view == nil || superview == nil {
                            continue;
                        }
                        let content_bounds: NSRect = msg_send![content_view, bounds];
                        let is_flipped: BOOL = msg_send![content_view, isFlipped];
                        // DOM flex center: 1px widget shell border + 38px toolbar / 2.
                        let toolbar_center_from_top = 20.0;
                        let toolbar_center_y = if is_flipped == YES {
                            toolbar_center_from_top
                        } else {
                            content_bounds.size.height - toolbar_center_from_top
                        };
                        let content_center = NSPoint {
                            x: content_bounds.origin.x + 10.0 + (i as f64) * 20.0 + 6.0,
                            y: content_bounds.origin.y + toolbar_center_y,
                        };
                        let native_center: NSPoint = msg_send![superview,
                            convertPoint: content_center fromView: content_view];
                        let target_x = native_center.x - reference_frame.size.width / 2.0;
                        let target_y = native_center.y - reference_frame.size.height / 2.0;
                        let target_frame = NSRect {
                            origin: NSPoint { x: target_x, y: target_y },
                            size: reference_frame.size,
                        };
                        let _: () = msg_send![btn, setFrame: target_frame];
                        // Match frame/bounds without a view transform, retaining native padding.
                        let _: () = msg_send![btn, setBounds: reference_bounds];
                    }
                }
            }
        }
    });
}

#[cfg(target_os = "macos")]
fn rebuild_mac_app_menu(app: &tauri::AppHandle, lang: &str) {
    use tauri::menu::{AboutMetadataBuilder, Menu, MenuItem, PredefinedMenuItem, Submenu};

    let is_en = lang.eq_ignore_ascii_case("en");
    let about_credits = if is_en {
        "Bùi Việt Linh\nHigh-speed mouse and keyboard macro automation utility for macOS.\nGitHub: https://github.com/linhbv94/VXClick"
    } else {
        "Bùi Việt Linh\nTiện ích ghi và phát lại thao tác chuột và bàn phím tốc độ cao.\nGitHub: https://github.com/linhbv94/VXClick"
    };
    let settings_label = if is_en { "Settings…" } else { "Cài đặt…" };

    let mut about_builder = AboutMetadataBuilder::new()
        .name(Some("VXClick"))
        .version(Some(env!("CARGO_PKG_VERSION")))
        // Empty AppKit build version prevents fallback to CFBundleVersion.
        .short_version(Some(""))
        .copyright(Some("© 2026 Bùi Việt Linh. All rights reserved.".to_string()))
            .authors(Some(vec!["Bùi Việt Linh".to_string()]))
        .credits(Some(about_credits))
        .website(Some("https://github.com/linhbv94/VXClick"))
        .website_label(Some("GitHub"));
    about_builder = about_builder.icon(Some(tauri::include_image!("icons/icon.png")));

    let build_menu = || -> tauri::Result<Menu<tauri::Wry>> {
        let about_item = PredefinedMenuItem::about(app, None, Some(about_builder.build()))?;
        let sep1 = PredefinedMenuItem::separator(app)?;
        let settings_item = MenuItem::with_id(
            app,
            "app_settings",
            settings_label,
            true,
            Some("CmdOrCtrl+,"),
        )?;
        let sep2 = PredefinedMenuItem::separator(app)?;
        let services_item = PredefinedMenuItem::services(app, None)?;
        let sep3 = PredefinedMenuItem::separator(app)?;
        let hide_item = PredefinedMenuItem::hide(app, None)?;
        let hide_others_item = PredefinedMenuItem::hide_others(app, None)?;
        let show_all_item = PredefinedMenuItem::show_all(app, None)?;
        let sep4 = PredefinedMenuItem::separator(app)?;
        let quit_item = PredefinedMenuItem::quit(app, None)?;

        let app_submenu = Submenu::with_items(
            app,
            "VXClick",
            true,
            &[
                &about_item,
                &sep1,
                &settings_item,
                &sep2,
                &services_item,
                &sep3,
                &hide_item,
                &hide_others_item,
                &show_all_item,
                &sep4,
                &quit_item,
            ],
        )?;
        Menu::with_items(app, &[&app_submenu])
    };

    if let Ok(menu) = build_menu() {
        let _ = app.set_menu(menu);
    }
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
        .on_menu_event(|app, event| {
            if event.id() == "app_settings" {
                use tauri::{Emitter, Manager};
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
                let _ = app.emit("vxclick://open-settings", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_system_state,
            prepare_app_update,
            cancel_app_update,
            start_recording,
            stop_recording,
            start_playback,
            stop_playback,
            start_autoclick,
            stop_autoclick,
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
                let initial_lang = engine_setup.get_settings().language;
                rebuild_mac_app_menu(app.handle(), &initial_lang);
                if let Some(win) = app.get_webview_window("main") {
                    sync_mac_space_behavior(&win);
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
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = &event {
                if let Some(win) = app_handle.get_webview_window("main") {
                    sync_mac_space_behavior(&win);
                    let _ = app_handle.show();
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Some(state) = app_handle.try_state::<AppState>() {
                    state.engine.shutdown();
                }
            }
        });
}

#[cfg(all(test, target_os = "macos"))]
mod window_policy_tests {
    use super::managed_space_behavior;

    #[test]
    fn floating_window_remains_managed_and_participates_in_cycle() {
        let defaults = managed_space_behavior(0);
        assert_ne!(defaults & (1 << 2), 0);
        assert_ne!(defaults & (1 << 5), 0);
        let transient_and_ignored = (1 << 3) | (1 << 4) | (1 << 6);
        assert_eq!(managed_space_behavior(transient_and_ignored), defaults);
    }

    #[test]
    fn activation_preserves_owner_space_and_unrelated_fullscreen_flags() {
        let unrelated = (1 << 8) | (1 << 11);
        let behavior = managed_space_behavior(unrelated | (1 << 0) | (1 << 1));
        assert_eq!(behavior & unrelated, unrelated);
        assert_eq!(behavior & ((1 << 0) | (1 << 1)), 0);
        assert_eq!(managed_space_behavior(behavior), behavior);
    }
}
