# System Specification Overview: VXClick (`_spec0_system`)

> **Tên sản phẩm:** VXClick (Ultra-compact Desktop Macro Recorder & Automation Engine)  
> **Thư mục dự án:** `vxclick`  
> **Tên sản phẩm:** VXClick (Ultra-compact Desktop Macro Recorder & Automation Engine)  
> **Thư mục dự án:** `vxclick`  
> **Phiên bản tài liệu:** 1.1.0  
> **Ngày cập nhật:** 2026-10-15  
> **Nền tảng mục tiêu:** macOS (Apple Silicon & Intel) + Windows 11/10 (x64)  
> **Kiến trúc phân tầng:**
> - **Tầng 1 (UI Shell — Single-Row Widget Siêu Tối Giản):** Tauri v2 WebView (React 19 + TypeScript + Vite + Tailwind CSS) tuân thủ nghiêm ngặt [master_theme.md](../../../_summary/master_theme.md) và [desktop_ui_standards.md](../../../.agents/desktop_ui_standards.md). Cửa sổ dạng Floating Bar kích thước `360px × 38px`, chừa vùng đệm Traffic Lights native macOS `54×38px` căn giữa dọc pixel-perfect, Drag Handle kéo thả native, cùng 5 nút cốt lõi: `Rec`, `Play`, `Auto Click` (Semantic Amber), `Pin` (Always on Top đưa ra ngoài), `Setting`. Hỗ trợ Dark/Light/System theme và Song ngữ Vi/En. Tự động expand Mini Status Bar khi Playback hoặc Auto Click (hiển thị tiến trình lặp x/X lần hoặc nhắc nhở ESC khi lặp vô tận).
> - **Tầng 2 (Macro Core Engine — 100% Rust Native):**
>   - *Bộ thu nạp sự kiện (Event Capture Engine):* Sử dụng Lock-free Ring Buffer (`crossbeam-channel`) thu nhận các sự kiện chuột và phím thời gian thực, chống hiện tượng nghẽn luồng (thread blocking).
>   - *Bộ nén thích ứng di chuyển chuột & Tự loại trừ (Adaptive Compression & Self-Exclusion):* Loại bỏ vi rung (< 3px & < 16ms), duy trì tần số lấy mẫu 60Hz-120Hz mượt nét vẽ trong Drag Mode, tự động lọc click vào thanh widget của app.
>   - *Bộ định thời lai chính xác cao (High-Precision Hybrid Timer):* Kết hợp giữa `Condvar::wait_timeout` và Spin-wait 300µs cuối có độ chính xác cao, đáp ứng ngắt khẩn cấp < 1ms.
>   - *Mạch ngắt khẩn cấp & Sổ đăng ký phần cứng (ActiveInputLedger & Failsafe):* Tự động xả sạch (phát Up) cho mọi phím và nút chuột đang giữ dở dang để triệt tiêu nguy cơ dính phím/kẹt chuột. Lắng nghe phím cứng toàn cục `ESC` khi Playback để ngắt tức thì.
>   - *Bộ điều khiển tốc độ và vòng lặp (Speed & Loop Controller):* Co giãn delta thời gian chuẩn xác theo hệ số tốc độ (`0.5x` → `50.0x`) và xử lý chuyển đổi giữa `Repeat Count` và `Continuous Playback`.
> - **Tầng 3 (Platform Native Hooks & Event Injection — Đặc thù OS):**
>   - *Trên macOS:* Sử dụng Quartz Event Services (`CGEventTapCreate`, `CGEventPost`, `CFRunLoop`), gắn định danh `0x5658434C` ("VXCL") tránh vòng lặp tự bắt. Quản lý quyền Accessibility (`AXIsProcessTrusted`), cơ chế ký số ổn định bằng Certificate-bound Designated Requirement (dùng local Code Signing Identity `FE024021592C718A39AD70B76D2EDC5DA0CD6B70` từ Keychain, thay thế ad-hoc codesign `cdhash`) bảo đảm giữ quyền TCC vĩnh viễn qua mọi lần rebuild/update, auto-watcher 800ms và command `restart_app` để nạp token quyền.
>   - *Trên Windows:* Kiến trúc module hóa tách biệt (`platform/windows.rs`). Cung cấp Windows Dummy Engine cho phép đóng gói bộ cài `.exe` (NSIS `currentUser`), chạy mượt mà giao diện đầy đủ (Single-Row Widget, Settings, Theme, Pin, Always on Top) mà không bị khóa quyền hay crash. Sẵn sàng cho việc nâng cấp Win32 Hooks (`SetWindowsHookExW` với `WH_MOUSE_LL`, `WH_KEYBOARD_LL`) và `SendInput` qua tính năng cập nhật tự động (Auto-Update).

---

## 1. Bối cảnh & Tôn chỉ Sản phẩm (Product Vision)

### 1.1. Nỗi đau thực tế (The Real Pain Point)
Trong các tác vụ văn phòng, kiểm thử phần mềm, nhập liệu bảng tính hoặc chơi game, người dùng máy tính thường xuyên phải thực hiện hàng trăm, hàng nghìn thao tác lặp đi lặp lại vô cùng nhàm chán:
- Click chuột vào đúng một vị trí định kỳ.
- Sao chép ô dữ liệu, chuyển ứng dụng, dán, bấm phím điều hướng và lưu.
- Giữ trạng thái hoạt động của máy tính để chống ngủ màn hình (AFK / Keep-alive).

Các giải pháp hiện có trên thị trường bộc lộ nhiều hạn chế nghiêm trọng:
1. **Phần mềm chuyên nghiệp quá nặng nề và phức tạp (AutoHotkey, Sikuli, PyAutoGUI):** Đòi hỏi người dùng phải biết viết code, cấu hình môi trường, cài đặt Python hoặc học cú pháp kịch bản rối rắm.
2. **TinyTask (Huyền thoại trên Windows):**
   - Chỉ hoạt động trên Windows, hoàn toàn vắng bóng trên macOS.
   - Giao diện thiết kế từ thời Windows XP (Win32 GDI cổ điển), thiếu tính thẩm mỹ và không hỗ trợ Dark Mode.
   - Vẫn còn chứa quá nhiều nút phụ (Open, Save, Record, Play, Compile to EXE, Prefs) khiến thanh công cụ bị phân tán.
3. **Các Auto-Clicker trôi nổi trên mạng:** Thường dính phần mềm quảng cáo (adware), giao diện lộn xộn, không có tính năng ghi lại chuỗi thao tác chuột kèm bàn phím, thiếu cơ chế an toàn ngắt khẩn cấp khiến máy bị treo đơ chuột.

### 1.2. Sứ mệnh của VXClick
VXClick sinh ra để trở thành **tiện ích tự động hóa macro chuột/phím tối giản nhất thế giới**:
- **Cực kỳ tinh gọn:** 5 nút bấm cốt lõi trên màn hình (`Rec`, `Play`, `Auto Click`, `Pin`, `Setting`). Mở lên là dùng ngay, không cần đọc hướng dẫn.
- **Hiện đại & Đẹp mắt:** Giao diện Slate Navy hiện đại, hỗ trợ Dark Mode hoàn hảo, ghim nổi mượt mà trên desktop kích thước siêu nhỏ 360×38px.
- **Mạnh mẽ ở tầng sâu:** Động cơ Rust xử lý hook tầng thấp với độ chính xác cấp micro-giây, an toàn tuyệt đối, không tiêu tốn tài nguyên CPU.

---

## 2. Ma trận Độ khó Kỹ thuật & Giải pháp Kiến trúc (Difficulty Matrix)

Dưới đây là ma trận phân tích các thách thức kỹ thuật cốt lõi giải thích vì sao "cái khó nằm ở engine bên dưới":

```text
┌────────────────────────────────────────────────────────────────────────┐
│               MA TRẬN ĐỘ KHÓ KỸ THUẬT (DIFFICULTY MATRIX)              │
├────────────────────────┬─────────────┬─────────────────────────────────┤
│ Hạng mục Kỹ thuật      │ Mức độ khó  │ Rủi ro / Thách thức cốt lõi     │
├────────────────────────┼─────────────┼─────────────────────────────────┤
│ 1. Low-Level Event Hook│ ★★★★★ (9/10)│ Lag UI, bị OS unhook do timeout,│
│    (macOS & Windows)   │             │ thiếu quyền Accessibility/TCC   │
├────────────────────────┼─────────────┼─────────────────────────────────┤
│ 2. DPI & Multi-Monitor │ ★★★★☆ (8.5) │ Lệch tọa độ chuột trên Retina / │
│    Coordinate Mapping  │             │ màn hình 4K tỉ lệ scale khác nhau│
├────────────────────────┼─────────────┼─────────────────────────────────┤
│ 3. High-Precision Timer│ ★★★★☆ (8.5) │ Độ trễ sleep bị co giãn bởi OS  │
│    & Speed Scaling     │             │ scheduler (15.6ms trên Windows) │
├────────────────────────┼─────────────┼─────────────────────────────────┤
│ 4. Emergency Failsafe  │ ★★★★☆ (8/10)│ Kẹt chuột vòng lặp vô tận không │
│    Circuit Breaker     │             │ thể bấm dừng trên màn hình      │
├────────────────────────┼─────────────┼─────────────────────────────────┤
│ 5. Adaptive Event      │ ★★★☆☆ (7.5) │ Tràn bộ nhớ do hàng vạn sự kiện │
│    Compression (Move)  │             │ di chuột 120Hz/240Hz polling    │
└────────────────────────┴─────────────┴─────────────────────────────────┘
```

---

### Điểm khó 1: Bắt Sự kiện Tầng thấp (Low-Level Hooks) & Hàng Đợi Hữu Hạn (Độ khó: 9/10)
* **Vấn đề kỹ thuật:**
  - *Trên Windows:* Hàm `SetWindowsHookExW` với `WH_MOUSE_LL` và `WH_KEYBOARD_LL` chạy trên một thread có Message Loop. Hệ điều hành Windows áp dụng cơ chế giám sát `LowLevelHooksTimeout` (từ 200ms đến trần 1000ms tùy cấu hình Registry). Nếu hàm callback bị block hoặc xử lý chậm, Windows sẽ **âm thầm gỡ bỏ hook (silent unhook)** mà không thông báo lỗi.
  - *Trên macOS:* `CGEventTapCreate` yêu cầu quyền Accessibility (`AXIsProcessTrusted`) và Input Monitoring (`CGPreflightListenEventAccess`, `CGPreflightPostEventAccess`). Ngoài ra, nếu hệ thống bật *Secure Event Input* (khi người dùng focus vào ô nhập mật khẩu), OS sẽ chủ động vô hiệu hóa tap bàn phím để bảo mật.
  - *Nguy cơ tràn bộ nhớ:* Nếu dùng queue không giới hạn (`unbounded`), khi worker xử lý chậm hoặc recording kéo dài với chuột gaming 1000Hz, dung lượng RAM sẽ phình to không kiểm soát gây OOM (Out-of-Memory).
* **Giải pháp kiến trúc:**
  - Tách biệt luồng thu thập (Capture Thread) và luồng xử lý (Worker Thread).
  - Tầng callback sử dụng **Hàng đợi Giới hạn Cấp phát Trước (Bounded Pre-allocated Queue)** qua `crossbeam_channel::bounded(10_000)` với phương thức không chặn `try_send()`. Thời gian thực thi callback luôn được duy trì < 5 micro-giây, tuyệt đối không cấp phát heap trong hook callback.
  - **Chính sách tràn bộ nhớ (Overflow Policy):**
    - Nếu queue đầy: Hệ thống ưu tiên tự động nén gộp (coalesce) các sự kiện `MouseMove`.
    - Mọi sự kiện Click (`MouseDown`, `MouseUp`) và Phím (`KeyDown`, `KeyUp`) **bắt buộc được bảo toàn 100%**, không bao giờ bị drop âm thầm.
    - Nếu hàng đợi vẫn bị quá tải sự kiện click/phím, hệ thống tự động dừng ghi an toàn và đánh dấu bản ghi không hợp lệ kèm thông báo cho người dùng.

---

### Điểm khó 2: Hệ Tọa độ Đa Màn hình Chuẩn xác & DPI Awareness (Độ khó: 8.5/10)
* **Vấn đề kỹ thuật:**
  - *Trên Windows:* Khi thiết lập nhiều màn hình với độ phân giải và tỉ lệ scale khác nhau (ví dụ: Màn hình 1 4K tỉ lệ 150%, Màn hình 2 Full HD tỉ lệ 100% đặt bên trái có tọa độ âm). Khi phát lại qua `SendInput`, nếu chỉ dùng cờ `MOUSEEVENTF_ABSOLUTE`, Windows sẽ mặc định ánh xạ về màn hình chính (Primary Display), làm lệch hoàn toàn tọa độ trên các màn hình phụ.
  - *Trên macOS:* Retina Display dùng điểm logic (Points) trong khi phần cứng dùng điểm vật lý (Pixels). Tọa độ Quartz Global Screen Space có gốc `(0,0)` ở góc trên-trái của Main Display. Nếu nhầm lẫn giữa pixel vật lý và logic point, chuột sẽ bay lệch gấp đôi vị trí thực tế trên màn hình Retina 2x.
* **Giải pháp kiến trúc:**
  - *Trên Windows:* Khai báo tiến trình DPI-Aware V2 (`DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2`). Khi phát lại, kết hợp bắt buộc cặp cờ:
    `MOUSEEVENTF_VIRTUALDESK | MOUSEEVENTF_ABSOLUTE`
    Tọa độ được quy đổi chuẩn xác theo toàn bộ Virtual Desktop: `normalized_x = (x - SM_XVIRTUALSCREEN) * 65535 / SM_CXVIRTUALSCREEN`.
  - *Trên macOS:* Lưu trữ và phát lại thuần nhất theo **Quartz Global Screen Points** (không nhân tỉ lệ scale màn hình một cách tùy tiện).
  - Bản ghi macro lưu kèm thông số Topology màn hình (độ phân giải, bounds của từng display) tại thời điểm ghi để kiểm tra tính tương thích trước khi phát lại.

---

### Điểm khó 3: Bộ Định thời Lai Có Thể Hủy (Cancellable Hybrid Timer) & Giới Hạn Spin (Độ khó: 8.5/10)
* **Vấn đề kỹ thuật:**
  - Hàm `std::thread::sleep` thông thường của Rust **không thể bị đánh thức bởi cờ atomic**. Nếu macro có một khoảng nghỉ dài 10 giây giữa hai thao tác, gọi `sleep(10s)` sẽ khiến thread bị treo cứng suốt 10 giây trước khi có thể kiểm tra cờ dừng, làm tê liệt nút Stop và phím ngắt khẩn cấp.
  - Ngược lại, nếu lạm dụng Spin-wait (vòng lặp bận) quá nhiều (1-2ms cho mỗi sự kiện), ở tốc độ cao hoặc macro dày đặc, CPU sẽ bị chiếm trọn 100% của một lõi xử lý, gây nóng máy và quạt rú.
* **Giải pháp kiến trúc:**
  - Sử dụng **Cơ chế Chờ Có thể Hủy (Cancellable Wait)**:
    - Đối với khoảng chờ `delta > 5ms`: Chia nhỏ khoảng nghỉ thành các chu kỳ ngắn (ví dụ mỗi nhịp 5ms) kết hợp kiểm tra `ATOMIC_ABORT_FLAG`, hoặc sử dụng `std::sync::Condvar::wait_timeout()`. Khi có tín hiệu Stop hoặc ESC, thread được đánh thức ngay lập tức trong vòng < 1ms.
    - **Giới hạn ngân sách Spin (Spin Budget Guard):** Chỉ áp dụng spin-loop cho tối đa **0.2ms - 0.5ms** cuối cùng trước deadline, kết hợp chỉ thị vi xử lý `std::hint::spin_loop()`.
  - Trên Windows, bọc `timeBeginPeriod(1)` và `timeEndPeriod(1)` trong một **RAII Guard struct** để đảm bảo luôn khôi phục timer hệ thống trên mọi đường thoát (kể cả khi panic hoặc ngắt khẩn cấp).

---

### Điểm khó 4: Mạch Ngắt Khẩn cấp Toàn Diện & Sổ Đăng Ký Input (Active Input Ledger) (Độ khó: 8/10)
* **Vấn đề kỹ thuật:**
  - Khi macro chạy tự động, nếu chỉ nhả cố định 3 nút chuột và các phím modifier (`Ctrl/Alt/Shift`) khi dừng: nếu kịch bản dừng ngay giữa lúc đang giữ một phím ký tự (ví dụ phím `A`, `W` hoặc Space) hoặc nút chuột phụ (XButton1), phím đó sẽ bị dính kẹt vĩnh viễn trên OS.
  - Nếu macro vô tình phát lại một thao tác có chứa phím `ESC`, tín hiệu này có thể bị chính luồng Failsafe hiểu nhầm là lệnh ngắt từ người dùng thật.
* **Giải pháp kiến trúc:**
  - **Sổ Đăng Ký Input Đang Giữ (Active Input Ledger):**
    Rust Engine duy trì một cấu trúc `ActiveInputLedger` ghi nhận danh sách động mọi phím và nút chuột mà engine **đã inject Down thành công nhưng chưa inject Up**.
  - **Quy trình Xả Phần Cứng An Toàn (Safe Hardware Flush):**
    Khi nhận tín hiệu Stop (từ UI, hoàn tất kịch bản, hoặc phím ngắt ESC):
    1. *Bước 1:* Khóa ngay lập tức luồng Injector (chặn không cho bắn thêm bất kỳ sự kiện nào mới).
    2. *Bước 2:* Quét toàn bộ `ActiveInputLedger` và gửi lệnh `Up` giải phóng cho từng phím/nút chuột đang bị giữ dở dang.
    3. *Bước 3:* Chuyển trạng thái FSM về `IDLE_READY` và thông báo cho UI.
  - **Phân biệt Nguồn Phím Tự Động vs Phím Vật Lý Thật:**
    Trên macOS và Windows, khi inject phím/chuột, gán giá trị nhận diện `0x5658434C` (mã ASCII "VXCL"). Luồng Hook ngắt khẩn cấp kiểm tra định danh: **chỉ chấp nhận phím ESC từ bàn phím vật lý thực sự của người dùng**, bỏ qua phím do phần mềm tự phát.
  - **Quy chuẩn Phím tắt Toàn cầu Duy nhất (Zero-Conflict Hotkeys — Đồng nhất Mac & Win):**
    - **Ghi / Dừng Ghi (Rec / Stop Recording):** `⌥ + ⇧ + ⌘ + R` (macOS: `Option + Shift + Command + R`) ⟷ `Ctrl + Alt + Shift + R` (Windows). Cơ chế toggle 2 chiều.
    - **Phát / Dừng Phát (Play / Stop Playback):** `⌥ + ⇧ + ⌘ + P` (macOS: `Option + Shift + Command + P`) ⟷ `Ctrl + Alt + Shift + P` (Windows). Cơ chế toggle 2 chiều.
    - **Tự động Nhấp Chuột (Auto Click / Stop Auto Click):** `⌥ + ⇧ + ⌘ + C` (macOS: `Option + Shift + Command + C`) ⟷ `Ctrl + Alt + Shift + C` (Windows). Cơ chế toggle 2 chiều.
    - **Ngắt khẩn cấp (Emergency Failsafe):** `ESC` (có hiệu lực khi đang Playback hoặc Auto Click). Tuyệt đối không dùng `ESC` để dừng ghi nhằm tránh nuốt phím khi người dùng đang thao tác thực tế trong các ứng dụng khác.

---

### Điểm khó 5: Thuật toán Nén Bảo Toàn Nét Vẽ & Kéo Thả (Drag Fidelity Adaptive Sampling) (Độ khó: 7.5/10)
* **Vấn đề kỹ thuật:**
  - Chuột gaming 1000Hz tạo ra lượng dữ liệu khổng lồ. Tuy nhiên, nếu nén thô bạo hoặc nhảy cóc (instant warp) ở tốc độ cao, các thao tác bôi đen văn bản, kéo thả tệp (Drag & Drop), hoặc vẽ nét trong Photoshop sẽ bị đứt đoạn, mất toàn bộ quỹ đạo kéo.
* **Giải pháp kiến trúc:**
  - Thuật toán nén thích ứng phân biệt rõ hai trạng thái:
    - **Trạng thái Di Chuột Tự Do (No Button Pressed):** Lọc mạnh theo khoảng cách (> 3px) và thời gian (> 16ms), bỏ qua các vi rung lắc để tiết kiệm bộ nhớ.
    - **Trạng thái Đang Giữ Chuột (Drag Mode — Có nút chuột ở trạng thái Down):** Tự động chuyển sang chế độ **Conservative Sampling (Bảo toàn quỹ đạo cao)**:
      * Bắt buộc giữ lại 100% tọa độ ngay trước và sau thời điểm `MouseDown` / `MouseUp`.
      * Tăng tần số lấy mẫu lên tối thiểu 60Hz-120Hz dọc theo đường kéo.
      * Tuyệt đối KHÔNG nhảy cóc (instant warp) khi đang ở trạng thái Drag, bảo toàn toàn vẹn hành vi kéo thả và vẽ nét.
  - **Bộ Lọc Tự Loại Trừ (Self-exclusion Filter):** Toàn bộ các thao tác click vào cửa sổ thanh công cụ của `vxclick` (bấm nút Stop, nút Pin, kéo cửa sổ) tự động bị lọc bỏ khỏi bản ghi, tránh việc phát lại tự click vào chính mình.

---

## 3. Kiến trúc Luồng Thực thi (Threading Architecture)

Sơ đồ phân chia trách nhiệm đa luồng trong tiến trình Rust Native của VXClick:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   TIẾN TRÌNH ỨNG DỤNG VXCLICK (RUST CORE)              │
│                                                                        │
│  ┌───────────────────────┐          Tauri IPC          ┌────────────┐  │
│  │   UI WebView Thread   │ ◄─────────────────────────► │ Main Event │  │
│  │ (React 19 / TS Widget)│  (Commands / State Events)  │ Loop (Rust)│  │
│  └───────────────────────┘                             └─────┬──────┘  │
│                                                              │         │
│          ┌───────────────────────────────────────────────────┴──┐      │
│          ▼                                                      ▼      │
│  ┌────────────────────────┐                          ┌──────────────┐  │
│  │  Capture Hook Thread   │                          │Playback Thread│ │
│  │  (Win32 LL / CGEvent)  │                          │(Hybrid Timer)│  │
│  └───────────┬────────────┘                          └──────┬───────┘  │
│              │ Lock-free RingBuffer                         │          │
│              ▼                                              ▼          │
│  ┌────────────────────────┐                          ┌──────────────┐  │
│  │  Adaptive Compression  │ ────── MacroTimeline ──► │Native Event  │  │
│  │     Worker Thread      │                          │  Injector    │  │
│  └────────────────────────┘                          └──────────────┘  │
│                                                             ▲          │
│  ┌──────────────────────────────────────────────────────────┴───────┐  │
│  │  Failsafe & Permission Watcher Thread (ESC / AXIsProcessTrusted) │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Đặc tả An toàn & Quyền hạn Hệ điều hành (Security & OS Permissions)

1. **macOS Gatekeeper, TCC Policy & Deep Code Signing:**
   - Ứng dụng yêu cầu quyền Trợ năng (Accessibility API qua `AXIsProcessTrusted`).
   - Khi khởi động, nếu thiếu quyền:
     - FSM chuyển sang `PERMISSION_BLOCKED`.
     - Nút `Rec` hiển thị ở trạng thái **mờ dịu mắt (dimmed / opacity-40)**, không dùng màu vàng/amber rực rỡ hay hiệu ứng ping gây rối thị giác. Người dùng bấm vào nút Rec sẽ mở `PermissionModal`.
     - Hộp thoại `PermissionModal` cung cấp hướng dẫn 3 bước trực quan, nút 1-chạm mở trực tiếp `Privacy & Security -> Accessibility`, và nút **"Khởi động lại ứng dụng"** (Relaunch 1-chạm qua Tauri command `restart_app`) để hỗ trợ nạp lại token quyền ngay khi user đã bật toggle trong Cài đặt Hệ thống.
     - Luồng nền `init_permission_watcher` kiểm tra quyền mỗi 800ms kết hợp listener `focus` ở frontend giúp mở khóa tức thì (Zero-Restart) ngay khi quyền sẵn sàng.
   - **Quy chuẩn Ký số Bắt buộc (Deep Ad-hoc Code Signing):** Do macOS TCC quản lý quyền qua Code Signing Requirement (CSReq), bundle `VXClick.app` bắt buộc phải được ký bằng `codesign --force --deep --sign -` sau khi build để đạt trạng thái `valid on disk` và `satisfies its Designated Requirement`, ngăn chặn triệt để lỗi toggle bật nhưng OS không cấp quyền.
2. **Đặc tả Mini Status Bar Tự Động Mở Rộng Khi Playback / Auto Click (Dynamic Status Bar):**
   - Khi ứng dụng chuyển sang trạng thái `PLAYING` hoặc `AUTOCLICKING`: Cửa sổ widget tự động mở rộng thêm một mini status bar nhỏ bên dưới thanh chính:
     - **Trường hợp 1 (Playback Macro — Repeat Count):** Hiển thị trạng thái tiến trình `Đã lặp x / X lần` kèm thanh tiến trình 2px sắc nét dưới đáy.
     - **Trường hợp 2 (Playback Macro — Lặp vô tận):** Hiển thị dòng trạng thái / tooltip: `Đang lặp liên tục • Nhấn ESC để dừng` (Press ESC to stop).
     - **Trường hợp 3 (Auto Click — Repeat Count):** Hiển thị tiến trình `Đã nhấp x / X lần` kèm thanh tiến trình màu hổ phách (amber).
     - **Trường hợp 4 (Auto Click — Until Stopped):** Hiển thị trạng thái `Đang tự nhấp #x • ESC để dừng`.
   - Khi dừng phát lại hoặc dừng auto click (hoàn tất hoặc bấm Stop/ESC), thanh mini tự động thu gọn về đúng kích thước chuẩn `360×38px`.
3. **An toàn Dữ liệu Tuyệt đối:**
   - Không chứa bất kỳ module mạng (Network Stack) nào ra ngoài internet.
   - Toàn bộ chuỗi macro chỉ lưu trong bộ nhớ tạm (RAM) của phiên làm việc.
