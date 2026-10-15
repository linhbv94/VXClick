# VXClick — Ultra-compact Macro Recorder & Automation Engine

> **Triết lý sản phẩm:** Lấy cảm hứng từ huyền thoại **TinyTask** trên Windows, nhưng được tái thiết kế hiện đại hóa với triết lý **siêu tối giản: Thanh công cụ nổi 1 hàng tích hợp toàn bộ điều khiển**.

```text
macOS:   ┌────────────────────────────────────────────────────────────────────────┐
         │ [● ● ○]   [ ● Rec ]      [ ▶ Play ]      [ 📌 Pin ]    [ ⚙ Setting ▾ ] │
         └────────────────────────────────────────────────────────────────────────┘

Windows: ┌────────────────────────────────────────────────────────────────────────┐
         │  :::     [ ● Rec ]      [ ▶ Play ]      [ 📌 Pin ]    [ ⚙ ▾ ]   [─] [✕]│
         └────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Giới thiệu Tổng quan

**VXClick** là ứng dụng desktop cá nhân siêu nhẹ dành cho macOS và Windows, chuyên phục vụ tác vụ ghi lại và tự động phát lại các thao tác chuột và bàn phím (Macro Recorder & Automation Player).

### Điểm nhấn Khác biệt
- **Bố cục 1 hàng chuẩn zTools (`Single-Row Window Bar` 310px × 38px):** Tích hợp hoàn hảo các nút điều khiển cửa sổ native và các nút hành động macro.
  - *macOS:* Giữ cụm 3 nút Traffic Lights native ở góc trái (`pl-3`), nút Xanh (Zoom) vô hiệu hóa vì thanh widget cố định kích thước.
  - *Windows:* Tắt hoàn toàn titlebar native (`decorations: false`, không double bar), mép trái có Drag handle `:::`, mép phải có nút Thu nhỏ `─` và Đóng `✕`.
- **Nút Pin (Always on Top) 1-Chạm:** Đưa trực tiếp ra ngoài thanh chính cạnh Setting để ghim/bỏ ghim tức thì.
- **Cụm 4 nút cốt lõi:** `Rec` (Ghi / Dừng ghi — Phím `F9`), `Play` (Phát lại / Dừng phát — Phím `F8`), `Pin` (Ghim nổi), `Setting` (Menu tùy chọn nhanh).
  1. `Play Speed`: Tốc độ phát lại (`0.5x`, `1.0x`, `2.0x`, `5.0x`, `10.0x`, `Custom...`).
  2. `Continuous Playback`: Công tắc lặp vô tận (Boolean switch).
  3. `Repeat Count`: Ô nhập số lần lặp cụ thể (tự động khóa mờ khi bật lặp vô tận).
  4. `About`: Giới thiệu phần mềm, tác giả Bùi Việt Linh và hệ sinh thái zTools.
  5. `Ủng hộ tác giả`: Card mã QR VietQR (Vietcombank) nền trắng sắc nét đặt ở vị trí trung tâm chuẩn zTools.
- **Engine Tầng Sâu Siêu Nhẹ (Rust Native):** Hoạt động trực tiếp ở tầng OS API, độ chính xác cấp micro-giây, chống kẹt phím toàn diện bằng `ActiveInputLedger` và có mạch ngắt khẩn cấp bằng phím cứng `ESC`.

---

## 2. Bản đồ Bộ Tài liệu Đặc tả Kỹ thuật (Specification Suite)

Toàn bộ hệ thống kỹ thuật của VXClick được đặc tả đầy đủ qua 8 tài liệu chuyên sâu:

| Tài liệu | Nội dung Chính | Liên kết |
| :--- | :--- | :--- |
| **Product Scope v1.0** | Tôn chỉ, ranh giới sản phẩm, các use cases cốt lõi và ma trận tính năng P0/P1/P2 | [vxclick_scope_v1_0.md](vxclick_scope_v1_0.md) |
| **00. System Overview** | Kiến trúc 3 tầng, ma trận độ khó kỹ thuật, Bounded Queue và Cancellable Wait | [00_system_overview.md](docs/spec/00_system_overview.md) |
| **01. Business Process** | Sơ đồ SIPOC, luồng nghiệp vụ BPMN 2.0, Active Input Ledger và ma trận tốc độ | [01_business_process.md](docs/spec/01_business_process.md) |
| **02. Feature Flow** | Luồng người dùng, FSM 7 trạng thái, sequence diagram Cancellable Wait | [02_feature_flow.md](docs/spec/02_feature_flow.md) |
| **03. UI & Wireframe** | Thiết kế thanh nổi 310px × 38px, Traffic Lights, cửa sổ mở rộng Dynamic Height | [03_ui_wireframe.md](docs/spec/03_ui_wireframe.md) |
| **04. API & Data** | Tauri v2 IPC Contracts, timestamp micro-giây, nén Drag Mode, wire format .vxclick | [04_api_data.md](docs/spec/04_api_data.md) |
| **05. QA & Acceptance** | Tiêu chuẩn Gherkin (F9/F8/ESC), ma trận 15 tình huống biên (Edge Cases) khắc nghiệt | [05_qa_acceptance.md](docs/spec/05_qa_acceptance.md) |
| **06. Demo Presentation** | Kịch bản demo 3 phút: điền bảng tính tự nhảy dòng, siêu tốc 5x, ngắt khẩn cấp ESC | [06_demo_presentation.md](docs/spec/06_demo_presentation.md) |

---

## 3. "Cái Khó Nằm Ở Engine Bên Dưới" — Phân Tích & Giải Pháp

Như nhận định trong đề bài, giao diện của VXClick siêu đơn giản, nhưng **toàn bộ thách thức kỹ thuật sống còn nằm ở Engine Rust bên dưới**:

### 1. Bắt Sự kiện Tầng thấp (Low-Level Hooks) & Chống Tràn Bộ Nhớ (Bounded Queue)
- **Vấn đề:** Trên Windows, hàm `SetWindowsHookExW` với `WH_MOUSE_LL`/`WH_KEYBOARD_LL` sẽ bị hệ điều hành tự động ngắt (`LowLevelHooksTimeout` từ 200ms đến 1000ms) nếu callback xử lý chậm. Nếu dùng queue không giới hạn (`unbounded`), recording kéo dài sẽ làm phình to RAM gây OOM.
- **Giải pháp:** Tách riêng Hook Callback thread; sử dụng **Hàng đợi Giới hạn Cấp phát Trước (Bounded Queue 10.000 slots)** qua `try_send()`. Callback thực thi < 5 micro-giây, không cấp phát heap. Nếu hàng đợi đầy: ưu tiên nén gộp `MouseMove`, bảo toàn 100% click và phím.

### 2. Bù trừ Sai lệch Tọa độ Đa Màn hình & Tỉ lệ HiDPI / Retina
- **Vấn đề:** Chuột di chuyển giữa màn hình Retina (2x scale) và màn hình ngoài 4K/Full HD có tỉ lệ scale khác nhau. Nếu dùng tọa độ thô, khi phát lại qua `SendInput` (Windows) hoặc `CGEventPost` (macOS), con trỏ chuột sẽ bị lệch vị trí, click trượt toàn bộ các nút bấm.
- **Giải pháp:** Trên Windows dùng tọa độ pixel trong Virtual Desktop kết hợp `MOUSEEVENTF_VIRTUALDESK | MOUSEEVENTF_ABSOLUTE` trong tiến trình Per-Monitor DPI Aware V2. Trên macOS dùng Quartz Global Screen Points chuẩn xác.

### 3. Bộ Định thời Lai Có Thể Hủy (Cancellable Wait & Spin Budget)
- **Vấn đề:** `thread::sleep` thông thường không thể bị đánh thức bởi atomic flag (nếu khoảng nghỉ 15 giây thì thread sẽ ngủ suốt 15 giây dù đã bấm Stop). Ngược lại, nếu spin-wait quá nhiều (1-2ms mỗi event) sẽ ngốn trọn 100% 1 lõi CPU.
- **Giải pháp:** Áp dụng **Cancellable Wait** (`sync::Condvar` hoặc chunk 5ms kiểm tra cờ ngắt). Khi có lệnh Stop/ESC, thread được đánh thức ngay trong vòng < 1ms. Giới hạn Spin Budget tối đa 0.2ms - 0.5ms cuối cùng. Bọc `timeBeginPeriod(1)` trong RAII guard.

### 4. Mạch Ngắt Khẩn Cấp Toàn Diện & Sổ Đăng Ký Input (`ActiveInputLedger`)
- **Vấn đề:** Khi chạy tốc độ cao hoặc lặp vô tận, nếu dừng giữa chừng khi macro đang giữ phím thường (ví dụ: 'W', Space) hoặc nút chuột, phím đó sẽ bị kẹt vĩnh viễn trên OS. Ngoài ra, nếu macro tự phát phím ESC, macro có thể tự ngắt chính nó.
- **Giải pháp:** Duy trì `ActiveInputLedger` lưu mọi phím/nút chuột đang ở trạng thái Down. Khi ngắt, hệ thống khóa Injector và xả sạch toàn bộ phím/nút trong Ledger. Luồng Failsafe kiểm tra cờ `LLKHF_INJECTED` và `dwExtraInfo`, chỉ tiếp nhận phím cứng ESC từ bàn phím vật lý thực của người dùng.

### 5. Thuật toán Nén Thích ứng Bảo Toàn Thao Tác Vẽ & Kéo Thả (Drag Fidelity)
- **Vấn đề:** Chuột gaming 1000Hz phát sinh hàng vạn sự kiện. Nhưng nếu nén thô bạo hoặc nhảy cóc (instant warp ở 10x), các thao tác vẽ nét, kéo thả tệp (Drag & Drop) hoặc bôi đen văn bản sẽ bị đứt gãy.
- **Giải pháp:** Tự động nhận diện trạng thái **Drag Mode** (khi có nút chuột đang Down): giữ lại 100% tọa độ tại MouseDown, MouseUp và duy trì tần số lấy mẫu cao (60Hz - 120Hz), tuyệt đối không nhảy cóc khi đang kéo thả. Áp dụng bộ lọc Tự Loại Trừ (Self-exclusion) để không ghi nhận các cú click vào chính thanh công cụ VXClick.
