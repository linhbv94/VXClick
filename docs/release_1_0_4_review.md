# VXClick 1.0.4 — QA Auto Click, SDK27 và release
Ngày:2026-10-27. User giao QA/release, cho phép lưu signer hiện có vào Secrets VXClick và yêu cầu bỏ qua test nhấp thật khi QA bundle thiếu Accessibility.

## QA và sửa trước tag

Review phạm vi Auto Click Mac, hotkey, config legacy, stop/recovery/session guard, Windows dummy, SDK27 và icon mới. Đã sửa harness compressor/tail-trim plain data bị kéo test serde không có crate; Cargo vẫn chạy test serialization đầy đủ. Bổ sung validate IPC interval10–60000ms, Left/Right, finite count1–999999 để tránh overflow deadline; chặn start khi không Idle; session ID tăng đơn điệu. Backend Windows từ chối Record/Play/Click, không chỉ UI guard.

Local frontend/build và22Rust +14automation +11compressor +10tail-trim đạt. Native bundle SDK27/version1.0.4 đã mở; Settings Auto Click và cuộn tới Update/About/Support đạt; Click thiếu quyền chỉ mở hướng dẫn, quay lại không phát input. Settings user giữ nguyên byte-exact. Traffic lights bị indicator chia sẻ màn hình che, không đo bezel từ screenshot; dựa artifact SDK27 và fixture AppKit riêng, chưa claim visual native sizing PASS.

## Signing và CI

Giữ app ID com.vxclick.desktop, public updater key; signer local fingerprint fe024021592c718a39ad70b76d2edc5da0cd6b70 được đối chiếu certificate/private key trước lưu Secrets đúng repo theo user cho phép. Private key không vào Git/log/release. CI thiếu signer sẽ fail, không fallback ad-hoc. Không cam kết quyền TCC được giữ từ bản public cũ; có thể cần bật lại một lần.

Cả hai target Mac dùng standard runner xcode-27, cross-build Intel riêng và kiểm SDK27.0 thật, không patch metadata. Windows UI/update-only; không nhận nghiệm thu engine thật.

Đang chuẩn bị tag; chưa publish. User bỏ qua nhấp thật; chưa kiểm global hotkey/nhấp/stop phần cứng, Windows/Intel GUI hoặc old→new updater. Không lấy test/CI thay những bằng chứng này.
