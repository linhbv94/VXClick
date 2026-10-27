# Feature Flow Specification: VXClick (`_spec2_feature_flow`)

> **Sản phẩm:** VXClick — Tiện ích Tự động hóa Macro Chuột & Bàn phím Siêu Tối giản  
> **Thư mục tài liệu:** `vxclick/docs/spec/`  
> **Phiên bản:** 1.1.0  
> **Ngày cập nhật:** 2026-10-15  

---

## 1. Luồng Người Dùng Chi tiết (User Flows)

### 1.1. Luồng 1: Ghi & Phát Nhanh Lần Đầu (Zero-Config First Run)
Người dùng muốn ghi và chạy lại thao tác ngay lập tức mà không cần chỉnh bất kỳ cấu hình nào:

```text
[Mở VXClick] 
      │
      ▼
[Thấy 3 nút chính: ● Rec (Đỏ) | ▶ Play (Xám mờ Disabled) | ⚙ Setting (Xám)]
      │
      ▼
[Click vào ● Rec] ──► (Nút chuyển thành ■ Stop màu đỏ, viền nhấp nháy pulse nhẹ)
      │
      ▼
[Người dùng thao tác chuột & gõ phím trên màn hình]
      │
      ▼
[Click vào ■ Stop] ──► (Nút Rec về lại ● Rec; Nút Play sáng màu xanh lá)
      │
      ▼
[Click vào ▶ Play] ──► (Nút chuyển thành ■ Stop xanh; cửa sổ tự mở Mini Status Bar)
      │
      ▼
[Hết chuỗi thao tác] ──► (Nút Play trở về ▶ Play; Mini Bar tự thu gọn; hoàn tất)
```

---

### 1.2. Luồng 2: Cấu hình Vòng lặp & Tốc độ qua Setting Popover

```text
[Click vào ⚙ Setting] 
      │
      ▼
[Mở rộng Setting Popover mượt mà, không thanh cuộn]
      │
      ├─► [Chọn Play Speed: 0.5x, 1.0x, 2.0x, 5.0x, 10.0x]
      │
      ├─► [Bật công tắc Đến tận thế (Continuous Playback / Lặp vô tận)]
      │         │
      │         └─► (Ô Repeat Count tự động bị khóa mờ Disabled)
      │
      ├─► [Hoặc Tắt Đến tận thế]
      │         │
      │         └─► (Người dùng nhập số lần lặp: Repeat Count = 25)
      │
      ├─► [Bật/Tắt Ghim trên cùng (Always on Top)]
      │
      ├─► [Chọn Ngôn ngữ: Tiếng Việt ⟷ English]
      │
      └─► [Xem Modal Giới thiệu (About vx*) & Ủng hộ (Support VietQR)]
      │
      ▼
[Click nút Đóng hoặc click ra ngoài để đóng Popover]
      │
      ▼
[Click ▶ Play để chạy theo cấu hình mới]
```

---

### 1.3. Luồng 3: Điều khiển bằng Phím tắt Toàn Hệ thống (Global Hotkeys)
Bộ phím tắt độc bản (Zero-Conflict) áp dụng chuẩn hóa đồng nhất trên cả 2 nền tảng:

| Thao tác | Phím tắt macOS | Phím tắt Windows | Hành vi |
| :--- | :--- | :--- | :--- |
| **Bật / Dừng Ghi (Rec Toggle)** | `⌥ + ⇧ + ⌘ + R` | `Ctrl + Alt + Shift + R` | Đổi trạng thái giữa Bắt đầu ghi ⟷ Dừng ghi |
| **Bật / Dừng Phát (Play Toggle)**| `⌥ + ⇧ + ⌘ + P` | `Ctrl + Alt + Shift + P` | Đổi trạng thái giữa Bắt đầu phát ⟷ Dừng phát |
| **Bật / Dừng Auto Click (Toggle)**| `⌥ + ⇧ + ⌘ + C` | `Ctrl + Alt + Shift + C` | Đổi trạng thái Bắt đầu tự nhấp ⟷ Dừng tự nhấp |
| **Dừng Khẩn Cấp (Emergency Failsafe)** | `ESC` | `ESC` | **Kích hoạt khi đang Playback hoặc Auto Click** để ngắt tức thì |

```text
[Đang ở bất kỳ cửa sổ/ứng dụng nào]
      │
      ├─► Nhấn [ ⌥ + ⇧ + ⌘ + R ] (macOS) / [ Ctrl + Alt + Shift + R ] (Windows):
      │         │
      │         ├─ Nếu đang Idle: Kích hoạt Bắt đầu Ghi (Record Start)
      │         └─ Nếu đang Recording: Dừng Ghi (Record Stop)
      │
      ├─► Nhấn [ ⌥ + ⇧ + ⌘ + P ] (macOS) / [ Ctrl + Alt + Shift + P ] (Windows):
      │         │
      │         ├─ Nếu đang Idle_Ready: Kích hoạt Phát lại (Playback Start)
      │         └─ Nếu đang Playing: Dừng Phát lại (Playback Stop)
      │
      ├─► Nhấn [ ⌥ + ⇧ + ⌘ + C ] (macOS) / [ Ctrl + Alt + Shift + C ] (Windows):
      │         │
      │         ├─ Nếu đang Idle_Empty / Idle_Ready: Bắt đầu Tự nhấp (Auto Click Start)
      │         └─ Nếu đang Autoclicking: Dừng Tự nhấp (Auto Click Stop)
      │
      └─► Nhấn [ ESC ]:
                │
                ├─ Nếu đang Recording: BỎ QUA (Không bắt phím để tránh nuốt phím thao tác)
                └─ Nếu đang Playing hoặc Autoclicking: NGẮT KHẨN CẤP NGAY LẬP TỨC (Failsafe < 1ms)
```

---

### 1.4. Luồng 4: Luồng Cấp Quyền Trợ Năng macOS (Accessibility Permission Onboarding)

```text
[Mở ứng dụng trên macOS lần đầu hoặc khi chưa cấp quyền]
      │
      ▼
[Hệ thống kiểm tra `AXIsProcessTrustedWithOptions`]
      │
      ├─► Đã cấp quyền: Nút Rec đỏ bình thường, sẵn sàng ghi
      │
      └─► Chưa cấp quyền:
            │
            ├─► Nút Rec hiển thị trạng thái mờ (`opacity-40 hover:opacity-80`, chấm xám)
            │
            ▼
[Người dùng click vào nút Rec mờ]
      │
      ▼
[Hiển thị Modal Hướng Dẫn Cấp Quyền (Permission Modal)]
      │
      ├─ Bước 1: Mở Cài đặt hệ thống ──► [Click nút "Mở Cài đặt hệ thống"]
      │                                       │ (App gọi URL Scheme mở đúng mục Accessibility)
      │
      ├─ Bước 2: Bật công tắc cho "VXClick" trong danh sách Trợ năng
      │
      └─ Bước 3: Áp dụng quyền
            │
            ├─ Cách A: Hệ thống tự động nhận diện quyền live (nút Rec sáng lên)
            │
            └─ Cách B: [Click nút "Khởi động lại ứng dụng"] ──► App tự restart nạp lại TCC token
```

---

### 1.5. Luồng 5: Luồng Mini Status Bar Tự Động Mở Rộng khi Playback (Dynamic Mini Expand Bar)

```text
[Người dùng bấm Play (Click UI hoặc bấm ⌥⇧⌘P / Ctrl+Alt+Shift+P)]
      │
      ▼
[Cửa sổ tự động mở rộng (Expand) kích thước dọc từ 38px ──► 62px]
      │
      ├─ Trường hợp A: Chế độ Lặp X lần (`continuous = false`)
      │     │
      │     ├─ Mini Bar hiển thị: "Đã lặp x / X lần" (kèm progress bar hoặc % tiến trình)
      │     └─ Cập nhật real-time sau mỗi chu kỳ playback hoàn tất
      │
      ├─ Trường hợp B: Chế độ Lặp đến tận thế (`continuous = true`)
      │     │
      │     └─ Mini Bar hiển thị tooltip/status: "Đang lặp liên tục • Nhấn ESC để dừng"
      │
      ▼
[Playback kết thúc HOẶC Người dùng bấm ESC / Stop]
      │
      ▼
[Cửa sổ tự động thu gọn (Collapse) kích thước dọc từ 62px ──► 38px về dạng thanh gốc]
```

---

### 1.6. Luồng 6: Luồng Tự Động Nhấp Chuột Nhanh (Auto Click Fast Flow)

```text
[Người dùng click nút "Auto Click" (hoặc bấm ⌥⇧⌘C / Ctrl+Alt+Shift+C)]
      │
      ▼
[Hệ thống kiểm tra trạng thái hiện tại & cấu hình trong Settings]
      │
      ├─ Cấu hình nạp:
      │   ├─ Interval: chu kỳ nhấp (mặc định 100ms, có thể chỉnh 10ms - 60000ms)
      │   ├─ Mouse Button: Phím chuột (Left / Right)
      │   └─ Repeat: Lặp đến khi dừng (until stopped) HOẶC số lần lặp (repeat count)
      │
      ▼
[Chuyển trạng thái sang AUTOCLICKING]
      │
      ├─ Nút Auto Click đổi sang trạng thái hoạt động (màu hổ phách Amber, pulse nhẹ, đếm số click)
      ├─ Cửa sổ tự động mở rộng (Expand) kích thước dọc từ 38px ──► 62px
      ├─ Luồng nền Rust inject MouseDown -> sleep 10ms -> MouseUp tại vị trí con trỏ chuột thời gian thực
      │
      ├─ Trường hợp A: Đến khi dừng (Until stopped) ──► Mini Bar: "Đang tự nhấp #x • ESC để dừng"
      └─ Trường hợp B: Theo số lần (Repeat times)  ──► Mini Bar: "Đã nhấp x / X lần" + progress bar
      │
      ▼
[Người dùng bấm nút Auto Click lần nữa HOẶC bấm ⌥⇧⌘C HOẶC bấm ESC HOẶC hoàn thành số lần]
      │
      ▼
[Dừng Auto Click an toàn: Xả phím chuột, Mini Bar hiển thị thông báo đã dừng 1.2s rồi thu gọn về 38px]
```

---

## 2. Máy Trạng thái Hữu hạn (Finite State Machine - FSM)

Toàn bộ hệ thống VXClick được điều khiển bởi một Máy Trạng Thái duy nhất trong Rust Core gồm 8 trạng thái vận hành chính xác:

```text
                        ┌─────────────────────────┐
                        │     UNINITIALIZED       │
                        └────────────┬────────────┘
                                     │ Khởi chạy
                                     ├───────────────────────────────┐
                                     │ Đủ quyền OS                   │ Thiếu quyền OS
                                     ▼                               ▼
                        ┌─────────────────────────┐     ┌────────────────────────┐
            ┌──────────►│       IDLE_EMPTY        │     │   PERMISSION_BLOCKED   │
            │           │ (Chưa có bản ghi macro) │     │ (Nút Rec mờ, hiện modal)│
            │           └─────┬──────────────┬────┘     └────────────┬───────────┘
            │                 │              │ Bấm Auto Click        │ Đã cấp quyền / Relaunch
            │                 │              │ (⌥⇧⌘C)                │
            │                 │              ▼                       │
            │                 │ ┌─────────────────────────┐          │
            │                 │ │       AUTOCLICKING      │◄─────────┘ (khi đủ quyền)
            │                 │ │(Tự nhấp tại vị trí chuột│
            │                 │ └───┬─────────────────┬───┘
            │                 │     │ Dừng/Hết lần    │ Bấm ESC
            │                 │     ▼                 ▼
            │                 │ ┌─────────────────────────┐
            │                 │ │    EMERGENCY_STOPPED    │
            │                 │ └────────────┬────────────┘
            │                 │ Bấm Rec      │ Khôi phục về Idle
            │                 │ (⌥⇧⌘R)       ▼
            │                 │ ┌─────────────────────────┐
            │                 └►│        RECORDING        │
            │                   │  (Đang thu thập sự kiện)│
            │                   └────────────┬────────────┘
            │                                │ Bấm Stop Rec (⌥⇧⌘R)
            │                                ▼
            │                   ┌─────────────────────────┐
            │  Ghi đè           │       IDLE_READY        │◄─────────────────┐
            │  bản mới          │ (Đã có macro sẵn sàng)  │                  │
            │                   └─────┬───────────┬───▲───┘                  │
            │                         │           │   │                      │
            │           Bấm Play      │           │   │ Hết chu kỳ lặp X lần │ Thu gọn
            │           (⌥⇧⌘P)        ▼           │   │ (Thu gọn Mini Bar)   │ Mini Bar
            │                   ┌───────────┐     │   │                      │
            │                   │  PLAYING  │     │   │                      │
            │                   └─────┬─────┘     │   │                      │
            │                         │           │   │                      │
            │           Bấm Stop      │           │   │                      │
            │           (⌥⇧⌘P)        ▼           │   │                      │
            │                   ┌───────────┐     │   │                      │
            │                   │  IDLE_... │     │   │                      │
            │                   └───────────┘     │   │                      │
            │                                     │   │                      │
            │               Bấm Auto Click (⌥⇧⌘C) │   │                      │
            │               chuyển AUTOCLICKING   └───┘                      │
            │                                                                │
            │           Bấm ESC khi Playing hoặc Autoclicking                │
            │                   ┌─────────────────────────┐                  │
            └───────────────────┤    EMERGENCY_STOPPED    ├──────────────────┘
                                │ (Xả Ledger & khôi phục) │ (Bảo toàn macro trong RAM)
                                └─────────────────────────┘
```

---

## 3. Bảng Chuyển Trạng thái Hệ thống (State Transition Table)

| Trạng thái Hiện tại | Tác nhân Kích hoạt (Trigger) | Điều kiện Tiên quyết | Hành vi Hệ thống (Actions) | Trạng thái Kế tiếp |
| :--- | :--- | :--- | :--- | :--- |
| `UNINITIALIZED` | App launch | Đủ quyền Accessibility/Input Monitor | Khởi tạo IPC, nạp `settings.json`, đăng ký global hotkeys (`⌥⇧⌘R`, `⌥⇧⌘P`, `ESC`) | `IDLE_EMPTY` |
| `UNINITIALIZED` | App launch | Thiếu quyền OS | Hiển thị nút Rec mờ (`opacity-40`), sẵn sàng mở `PermissionModal` | `PERMISSION_BLOCKED` |
| `PERMISSION_BLOCKED`| Click nút Rec | Quyền chưa cấp | Mở `PermissionModal` hướng dẫn 3 bước (Mở Cài đặt, Cấp quyền, Khởi động lại) | `PERMISSION_BLOCKED` |
| `PERMISSION_BLOCKED`| OS cấp quyền hoặc Relaunch | `AXIsProcessTrustedWithOptions` = true | Tự động mở khóa nút Rec sáng màu đỏ bình thường | `IDLE_EMPTY` |
| `IDLE_EMPTY` | Click `Rec` hoặc `⌥⇧⌘R` | Quyền hợp lệ | Bật capture thread, khởi động micro-clock `t0 = Instant::now()`, đổi icon Rec sang Stop đỏ | `RECORDING` |
| `RECORDING` | Sự kiện chuột/phím từ OS | - | Đóng gói raw event, tính `timestamp_us`, nén thích ứng lưu vào Bounded Queue | `RECORDING` |
| `RECORDING` | Click `Stop` hoặc `⌥⇧⌘R` | Buffer > 0 sự kiện | Gỡ bỏ capture hook, lọc bỏ click Stop, chốt `MacroTimeline`, bật nút Play sáng xanh | `IDLE_READY` |
| `RECORDING` | Click `Stop` hoặc `⌥⇧⌘R` | Buffer = 0 sự kiện | Gỡ bỏ capture hook, thông báo không có sự kiện nào được ghi, nút Play vẫn mờ | `IDLE_EMPTY` |
| `IDLE_READY` | Click `Play` hoặc `⌥⇧⌘P` | `MacroTimeline.len() > 0` | Mở rộng Mini Expand Bar (62px), tạo playback thread, RAII timer, icon Play sang Stop | `PLAYING` |
| `IDLE_READY` | Click `Rec` hoặc `⌥⇧⌘R` | - | Xóa timeline cũ trong RAM, chuyển sang thu thập timeline mới | `RECORDING` |
| `IDLE_EMPTY` / `IDLE_READY` | Click `Auto Click` hoặc `⌥⇧⌘C` | Quyền hợp lệ | Mở rộng Mini Expand Bar (62px), tạo background thread nhấp chuột theo `interval_ms` | `AUTOCLICKING` |
| `AUTOCLICKING` | Click `Auto Click` hoặc `⌥⇧⌘C` | - | Thu gọn Mini Bar về 38px, ngắt luồng auto click, xả phím chuột, trả về trạng thái trước đó | `IDLE_READY` / `IDLE_EMPTY` |
| `AUTOCLICKING` | Hoàn tất `repeat_count` lần | `until_stopped = false` | Thu gọn Mini Bar, phát âm báo / thông báo đã hoàn thành số lần | `IDLE_READY` / `IDLE_EMPTY` |
| `AUTOCLICKING` | Nhấn phím cứng `ESC` | Phím vật lý thật | Ngắt luồng auto click tức thì < 1ms, xả phím chuột, hiển thị thông báo đã dừng [ESC] | `EMERGENCY_STOPPED` |
| `PLAYING` | Kết thúc `Repeat Count` lần | `Continuous = false` | Thu gọn Mini Bar về 38px, dọn timer, xả Ledger, đổi icon về Play | `IDLE_READY` |
| `PLAYING` | Click `Stop` hoặc `⌥⇧⌘P` | - | Thu gọn Mini Bar về 38px, ngắt luồng playback, gọi `flush_hardware_state()`, trả về sẵn sàng | `IDLE_READY` |
| `PLAYING` | Nhấn phím cứng `ESC` | Phím vật lý thật | Kích hoạt cờ ngắt khẩn cấp, Condvar đánh thức < 1ms, xả sạch Ledger, thu gọn Mini Bar | `EMERGENCY_STOPPED` |
| `EMERGENCY_STOPPED`| Tự động hoàn tất cleanup | Thời gian < 5ms | Cập nhật UI thông báo "Đã ngắt khẩn cấp an toàn", bảo toàn macro trong RAM | `IDLE_READY` |

---

## 4. Biểu đồ Tuần tự Chi tiết (Detailed Sequence Diagrams)

### 4.1. Bắt Sự kiện Thời gian Thực (Real-time Event Capture Sequence)

```text
User / Peripherals      OS Hook Callback         RingBuffer (Rust)        Compression Worker       UI State
        │                      │                        │                         │                    │
        │── Mouse Click ──────►│                        │                         │                    │
        │                      │── Pack Raw Event ─────►│                         │                    │
        │                      │   (Type, X, Y, Delta)  │                         │                    │
        │                      │◄── return CallNextHook │                         │                    │
        │                      │                        │                         │                    │
        │                      │                        │── Pop Batch Events ────►│                    │
        │                      │                        │                         │── Check Threshold  │
        │                      │                        │                         │   (Keep Click/Key) │
        │                      │                        │                         │── Append to Vector │
        │                      │                        │                         │                    │
        │── Fast Mouse Move ──►│                        │                         │                    │
        │   (100 events/sec)   │── Pack Raw Event ─────►│                         │                    │
        │                      │                        │── Pop Batch ───────────►│                    │
        │                      │                        │                         │── Adaptive Filter  │
        │                      │                        │                         │   (Giữ lại 15 mốc) │
        │                      │                        │                         │── Append to Vector │
        │                      │                        │                         │                    │
        │── Bấm Stop Rec ─────►│                        │                         │                    │
        │                      │── Unhook ──────────────┴────────────────────────►│                    │
        │                      │                                                  │── Finalize Timeline│
        │                      │                                                  │── Emit Event ─────►│
        │                      │                                                  │                    │◄── Update UI
```

---

### 4.2. Tái hiện Sự kiện & Tự Động Mở Rộng Mini Status Bar (Playback & Dynamic Mini Bar Sequence)

```text
UI (Play Click / Hotkey)  Playback Manager         Tauri Window (Resize)     Hybrid Timer Loop      OS Injector
        │                        │                         │                         │                  │
        │── start_playback ─────►│                         │                         │                  │
        │                        │── emit("playback_start")│                         │                  │
        │◄───────────────────────┤                         │                         │                  │
        │── resize(360, 62) ──────────────────────────────►│                         │                  │
        │   (Expand Mini Bar)    │                         │                         │                  │
        │                        │── Spawn Playback Thread ─────────────────────────►│                  │
        │                        │                         │                         │── Inject Events ─►
        │                        │                         │                         │   (SendInput/CG) │
        │                        │◄── Loop 1 completed ────┼─────────────────────────┤                  │
        │◄── emit("progress") ───┤                         │                         │                  │
        │    (x / X lần)         │                         │                         │                  │
        │                        │                         │                         │                  │
        │   [Hết số lần HOẶC Bấm ESC]                      │                         │                  │
        │                        │◄── Playback Ended ──────┼─────────────────────────┤                  │
        │── resize(360, 38) ──────────────────────────────►│                         │                  │
        │   (Collapse Mini Bar)  │                         │                         │                  │
        │◄── emit("playback_end")│                         │                         │                  │
```

---

### 4.3. Luồng Kiểm Tra & Cấp Quyền Trợ Năng macOS (macOS Accessibility Permission Flow)

```text
User                      UI (Rec Button)          Rust Core (Tauri)          macOS TCC Daemon       System Settings
 │                               │                         │                         │                     │
 │── Click nút Rec (Mờ) ────────►│                         │                         │                     │
 │                               │── check_permissions() ─►│                         │                     │
 │                               │                         │── AXIsProcessTrusted() ─►│                     │
 │                               │                         │◄── false ───────────────┤                     │
 │                               │◄── Permission Denied ───┤                         │                     │
 │◄── Mở PermissionModal ────────┤                         │                         │                     │
 │                               │                         │                         │                     │
 │── Click "Mở Cài đặt" ────────►│── request_permissions()►│                         │                     │
 │                               │                         │── Open URL Scheme ───────────────────────────►│
 │                               │                         │   (x-apple.systempreferences)                 │
 │── Gạt toggle VXClick ON ───────────────────────────────────────────────────────────────────────────────►│
 │                               │                         │                         │                     │
 │── Click "Khởi động lại" ─────►│── restart_app() ───────►│                         │                     │
 │                               │                         │── Relaunch Process ────►│ (Nạp token TCC mới) │
 │◄── App khởi động lại sáng Rec ┴─────────────────────────┴─────────────────────────┴─────────────────────┘
```
