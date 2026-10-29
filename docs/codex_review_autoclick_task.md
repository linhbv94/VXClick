# Yêu cầu Codex Tham Vấn & Review Chỉ Đọc — VXClick Auto Click Feature & Hotkey ⌥⇧⌘C
Ngày thực hiện: 2026-10-27

> **Chỉ thị bắt buộc cho Codex:**
> - Chỉ tham vấn/review chỉ đọc; không sửa nguồn; không gọi agent khác.
> - Tuân thủ AGENTS.md, tiếng Việt chuyên nghiệp, UTF-8, snake_case, tuyệt đối KHÔNG dùng cú pháp LaTeX.

---

## 1. Mục tiêu
Độc lập kiểm tra, phân tích và phản biện tính đúng đắn, an toàn luồng thực thi (thread safety & race conditions), khả năng tương thích ngược (backward compatibility) và rà soát các điểm còn thiếu sót/edge cases đối với đợt triển khai tính năng **Tự động nhấp chuột (Auto Click)** và **Tổ hợp phím tắt toàn cục ⌥⇧⌘C** trên ứng dụng `VXClick`.

---

## 2. Phạm vi thay đổi (Git Diff & Files liên quan)
Toàn bộ thay đổi nằm trong workspace `/Users/vic/_Work/VXUtilities/vxclick`:

1. **`src-tauri/src/types.rs`:**
   - Bổ sung `AUTOCLICKING` vào `SystemState` enum (SCREAMING_SNAKE_CASE serde).
   - Thêm `AutoClickConfig` struct (`interval_ms`, `button: MouseBtn`, `until_stopped: bool`, `repeat_count: u32`).
   - Thêm `AutoClickProgressPayload` struct (`current_clicks: u32`, `total_clicks: u32`, `pct: f32`).
   - Mở rộng `SettingsState` với serde default functions để đảm bảo tương thích ngược 100% với file cấu hình `settings.json` cũ của người dùng (`autoclick_interval_ms: 100`, `autoclick_button: Left`, `autoclick_until_stopped: true`, `autoclick_repeat_count: 100`).
   - Bổ sung 2 unit tests: `test_settings_state_backward_compatibility` và `test_settings_state_full_roundtrip`.

2. **`src-tauri/src/engine/mod.rs`:**
   - Triển khai `start_autoclick(config: Option<AutoClickConfig>) -> Result<u64, String>`:
     - Khóa guard: từ chối nếu đang `RECORDING` hoặc `PLAYING`.
     - FSM chuyển sang `AUTOCLICKING`, phát sự kiện `macro://state_changed`.
     - Luồng nền chạy vòng lặp inject chuột tại tọa độ con trỏ chuột thời gian thực: `MouseDown` -> `sleep 10ms` -> `MouseUp`.
     - Đợi chu kỳ nhấp qua `cvar.wait_timeout` (có thể bị đánh thức tức thì < 1ms khi có tín hiệu dừng hoặc ngắt khẩn cấp).
     - Tiết lưu (Throttle) phát sự kiện `macro://autoclick_progress` mỗi 100ms để không làm nghẽn luồng IPC.
   - Triển khai `stop_autoclick()` và `on_autoclick_ended()`: Xả phím chuột dở dang và khôi phục FSM về `IDLE_READY` (nếu đã có timeline macro trong RAM) hoặc `IDLE_EMPTY` (nếu chưa có timeline).
   - Đấu nối mạch ngắt khẩn cấp `trigger_emergency_stop`: Nếu nhận phím cứng `ESC` khi đang `AUTOCLICKING`, ngắt luồng ngay lập tức, chuyển FSM sang `EMERGENCY_STOPPED`, xả chuột, sau đó phục hồi an toàn về Idle.
   - Xử lý watcher quyền hệ thống: Nếu quyền bị thu hồi đột ngột khi đang `AUTOCLICKING`, tự động dừng auto click và chuyển về `PERMISSION_BLOCKED`.

3. **`src-tauri/src/platform/macos.rs` & `windows.rs`:**
   - Bổ sung hàm đọc vị trí con trỏ chuột hiện tại `get_current_mouse_location() -> (i32, i32)` trên macOS dùng `CGEventSource` + `CGEvent::new(source).location()` trả về tọa độ logic Quartz points thời gian thực.
   - Trên Windows adapter cung cấp dummy `(0, 0)`.
   - Bổ sung nhận diện hotkey toàn cục `is_toggle_autoclick_hotkey`: kiểm tra virtual keycode `0x08` (`kVK_ANSI_C`) kết hợp cờ `MOD_CMD | MOD_ALT | MOD_SHIFT`, kích hoạt enum `GlobalHotkeyTrigger::ToggleAutoClick`.

4. **`src-tauri/src/lib.rs`:**
   - Khai báo và đăng ký hai Tauri IPC commands mới: `start_autoclick` và `stop_autoclick`.

5. **`tauri.conf.json` & `src/index.css`:**
   - Nâng chiều rộng cửa sổ từ `310px` lên `360px` để chứa đủ 5 nút chức năng trên một hàng mà không bị đè lên vùng đệm Traffic Lights native 54×38px.

6. **`src/types/macro.ts` & `src/services/tauri_bridge.ts`:**
   - Cập nhật định nghĩa TypeScript types đồng bộ với Rust backend.
   - Bổ sung wrappers IPC: `bridgeStartAutoClick`, `bridgeStopAutoClick`, `bridgeListenAutoClickProgress`.
   - Tích hợp giả lập Auto Click trong `MockMacroEngine` (dùng cho môi trường web preview).

7. **`src/components/MainBar.tsx`:**
   - Bổ sung nút `Auto Click` với icon `MousePointerClick`, Semantic Amber (`#f59e0b`), tooltip `⌥⇧⌘C`, trạng thái running với bộ đếm click.

8. **`src/components/SettingsPopover.tsx`:**
   - Bổ sung khối Cài đặt Auto Click: Click Interval (preset chip + custom slider/input ms), Target Mouse Button (`Left` / `Right`), Repeat (`Until stopped` switch / `Repeat Count` stepper).

9. **`src/components/PlaybackMiniBar.tsx`:**
   - Hỗ trợ `mode === 'autoclick'`: Hiển thị tiến trình nhấp (số lần hoặc vòng lặp vô tận) với theme Amber và nút ngắt ESC.

10. **`src/App.tsx`:**
    - Điều phối sự kiện FSM, lắng nghe `bridgeListenAutoClickProgress`, xử lý ngắt ESC và cập nhật `StoppedNoticeInfo`.

11. **`src/i18n/translations.ts`:**
    - Bổ sung đầy đủ dictionary keys song ngữ Tiếng Việt và English.

---

## 3. Hiện trạng kiểm thử & Xác minh kỹ thuật (Verification Status)
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: 17/17 tests PASS (toàn bộ unit tests bao gồm backward compatibility serde tests).
- `npm run test:automation`: 14/14 tests PASS.
- `npm run build`: Vite build + TypeScript compiler PASS 0 errors (1918 modules transformed, built in 882ms).

---

## 4. Các câu hỏi cụ thể cần Codex tham vấn & rà soát
1. **Thread Safety & Condvar Loop:** Trong `engine/mod.rs`, luồng vòng lặp `start_autoclick` sử dụng `condvar.wait_timeout` và kiểm tra `is_autoclicking` atomic flag. Khi người dùng bấm dừng nhanh hoặc bấm ESC liên tục, có nguy cơ kẹt deadlock hoặc dính phím chuột Down không?
2. **Đọc Tọa độ Chuột macOS:** Việc sử dụng `CGEventSource::new(CGEventSourceStateID::CombinedSessionState)` rồi gọi `CGEvent::new(source).location()` có gặp vấn đề lệch tỉ lệ (scale drift) trên màn hình Retina hoặc thiết lập đa màn hình khác độ phân giải không?
3. **Phục hồi FSM & Bảo toàn Macro:** Khi Auto Click kết thúc hoặc bị ngắt bằng ESC, FSM khôi phục về `IDLE_READY` (nếu đã có timeline macro trong RAM) hoặc `IDLE_EMPTY`. Cơ chế này có làm ảnh hưởng hay xóa nhầm bản ghi macro người dùng đã ghi trước đó không?
4. **Đánh giá tổng thể:** Còn bất kỳ edge case, lỗ hổng tiềm ẩn hoặc điểm cần tối ưu nào khác trước khi đưa vào phát hành không?

---
*Vui lòng xuất báo cáo nhận xét chi tiết vào file `vxclick/docs/codex_review_autoclick_report.md` hoặc trả lời trực tiếp.*
