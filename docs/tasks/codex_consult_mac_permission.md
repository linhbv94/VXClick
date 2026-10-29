# Nhiệm vụ tham vấn Codex: Tối ưu UI và Chẩn đoán Luồng Cấp Quyền macOS Accessibility cho VXClick

> **Quy chế:** Chỉ tham vấn/review chỉ đọc; không sửa nguồn; không gọi agent khác.
> **Tuân thủ:** AGENTS.md, UTF-8, Tiếng Việt chuyên nghiệp, snake_case, Tuyệt đối KHÔNG dùng cú pháp LaTeX.

---

## 1. Bối cảnh dự án
- **Ứng dụng:** VXClick (Macro Recorder & Automation Engine siêu nhẹ trên VXUtilities).
- **Công nghệ:** Rust 2024 Native Core Engine + Tauri v2 + React 19 + TypeScript.
- **Môi trường:** macOS (Apple Silicon / Intel, macOS Sonoma / Sequoia).
- **Tính năng liên quan:**
  - `CGEventTap` (thu thập chuột, bàn phím, modifiers).
  - Kiểm tra và xin quyền Trợ năng (`AXIsProcessTrusted`, `AXIsProcessTrustedWithOptions`).
  - Giao diện thanh widget siêu nhỏ gọn 310×38px.

---

## 2. Các file mã nguồn liên quan
- Backend:
  - `src-tauri/src/platform/macos.rs`: Hàm `check_accessibility_permission()` gọi `AXIsProcessTrusted()`, và `request_accessibility_permission()` mở `x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility` cùng `AXIsProcessTrustedWithOptions(kAXTrustedCheckOptionPrompt: true)`.
  - `src-tauri/src/engine/mod.rs`: `init_permission_watcher` chạy thread vòng lặp kiểm tra `check_accessibility_permission()` mỗi 800ms để chuyển FSM từ `PERMISSION_BLOCKED` sang `IDLE_EMPTY`.
  - `src-tauri/src/lib.rs`: Expose commands `get_system_permissions`, `request_system_permissions`, `get_system_state`.
- Frontend:
  - `src/components/MainBar.tsx`: Hiển thị nút Rec và các nút chức năng.
  - `src/components/PermissionModal.tsx`: Modal popover hướng dẫn cấp quyền 3 bước.
  - `src/App.tsx`: Quản lý `systemState`, tự động kiểm tra quyền khi khởi động và khi `window.focus`.

---

## 3. Phản hồi thực tế từ User & Vấn đề phát sinh
1. **Về Giao diện (UI/UX):**
   - User phản hồi: *"Mở lên, nút đang vàng => không hợp lý. Nếu chưa cấp quyền thì nút nên bị mờ."*
   - Hiện trạng: Khi `systemState === 'PERMISSION_BLOCKED'`, nút Rec đang hiển thị màu vàng/amber kèm chấm vàng ping animation. User thấy màu này gây mất tập trung và không đúng chuẩn UX (nút chưa sẵn sàng nên bị mờ/dimmed thay vì rực rỡ).
2. **Về Logic Quyền Hệ thống (macOS Accessibility / TCC):**
   - User phản hồi: *"Nó tự mở được sang trợ năng trong privacy setting. Nhưng enable lên xong không có gì xảy ra cả => tôi xoá nó đi trong trợ năng rồi."*
   - Hiện trạng: Nút mở Settings hoạt động tốt, app xuất hiện trong danh sách Accessibility, nhưng khi user gạt switch BẬT (enable), backend watcher (800ms) và frontend focus listener vẫn không phát hiện được sự thay đổi, FSM vẫn kẹt ở `PERMISSION_BLOCKED` và app không tự mở khóa.

---

## 4. Các câu hỏi cần Codex phân tích & tham vấn

1. **Cơ chế Cache của macOS TCC đối với `AXIsProcessTrusted()`:**
   - Tại sao khi một tiến trình macOS đang chạy, user bật switch Accessibility trong Settings mà `AXIsProcessTrusted()` vẫn tiếp tục trả về `false`?
   - `AXIsProcessTrusted()` có bị cache theo PID/Mach-port của process đang chạy trên các bản macOS hiện đại không?
   - Có cờ hay tham số nào trong `AXIsProcessTrustedWithOptions` (hoặc CoreGraphics API) giúp bypass cache hoặc buộc hệ thống kiểm tra lại trạng thái TCC thực tế không?

2. **Yêu cầu Khởi động lại (Relaunch / Restart):**
   - Trên macOS, việc cấp quyền Trợ năng (Accessibility) cho một ứng dụng lần đầu có bắt buộc phải Relaunch ứng dụng để hệ thống nạp quyền vào token của tiến trình không?
   - Nếu macOS bắt buộc phải restart process, kiến trúc UX và xử lý kỹ thuật nên như thế nào? (Ví dụ: Thêm nút "Khởi động lại ứng dụng" 1-chạm qua Tauri API `tauri::process::restart` hoặc `app_handle.restart()` khi user đã bật toggle).

3. **Vấn đề Mã ký (Code Signing) & Bundle Identity:**
   - App đang build release ad-hoc cục bộ với identifier `com.vxclick.desktop`. Khi rebuild nhiều lần, Designated Requirement (cdhash) có thể thay đổi khiến macOS TCC không khớp với bản đang chạy.
   - Làm thế nào để cấu hình hoặc xử lý để macOS TCC quản lý ổn định nhất trong quá trình phát triển và sử dụng thực tế?

4. **Đề xuất Kiến trúc UX & Code Chỉnh sửa Tối ưu:**
   - Cách làm mờ nút Rec chuẩn phong cách VXUtilities / vx* (nút bị mờ/dimmed, opacity thấp, biểu tượng khóa nhẹ hoặc xám mờ, hover tooltip chỉ rõ cần cấp quyền, bấm vào mở modal hướng dẫn).
   - Thiết kế lại luồng trong `PermissionModal.tsx` và backend Rust: Nếu cần restart, hướng dẫn rõ ràng: Bước 1: Mở Cài đặt và bật switch; Bước 2: Bấm nút "Khởi động lại VXClick" để hoàn tất.
   - Code snippet đề xuất cho Rust và React.
