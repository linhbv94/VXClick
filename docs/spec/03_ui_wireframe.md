# UI & Wireframe Specification: VXClick (`_spec3_ui_wireframe`)

> **Sản phẩm:** VXClick — Tiện ích Tự động hóa Macro Chuột & Bàn phím Siêu Tối giản  
> **Thư mục tài liệu:** `vxclick/docs/spec/`  
> **Phiên bản:** 1.1.0  
> **Ngày cập nhật:** 2026-10-15  
> **Quy chuẩn tuân thủ:** Bắt buộc tuân thủ 100% [desktop_ui_standards.md](../../../.agents/desktop_ui_standards.md) và [master_theme.md](../../../_summary/master_theme.md).  

---

## 1. Triết lý Giao diện: Thanh Công cụ Nổi Siêu Tối giản (Floating Mini-bar)

VXClick không sử dụng cửa sổ truyền thống với các menu File, Edit, View cồng kềnh. Giao diện của ứng dụng được thu gọn tối đa thành một **thanh công cụ nổi (Floating Pill Bar)** thanh lịch, neo gọn gàng trên màn hình desktop:

* **Kích thước Cố định Thanh Widget (Main Bar):** Rộng `360px`, Cao `38px` (gồm thanh điều khiển 32px chuẩn theo [desktop_ui_standards.md](../../../.agents/desktop_ui_standards.md) cộng 3px padding trên/dưới bảo vệ đổ bóng viền).
* **Bán kính bo góc (Border Radius):** `12px` (chuẩn `rounded-xl`), viền mảnh `1px` sắc nét.
* **Kéo thả cửa sổ (Window Dragging):** Bất kỳ vùng đệm trống nào giữa các nút hoặc hai đầu thanh công cụ đều được gắn thuộc tính `data-tauri-drag-region`, cho phép người dùng nhấp giữ chuột để di chuyển cửa sổ đến bất kỳ vị trí thuận tiện nào trên màn hình.
* **Kiến trúc Cửa sổ Đa tầng (Multi-Window & Dynamic Expansion):**
  - Chiều cao thanh mini ban đầu là `38px`.
  - *Khi Playback hoặc Auto Click (Dynamic Mini Expand Bar):* Cửa sổ tự động mở rộng chiều cao xuống dưới thành `62px` để hiển thị dòng trạng thái tiến trình (Lặp X lần hoặc Lặp đến tận thế hoặc Auto Click). Khi dừng, tự động thu gọn lại đúng `38px`.
  - *Khi Mở Menu Setting Nhanh:* Cửa sổ mở rộng chiều cao xuống dưới thành `340px` (`appWindow.setSize(LogicalSize::new(360.0, 340.0))`) hiển thị trọn vẹn menu Setting gồm cả mục Macro và Auto Click không thanh cuộn. Khi đóng menu, cửa sổ tự động thu gọn lại đúng `38px`.
  - *Khi Mở Modal Hướng Dẫn Cấp Quyền / Giới thiệu / Ủng hộ Tác giả:* Hiển thị dạng Modal lớp phủ (Overlay) hoặc Cửa sổ Hộp thoại Phụ Độc lập (Secondary Dialog Window) kích thước `380px × 360px`, căn giữa màn hình, hiển thị mã VietQR hoặc hướng dẫn cấp quyền 3 bước rõ ràng.
* **Quy chuẩn Tích hợp Hệ điều hành:**
  - *Trên Windows:* Bỏ hoàn toàn titlebar native của OS (`decorations: false`, không để runtime effect gọi `setWindowDecorations(true)` gây double bar). Nút đóng `✕` và thu nhỏ `─` nằm ở góc phải thanh công cụ.
  - *Trên macOS:* Sử dụng cấu hình Tauri `decorations: true`, `titleBarStyle: Overlay`, `hiddenTitle: true`. Vùng đệm Traffic Lights native dành riêng `54px × 38px` ở góc trái để 3 chấm tròn Đỏ/Vàng/Xanh căn giữa dọc hoàn hảo, không bị đè hay thụt lùi.

---

## 2. Wireframe Thanh Điều khiển Chính (Bố cục macOS & Windows)

Thanh công cụ được tích hợp theo chuẩn 1 hàng duy nhất (`Single-Row Window Bar`), kích thước chiều rộng `360px`, chiều cao `38px`:

### 2.1. Bố cục trên macOS (Apple Silicon & Intel)
Góc trái hiển thị cụm **3 nút Traffic Lights native** trong vùng đệm `54×38px` căn giữa dọc:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [● ● ○]   [ ● Rec ]   [ ▶ Play ]   [ ↖ Click ]   [ 📌 Pin ]  [ ⚙ Set ▾ ]│
└────────────────────────────────────────────────────────────────────────┘
    ▲           ▲           ▲            ▲             ▲           ▲
    │           │           │            │             │           │
 Vùng đệm    Nút 1:      Nút 2:       Nút 3:        Nút 4:      Nút 5:
 Traffic     Ghi macro   Phát macro   Auto Click    Ghim nổi    Cài đặt
 Lights      (⌥⇧⌘R)      (⌥⇧⌘P)       (⌥⇧⌘C)        (Pin Top)   (Settings)
 (54×38px)
```

### 2.2. Bố cục trên Windows 11/10 (x64)
Theo quy chuẩn [desktop_ui_standards.md](../../../.agents/desktop_ui_standards.md), Windows tắt hoàn toàn titlebar native (`decorations: false`, không double bar). Góc trái có tay nắm kéo `:::`, góc phải có nút Thu nhỏ `─` và Đóng `✕`:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ :::  [ ● Rec ]  [ ▶ Play ]  [ ↖ Click ]  [ 📌 Pin ]  [ ⚙ ▾ ]   [─] [✕] │
└────────────────────────────────────────────────────────────────────────┘
  ▲        ▲          ▲           ▲            ▲         ▲         ▲
  │        │          │           │            │         │         │
 Drag    Nút 1:     Nút 2:      Nút 3:       Nút 4:    Nút 5:    Thu nhỏ
 Handle  Ghi macro  Phát macro  Auto Click   Ghim nổi  Cài đặt   & đóng
```

---

## 3. Chi tiết Nút Pin (Always on Top) Đưa Ra Ngoài Thanh Chính

Đưa nút **Pin (Always on Top)** từ Dropdown ra ngoài thanh công cụ chính là một bước tối ưu UX quan trọng cho tiện ích macro:
- **Thao tác 1-chạm (1-Click Action):** Người dùng đang nhập liệu trên Excel hoặc chơi game chỉ cần click thẳng vào nút `Pin` để ghim/bỏ ghim thanh công cụ ngay lập tức, không cần tốn 2 lượt nhấp chuột vào Setting Dropdown.
- **Phản hồi trạng thái trực quan:**
  - *Khi Ghim (Pinned - ON, Mặc định):* Icon ghim nổi bật với màu xanh sáng (`text-sky-400 bg-sky-500/10 border-sky-500/30`), kèm tooltip `Đang ghim trên cùng (Click để bỏ ghim)`.
  - *Khi Không ghim (Unpinned - OFF):* Icon ghim màu xám Slate (`text-slate-400 hover:text-slate-200`), kèm tooltip `Ghim nổi trên cùng`.
- **Đồng bộ hai chiều:** Nút Pin trên thanh chính và công tắc `Always on Top` trong menu Setting liên kết với cùng một biến trạng thái phản ứng (Reactive State). Bật/tắt ở một nơi sẽ tự động cập nhật ở nơi còn lại.

---

## 4. Chi tiết Trạng thái Các Nút Bấm Trên Thanh Chính

```text
1. TRẠNG THÁI THIẾU QUYỀN HỆ THỐNG TRÊN MACOS (PERMISSION_BLOCKED)
┌────────────────────────────────────────────────────────────────────────┐
│ [● ● ○]   [ ○ Rec ]      [ ▶ Play ]      [ 📌 Pin ]    [ ⚙ Setting ▾ ] │
└────────────────────────────────────────────────────────────────────────┘
            (Xám mờ 40%)   (Mờ 40%)        (Xanh sáng)   (Màu Slate)
            Click mở Modal Khóa hoàn toàn  Đang ghim     Mở tùy chọn
            hướng dẫn quyền

2. TRẠNG THÁI CHỜ BAN ĐẦU (IDLE - ĐỦ QUYỀN, CHƯA CÓ DỮ LIỆU)
┌────────────────────────────────────────────────────────────────────────┐
│ [● ● ○]   [ ● Rec ]      [ ▶ Play ]      [ 📌 Pin ]    [ ⚙ Setting ▾ ] │
└────────────────────────────────────────────────────────────────────────┘
            (Màu Đỏ)       (Mờ 40%)        (Xanh sáng)   (Màu Slate)
            Sẵn sàng ghi   Chưa có bản ghi Đang ghim     Mở tùy chọn

3. TRẠNG THÁI ĐANG GHI THAO TÁC (RECORDING)
┌────────────────────────────────────────────────────────────────────────┐
│ [● ● ○]   [ ■ Stop ]     [ ▶ Play ]      [ 📌 Pin ]    [ ⚙ Setting ▾ ] │
└────────────────────────────────────────────────────────────────────────┘
            (Đỏ nhấp nháy) (Mờ 40%)        (Xanh sáng)   (Vô hiệu hóa)
            Nhấn để dừng   Không bấm được  Giữ nguyên    Đang ghi

4. TRẠNG THÁI ĐÃ CÓ BẢN GHI SẴN SÀNG (IDLE - READY TO PLAY)
┌────────────────────────────────────────────────────────────────────────┐
│ [● ● ○]   [ ● Rec ]      [ ▶ Play ]      [ 📌 Pin ]    [ ⚙ Setting ▾ ] │
└────────────────────────────────────────────────────────────────────────┘
            (Màu Đỏ)       (Xanh Emerald)  (Xanh sáng)   (Màu Slate)
            Ghi đè bản mới Sẵn sàng phát   Đang ghim     Cấu hình tốc độ

5. TRẠNG THÁI ĐANG PHÁT LẠI (PLAYING)
┌────────────────────────────────────────────────────────────────────────┐
│ [● ● ○]   [ ● Rec ]      [ ■ Stop ]      [ 📌 Pin ]    [ ⚙ Setting ▾ ] │
└────────────────────────────────────────────────────────────────────────┘
            (Mờ 40%)       (Xanh nhấp nháy)(Xanh sáng)   (Khóa cấu hình)
            Không bấm được Nhấn để dừng    Giữ nguyên    Đang phát
```

---

## 5. Wireframe Dynamic Mini Expand Bar khi Playback

Khi bắt đầu Playback, cửa sổ tự động mở rộng chiều cao từ `38px` lên `62px` để hiện thanh trạng thái mini bên dưới:

### 5.1. Trường hợp 1: Chế độ Lặp X lần (`continuous = false`)
Hiển thị số lần lặp thực tế và thanh tiến trình:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [● ● ○]   [ ● Rec ]      [ ■ Stop ]      [ 📌 Pin ]    [ ⚙ Setting ▾ ] │
├────────────────────────────────────────────────────────────────────────┤
│ 🔁  Đã lặp 3 / 10 lần (30%)             [█████████░░░░░░░░░░░░░░░░░░░] │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.2. Trường hợp 2: Chế độ Lặp Đến Tận Thế (`continuous = true` / Loop until doomsday)
Hiển thị icon vô tận, số vòng lặp và nhắc nhở phím ESC để dừng:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [● ● ○]   [ ● Rec ]      [ ■ Stop ]      [ 📌 Pin ]    [ ⚙ Setting ▾ ] │
├────────────────────────────────────────────────────────────────────────┤
│ ♾️  Lặp đến tận thế #4             Nhấn ESC để dừng           [ ESC ]  │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.3. Trạng thái Dừng Phát Lại & Phản hồi ESC An toàn (Stopped Notice Feedback)
Khi người dùng nhấn phím ESC hoặc nút Stop, MiniBar không biến mất đột ngột mà duy trì hiển thị thông báo dừng trong 1.2s - 1.4s trước khi co về 38px, tuyệt đối không tạo popup che đè lên các nút thao tác chính:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [● ● ○]   [ ● Rec ]      [ ▶ Play ]      [ 📌 Pin ]    [ ⚙ Setting ▾ ] │
├────────────────────────────────────────────────────────────────────────┤
│ ⏹  Đã dừng lặp đến tận thế                                   [ ESC ]  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Wireframe Modal Hướng Dẫn Cấp Quyền Trợ Năng macOS (`PermissionModal`)

Kích thước: `380px × 360px`, căn giữa màn hình khi người dùng click vào nút Rec mờ:

```text
┌────────────────────────────────────────────────────────┐
│  🔐 Cấp Quyền Trợ Năng macOS                    [ ✕ ]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│   VXClick cần quyền Trợ năng (Accessibility) để ghi    │
│   và tự động hóa các thao tác chuột & bàn phím.       │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │ Bước 1: Nhấp nút bên dưới để mở Privacy        │   │
│   │         [ ⚙ Mở Cài đặt hệ thống ]              │   │
│   ├────────────────────────────────────────────────┤   │
│   │ Bước 2: Tìm "VXClick" trong danh sách và       │   │
│   │         GẠT BẬT công tắc cho phép.             │   │
│   ├────────────────────────────────────────────────┤   │
│   │ Bước 3: Nếu hệ thống chưa nhận diện ngay:      │   │
│   │         [ 🔄 Khởi động lại ứng dụng ]          │   │
│   └────────────────────────────────────────────────┘   │
│                                                        │
│   *Ứng dụng được ký số cục bộ an toàn, không gửi       │
│    dữ liệu ra ngoài Internet.                          │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                            [ Đóng ]    │
└────────────────────────────────────────────────────────┘
```

---

## 7. Wireframe Setting Popover (Menu Thiết lập Nhanh)

Khi người dùng nhấn vào nút **⚙ Setting ▾**, một bảng Popover hiện đại bung xuống ngay phía dưới nút với các thành phần được tối ưu hóa cho thao tác 1-chạm:

```text
┌─────────────────────────────────────────────────────────┐
│                    CÀI ĐẶT MACRO                        │
├─────────────────────────────────────────────────────────┤
│ Tốc độ phát lại (Play Speed)                            │
│ ┌───────┬───────┬───────┬───────┬────────┬────────────┐ │
│ │ 0.5x  │ 1.0x* │ 2.0x  │ 5.0x  │ 10.0x  │ Custom...  │ │
│ └───────┴───────┴───────┴───────┴────────┴────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Đến tận thế (Continuous Playback)              [  ON  ] │
│ Lặp liên tục cho đến khi bấm Stop hoặc nhấn ESC         │
├─────────────────────────────────────────────────────────┤
│ Số lần lặp lại (Repeat Count)                 [  --  ]  │
│ ┌───────────────────────────────────────────┬─────────┐ │
│ │ (Vô hiệu hóa vì đang bật Đến tận thế)     │ [ 10 ]  │ │
│ └───────────────────────────────────────────┴─────────┘ │
├─────────────────────────────────────────────────────────┤
│ 🖱 CÀI ĐẶT TỰ ĐỘNG NHẤP (AUTO CLICK)         [ ⌥⇧⌘C ]  │
├─────────────────────────────────────────────────────────┤
│ Chu kỳ nhấp (Click Interval): 100 ms                    │
│ ┌───────┬───────┬───────┬───────┬────────┬────────────┐ │
│ │ 50ms  │ 100ms*│ 200ms │ 500ms │  1s    │ Tuỳ chỉnh  │ │
│ └───────┴───────┴───────┴───────┴────────┴────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Phím chuột (Mouse Button)        [ Trái (L)* | Phải (R) ]│
├─────────────────────────────────────────────────────────┤
│ Nhấp đến khi dừng (Until stopped)              [  ON  ] │
│ Nhấp liên tục cho đến khi bấm dừng hoặc ESC             │
├─────────────────────────────────────────────────────────┤
│ Số lần nhấp (Click Count)                     [  --  ]  │
│ ┌───────────────────────────────────────────┬─────────┐ │
│ │ (Vô hiệu hóa vì đang bật Đến khi dừng)    │ [ 100 ] │ │
│ └───────────────────────────────────────────┴─────────┘ │
├─────────────────────────────────────────────────────────┤
│ Luôn nổi trên cùng (Always on Top)             [  ON  ] │
├─────────────────────────────────────────────────────────┤
│ Giao diện (Theme)             [ Hệ thống* | Tối | Sáng ]│
├─────────────────────────────────────────────────────────┤
│ Ngôn ngữ giao diện (Language)               [ Tiếng Việt ]
├─────────────────────────────────────────────────────────┤
│────────────────── ĐƯỜNG KẺ PHÂN CÁCH ───────────────────│
├─────────────────────────────────────────────────────────┤
│ ℹ️  Giới thiệu phần mềm (About)...                      │
│ ☕  Ủng hộ tác giả (VietQR)...                          │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Modal Thông tin & Hỗ trợ (Tuân thủ Quy chuẩn Desktop UI zTools)

### 8.1. Modal Giới thiệu (About Dialog)
Kích thước: `380px × 340px`, căn giữa màn hình:

```text
┌────────────────────────────────────────────────────────┐
│  Giới thiệu VXClick                             [ ✕ ]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│                    [ LOGO VXCLICK ]                    │
│                        v1.0.0                          │
│                                                        │
│   VXClick là tiện ích tự động hóa macro chuột và bàn    │
│   phím siêu nhẹ, tối giản lấy cảm hứng từ TinyTask,   │
│   xây dựng trên nền tảng Tauri v2 và Rust Native.     │
│                                                        │
│   • Tác giả: Bùi Việt Linh                             │
│   • Bản quyền: zTools Ecosystem 2026                   │
│   • Công nghệ: Rust 2024, React 19, TypeScript, Vite   │
│   • Phím tắt: ⌥⇧⌘R (Rec) | ⌥⇧⌘P (Play) | ESC (Stop)    │
│   • Mã nguồn: github.com/linhbv94/ztools               │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                            [ Đóng ]    │
└────────────────────────────────────────────────────────┘
```

---

### 8.2. Modal Ủng hộ Tác giả (Support Author Dialog — Chuẩn zTools 1.3.0)
Theo quy định tại mục 25-32 của [desktop_ui_standards.md](../../../.agents/desktop_ui_standards.md):
- **Tối giản:** Loại bỏ hoàn toàn số tài khoản thủ công, tên ngân hàng bằng chữ và nút copy STK rườm rà.
- **Tập trung:** Đặt **card mã QR VietQR (Vietcombank) nền trắng sắc nét ở vị trí trung tâm**, tối ưu để người dùng quét trực tiếp từ app ngân hàng trên điện thoại di động.
- **Tông màu:** Tông màu ấm cúng (Amber/Warm Yellow), tạo cảm giác thân thiện, chân thành.

```text
┌────────────────────────────────────────────────────────┐
│  ☕ Ủng hộ Tác giả                              [ ✕ ]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Cảm ơn bạn đã đồng hành và sử dụng VXClick!          │
│   Nếu tiện ích nhỏ này giúp bạn tiết kiệm thời gian    │
│   và công sức, hãy mời tác giả một ly cà phê nhé.     │
│                                                        │
│           ┌────────────────────────────────┐           │
│           │                                │           │
│           │       [ MÃ QR VIETQR ]         │           │
│           │         VIETCOMBANK            │           │
│           │      (Nền trắng sắc nét,       │           │
│           │     quét trực tiếp từ app)     │           │
│           │                                │           │
│           └────────────────────────────────┘           │
│                                                        │
│            "Chúc bạn một ngày làm việc vui vẻ!"        │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                            [ Đóng ]    │
└────────────────────────────────────────────────────────┘
```

---

## 9. Bảng Token Thiết kế (Design Tokens & Color Palette)

Tuân thủ nghiêm ngặt bảng mã màu Dark/Light Mode của [master_theme.md](../../../_summary/master_theme.md):

| Thành phần UI | Mã Màu Dark | Mã Màu Light | Lớp Tailwind CSS Tương đương | Ghi chú Trải nghiệm |
| :--- | :--- | :--- | :--- | :--- |
| **Nền Widget (Bar Background)** | `#0f172a` | `#ffffff` | `bg-slate-900 / bg-white` | Nền tối Slate Navy hoặc trắng tinh |
| **Viền Widget (Border)** | `#334155` | `#e2e8f0` | `border-slate-700 / border-slate-200` | Đường viền mảnh 1px phân định ranh giới |
| **Nút Rec (Blocked)** | `#64748b` | `#94a3b8` | `opacity-40 text-slate-500 hover:opacity-80` | Mờ xám, click mở PermissionModal |
| **Nút Rec (Idle)** | `#ef4444` | `#dc2626` | `text-red-500 hover:bg-red-500/10` | Chấm tròn đỏ sẵn sàng ghi |
| **Nút Rec (Recording)** | `#dc2626` | `#b91c1c` | `bg-red-600 text-white animate-pulse` | Ô vuông đỏ nhấp nháy báo hiệu đang ghi |
| **Nút Play (Ready)** | `#10b981` | `#059669` | `text-emerald-500 hover:bg-emerald-500/10`| Tam giác xanh lá sẵn sàng hoạt động |
| **Nút Play (Playing)** | `#059669` | `#047857` | `bg-emerald-600 text-white animate-pulse` | Ô vuông xanh báo hiệu đang phát lại |
| **Nút Auto Click (Idle)** | `#f59e0b` | `#d97706` | `text-amber-500 hover:bg-amber-500/10` | Con trỏ click màu hổ phách sẵn sàng |
| **Nút Auto Click (Running)**| `#d97706` | `#b45309` | `bg-amber-600 text-white animate-pulse` | Báo hiệu đang tự nhấp kèm bộ đếm |
| **Nút Pin (Pinned ON)** | `#38bdf8` | `#0284c7` | `text-sky-400 bg-sky-500/10 border-sky-500/30` | Nổi bật báo hiệu đang ghim trên cùng |
| **Nút Pin (Unpinned OFF)**| `#64748b` | `#94a3b8` | `text-slate-500 hover:text-slate-300` | Xám mờ khi không ghim |
| **Nút Setting** | `#94a3b8` | `#64748b` | `text-slate-400 hover:text-slate-200` | Bánh răng xám thanh lịch |
| **Mini Expand Bar Nền** | `#0b1120` | `#f8fafc` | `bg-slate-950 / bg-slate-50` | Nền thanh trạng thái lặp 24px |
| **Thanh Tiến trình (Progress)** | `#0284c7` | `#0284c7` | `bg-sky-500` | Dày 2px phản ánh tiến độ lặp X lần |
| **Font Chữ Hệ Thống** | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto` | `font-sans` | Cỡ 12px, weight 500/600 |



## Hiệu chỉnh traffic lights macOS — 2026-10-15

Giữ control native và action hiện có, đường kính hiển thị 12pt, khoảng cách tâm 20pt. Frame và bounds phải giữ cùng kích thước/tỷ lệ native, gồm padding: không ép frame12×12 hay ép bounds vuông. SDK15.5 có bezel12×12 trong frame/bounds14×16. Lấy geometry chuẩn từ NSWindow.standardWindowButton:forStyleMask: và chỉ đổi origin; kiểm tra lại sau focus/resize. VXClick vẫn giữ chính sách ẩn Zoom của widget cố định; không đổi engine, quyền OS hoặc updater.


## Mission Control và kích hoạt lại trên macOS — 2026-10-15

Main widget là cửa sổ ứng dụng có tham gia Mission Control/Spaces và window cycling, kể cả bật Pin. Pin chỉ thay đổi window level; không biến widget thành transient panel hoặc kéo cửa sổ sang Space đang active. Chọn lại app qua Dock/LaunchServices phải hiện, bỏ minimize nếu có và focus cửa sổ hiện có tại Space của nó; không tạo widget thứ hai, không bắt đầu ghi/phát macro. Không đổi thiết lập Spaces toàn hệ thống.


### Căn tâm dọc traffic lights theo toolbar — 2026-10-15

Toolbar 38px: tâm control native trùng tâm toolbar tại y=20pt từ đỉnh content view (border shell trên 1px + toolbar38/2). Chuyển điểm từ content view sang superview của nút bằng AppKit convertPoint:fromView:, xử lý cả hệ tọa độ flipped/non-flipped. Không giữ center frame native cũ hoặc suy vị trí từ chiều cao superview titlebar. Giữ frame/bounds native cùng padding, không scale và giữ khoảng cách tâm ngang hiện có; áp dụng lại khi focus/resize.


### Kích thước bezel và padding native — 2026-10-15

12pt là đường kính bezel hiển thị, không phải kích thước NSButton view. Artifact GitHub hiện tại dùng SDK15.5: AppKit frame/bounds14×16, bezel12×12; ép frame12×12 với bounds14×14 làm bezel co còn khoảng10×10. Khôi phục frame/bounds/controlSize từ reference native cùng style mask rồi chỉ căn vị trí theo toolbar. Không suy kích thước từ bounds đã bị thay đổi ở lần focus trước. SDK26 có metrics khác; QA cần cùng SDK/profile với artifact phát hành.

---

## 10. Tích hợp Cập nhật Tự động (Auto-Update) & Chỉ báo Notification Nút Setting — 2026-10-15

### 10.1. Hiệu ứng Nút Setting Phát Sáng & Chấm Báo Cập nhật (Notification Glow)
Khi hệ thống phát hiện có phiên bản cập nhật mới (`updateState.status === 'available'` hoặc `'installed'`):
- **Hiệu ứng trên thanh chính (`MainBar.tsx`):**
  - Nút `⚙ Setting` tự động chuyển sang trạng thái viền sáng và nền phát quang Cyan nhẹ (`bg-cyan-500/15 border-cyan-500/40 shadow-xs shadow-cyan-400/40 ring-1 ring-cyan-400/30`).
  - Đi kèm một chấm tròn báo hiệu động kép ở góc trên bên phải: bao gồm 1 vòng phát xung (`animate-ping absolute bg-cyan-400 opacity-75`) và 1 điểm định vị tĩnh (`relative inline-flex h-2 w-2 bg-cyan-500 ring-1.5 ring-white dark:ring-slate-900`).
  - Tooltip tự động chuyển thành: `Cài đặt & Tùy chọn (Có bản cập nhật mới)`.
- Khi người dùng bấm mở Setting, popover mở rộng xuống dưới và hiển thị ngay thông tin bản mới cùng nút cài đặt 1 chạm.

### 10.2. Khối Cập nhật Ứng dụng trong Bảng Cài đặt Mở rộng (`SettingsPopover.tsx`)
Nằm ở vị trí Mục 7 ngay trước cụm About/Support, thiết kế bo góc `rounded-lg` đồng nhất theo chuẩn zTools:
- **Tiêu đề khối:** Icon `RefreshCw` + chữ "Cập nhật phần mềm" + badge phiên bản hiện tại `v1.0.1`.
- **Máy trạng thái hữu hạn (FSM Lifecycle):**
  1. `idle`: Hiển thị "Tự động kiểm tra bản mới khi mở ứng dụng" kèm nút "Kiểm tra cập nhật".
  2. `checking`: Spinner `RefreshCw animate-spin` kèm dòng "Đang kiểm tra cập nhật…".
  3. `current`: Icon `CheckCircle2` xanh ngọc kèm dòng "Bạn đang dùng phiên bản mới nhất." + link "Kiểm tra lại".
  4. `available`: Icon `Sparkles text-cyan-500 animate-pulse` "Có bản cập nhật mới: vX.X.X" + nút CTA chính màu Cyan "Cập nhật & Khởi động lại" (`Download`).
  5. `downloading`: Tên trạng thái kèm phần trăm tiến độ tải về và thanh Progress Bar mượt mà 1.5px.
  6. `installing`: Spinner kèm dòng "Đang cài đặt bản cập nhật…".
  7. `installed`: Dòng "Đã cài đặt xong. Khởi động lại để áp dụng." kèm nút CTA màu Emerald "Khởi động lại ngay".
  8. `error`: Icon `AlertCircle` cảnh báo kèm nút "Thử lại".
  9. `disabled`: Chữ mờ ghi chú "Cập nhật khả dụng trên bản cài đặt chính thức." khi chạy môi trường dev/không phải cửa sổ chính.

### 10.3. Cơ chế Đồng bộ Kích thước Cửa sổ & Chống Deadlock Khi Mở rộng
- **Tránh deadlock viewport `100vh`:** Cửa sổ nổi khởi tạo ở chiều cao 38px, do đó thuộc tính CSS `100vh` bên trong webview chỉ bằng 38px. Tuyệt đối không dùng `calc(100vh - ...)` để giới hạn `.widget_content`.
- **Giới hạn nội dung qua CSS Variable:** `.widget_content` sử dụng `max-height: var(--widget-content-max-h, 520px)` và `overflow-y: auto`.
- **Tính toán ngân sách chiều cao khả dụng:** `bridgeSyncWindowHeight` và `bridgeInitWindowConstraints` truy vấn `monitor.workArea` (trừ đi chiều cao Taskbar/Dock và 38px của thanh chính), cập nhật `--widget-content-max-h` trên `document.documentElement` để nội dung cuộn mượt mà khi màn hình hiển thị nhỏ mà không gây kẹt kích thước.
- **Tuần tự hóa (Serialization):** Toàn bộ thao tác `win.setSize` và `win.setPosition` được đưa vào hàng đợi tuần tự Promise, loại bỏ triệt để hiện tượng race condition khi người dùng thao tác đóng/mở nhanh.

