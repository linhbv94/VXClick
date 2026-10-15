# VXClick — Product Scope v1.0

## 1. Định nghĩa Sản phẩm (Product Definition)

**VXClick** là tiện ích desktop siêu nhẹ, tối giản dành cho macOS và Windows, chuyên phục vụ tác vụ **tự động ghi và phát lại chuỗi thao tác chuột và bàn phím (Macro Recorder & Automation Player)**.

Lấy cảm hứng từ huyền thoại **TinyTask** trên Windows nhưng được tái định nghĩa với triết lý thẩm mỹ hiện đại, loại bỏ toàn bộ các thanh menu rườm rà, đưa giao diện người dùng về trạng thái **tối giản tuyệt đối: chỉ vỏn vẹn 3 nút bấm** trên một thanh công cụ nổi (Floating Mini-bar):
1. **Rec** (Ghi / Dừng ghi thao tác)
2. **Play** (Phát lại / Dừng phát macro)
3. **Setting** (Menu dropdown thiết lập nhanh)

```text
macOS:   ┌────────────────────────────────────────────────────────────────────────┐
         │ [● ● ○]   [ ● Rec ]      [ ▶ Play ]      [ 📌 Pin ]    [ ⚙ Setting ▾ ] │
         └────────────────────────────────────────────────────────────────────────┘

Windows: ┌────────────────────────────────────────────────────────────────────────┐
         │  :::     [ ● Rec ]      [ ▶ Play ]      [ 📌 Pin ]    [ ⚙ ▾ ]   [─] [✕]│
         └────────────────────────────────────────────────────────────────────────┘
```

### Nguyên tắc Cốt lõi (Core Principles)
1. **Zero Clutter (Không thừa thãi):** Không menu bar phức tạp, không thanh trạng thái cồng kềnh. Thanh điều khiển chỉ rộng `310px × 38px`, gom trọn cụm điều khiển cửa sổ và các nút hành động cốt lõi trên đúng một hàng duy nhất.
2. **Cross-Platform Parity (Đa nền tảng chuẩn mực):**
   - *Trên macOS:* Giữ cụm **3 nút Traffic Lights native** ở góc trái (`pl-3`), nút Xanh (Zoom) được vô hiệu hóa vì thanh widget cố định kích thước.
   - *Trên Windows:* Bỏ hoàn toàn titlebar native (`decorations: false`), góc trái có Drag handle `:::`, góc phải có nút Thu nhỏ `─` và Đóng `✕`.
3. **Nút Pin (Always on Top) 1-Chạm:** Đưa nút Ghim (`Pin`) trực tiếp ra ngoài thanh công cụ chính cạnh nút Setting để người dùng bật/tắt ghim tức thì chỉ với 1 click chuột khi đang thao tác trên các ứng dụng khác.
4. **Low-Level Native Precision (Độ chính xác tầng sâu):** Bắt và tái hiện sự kiện chuột/phím ở tầng hệ thống với độ trễ micro-giây, bù trừ chuẩn xác hệ tọa độ đa màn hình (Multi-monitor) và tỉ lệ HiDPI / Retina.
5. **Safety & Failsafe First (An toàn là trên hết):** Tự động hóa luôn tiềm ẩn rủi ro lặp vô tận hoặc chiếm quyền điều khiển chuột. VXClick trang bị mạch ngắt khẩn cấp (Emergency Failsafe Circuit Breaker) kích hoạt bằng phím nóng phần cứng độc lập (`ESC` hoặc `F8`).
6. **Offline & Privacy-Respecting (Ngoại tuyến & Riêng tư):** Hoạt động hoàn toàn cục bộ, không gửi dữ liệu ra ngoài, không yêu cầu đăng nhập, không gắn dịch vụ theo dõi.

---

## 2. Thiết kế Tối giản: Cụm Nút Bấm & Setting Dropdown

Thanh công cụ gồm 4 nút chức năng trực quan:
1. **Rec** (Ghi / Dừng ghi thao tác)
2. **Play** (Phát lại / Dừng phát macro)
3. **Pin** (Ghim / Bỏ ghim cửa sổ trên cùng — 1-click toggle)
4. **Setting** (Menu dropdown thiết lập nâng cao)
- **Trạng thái Chờ (Idle):** Biểu tượng chấm tròn đỏ `● Rec`. Nhấn vào để bắt đầu ghi lại toàn bộ thao tác chuột (click, di chuyển, cuộn) và bàn phím.
- **Trạng thái Đang ghi (Recording):** Chuyển sang biểu tượng ô vuông đỏ `■ Stop` kèm hiệu ứng nhấp nháy viền nhẹ (Pulse Effect) để báo hiệu hệ thống đang lắng nghe sự kiện.
- **Phím tắt nhanh:** `F9` (trên Windows) hoặc `Cmd + Option + R` (trên macOS) để Bắt đầu/Dừng ghi mà không cần chạm chuột vào cửa sổ ứng dụng.

### 2.2. Nút 2: Play (Playback)
- **Trạng thái Sẵn sàng (Ready):** Biểu tượng tam giác xanh lá `▶ Play`. Nhấn vào để bắt đầu phát lại chuỗi macro vừa ghi theo cấu hình tốc độ và số lần lặp.
- **Trạng thái Đang phát (Playing):** Chuyển sang biểu tượng ô vuông xanh `■ Stop` kèm thanh tiến trình siêu mảnh (2px) chạy ngầm dưới đáy thanh widget.
- **Trạng thái Chưa có dữ liệu (Disabled):** Khi chưa có bản ghi nào trong bộ nhớ, nút Play hiển thị trạng thái mờ (Disabled 50% opacity).
- **Phím tắt nhanh:** `F8` (trên Windows) hoặc `Cmd + Option + P` (trên macOS) để Bắt đầu/Dừng phát lại.

### 2.3. Nút 3: Pin (Always on Top)
- **Công tắc 1-chạm:** Bật/tắt ghim thanh công cụ nổi trên cùng ngay lập tức mà không cần mở Dropdown.
- **Trực quan:** Icon sáng xanh Cyan khi đang ghim (`Pinned - ON`), màu xám Slate khi hạ xuống lớp thường.

### 2.4. Nút 4: Setting (Dropdown Popover)
Nút bấm biểu tượng bánh răng hoặc sliders `⚙ Setting ▾`. Khi nhấn sẽ mở ra một menu popover thanh lịch chứa đầy đủ các tùy chỉnh vận hành:

| Tùy chọn | Kiểu điều khiển | Giá trị / Khoảng cho phép | Ý nghĩa chức năng |
| :--- | :--- | :--- | :--- |
| **Play Speed** | Segmented Control / Dropdown | `0.5x`, `1.0x` (mặc định), `2.0x`, `5.0x`, `10.0x`, `Custom...` | Tốc độ phát lại chuỗi thao tác. Bù trừ và co giãn khoảng cách thời gian giữa các sự kiện. |
| **Continuous Playback** | Toggle Switch (Boolean) | `true` / `false` (mặc định: `false`) | Phát lặp lại liên tục không ngừng cho đến khi người dùng bấm Dừng hoặc kích hoạt phím ngắt khẩn cấp. |
| **Repeat Count** | Stepper / Number Input | Số nguyên `1` → `9999` (mặc định: `1`) | Số lần lặp lại chuỗi macro (chỉ hoạt động khi `Continuous Playback = false`). |
| *--- Đường kẻ phân cách ---* | Divider | - | Phân tách khu vực điều khiển và thông tin hỗ trợ. |
| **About** | Menu Item (Click) | Mở popover thông tin | Hiển thị phiên bản, công nghệ Rust + Tauri, tác giả Bùi Việt Linh và liên kết mã nguồn. |
| **Ủng hộ tác giả** | Menu Item (Click, icon Coffee) | Mở popover VietQR | Lời cảm ơn và mã QR VietQR (Vietcombank) chuẩn zTools để người dùng quét ủng hộ. |

---

## 3. Tình huống Sử dụng Cốt lõi (Core Use Cases)

### UC-01 — Ghi và Lặp lại Thao tác Nhập liệu Văn phòng (Office Automation)
1. Người dùng mở bảng tính hoặc phần mềm quản lý nội bộ cần nhập một cột dữ liệu 100 dòng theo quy trình cố định: Gõ chữ → Bấm Enter (nhảy sang dòng kế tiếp).
2. Mở VXClick, bấm nút **Rec** (hoặc nhấn phím tắt `F9`).
3. Thực hiện mẫu đúng 1 chu kỳ trên ô đầu tiên.
4. Bấm **Stop Rec** trên VXClick (hoặc nhấn lại `F9`).
5. Vào **Setting**, đặt `Repeat Count = 99`, giữ `Play Speed = 1.0x` hoặc tăng lên `2.0x`.
6. Bấm **Play**. VXClick tự động chạy lặp lại đúng 99 lần liên tiếp với độ chuẩn xác từng pixel.

### UC-02 — Treo Auto-Click / Giữ Hoạt động Ứng dụng (Continuous AFK / Keep-Alive)
1. Người dùng cần giữ trạng thái online của một phần mềm làm việc, hoặc auto-click định kỳ trong game/ứng dụng kiểm thử.
2. Bấm **Rec**, click chuột 2-3 nhịp vào vị trí chỉ định.
3. Bấm **Stop Rec**.
4. Vào **Setting**, bật công tắc **Continuous Playback** (hệ thống tự động vô hiệu hóa ô `Repeat Count`).
5. Bấm **Play**. Ứng dụng chạy lặp vô tận.
6. Khi muốn dừng, người dùng chỉ cần nhấn phím nóng **ESC** hoặc **F8** để ngắt ngay tức khắc.

### UC-03 — Dừng Khẩn cấp (Emergency Failsafe Circuit Break)
1. Trong quá trình phát lại ở tốc độ cao (`5.0x` hoặc `10.0x`), cửa sổ đích bất ngờ bị đóng hoặc chuyển tiêu điểm, chuột bắt đầu click nhầm vào các ứng dụng nhạy cảm khác.
2. Do chuột bị macro chiếm quyền di chuyển liên tục, người dùng không thể đưa con trỏ về bấm nút Stop trên giao diện.
3. Người dùng lập tức nhấn phím cứng **ESC** (hoặc di chuyển chuột thật giật mạnh vào góc màn hình - Corner Failsafe).
4. Mạch ngắt khẩn cấp cấp độ Kernel/OS lập tức ngắt Playback Thread, nhả toàn bộ nút chuột và phím đang giữ, trả quyền điều khiển về cho người dùng.

---

## 4. Phạm vi Tính năng (Functional Scope Matrix)

| Mã | Nhóm | Yêu cầu Chức năng | Mức ưu tiên |
| :--- | :--- | :--- | :--- |
| **F01** | Window & UI | Thanh công cụ nổi siêu nhỏ gọn (Floating Mini-bar), không chiếm màn hình | **P0** |
| **F02** | Window & UI | Ghim cửa sổ trên cùng (Always on Top) hoạt động tức thì qua Tauri API | **P0** |
| **F03** | Window & UI | 3 nút bấm chuẩn: Rec, Play, Setting | **P0** |
| **F04** | Engine Capture | Bắt sự kiện chuột: Click trái, phải, giữa, double click, cuộn chuột (Scroll) | **P0** |
| **F05** | Engine Capture | Bắt sự kiện di chuyển chuột (Mouse Move) có nén thích ứng (Adaptive Sampling) | **P0** |
| **F06** | Engine Capture | Bắt sự kiện bàn phím: Ký tự thường và các phím bổ trợ (Shift, Ctrl, Alt, Cmd) | **P0** |
| **F07** | Engine Playback | Tái hiện sự kiện chuột và phím qua Native OS API (`CGEventPost` / `SendInput`) | **P0** |
| **F08** | Engine Playback | Bộ định thời chính xác cao (High-precision hybrid sleep timer < 1ms) | **P0** |
| **F09** | Engine Failsafe | Phím nóng ngắt khẩn cấp toàn hệ thống (`ESC` / `F8`) ngắt lập tức | **P0** |
| **F10** | Settings | Tùy chỉnh tốc độ phát lại (Play Speed: 0.5x, 1x, 2x, 5x, 10x) | **P0** |
| **F11** | Settings | Tùy chỉnh lặp vô tận (Continuous Playback toggle) | **P0** |
| **F12** | Settings | Tùy chỉnh số lần lặp cụ thể (Repeat Count stepper) | **P0** |
| **F13** | Permissions | Tự động phát hiện và hướng dẫn cấp quyền Accessibility / Input Monitoring trên macOS | **P0** |
| **F14** | Settings | Popover Giới thiệu (About) chuẩn zTools | **P0** |
| **F15** | Settings | Popover Ủng hộ tác giả với mã VietQR chuẩn zTools | **P0** |
| **F16** | Multi-Monitor | Chuẩn hóa tọa độ hiển thị trên màn hình Retina / 4K và thiết lập đa màn hình | **P1** |
| **F17** | Storage | Lưu và mở tệp kịch bản `.vxclick` (Lưu chuỗi macro vào đĩa để tái sử dụng) | **P1** |
| **F18** | Engine Failsafe | Corner Failsafe (Di chuột giật mạnh vào 1 trong 4 góc màn hình để dừng) | **P1** |
| **F19** | Settings | Tốc độ tùy chỉnh (Custom Speed nhập số lẻ, ví dụ: 3.5x hoặc 0.1x) | **P2** |
| **F20** | Engine Playback | Tùy chọn bỏ qua di chuyển chuột (Mouse Click Only - chỉ click, không vẽ đường di chuột) | **P2** |

---

## 5. Ranh giới Sản phẩm (Out-of-Scope Boundaries)

Để giữ đúng linh hồn của TinyTask — siêu nhẹ, tức thời và không rào cản — các tính năng sau đây **nằm ngoài phạm vi của VXClick**:
- **Không hỗ trợ ngôn ngữ lập trình kịch bản (No Scripting Language):** Không xây dựng cú pháp viết script như AutoHotkey, Python script hay AppleScript. Người dùng chỉ cần làm mẫu bằng tay, máy ghi lại và phát lại y hệt.
- **Không hỗ trợ nhận diện hình ảnh AI/OCR (No Computer Vision/OCR):** Không tìm kiếm nút bấm bằng hình ảnh trên màn hình; thao tác dựa trên hệ tọa độ và timeline sự kiện.
- **Không hỗ trợ Web Browser Automation chuyên biệt:** Không nhúng engine Playwright/Selenium; tự động hóa thực hiện trực tiếp ở tầng OS thông qua chuột và bàn phím vật lý.
