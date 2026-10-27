# Business Process Specification: VXClick (`_spec1_business_process`)

> **Sản phẩm:** VXClick — Tiện ích Tự động hóa Macro Chuột & Bàn phím Siêu Tối giản  
> **Thư mục tài liệu:** `vxclick/docs/spec/`  
> **Phiên bản:** 1.0.0  
> **Ngày cập nhật:** 2026-10-14  

---

## 1. Sơ đồ SIPOC Tổng quan

Bảng phân tích SIPOC (Suppliers, Inputs, Process, Outputs, Customers) cho toàn bộ vòng đời vận hành của VXClick:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SƠ ĐỒ SIPOC VXCLICK                                  │
├───────────────┬───────────────────┬────────────────────┬──────────────────┬────────────┤
│ Suppliers     │ Inputs            │ Process (Core)     │ Outputs          │ Customers  │
├───────────────┼───────────────────┼────────────────────┼──────────────────┼────────────┤
│ 1. Người dùng │ - Thao tác chuột  │ 1. Kiểm tra quyền  │ - MacroTimeline  │ - Người    │
│    văn phòng, │   (click, move,   │    hệ thống        │   chuẩn xác      │   dùng văn │
│    tester,    │   drag, scroll)   │ 2. Thu nạp sự kiện │ - Thao tác chuột │   phòng    │
│    game thủ   │ - Thao tác phím   │    low-level hook  │   và phím tái    │ - Kỹ sư QA │
│ 2. Hệ điều    │   (down, up, mod) │ 3. Nén thích ứng   │   hiện tự động   │   kiểm thử │
│    hành       │ - Cấu hình lặp &  │ 4. Định thời và    │ - Tệp kịch bản   │ - Người    │
│    (macOS /   │   tốc độ          │    bắn sự kiện     │   `.vxclick`     │   cần auto-│
│    Windows)   │ - Phím nóng ngắt  │ 5. Mạch ngắt       │ - Báo cáo trạng  │   click    │
│               │   khẩn cấp (ESC)  │    khẩn cấp        │   thái thời gian │   lặp lại  │
└───────────────┴───────────────────┴────────────────────┴──────────────────┴────────────┘
```

---

## 2. Quy trình Nghiệp vụ Chi tiết (BPMN 2.0 & Swimlanes)

### 2.1. Quy trình 1: Chuẩn bị & Xác thực Quyền Hệ thống (Permission Onboarding & Deep Signing)

```text
User                      UI Shell (WebView)             Rust Core Backend              Operating System (OS)
 │                                │                              │                                 │
 │── Khởi chạy VXClick ──────────►│                              │                                 │
 │                                │── get_system_permissions() ─►│                                 │
 │                                │                              │── Check AXIsProcessTrusted() ──►│
 │                                │                              │◄── Status: Trusted/NotTrusted ──│
 │                                │◄── Result: Status JSON ──────│                                 │
 │                                │                              │                                 │
 │◄─ [Nếu thiếu quyền]            │                              │                                 │
 │   Nút Rec hiển thị mờ dịu mắt  │                              │                                 │
 │   (dimmed opacity-40)          │                              │                                 │
 │                                │                              │                                 │
 │── Click vào nút Rec mờ ───────►│                              │                                 │
 │   Mở PermissionModal           │── request_permissions() ────►│                                 │
 │   (3 bước + Mở Settings +      │                              │── Mở Privacy & Security ───────►│
 │    Khởi động lại ứng dụng)     │                              │   (URL scheme x-apple...)       │
 │                                │                              │                                 │
 │── Bật switch VXClick trong OS ─────────────────────────────────────────────────────────────────►│
 │                                │                              │                                 │
 │── Bấm "Khởi động lại" (hoặc) ─►│── restart_app() ────────────►│── TCC nạp token quyền mới       │
 │   Chờ auto-watcher 800ms ──────┼── Watcher polling: OK ───────┼── AXIsProcessTrusted = true ────│
 │                                │                              │                                 │
 │◄─ Tự động đóng modal, ─────────│◄── State: IDLE_EMPTY ────────│── Kích hoạt Global Hotkeys ─────│
 │   Nút Rec trở về sẵn sàng      │                              │                                 │
```

---

### 2.2. Quy trình 2: Ghi Chuỗi Thao tác (Macro Recording Lifecycle)

```text
User                      UI Shell (5-Button)            Rust Core (Capture Thread)     OS Hardware Hooks
 │                                │                              │                                 │
 │── Nhấn ⌥⇧⌘R / Ctrl+Alt+Shift+R►│                              │                                 │
 │   (hoặc click [ ● Rec ])       │── start_recording() ────────►│                                 │
 │                                │                              │── Khởi tạo Timer: t0 = now()    │
 │                                │                              │── Tạo Bounded Queue (10k slots) │
 │                                │                              │── Đăng ký Low-Level Hook ──────►│
 │                                │                              │   (WH_MOUSE_LL / CGEventTap)    │
 │◄─ Đổi icon [ ■ Stop ] đỏ, ────│                              │                                 │
 │   hiện thời gian ghi 00:xx     │                              │                                 │
 │                                │                              │                                 │
 │── [Thực hiện các thao tác: ───────────────────────────────────┼────────────────────────────────►│
 │    Click ô tính, gõ chữ, cuộn] │                              │                                 │
 │                                │                              │◄── Bắt sự kiện chuột/phím ──────│
 │                                │                              │    + timestamp_us = now() - t0  │
 │                                │                              │── try_send() vào Bounded Queue  │
 │                                │                              │── Worker: Lọc nén Adaptive      │
 │                                │                              │   (Bảo toàn nét khi Drag)       │
 │                                │                              │                                 │
 │── Nhấn lại ⌥⇧⌘R /              │                              │                                 │
 │   Ctrl+Alt+Shift+R (hoặc Stop)►│── stop_recording() ─────────►│                                 │
 │                                │                              │── Gỡ bỏ Hook hệ thống ─────────►│
 │                                │                              │── Bộ lọc Tự Loại Trừ:           │
 │                                │                              │   Bỏ qua click Stop/thanh bar   │
 │                                │                              │── Hoàn thiện MacroTimeline      │
 │                                │◄── stats: {count, duration} ─│                                 │
 │◄─ Nút Rec về lại ●, ──────────│                              │                                 │
 │   Nút Play mở sáng (Enabled)   │                              │                                 │
```

---

### 2.3. Quy trình 3: Phát lại Chuỗi Thao tác & Dynamic Mini Expand Bar

```text
User                      UI Shell (Setting & Play)      Rust Core (Playback Engine)    Target Window / OS
 │                                │                              │                                 │
 │── Cấu hình Settings:           │                              │                                 │
 │   Speed: 2.0x, Repeat: X lần   │                              │                                 │
 │── Nhấn ⌥⇧⌘P / Ctrl+Alt+Shift+P►│                              │                                 │
 │   (hoặc click [ ▶ Play ])      │── start_playback(config) ───►│                                 │
 │                                │                              │── Khởi tạo Playback Thread      │
 │                                │                              │── RAII timeBeginPeriod(1)       │
 │                                │                              │── Khởi tạo ActiveInputLedger    │
 │                                │                              │── current_loop = 1              │
 │◄─ Đổi icon [ ■ Stop ] xanh, ───│                              │                                 │
 │   Tự động MỞ RỘNG MINI BAR     │                              │                                 │
 │   dưới đáy widget:             │                              │                                 │
 │   - Nếu lặp X: "Đã lặp x/X"    │                              │                                 │
 │   - Nếu vô tận: "Press ESC"    │                              │                                 │
 │                                │                              │── [VÒNG LẶP CHO TỪNG SỰ KIỆN]   │
 │                                │                              │   target_wait = delta / speed   │
 │                                │                              │   Cancellable Wait (Condvar /   │
 │                                │                              │   chunk 5ms + spin budget 0.3ms)│
 │                                │                              │   Ghi nhận Down vào Ledger      │
 │                                │                              │   Native Inject Event ─────────►│
 │                                │                              │   dwExtraInfo = 0x5658434C      │
 │                                │                              │   Ghi nhận Up vào Ledger        │
 │                                │◄── emit progress (loop/total)│                                 │
 │                                │                              │                                 │
 │                                │                              │── [HẾT 1 LẦN GHI]               │
 │                                │                              │   Nếu current_loop < total:     │
 │                                │                              │     current_loop += 1, lặp lại  │
 │                                │                              │   Nếu Continuous = true:        │
 │                                │                              │     lặp vô tận đến khi stop     │
 │                                │                              │                                 │
 │── [Nếu bấm ESC hoặc Stop] ────►│── trigger_emergency_stop() ─►│── Quét ActiveInputLedger xả Up  │
 │                                │                              │── Đánh thức Condvar (< 1ms)     │
 │                                │                              │── RAII drop(timeBeginPeriod)    │
 │                                │◄── emit: playback_finished ──│                                 │
 │◄─ Mini Bar tự thu gọn về 38px, │                              │                                 │
 │   Nút Play trở về sẵn sàng     │                              │                                 │
```

---

### 2.4. Quy trình 4: Mạch Ngắt Khẩn cấp & Xả Ledger Input (Emergency Failsafe Circuit Break)

```text
User                      Hardware Keyboard              Failsafe Thread (Rust)         Playback Thread (Rust)
 │                                │                              │                                 │
 │ [Phát hiện macro chạy sai /    │                              │                                 │
 │  cửa sổ đích bị đóng]          │                              │                                 │
 │                                │                              │                                 │
 │── Nhấn phím cứng: ESC ────────►│                              │                                 │
 │                                │── Low-Level Key Hook ───────►│                                 │
 │                                │                              │── Kiểm tra dwExtraInfo:         │
 │                                │                              │   Bỏ qua nếu LLKHF_INJECTED     │
 │                                │                              │   Xác nhận là phím vật lý!      │
 │                                │                              │── Set ATOMIC_ABORT = true       │
 │                                │                              │── Đánh thức Condvar ngay lập tức│
 │                                │                              │                                 │
 │                                │                              │                  [Được đánh thức ngay <1ms]
 │                                │                              │                  Khóa Injector tức thì
 │                                │                              │                  Quét ActiveInputLedger:
 │                                │                              │                  - Gửi Up cho mọi key kẹt
 │                                │                              │                  - Gửi Up cho mọi mouse button
 │                                │                              │                  Làm sạch Ledger
 │                                │                              │                  Phát Event về UI:
 │                                │                              │                  emergency_stopped
 │                                │                              │                  FSM về IDLE_READY
```

---

### 2.4. Quy trình 4: Vòng đời Tự Động Nhấp Chuột (Auto Click Lifecycle)

```text
User                      UI Shell (MainBar/MiniBar)     Rust Core Engine               OS Event Tap/SendInput
 │                                │                              │                                 │
 │── Nhấn ⌥⇧⌘C / Ctrl+Alt+Shift+C►│                              │                                 │
 │   (hoặc click [ 🖱 Auto ])     │── start_autoclick(config) ──►│                                 │
 │                                │                              │── Validate SystemState:         │
 │                                │                              │   Từ chối nếu Recording/Playing │
 │                                │                              │── Khởi tạo luồng nhấp nền       │
 │                                │                              │── FSM -> AUTOCLICKING           │
 │◄─ Đổi nút Auto sang màu Amber, │◄── emit(state_changed) ──────│                                 │
 │   mở rộng Mini Bar (62px)      │                              │                                 │
 │                                │                              │── Loop:                         │
 │                                │                              │   1. get_current_mouse_loc() ──►│
 │                                │                              │   2. Inject MouseDown ─────────►│
 │                                │                              │   3. sleep 10ms                │
 │                                │                              │   4. Inject MouseUp ───────────►│
 │                                │                              │   5. Emit progress (throttled)  │
 │                                │                              │   6. Condvar wait (interval_ms) │
 │                                │                              │                                 │
 │── Bấm lại [ 🖱 Auto ] / ⌥⇧⌘C ──►│                              │                                 │
 │   (hoặc phím ESC / hết lần)    │── stop_autoclick() ─────────►│                                 │
 │                                │                              │── Đánh thức Condvar             │
 │                                │                              │── Xả sạch trạng thái chuột      │
 │                                │                              │── FSM -> IDLE_READY / EMPTY     │
 │◄─ Mini Bar thông báo đã dừng,  │◄── emit(state_changed) ──────│                                 │
 │   sau 1.2s thu gọn về 38px     │                              │                                 │
```

---

## 3. Ma trận Quyết định Nghiệp vụ (Business Decision Matrix)

### 3.1. Ma trận Xử lý Xung đột: `Continuous Playback` vs `Repeat Count`

| Trạng thái Continuous | Giá trị Repeat Count | Hành vi của Hệ thống | Trạng thái hiển thị trên Dropdown |
| :--- | :--- | :--- | :--- |
| `false` (Mặc định) | `1` (Mặc định) | Chạy đúng 1 lần rồi dừng tự động. | Ô nhập Repeat Count mở cho phép sửa (1 - 9999). |
| `false` | `N` (Ví dụ: `50`) | Chạy tuần tự 50 lần liên tiếp; dừng khi đạt 50. | Ô nhập Repeat Count hiển thị `50`. |
| `true` | Bất kỳ | Chạy lặp vô tận, bỏ qua hoàn toàn giá trị `Repeat Count`. | Ô nhập Repeat Count bị làm mờ (Disabled / Readonly) kèm chú thích "Đang lặp liên tục". |

---

### 3.2. Ma trận Quy tắc Co giãn Thời gian theo Tốc độ (`Play Speed`) & Bảo Toàn Nét Kéo (Drag Fidelity)

| Tùy chọn Tốc độ | Hệ số Nhân (`scale`) | Khoảng trễ thực tế (`target_delay`) | Xử lý sự kiện di chuột tự do | Xử lý khi đang giữ chuột (Drag Mode) |
| :--- | :--- | :--- | :--- | :--- |
| `0.5x` (Chậm lại) | `0.5` | `recorded_delta / 0.5 = 2.0 × delta` | Giữ nguyên toàn bộ các điểm di chuột, di chuyển chậm rãi trực quan. | Giữ nguyên 100% tọa độ vẽ nét. |
| `1.0x` (Mặc định) | `1.0` | `recorded_delta` (Thời gian thực) | Tái hiện nguyên vẹn theo đúng nhịp độ thao tác của người dùng. | Tái hiện nguyên vẹn 100% quỹ đạo kéo thả. |
| `2.0x` (Nhanh gấp đôi) | `2.0` | `recorded_delta / 2.0` | Bỏ bớt các điểm vi chuyển động chuột trung gian cách < 3px. | Giữ mật độ lấy mẫu cao (tối thiểu 60Hz), không ngắt quãng. |
| `5.0x` (Rất nhanh) | `5.0` | `recorded_delta / 5.0` | Bỏ qua vi chuyển động, chỉ giữ các góc đổi hướng vector. | Nén có kiểm soát, bảo toàn các điểm góc uốn lượn khi kéo. |
| `10.0x` (Siêu tốc) | `10.0` | `recorded_delta / 10.0` (Tối thiểu 1ms) | Nhảy tức thời đến vị trí click (Instant Warp) để tối ưu thời gian. | **TUYỆT ĐỐI KHÔNG WARP:** Giữ các mốc nội suy để bảo toàn thao tác vẽ/kéo thả. |

---

### 3.3. Quy tắc Sổ Đăng Ký Input & Xả Phần Cứng Toàn Diện (Active Input Ledger Rule)

Một lỗi kinh điển của các phần mềm macro tự động hóa là khi dừng giữa chừng (do người dùng bấm Stop hoặc ngắt khẩn cấp), nếu kịch bản đang ở giữa một cú nhấn phím ký tự hoặc nút chuột mà chưa nhả ra, hệ điều hành sẽ bị dính phím ảo vĩnh viễn (stuck key).

**Quy tắc bắt buộc đối với VXClick:**
1. **Duy trì Sổ Đăng Ký Đầu Vào Đang Giữ (Active Input Ledger):**
   - Mọi sự kiện `MouseDown` hoặc `KeyDown` khi inject thành công đều được ghi vào `ActiveInputLedger`.
   - Khi sự kiện `MouseUp` hoặc `KeyUp` tương ứng được inject thành công, xóa mục đó khỏi `ActiveInputLedger`.
2. **Quy trình Xả Sạch khi Dừng (Safe Hardware Flush):**
   Bất kể khi kết thúc chu kỳ bình thường, người dùng chủ động bấm Stop, hay mạch Failsafe kích hoạt:
   - *Bước 1:* Khóa ngay lập tức Playback Injector để ngăn chặn bắn thêm sự kiện.
   - *Bước 2:* Duyệt qua toàn bộ phần tử còn sót lại trong `ActiveInputLedger`:
     * Với mỗi nút chuột còn giữ: Gửi lệnh `MouseUp` tương ứng.
     * Với mỗi phím còn giữ: Gửi lệnh `KeyUp` tương ứng.
   - *Bước 3:* Quét thêm danh sách modifier keys đề phòng can thiệp (`Shift`, `Ctrl`, `Alt`, `Command / Win`).
   - *Bước 4:* Xóa sạch ledger và chuyển FSM về trạng thái `IDLE_READY` an toàn.
