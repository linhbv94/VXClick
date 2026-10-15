# Tham vấn Codex CLI: Khắc phục TCC Accessibility Permission & Ký ổn định (Certificate-bound DR)

Chỉ tham vấn/review chỉ đọc; không sửa nguồn; không gọi agent khác. Tuân thủ AGENTS.md, tiếng Việt, UTF-8, snake_case và không LaTeX.

## 1. Bối cảnh
- Ứng dụng VXClick (Tauri v2 + Rust) cần quyền macOS Accessibility (`AXIsProcessTrustedWithOptions`).
- Hiện tại đang ký ad-hoc (`codesign --force --deep --sign -`).
- Vấn đề: Mỗi lần build/rebuild, người dùng vào System Settings > Privacy & Security > Accessibility thấy switch đã BẬT, nhưng app vẫn báo `PERMISSION_BLOCKED` và không nhận quyền. Người dùng phải xóa entry cũ rồi add lại thủ công rất phiền toái.
- User ghi nhớ: Trước đây Codex đã xử lý thành công vấn đề này cho VXClean (Full Disk Access - FDA) bằng cơ chế ký ổn định (certificate-bound Designated Requirement), giúp app giữ nguyên quyền qua các lần update mà không bắt cấp lại.

## 2. Kiểm tra hiện trạng máy
- Lệnh `security find-identity -v -p codesigning` trả về:
  `1) FE024021592C718A39AD70B76D2EDC5DA0CD6B70 "VXClean Code Signing"`
- Đã đọc tài liệu tham chiếu:
  - `vxclean/docs/macos_signer_setup_plan.md`
  - `vxclean/docs/spec/25_full_disk_access_flow.md`
  - `vxclean/scripts/build_signed_macos.mjs`

## 3. Câu hỏi tham vấn Codex
1. Giải thích ngắn gọn cơ chế vì sao ad-hoc signing (`codesign -s -`) bị TCC từ chối nhận diện sau mỗi lần rebuild (mối liên hệ giữa cdhash, Designated Requirement và TCC database).
2. Đối với VXClick, nên tái sử dụng certificate `FE024021592C718A39AD70B76D2EDC5DA0CD6B70` hay nên tạo một certificate riêng (ví dụ `VXClick Code Signing` hoặc `zTools Local Code Signing`)? Ưu/nhược điểm?
3. Nếu tạo certificate riêng hoặc dùng cert hiện có: Cần lệnh openssl/security cụ thể nào để tạo keychain/identity an toàn, không đụng chạm SSL/TLS root cert?
4. Cấu hình lệnh `codesign` hoặc script build Tauri như thế nào để đảm bảo Designated Requirement sinh ra ràng buộc chặt chẽ vào `certificate leaf = H"..."` thay vì `cdhash`?
5. Các bước tối thiểu người dùng cần làm 1 lần duy nhất trong System Settings để TCC lưu vĩnh viễn quyền Accessibility cho VXClick?
