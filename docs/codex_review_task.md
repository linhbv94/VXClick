# Yêu cầu Codex Tham Vấn & Review Chỉ Đọc — VXClick Auto-Update & Notification Glow
Ngày thực hiện: 2026-10-16

> **Chỉ thị bắt buộc cho Codex:**
> - Chỉ tham vấn/review chỉ đọc; không sửa nguồn; không gọi agent khác.
> - Tuân thủ AGENTS.md, tiếng Việt chuyên nghiệp, UTF-8, snake_case, tuyệt đối KHÔNG dùng cú pháp LaTeX.

---

## 1. Mục tiêu
Độc lập kiểm tra, đánh giá tính đúng đắn, an toàn luồng thực thi, tính nhất quán kiến trúc và rà soát các điểm còn thiếu sót/edge cases đối với đợt triển khai tính năng **Cập nhật tự động (Auto-Update)** và **Chỉ báo Notification Glow cho nút Setting** trên ứng dụng `VXClick`.

---

## 2. Phạm vi thay đổi (Git Diff & Files)
Toàn bộ thay đổi nằm trong workspace `vxclick`:

1. **`src/services/update_controller.ts` (Mới tạo):**
   - Bộ điều phối máy trạng thái FSM (`idle` | `checking` | `current` | `available` | `downloading` | `installing` | `installed` | `error` | `disabled`).
   - Tự động kiểm tra bản cập nhật khi khởi động app (`start()`) với cơ chế bắt lỗi an toàn (offline không làm gián đoạn UI).
   - Quản lý subscription phản ứng cho UI qua React `useSyncExternalStore`.
   - Điều phối tải về và cài đặt (`downloadAndInstall`) kèm cập nhật % tiến độ tải, gọi `relaunch()` khi hoàn tất.

2. **`src/services/app_updater.ts` (Mới tạo):**
   - Đóng gói controller kết nối với `@tauri-apps/plugin-updater` (`check`) và `@tauri-apps/plugin-process` (`relaunch`).
   - Cờ `enabled`: `isTauri() && !import.meta.env.DEV && getCurrentWindow().label === 'main'`.
   - Cung cấp hook React `useAppUpdater()`.

3. **`src/components/MainBar.tsx` (Chỉnh sửa):**
   - Bổ sung prop `hasUpdateAvailable?: boolean`.
   - Khi có update: Nút `⚙ Setting` có hiệu ứng phát sáng Cyan nhẹ (`bg-cyan-500/15 border-cyan-500/40 shadow-xs shadow-cyan-400/40 ring-1 ring-cyan-400/30`), kèm notification ping dot kép (`animate-ping absolute bg-cyan-400` + chấm tròn tĩnh `bg-cyan-500`) ở góc trên bên phải.
   - Cập nhật tooltip sang `settings_update_available_title`.

4. **`src/components/SettingsPopover.tsx` (Chỉnh sửa):**
   - Tích hợp khối "Cập nhật phần mềm" (Mục 7) ngay trước cụm About/Support.
   - Hiển thị badge phiên bản hiện tại `v1.0.1`.
   - Khung card trạng thái hiển thị theo FSM: Spinner khi checking, tích xanh khi up-to-date kèm nút check lại, khung nổi bật + nút CTA Cyan "Cập nhật & Khởi động lại" khi có bản mới, progress bar khi downloading, nút CTA Emerald "Khởi động lại ngay" khi installed, và nút thử lại khi error.

5. **`src/App.tsx` (Chỉnh sửa):**
   - Gọi `useAppUpdater()`, tính toán `hasUpdateAvailable = updateState.status === 'available' || updateState.status === 'installed'`.
   - Truyền `hasUpdateAvailable` vào `MainBar`.

6. **`src/i18n/translations.ts` (Chỉnh sửa):**
   - Bổ sung 15 translation keys song ngữ Tiếng Việt & English cho toàn bộ các trạng thái và nút bấm của tính năng cập nhật.

7. **`scripts/build_signed_macos.mjs` (Chỉnh sửa):**
   - Thêm `--config '{"bundle":{"createUpdaterArtifacts":false}}'` vào lệnh build app bundle local để không bị dừng bởi lỗi thiếu `TAURI_SIGNING_PRIVATE_KEY` (private key chỉ cần và chỉ có trên CI runner).

8. **`docs/spec/03_ui_wireframe.md` & `_summary/work_log.md`:**
   - Đồng bộ đặc tả UI mục 10 và cập nhật nhật ký tiến độ Track C.

---

## 3. Hiện trạng kết quả kiểm thử (Verification Checks)
- `npm run build`: PASS 100% (TypeScript compile + Vite build 0 errors, 1918 modules transformed).
- `cargo test --offline`: PASS 15/15 tests (gồm 14 algorithm/window policy tests + 1 Windows dummy engine test).
- `npm run test:automation`: PASS 8/8 tests.
- `npm run bundle:mac`: PASS 100%, bundle `VXClick.app` được ký số ổn định đạt `satisfies its Designated Requirement` với leaf certificate `fe024021592c718a39ad70b76d2edc5da0cd6b70`.

---

## 4. Các câu hỏi cụ thể cần Codex phản biện và đánh giá
1. **FSM và React Lifecycle:**
   - Hook `useAppUpdater()` sử dụng `useSyncExternalStore` kết hợp `useEffect(controller.start, [])` có đảm bảo an toàn tuyệt đối dưới React StrictMode (vốn mount-unmount-remount trong dev) không?
   - Có kịch bản race condition nào xảy ra nếu người dùng bấm nút "Kiểm tra cập nhật" liên tiếp nhiều lần không?
2. **Quy trình Download & Relaunch:**
   - Trong `update_controller.ts`, lệnh `relaunch()` được bọc trong `try...catch` ở dòng 79-84: Liệu trên macOS có trường hợp bundle sau khi tải xong cần thêm bước nào trước khi relaunch không?
   - Cấu hình updater trong `tauri.conf.json` và `capabilities/default.json` đã đồng bộ và đầy đủ quyền chưa?
3. **Layout & UX:**
   - Kích thước popover khi thêm Section 7 có gây tràn cửa sổ hoặc giật nhảy khung hình không (nhờ cơ chế `ResizeObserver` đã có trong `App.tsx`)?
   - Hiệu ứng phát sáng trên nút Setting ở `MainBar.tsx` có xung đột về CSS class với trạng thái `isSettingOpen` hay không?
4. **Build & Release Compatibility:**
   - Việc bổ sung override `--config '{"bundle":{"createUpdaterArtifacts":false}}'` trong `build_signed_macos.mjs` có làm ảnh hưởng đến CI GitHub Actions khi build release artifacts đầy đủ hay không?
5. **Khuyến nghị & Điểm cần cải thiện:**
   - Nêu rõ các điểm cần sửa chữa hoặc tối ưu (nếu có).
