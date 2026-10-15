# VXClick — QA độc lập lượt cập nhật cửa sổ

Ngày: 2026-10-15. User giao Codex QA; **Anti phụ trách release sau bàn giao**, Codex không publish/gọi Anti. Baseline Git `7ef751d8d6b5b6f420a6a94822c309b9f5d2e77f` cùng diff đang có ở `lib.rs`, `tauri_bridge.ts`, spec03/05. Không ghi đè thay đổi agent khác.

## Kết quả

- Frontend production build PASS; 13 Rust lib tests PASS; 8 Node release tests PASS. Hai regression cũ và các compressor tests nay PASS (runner riêng 9/9), không giữ kết luận “hai lỗi cũ chưa sửa” làm hiện trạng.
- Review thay đổi mới: native frame/bounds cùng tỷ lệ, tâm toolbar20pt chuyển qua content/superview; Pin đi qua IPC native để giữ managed/cycling policy; Reopen khôi phục cửa sổ hiện có, không khởi tạo engine mới.
- Bundle QA cuối `com.vxclick.qa.align20261015` mở được. Từ chối hướng dẫn quyền bằng Quay lại giữ Rec blocked, Play disabled; không tự ghi. Pin ON→OFF→ON cập nhật đúng UI, giữ nguyên trạng thái cuối. Không cấp TCC, không chỉnh Spaces toàn máy.
- Chưa nghiệm thu hình dạng/căn tâm traffic lights vì sharing indicator che cụm nút; chưa xác minh Mission Control thumbnail/cross-Space trên desktop thật. Nhấn minimize có thực hiện nhưng AX/capture không chứng minh được trạng thái minimized/reopen ở lượt độc lập này. Không suy PASS từ source hoặc unit tests.
- Không thực hiện native capture/injection do QA bundle chưa có Accessibility; không dùng permission của bundle production để đại diện bản QA.

## P1 — Lỗi mới đã tái hiện: tail-trim xóa KeyUp không liên quan

`src-tauri/src/compressor.rs:92–119`: stage1 dùng padding8, tail-trim dùng padding16. Tại dải cách widget10px, mouse pair qua stage1 nhưng tail-trim gặp Up sẽ gọi `step1_events.truncate(down_idx)`, xóa mọi event sau Down, gồm keyboard event không thuộc widget.

Fixture bounds100..200:

1. KeyDown W.
2. MouseDown tại (90,150), ngoài padding8 nhưng trong padding16.
3. KeyUp W.
4. MouseUp tại (90,150).

Kết quả production chỉ còn KeyDown W. Phím bị giữ tới khi engine flush cuối playback; continuous có thể giữ xuyên vòng. Đây là lỗi logic tái hiện offline, chưa bắn phím thật lên desktop.

```sh
python3 docs/qa/run_tail_trim_regression.py
```

Hiện **7 PASS + 1 FAIL, exit101**. [Fixture](qa/tail_trim_regression.rs), [output](qa/independent_tail_trim_2026_10_15.txt). Sửa chỉ xóa đúng gesture thuộc widget, bảo toàn mọi keyboard/button khác; dùng cùng vùng ownership giữa các stage. Chuyển fixture vào suite chính, kiểm thêm nhiều buttons/key modifiers.

## Các điểm cần review tiếp khi Anti sửa

- `engine/mod.rs:425–427`: join worker cũ khi đang giữ engine write lock; worker kết thúc lại cần lock ở `on_playback_ended`. Emergency timer500ms có thể trả READY trước worker xong → nguy cơ deadlock khi Play lại. Chưa tái hiện runtime; cần fixture worker completion bị trì hoãn, join ngoài lock và generation guard.
- Overflow nay có flag/reject timeline ở stop, không còn âm thầm phát timeline bị cắt. Nhưng chưa thấy auto-stop watcher hoặc frontend listener `macro://overflow_error`; contract tự dừng ngay ngưỡng vẫn chưa được chứng minh. Không đánh đồng unit test queue flag với E2E.
- Topology vẫn chỉ main display/scale2, thiếu playback gate và Sleep/Lock guard như spec. Tuyên bố “TCC vĩnh viễn”, “không trùng bất kỳ app nào” trong spec là quá mức; sửa tài liệu theo evidence, không gọi tất cả gate đã đạt.
- Windows dummy hiện trả start recording OK và chưa có banner/capability guard UI rõ ràng. Theo AGENTS1.6, được release dummy nhưng phải giải thích tính năng chưa có, chặn/giải thích thao tác và giữ updater thật; không báo ghi thành công giả.

## Bàn giao Anti release

**Chưa QA PASS toàn app: sửa P1 và kiểm lại trước tag/publish.** Scope release khi đạt: Mac engine thật + Windows dummy theo quy tắc mới; không đợi Win32 engine thật. Không đổi app identifier/updater key hoặc thay package v1.0.0 đã public. Dùng patch version mới và tag bất biến.

Đọc work log Track C, báo cáo này, báo cáo cửa sổ chung và skill release. Chạy lại build/13test+regressions mới/Node; native test có permission phù hợp trên fixture, Pin, minimize/reopen, Mission Control/Space và visual khi có thể quan sát. Ghi rõ case chưa thử. Script local `build_signed_macos.mjs` vẫn tham chiếu signer/keychain app khác; không chạy/đổi trust/ACL chỉ để làm check xanh. Đối chiếu signer production hiện hữu và kế hoạch TCC/update theo doc quyền trước build.

Release agent kiểm CI đúng commit, ba platform/6assets, chữ ký updater và public endpoint; Windows dummy cần installer/update hoạt động và note trung thực. User sẽ giao Anti; báo cáo này không phải một lần dispatch hoặc quyền upload key mới.
