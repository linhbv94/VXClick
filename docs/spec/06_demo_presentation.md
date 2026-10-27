# Demo & Presentation Specification: VXClick (`_spec6_demo_presentation`)

> **Sản phẩm:** VXClick — Tiện ích Tự động hóa Macro Chuột & Bàn phím Siêu Tối giản  
> **Thư mục tài liệu:** `vxclick/docs/spec/`  
> **Phiên bản:** 1.1.0  
> **Ngày cập nhật:** 2026-10-15  

---

## 1. Kịch bản Trình diễn Trực tiếp (Live Demo Playbook)

Thời lượng tổng thể: **3 - 4 phút**.  
Mục tiêu: Làm nổi bật tính trực quan, tốc độ phản hồi tức thì và sự ưu việt của triết lý **"Thanh nổi 1 hàng siêu tối giản"** so với các phần mềm macro cồng kềnh truyền thống.

---

### Màn 1: Ghi & Tái Hiện Thao Tác Điền Dữ Liệu Bảng Tính (60 Giây)
* **Bối cảnh chuẩn bị:** Mở sẵn một bảng tính Excel / Google Sheets gồm 1 cột số thứ tự và 1 cột trạng thái rỗng. Người dùng nhấp chọn sẵn ô B2.
* **Thao tác biểu diễn:**
  1. Người dùng chỉ tay vào thanh công cụ VXClick nhỏ gọn nổi ở góc trên màn hình: *"Đây là VXClick, giao diện thanh 1 hàng siêu gọn: Rec, Play, Pin và Setting, tối ưu với đệm Traffic Lights native macOS và Windows borderless"*.
  2. Bấm phím tắt **`⌥⇧⌘R`** (macOS) hoặc **`Ctrl+Alt+Shift+R`** (Windows) (hoặc click nút **● Rec**; nút chuyển sang **■ Stop** đỏ nhấp nháy viền nhẹ).
  3. Gõ chuỗi ký tự `"Hoàn tất"` vào ô đang chọn → Nhấn phím `Enter` (bảng tính tự động nhảy con trỏ xuống ô tiếp theo B3).
  4. Bấm lại phím **`⌥⇧⌘R`** / **`Ctrl+Alt+Shift+R`** (hoặc click nút **■ Stop** trên VXClick). Nút Play sáng màu xanh lá **▶ Play** ngay lập tức.
  5. Bấm phím **`⌥⇧⌘P`** (macOS) hoặc **`Ctrl+Alt+Shift+P`** (Windows) (hoặc click nút **▶ Play**).
* **Hiệu ứng trực quan:** Cửa sổ tự động mở rộng Dynamic Mini Bar (chiều cao 62px). Macro tự động gõ chữ `"Hoàn tất"` vào ô B3 hiện tại và bấm `Enter` để nhảy xuống B4 trong sự ngỡ ngàng của khán giả. Khi xong, thanh mini tự động thu gọn về 38px. Chuẩn xác 100% nhịp điệu và không phụ thuộc vào click tọa độ cứng.

---

### Màn 2: Biểu Diễn Siêu Tốc Độ 5.0x & Lặp 10 Lần với Dynamic Mini Bar (45 Giây)
* **Thao tác biểu diễn:**
  1. Nhấp vào nút **⚙ Setting ▾**.
  2. Bảng Popover hiện đại bung xuống mượt mà (cửa sổ mở rộng chiều cao tự nhiên 290px, không thanh cuộn).
  3. Chọn nấc tốc độ **5.0x** trên thanh chip điều khiển.
  4. Đặt ô `Repeat Count = 10`.
  5. Đóng menu, sau đó bấm phím **`⌥⇧⌘P`** / **`Ctrl+Alt+Shift+P`** (hoặc nút **▶ Play**).
* **Hiệu ứng trực quan:**
  - Cửa sổ tự động mở rộng Mini Status Bar xuống dưới.
  - Dòng trạng thái hiển thị real-time: `🔁 Đã lặp 1 / 10 lần (10%)`, `2 / 10 lần (20%)`... kèm thanh tiến trình chạy đều từ 0% đến 100%.
  - Chuỗi thao tác được thực thi với tốc độ cực nhanh, 10 dòng bảng tính tiếp theo được điền xong chỉ trong vòng 2 giây!
  - Khi hoàn tất chu kỳ 10, thanh mini tự động thu gọn lại về thanh 38px ban đầu.

---

### Màn 3: Lặp Đến Tận Thế & Trình Diễn Mạch Ngắt Khẩn Cấp ESC (45 Giây)
* **Thao tác biểu diễn:**
  1. Mở Setting, bật công tắc **Đến tận thế (Continuous Playback) = ON**.
  2. Khán giả thấy ô `Repeat Count` tự động bị làm mờ (Disabled) một cách thông minh.
  3. Bấm **▶ Play** (hoặc phím **`⌥⇧⌘P`** / **`Ctrl+Alt+Shift+P`**). Cửa sổ mở rộng Mini Status Bar hiển thị: *"♾️ Đang lặp liên tục • Nhấn [ESC] để dừng"*.
  4. Hệ thống bắt đầu chạy lặp liên tục không ngừng.
  5. Người thuyết trình: *"Khi macro đang chạy liên tục thế này, nếu dùng chuột thông thường, bạn không thể nào giật lại quyền điều khiển để bấm Stop. Nhưng với VXClick..."*
  6. Người thuyết trình bấm mạnh phím cứng **ESC** trên bàn phím vật lý.
* **Hiệu ứng trực quan:**
  - Condvar đánh thức thread và toàn bộ chuỗi thao tác dừng lại ngay trong tích tắc (< 1 mili-giây).
  - Không có hiện tượng giật chuột, ActiveInputLedger giải phóng mọi phím kẹt.
  - Mini Status Bar tự động thu gọn mượt mà về 38px, bảo toàn nguyên vẹn macro trong RAM.

---

### Màn 4: Khám Phá Nút Pin, About & Ủng Hộ Tác Giả Chuẩn zTools (30 Giây)
* **Thao tác biểu diễn:**
  1. Nhấp 1-chạm vào nút **📌 Pin** trên thanh chính: Nút sáng màu xanh Sky (`text-sky-400`), biểu diễn kéo thanh công cụ nổi đè lên các cửa sổ khác nhau để chứng minh cửa sổ luôn ghim nổi.
  2. Bấm vào mục **About** trong Setting: Cửa sổ phụ mở ra hiển thị thông tin phiên bản v1.0, tác giả Bùi Việt Linh, phím tắt chuẩn hóa `⌥⇧⌘R` / `⌥⇧⌘P` và nền tảng công nghệ Rust + Tauri v2.
  3. Bấm vào mục **Ủng hộ tác giả (icon Coffee)**: Hiển thị hộp thoại ấm cúng với **mã QR VietQR (Vietcombank) nền trắng sắc nét đặt ở vị trí trung tâm**, tối ưu để khán giả quét mã mời cà phê tác giả ngay trên điện thoại di động.

---

### Màn 5: Biểu Diễn Tự Động Nhấp Chuột (Auto Click) Siêu Nhanh với Phím Tắt ⌥⇧⌘C (30 Giây)
* **Thao tác biểu diễn:**
  1. Người dùng di chuyển chuột tới vị trí bất kỳ trên màn hình (ví dụ trang web bấm nút clicker hoặc game click).
  2. Nhấn tổ hợp phím **`⌥⇧⌘C`** (macOS) hoặc **`Ctrl+Alt+Shift+C`** (Windows) (hoặc bấm nút **🖱 Auto Click** trên thanh chính).
  3. Nút Auto Click phát sáng màu hổ phách (Amber), bộ đếm click `#1, #2, #3...` tăng vùn vụt; Mini Bar mở rộng hiển thị tiến trình tự động nhấp.
  4. Người dùng di chuyển chuột sang các vị trí khác, các cú click tự động bám theo thời gian thực tại đúng vị trí con trỏ chuột.
  5. Nhấn phím cứng **ESC** (hoặc bấm lại `⌥⇧⌘C`): Auto click ngắt tức thì trong < 1ms, Mini Bar hiển thị `Đã dừng tự nhấp [ESC]` và tự thu gọn về 38px.

---

## 2. Danh Sách Kiểm Tra Trước Trình Diễn (Live Demo Checklist)

| STT | Hạng mục Kiểm tra | Trạng thái Yêu cầu | Cách xác minh nhanh |
| :--- | :--- | :--- | :--- |
| **01** | Quyền Accessibility trên macOS | Đã cấp quyền (Trusted) | Nút Rec hiển thị màu đỏ bình thường (không bị mờ xám) |
| **02** | Ký số Bundle macOS (Deep Signing) | Hợp lệ on disk | Chạy `codesign --verify --deep --strict --verbose=4 VXClick.app` trả về `valid on disk` |
| **03** | Tổ hợp Phím Tắt Toàn Cục | Đăng ký thành công | Bấm thử `⌥⇧⌘R` (Rec) và `⌥⇧⌘P` (Play) |
| **04** | Dynamic Mini Expand Bar | Hoạt động trơn tru | Bấm Play kiểm tra thanh bar expand 38px ──► 62px |
| **05** | Phím nóng ESC ngắt khẩn cấp | Đã sẵn sàng | Thử bấm ESC khi macro đang Playback |
| **06** | Ghim Always on Top | Đang Bật | Kéo thử cửa sổ trình duyệt đè lên |
| **07** | Mã QR VietQR trong modal Support Author | Hiển thị sắc nét, đúng STK | Quét thử bằng camera điện thoại |
