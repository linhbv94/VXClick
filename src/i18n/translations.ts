// Hệ thống từ điển song ngữ (Tiếng Việt / English) cho VXClick
// Chuẩn hóa theo phong cách các ứng dụng vx* (nhẹ, chuyên nghiệp, không đề cập zTools hay TinyTask)

import type { LanguageMode } from '../types/macro';

export const TRANSLATIONS = {
  vi: {
    // MainBar
    rec_start_title: 'Ghi macro mới (⌥⇧⌘R / Ctrl+Alt+Shift+R)',
    rec_stop_title: 'Dừng ghi macro (⌥⇧⌘R / Ctrl+Alt+Shift+R)',
    rec_button: 'Rec',
    play_start_title: 'Phát lại macro (⌥⇧⌘P / Ctrl+Alt+Shift+P)',
    play_stop_title: 'Dừng phát lại (⌥⇧⌘P / Ctrl+Alt+Shift+P hoặc ESC)',
    play_no_macro: 'Chưa có bản ghi macro',
    play_button: 'Play',
    stop_button: 'Stop',
    pin_on_title: 'Đang ghim trên cùng (Click để bỏ ghim)',
    pin_off_title: 'Ghim nổi trên cùng (Always on Top)',
    settings_title: 'Cài đặt & Tùy chọn',
    drag_handle_title: 'Kéo thả di chuyển widget',
    traffic_lights_title: 'Vùng điều khiển native macOS',
    minimize_title: 'Thu nhỏ',
    close_title: 'Đóng ứng dụng',

    // Playback Mini Bar
    status_loop_progress: 'Đã lặp',
    status_loop_times: 'lần',
    status_continuous_loop: 'Lặp đến tận thế',
    status_esc_to_stop: 'Nhấn ESC để dừng',
    status_continuous_tooltip: 'Lặp đến tận thế • Nhấn ESC hoặc Stop để dừng',
    status_stopped_esc: 'Đã dừng phát lại',
    status_stopped_doomsday_esc: 'Đã dừng lặp đến tận thế',
    status_stopped_manual: 'Đã dừng phát lại',
    status_completed_all: 'Đã hoàn tất toàn bộ vòng lặp',

    // Settings Popover
    settings_header: 'Cài đặt Macro',
    speed_label: 'Tốc độ phát lại',
    speed_custom: 'Tự nhập',
    speed_custom_label: 'Hệ số tùy chỉnh:',
    continuous_label: 'Lặp đến tận thế',
    continuous_desc: 'Lặp liên tục đến khi bấm Stop hoặc ESC',
    repeat_label: 'Số lần lặp lại',
    repeat_continuous_active: 'Đang bật lặp đến tận thế',
    repeat_limit_desc: 'Dừng khi đủ số vòng lặp',
    always_on_top_label: 'Luôn nổi trên cùng',
    always_on_top_desc: 'Ghim cửa sổ trên các ứng dụng khác',
    theme_label: 'Giao diện',
    theme_system: 'Hệ thống',
    theme_dark: 'Tối',
    theme_light: 'Sáng',
    language_label: 'Ngôn ngữ',
    about_menu_item: 'Giới thiệu phần mềm (About)...',
    support_menu_item: 'Ủng hộ tác giả (VietQR)...',

    // About Dialog (Phong cách vx*)
    about_header: 'Giới thiệu VXClick',
    app_name: 'VXClick Desktop',
    app_version: 'v1.0.0',
    app_desc: 'Tiện ích ghi và phát lại thao tác chuột & bàn phím tốc độ cao, thiết kế siêu nhỏ gọn tối ưu cho quy trình tự động hóa cá nhân.',
    highlights_title: 'Điểm nổi bật của ứng dụng:',
    highlight_1: 'Thao tác nhanh 1 chạm: Phím tắt toàn cục ⌥⇧⌘R (Ghi/Dừng) • ⌥⇧⌘P (Phát lại) • ESC (Ngắt khẩn cấp).',
    highlight_2: 'Thanh widget siêu gọn 310×38px luôn nổi trên cùng, tự động mở rộng Mini Status Bar khi Playback.',
    highlight_3: 'Tùy chỉnh tốc độ phát lại từ 0.5x đến 10x, hỗ trợ lặp đến tận thế hoặc theo số lần lặp linh hoạt.',
    tech_title: 'Công nghệ nền tảng:',
    tech_core: 'Rust 2024 Native Core Engine + Tauri v2 + React 19 + TypeScript',
    author_label: 'Tác giả:',
    author_name: 'Bùi Việt Linh',
    source_label: 'Kho mã nguồn:',
    back_button: 'Quay lại',

    // Support Modal
    support_header: 'Ủng hộ tác giả',
    support_message: 'Cảm ơn bạn đã đồng hành và sử dụng VXClick! Nếu tiện ích nhỏ này giúp bạn tiết kiệm thời gian, hãy mời tác giả một ly cà phê nhé.',
    support_qr_alt: 'Mã VietQR Vietcombank ủng hộ tác giả',
    support_qr_caption: 'VietQR • Napas247 • Vietcombank',
    support_wish: 'Chúc bạn một ngày làm việc hiệu quả!',

    // Permission Modal
    permission_header: 'Yêu cầu Quyền Trợ Năng',
    permission_badge: 'Quyền hệ thống macOS',
    permission_desc: 'macOS yêu cầu cấp quyền Trợ năng (Accessibility) để VXClick có thể thu thập và phát lại thao tác chuột & bàn phím.',
    permission_step_title: 'Các bước thực hiện nhanh:',
    permission_step_1: 'Nhấn nút "Mở Cài đặt Hệ thống" bên dưới.',
    permission_step_2: 'Tìm và gạt BẬT công tắc cho ứng dụng VXClick.',
    permission_step_3: 'Nếu hệ thống chưa tự mở khóa, bấm nút "Khởi động lại ứng dụng" bên dưới.',
    permission_open_btn: 'Mở Cài đặt Hệ thống',
    permission_check_btn: 'Kiểm tra lại quyền',
    permission_relaunch_btn: 'Khởi động lại ứng dụng',
    permission_relaunch_hint: 'Khởi động lại để nạp quyền hệ thống nếu đã gạt bật',
    permission_blocked_title: 'Cần cấp quyền Trợ năng để ghi (Bấm để xem hướng dẫn)',
    permission_granted_toast: 'Đã cấp quyền Trợ năng thành công!',
    permission_checking_hint: 'Đang tự động kiểm tra trạng thái quyền...',
  },
  en: {
    // MainBar
    rec_start_title: 'Record new macro (⌥⇧⌘R / Ctrl+Alt+Shift+R)',
    rec_stop_title: 'Stop recording (⌥⇧⌘R / Ctrl+Alt+Shift+R)',
    rec_button: 'Rec',
    play_start_title: 'Playback macro (⌥⇧⌘P / Ctrl+Alt+Shift+P)',
    play_stop_title: 'Stop playback (⌥⇧⌘P / Ctrl+Alt+Shift+P or ESC)',
    play_no_macro: 'No recorded macro available',
    play_button: 'Play',
    stop_button: 'Stop',
    pin_on_title: 'Currently pinned on top (Click to unpin)',
    pin_off_title: 'Always on top (Pin widget)',
    settings_title: 'Settings & Options',
    drag_handle_title: 'Drag to move widget',
    traffic_lights_title: 'macOS native control area',
    minimize_title: 'Minimize',
    close_title: 'Close application',

    // Playback Mini Bar
    status_loop_progress: 'Looped',
    status_loop_times: 'times',
    status_continuous_loop: 'Loop until doomsday',
    status_esc_to_stop: 'Press ESC to stop',
    status_continuous_tooltip: 'Loop until doomsday • Press ESC or Stop to stop',
    status_stopped_esc: 'Playback stopped',
    status_stopped_doomsday_esc: 'Loop until doomsday stopped',
    status_stopped_manual: 'Playback stopped',
    status_completed_all: 'All loops completed successfully',

    // Settings Popover
    settings_header: 'Macro Settings',
    speed_label: 'Playback Speed',
    speed_custom: 'Custom',
    speed_custom_label: 'Custom factor:',
    continuous_label: 'Loop until doomsday',
    continuous_desc: 'Repeat continuously until Stop or ESC',
    repeat_label: 'Repeat Count',
    repeat_continuous_active: 'Loop until doomsday active',
    repeat_limit_desc: 'Stops after reaching count limit',
    always_on_top_label: 'Always on Top',
    always_on_top_desc: 'Keep window above all applications',
    theme_label: 'Appearance',
    theme_system: 'System',
    theme_dark: 'Dark',
    theme_light: 'Light',
    language_label: 'Language',
    about_menu_item: 'About VXClick...',
    support_menu_item: 'Support Author (VietQR)...',

    // About Dialog (vx* style)
    about_header: 'About VXClick',
    app_name: 'VXClick Desktop',
    app_version: 'v1.0.0',
    app_desc: 'High-speed mouse and keyboard macro automation utility with an ultra-compact footprint designed for effortless personal workflows.',
    highlights_title: 'Key Highlights:',
    highlight_1: 'One-touch shortcuts: Global hotkeys ⌥⇧⌘R (Record/Stop) • ⌥⇧⌘P (Play) • ESC (Emergency Stop).',
    highlight_2: 'Ultra-compact 310×38px floating widget staying on top, auto-expanding Mini Status Bar during playback.',
    highlight_3: 'Flexible speed adjustments from 0.5x to 10x with loop until doomsday or custom cycle limits.',
    tech_title: 'Core Technologies:',
    tech_core: 'Rust 2024 Native Core Engine + Tauri v2 + React 19 + TypeScript',
    author_label: 'Author:',
    author_name: 'Viet Linh Bui',
    source_label: 'Source Repository:',
    back_button: 'Back',

    // Support Modal
    support_header: 'Support Author',
    support_message: 'Thank you for using VXClick! If this little tool saves your precious time, feel free to buy the author a cup of coffee.',
    support_qr_alt: 'VietQR Vietcombank author support code',
    support_qr_caption: 'VietQR • Napas247 • Vietcombank',
    support_wish: 'Wishing you a productive and joyful day!',

    // Permission Modal
    permission_header: 'Accessibility Permission Required',
    permission_badge: 'macOS System Permission',
    permission_desc: 'macOS requires Accessibility permission for VXClick to capture and simulate mouse and keyboard actions.',
    permission_step_title: 'Quick Setup Steps:',
    permission_step_1: 'Click "Open System Settings" below.',
    permission_step_2: 'Locate VXClick and switch the toggle ON.',
    permission_step_3: 'If not automatically unlocked, click "Relaunch Application" below.',
    permission_open_btn: 'Open System Settings',
    permission_check_btn: 'Recheck Permission',
    permission_relaunch_btn: 'Relaunch Application',
    permission_relaunch_hint: 'Restart to load system permissions if already enabled',
    permission_blocked_title: 'Accessibility permission required to record (Click to view guide)',
    permission_granted_toast: 'Accessibility permission granted successfully!',
    permission_checking_hint: 'Automatically monitoring permission status...',
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.vi;

export function t(key: TranslationKey, lang: LanguageMode = 'vi'): string {
  const dictionary = TRANSLATIONS[lang] || TRANSLATIONS.vi;
  return dictionary[key] || TRANSLATIONS.vi[key] || key;
}
