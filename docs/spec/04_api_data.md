# API & Data Specification: VXClick (`_spec4_api_data`)

> **Sản phẩm:** VXClick — Tiện ích Tự động hóa Macro Chuột & Bàn phím Siêu Tối giản  
> **Thư mục tài liệu:** `vxclick/docs/spec/`  
> **Phiên bản:** 1.1.0  
> **Ngày cập nhật:** 2026-10-15  

---

## 1. Giao diện IPC Contract (Tauri v2 Commands & Events)

Toàn bộ quá trình giao tiếp giữa UI WebView (React 19) và Native Engine (Rust 2024) được thực hiện qua cơ chế IPC an toàn kiểu dữ liệu (Type-safe IPC) của Tauri v2.

### 1.1. Danh mục Tauri Commands (Frontend Gọi Backend)

```rust
// ==========================================
// 1. NHÓM ĐIỀU KHIỂN GHI THAO TÁC (CAPTURE)
// ==========================================

#[tauri::command]
pub async fn start_recording(state: State<'_, AppState>) -> Result<u64, String>;
// Bắt đầu khởi tạo bounded hook (10k slots), trả về session_id mới.

#[tauri::command]
pub async fn stop_recording(session_id: u64, state: State<'_, AppState>) -> Result<MacroStats, String>;
// Dừng hook, áp dụng Self-exclusion lọc bỏ click Stop, hoàn tất timeline và trả về thống kê.

// ==========================================
// 2. NHÓM ĐIỀU KHIỂN PHÁT LẠI (PLAYBACK)
// ==========================================

#[tauri::command]
pub async fn start_playback(
    config: PlaybackConfig,
    state: State<'_, AppState>
) -> Result<u64, String>;
// Khởi chạy cancellable playback thread với validation tham số (speed > 0, repeat >= 1).

#[tauri::command]
pub async fn stop_playback(state: State<'_, AppState>) -> Result<(), String>;
// Dừng phát lại chủ động, kích hoạt Condvar ngắt < 1ms và xả sạch ActiveInputLedger.

#[tauri::command]
pub async fn get_macro_stats(state: State<'_, AppState>) -> Result<Option<MacroStats>, String>;
// Lấy thông số bản ghi hiện tại trong RAM: số sự kiện, thời lượng tổng.

// ==========================================
// 2B. NHÓM ĐIỀU KHIỂN TỰ ĐỘNG NHẤP (AUTO CLICK)
// ==========================================

#[tauri::command]
pub async fn start_autoclick(
    config: Option<AutoClickConfig>,
    state: State<'_, AppState>
) -> Result<u64, String>;
// Bắt đầu luồng auto click tại tọa độ chuột hiện tại theo cấu hình (interval_ms, button, until_stopped/repeat_count).

#[tauri::command]
pub async fn stop_autoclick(state: State<'_, AppState>) -> Result<(), String>;
// Dừng auto click chủ động, xả phím chuột và khôi phục trạng thái FSM.

// ==========================================
// 3. NHÓM CẤU HÌNH, HỆ THỐNG & QUYỀN OS
// ==========================================

#[tauri::command]
pub async fn get_system_state(state: State<'_, AppState>) -> Result<SystemState, String>;
// Lấy trạng thái FSM hiện tại của hệ thống.

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<SettingsState, String>;
// Đọc cấu hình settings.json hiện tại.

#[tauri::command]
pub async fn set_settings(settings: SettingsState, state: State<'_, AppState>) -> Result<(), String>;
// Lưu cấu hình mới và đồng bộ hotkey / window state.

#[tauri::command]
pub async fn set_always_on_top(window: Window, enabled: bool) -> Result<(), String>;
// Ghim hoặc bỏ ghim cửa sổ trên cùng tức thì.

#[tauri::command]
pub async fn get_system_permissions() -> Result<PermissionStatus, String>;
// Kiểm tra quyền Accessibility & Input Monitoring qua AXIsProcessTrustedWithOptions.

#[tauri::command]
pub async fn request_system_permissions() -> Result<(), String>;
// Mở trang cài đặt quyền hệ thống của OS (URL Scheme trên macOS).

#[tauri::command]
pub async fn restart_app(app_handle: AppHandle) -> Result<(), String>;
// Khởi động lại ứng dụng 1-chạm (Relaunch) để nạp token TCC mới khi user vừa cấp quyền.

// ==========================================
// 4. NHÓM LƯU TRỮ TỆP KỊCH BẢN
// ==========================================

#[tauri::command]
pub async fn save_macro_file(file_path: String, state: State<'_, AppState>) -> Result<(), String>;
// Xuất MacroTimeline trong RAM ra tệp định dạng .vxclick có checksum CRC32.

#[tauri::command]
pub async fn load_macro_file(file_path: String, state: State<'_, AppState>) -> Result<MacroStats, String>;
// Validate tệp .vxclick trước; chỉ thay thế RAM buffer khi tệp hoàn toàn hợp lệ.
```

---

### 1.2. Danh mục Tauri Events (Backend Bắn Sự Kiện Thời Gian Thực Sang Frontend)

| Tên Event | Payload Type | Thời điểm Kích hoạt | Mô tả Hành vi |
| :--- | :--- | :--- | :--- |
| `macro://state_changed` | `{ state: SystemState, session_id: u64, revision: u64 }` | Khi chuyển đổi FSM | Bổ sung `session_id` & `revision` để UI loại bỏ event lỗi thời. |
| `macro://recording_event`| `{ count: usize, elapsed_ms: u64 }` | Throttle mỗi 200ms khi Rec | Cập nhật số lượng sự kiện đã thu thập. |
| `macro://playback_progress`| `{ loop: u32, total: u32, pct: f32 }` | Sau mỗi chu kỳ vòng lặp | Cập nhật Mini Expand Bar: `loop / total` hoặc status continuous. |
| `macro://autoclick_progress`| `{ current_clicks: u32, total_clicks: u32, pct: f32 }` | Throttle mỗi 100ms khi Auto Click | Cập nhật số lần click đã thực hiện và phần trăm hoàn thành. |
| `macro://emergency_stopped`| `{ reason: String, timestamp: u64 }` | Khi nhấn phím cứng ESC | Báo hiệu hệ thống vừa kích hoạt mạch ngắt khẩn cấp. |

---

## 2. Cấu trúc Mô hình Dữ liệu (Data Schemas)

### 2.1. Định dạng MacroTimeline & MacroEvent (Monotonic Microseconds Timeline)

Chuỗi sự kiện sử dụng **mốc thời gian tuyệt đối micro-giây (`timestamp_us`)** kể từ thời điểm bắt đầu ghi để loại bỏ triệt để sai số trôi dồn tích:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SystemState {
    Uninitialized,
    PermissionBlocked,
    IdleEmpty,
    Recording,
    IdleReady,
    Playing,
    Autoclicking,
    EmergencyStopped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroTimeline {
    pub version: u32,                  // Phiên bản schema (Hiện tại: 1)
    pub created_at: String,             // ISO 8601 Timestamp
    pub duration_us: u64,              // Tổng thời lượng chuỗi macro (micro-giây)
    pub event_count: usize,             // Tổng số lượng sự kiện
    pub screen_topology: ScreenTopology,// Thông số màn hình tại thời điểm ghi
    pub events: Vec<MacroEvent>,       // Danh sách sự kiện tuần tự
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenTopology {
    pub virtual_width: i32,            // SM_CXVIRTUALSCREEN trên Windows / Quartz bounds trên macOS
    pub virtual_height: i32,           // SM_CYVIRTUALSCREEN
    pub scale_factor: f32,             // DPI scale của màn hình chính
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroEvent {
    pub timestamp_us: u64,             // Thời điểm bắn sự kiện (micro-giây tính từ t0)
    pub action: MacroAction,           // Chi tiết hành động phần cứng
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum MacroAction {
    MouseDown { button: MouseBtn, x: i32, y: i32 },
    MouseUp   { button: MouseBtn, x: i32, y: i32 },
    MouseMove { x: i32, y: i32 },
    MouseScroll { delta_x: i32, delta_y: i32 },
    KeyDown   { key_code: u16, modifiers: u8 },
    KeyUp     { key_code: u16, modifiers: u8 },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum MouseBtn {
    Left,
    Right,
    Middle,
    X1,
    X2,
}

// Bitmask biểu diễn các phím bổ trợ (Modifiers)
pub const MOD_SHIFT: u8 = 1 << 0;
pub const MOD_CTRL:  u8 = 1 << 1;
pub const MOD_ALT:   u8 = 1 << 2;
pub const MOD_CMD:   u8 = 1 << 3; // Win trên Windows / Command trên macOS
```

---

### 2.2. Sổ Đăng Ký Input Đang Giữ (Active Input Ledger)

```rust
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum LedgerInput {
    Key(u16),
    MouseButton(MouseBtn),
}

#[derive(Default)]
pub struct ActiveInputLedger {
    pub held_inputs: HashSet<LedgerInput>,
}

impl ActiveInputLedger {
    pub fn record_down(&mut self, input: LedgerInput) {
        self.held_inputs.insert(input);
    }

    pub fn record_up(&mut self, input: &LedgerInput) {
        self.held_inputs.remove(input);
    }

    pub fn flush_all(&mut self) -> Vec<LedgerInput> {
        self.held_inputs.drain().collect()
    }
}
```

---

### 2.3. Cấu hình Vận hành (SettingsState & PlaybackConfig)

Tách bạch rõ giữa Cấu hình Lưu trữ Toàn cục (`SettingsState`) và Cấu hình Phiên Chạy (`PlaybackConfig`):

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsState {
    pub play_speed: f32,            // 0.5, 1.0, 2.0, 5.0, 10.0, hoặc số thực dương
    pub continuous: bool,          // Lặp đến tận thế: true / false
    pub repeat_count: u32,         // Số lần lặp (1 - 9999)
    pub always_on_top: bool,       // Ghim cửa sổ trên cùng (độc lập với playback)
    pub language: String,          // "vi" | "en" (Song ngữ giao diện)
    pub theme: String,             // "system" | "dark" | "light"
    pub autoclick_interval_ms: u64,// Chu kỳ nhấp chuột (ms, mặc định 100)
    pub autoclick_button: MouseBtn,// Nút chuột (Left / Right)
    pub autoclick_until_stopped: bool, // Lặp đến khi dừng (true) hoặc theo số lần
    pub autoclick_repeat_count: u32, // Số lần nhấp khi không lặp vô tận (mặc định 100)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoClickConfig {
    pub interval_ms: u64,
    pub button: MouseBtn,
    pub until_stopped: bool,
    pub repeat_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoClickProgressPayload {
    pub current_clicks: u32,
    pub total_clicks: u32,
    pub pct: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackConfig {
    pub speed: f32,                // Tốc độ phát lại
    pub continuous: bool,          // Chế độ lặp đến tận thế
    pub repeat_count: u32,         // Số lần lặp
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroStats {
    pub total_events: usize,
    pub clicks_count: usize,
    pub keys_count: usize,
    pub duration_formatted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionStatus {
    pub is_trusted: bool,          // macOS Accessibility (AXIsProcessTrustedWithOptions)
    pub input_monitoring: bool,    // macOS Input Monitoring
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackProgressPayload {
    pub current_loop: u32,         // Vòng lặp hiện tại (x)
    pub total_loops: u32,          // Tổng số vòng lặp (X; 0 nếu continuous)
    pub percentage: f32,           // Phần trăm hoàn tất (0.0 -> 100.0)
}
```

---

### 2.4. Cấu hình Phím tắt Toàn Cục (Global Shortcuts Mapping)

Đăng ký qua `tauri-plugin-global-shortcut`:

```rust
pub const MAC_HOTKEY_REC:       &str = "Option+Shift+Command+R"; // ⌥⇧⌘R
pub const MAC_HOTKEY_PLAY:      &str = "Option+Shift+Command+P"; // ⌥⇧⌘P
pub const MAC_HOTKEY_AUTOCLICK: &str = "Option+Shift+Command+C"; // ⌥⇧⌘C

pub const WIN_HOTKEY_REC:       &str = "Control+Alt+Shift+R";
pub const WIN_HOTKEY_PLAY:      &str = "Control+Alt+Shift+P";
pub const WIN_HOTKEY_AUTOCLICK: &str = "Control+Alt+Shift+C";

pub const FAILSAFE_KEY:         &str = "Escape"; // Bắt khi state == Playing hoặc Autoclicking
```

---

## 3. Thuật toán Nén Thích ứng Sự kiện Di Chuột (Bảo Toàn Drag Nét Vẽ)

```text
Đầu vào: Chuỗi điểm thô P[i] = (x, y, timestamp_us) từ Bounded Queue
Biến trạng thái: is_mouse_down: bool (Có nút chuột nào đang giữ không)

TRƯỜNG HỢP 1: is_mouse_down == true (CHẾ ĐỘ KÉO THẢ / VẼ NÉT — DRAG MODE)
  - Áp dụng Conservative Sampling:
  - Bắt buộc giữ lại 100% điểm tọa độ tại thời điểm MouseDown và MouseUp.
  - Lấy mẫu với tần số ổn định 60Hz - 120Hz dọc theo đường kéo.
  - TUYỆT ĐỐI KHÔNG nhảy cóc (instant warp) ở tốc độ cao, giữ trọn vẹn quỹ đạo.

TRƯỜNG HỢP 2: is_mouse_down == false (CHẾ ĐỘ DI CHUỘT TỰ DO)
  - Nếu delta_time < 16ms và Euclidean distance < 3 pixel -> BỎ QUA ĐIỂM (Vi rung).
  - Nếu góc lệch giữa 3 điểm vector >= 15 độ (Góc ngoặt) -> LƯU ĐIỂM.
  - Nếu nằm trên đường thẳng -> Chỉ lưu mốc sau mỗi 32ms.

MỌI SỰ KIỆN MouseDown, MouseUp, KeyDown, KeyUp:
  - 100% ĐƯỢC BẢO TOÀN, TUYỆT ĐỐI KHÔNG BỊ LỌC.
```

---

## 4. Đặc tả Định dạng Tệp Kịch bản `.vxclick` (Wire Format)

Cấu trúc định dạng tệp chuẩn xác:
- **Magic Bytes (8 bytes):** `VXCLICK\x01` (ASCII + Version byte).
- **Header Length (4 bytes Big-Endian):** Kích thước của chuỗi JSON Header `N`.
- **JSON Header (N bytes UTF-8):** Chứa metadata: `version`, `created_at`, `duration_us`, `event_count`, `screen_topology`, và mã kiểm tra `crc32`.
- **Payload Bytes:** Dữ liệu chuỗi `MacroEvent` được serialize nhị phân (Bincode) hoặc JSON nén bằng Zstandard (Zstd), giải nén nhanh với độ trễ < 1ms.
- **Quy tắc Nạp tệp (Safe Load Rule):** Quá trình nạp tệp bắt buộc phải giải nén và kiểm tra tính toàn vẹn (CRC32, kích thước bounds) thành công trước khi ghi đè vào RAM; nếu tệp lỗi hoặc hỏng, bản ghi macro hiện tại trong RAM được giữ nguyên vẹn.

## QA bổ sung trước release 2026-10-27

Auto Click backend chỉ bắt đầu từ Idle, từ chối giai đoạn dừng khẩn cấp/engine bận. Kiểm tra IPC: interval10–60000ms, nút Left/Right, finite repeat1–999999; input không hợp lệ không tạo worker. Windows dummy từ chối Record/Play/Click trong backend. Serialization legacy/roundtrip chạy bằng Cargo; harness compressor plain-data tách khỏi test serde. Native GUI Mac đã mở, Settings cuộn được, thiếu Accessibility thì Click chỉ mở hướng dẫn; user yêu cầu bỏ qua test nhấp thật lần này. Không claim hardware hotkey/nhấp/stop hoặc giữ quyền qua updater đã nghiệm thu.
