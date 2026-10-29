# VXClick — điều tra quyền sau update 2026-10-29

## Kết luận theo evidence

macOS26.7 arm64. [Raw checks](permission_identity_20261029.json) lưu stdout/stderr/exit code; không đọc/chỉnh TCC, không chạy chức năng phát input, không thay app đang cài.

| Gói | Identity/requirement | Strict verify | Hash executable SHA-256 |
|---|---|---|---|
| `/Applications/VXClick.app` 1.0.5 | Ad-hoc; DR chỉ cdhash `7e09b8df2382bd4e87ea7b5184f5d765e445e84e` | PASS | `ba3d1e4b781b265a5e7b6525de4c0759cb27ebd8c667f700bb6be13b78cffee6` |
| Local target/release bundle 1.0.5 | Trùng ad-hoc/cdhash bản cài | PASS | Như bản cài |
| Public Silicon 1.0.5 tải mới | ID `com.vxclick.desktop`, certificate leaf `fe024021592c718a39ad70b76d2edc5da0cd6b70` | FAIL `CSSMERR_TP_NOT_TRUSTED` trên máy hiện tại | `b878ed982049eacdbe5a5217a892706db9ca7f5842b5b34af329df30caf5aa66` |

Public archive SHA-256 `4b0cbaa658f7579e629331df8c5a1889c5f5867c4799d0de894adc0be0e27848` khớp hồ sơ release có sẵn. Đối chiếu trực tiếp [asset public](https://github.com/linhbv94/VXClick/releases/download/v1.0.5/vxclick_1.0.5_macos_silicon.app.tar.gz), không cài/chạy gói tải về. Chưa kiểm lại Minisign trên manifest mới ở lượt này.

Bản cài hiện tại không trùng binary public. Trộn build local ad-hoc với public certificate-bound là rủi ro identity đã xác minh; chưa có evidence ai/cách nào thay bản cài và chưa tái hiện updater N → N+1 làm mất Accessibility. Không kết luận updater sửa/xóa TCC. Strict PASS riêng của ad-hoc không chứng minh retention; strict FAIL public là gap trust riêng, không tự sửa bằng re-sign hoặc thay trust.

## Đã sửa trong source

- `tauri.conf.json` mặc định signer certificate hiện hành thay `-`; không rotate certificate, app ID, updater key hay đường dẫn dữ liệu.
- `build_signed_macos.mjs` dùng wrapper SDK27, ký ngay khi bundle; bỏ thao tác tự mở khóa/chỉnh ACL keychain và bỏ re-sign `--deep` sau bundle. Override sang signer khác bị từ chối; signer thiếu/trust lỗi thì build fail.
- `verify_macos_identity.mjs` kiểm strict và DR đúng app/certificate; từ chối cdhash hoặc nhánh OR. `tauri_sdk.mjs` gọi gate trước khi tauri-action có thể upload. `--no-bundle` là compile-only, không dùng gói đó để cài.
- `validate_release.mjs` chặn ad-hoc/signer khác trong config; thêm regression version/config/DR. Docs overview/QA bỏ cam kết quyền vĩnh viễn và yêu cầu ad-hoc sai trước đây.

Đây là guard đường build và sửa docs; chưa tạo bundle signed mới. Không sửa UI/Settings, engine permission API hoặc /Applications.

## Hướng dẫn Anti release VXClick

Đọc [runbook quyền hệ thống toàn VX](../../../_summary/standard_docs/desktop_system_permissions.md) trước. Local bundle: từ root repo chạy `npm run bundle:mac`; không thay bằng build ad-hoc hoặc codesign `-`. CLI này chỉ tạo app local, không tạo gói updater. Release CI dùng workflow repo và cùng signer hiện hành; không tự xử lý Secrets/certificate nếu ngoài quyền.

Trước cài, chạy `node scripts/verify_macos_identity.mjs <đường_dẫn_app>` trên app giải nén từ chính archive updater, từng architecture. Đối chiếu bản đang cài. Máy hiện tại có baseline ad-hoc và public trust FAIL: phải giải quyết migration/trust theo quyền user và review riêng trước thay app; không reset TCC, không tự thêm trust. Nếu runtime retention chưa test, báo chưa kiểm chứng, không báo giữ quyền thành công.

## Checks và giới hạn

- Node release/version tests: 10/10 PASS từ cwd repo. Một lượt gọi từ cwd workspace lỗi đường dẫn fixture; chạy lại đúng cwd đã PASS.
- `validate_release.mjs` PASS; syntax hai build wrappers PASS.
- Gate native từ chối cả installed/local ad-hoc như dự kiến. Parser DR public PASS; strict gate public FAIL đúng lỗi trust và không bị bỏ qua.
- Chưa build signed mới, chưa update/restart, chưa test Accessibility trước/sau, chưa Intel/máy khác. Không thêm trust, không cấp/thu hồi quyền và không commit/push/release.

## Căn cứ kỹ thuật

[Apple TN2206](https://developer.apple.com/library/archive/technotes/tn2206/_index.html) giải thích DR và policy theo subsystem; cùng DR không thay QA TCC. [Tauri macOS signing](https://v2.tauri.app/distribute/sign/macos/) phân biệt certificate signing/ad-hoc; updater signature không cấp quyền runtime.
