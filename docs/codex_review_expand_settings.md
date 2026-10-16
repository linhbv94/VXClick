# Yêu cầu Codex Tham Vấn & Review Chỉ Đọc — Lỗi Không Expand Được Setting trên VXClick v1.0.2
Ngày thực hiện: 2026-10-16

> **Chỉ thị bắt buộc cho Codex:**
> - Chỉ tham vấn/review chỉ đọc; không sửa nguồn; không gọi agent khác.
> - Tuân thủ AGENTS.md, tiếng Việt chuyên nghiệp, UTF-8, snake_case, tuyệt đối KHÔNG dùng cú pháp LaTeX.

---

## 1. Vấn đề Người Dùng Báo Cáo
Người dùng phản ánh: "bản mới bị méo gì ấy. k expand setting được. check lại. gọi codex cli review rồi sửa theo luôn".

---

## 2. Phân Tích Hiện Trạng & Nghi Vấn Kỹ Thuật

### A. Vấn đề cốt lõi tại `src/index.css`:
Trong commit `6841589` (v1.0.2), để xử lý chống tràn trên màn hình nhỏ, rule CSS sau đã được thêm vào:
```css
.widget_content {
  width: 100%;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  max-height: min(520px, calc(100vh - 80px));
  overflow-y: auto;
  overflow-x: hidden;
}
```

**Cơ chế gây lỗi (Deadlock kích thước):**
1. Cửa sổ `VXClick` khi khởi động ở trạng thái thanh công cụ thu gọn (`MainBar`), có chiều cao khởi tạo là `height: 38px`.
2. Trong môi trường webview Tauri, biến viewport `100vh` phản ánh trực tiếp chiều cao hiện tại của cửa sổ webview, tức `100vh = 38px`.
3. Biểu thức `calc(100vh - 80px)` được tính bằng `38px - 80px = -42px`. Trong chuẩn CSS, giá trị `max-height` âm được clamp về `0px`.
4. Khi người dùng click nút Setting, React render `<div className="widget_content">{popoverNode}</div>`. Do `max-height: 0px` (kết hợp `overflow-y: auto`), chiều cao hiển thị của `.widget_content` bị triệt tiêu về `0px`.
5. `ResizeObserver` trong `App.tsx` đo chiều cao của `shellRef` vẫn chỉ là `38px` (`38px + 0px = 38px`).
6. `ResizeObserver` gọi `bridgeSyncWindowHeight(38, false)`, giữ nguyên chiều cao cửa sổ Tauri ở `38px`.
7. Kết quả: Popover hoàn toàn bị ẩn, cửa sổ không bao giờ mở rộng được khi người dùng click nút Setting.

### B. Các yếu tố liên quan cần rà soát:
1. **Nút Setting trong `src/components/MainBar.tsx`:**
   Chấm báo hiệu cập nhật `hasUpdateAvailable`:
   ```tsx
   {hasUpdateAvailable && (
     <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
       <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 ring-1.5 ring-white dark:ring-slate-900" />
     </span>
   )}
   ```
   Cần bổ sung `pointer-events-none` để bảo đảm các phần tử ping dot không chặn click event vào nút button.

2. **Cơ chế giới hạn chiều cao an toàn trên màn hình nhỏ:**
   Trong `src/services/tauri_bridge.ts`, hàm `bridgeSyncWindowHeight` đã có sẵn cơ chế clamp theo monitor thật qua Tauri window API:
   ```ts
   const maxAvailableH = Math.max(200, Math.floor(monitorHeight - dockMargin - 25));
   const safeTargetHeight = Math.min(targetHeight, maxAvailableH);
   ```
   Khi `safeTargetHeight < targetHeight`, cửa sổ được giới hạn ở `safeTargetHeight`. Nếu `.widget_content` có `max-height: 520px` (hoặc chiều cao cố định độc lập với `100vh`) và `overflow-y: auto`, nội dung sẽ tự động cuộn bên trong mà không bị deadlock khi mở rộng.

---

## 3. Câu Hỏi Tham Vấn Cho Codex
1. Xác nhận phân tích trên về `calc(100vh - 80px)` có phải là nguyên nhân trực tiếp và duy nhất dẫn tới việc không thể mở rộng Setting hay không?
2. Phương án khắc phục tối ưu cho `.widget_content` trong `src/index.css` và `tauri_bridge.ts` để:
   - Cho phép mở rộng popover mượt mà, đo đúng chiều cao thực của nội dung.
   - Vẫn hỗ trợ cuộn nội dung khi màn hình nhỏ hơn chiều cao popover.
   - Không bị bất kỳ vòng lặp deadlock kích thước nào giữa ResizeObserver và Tauri `win.setSize`.
3. Có bất kỳ edge case nào khác liên quan đến việc render popover, click trigger, ResizeObserver hay cấu hình Tauri (`resizable: false`) cần lưu ý không?
