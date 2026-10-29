# QA & Acceptance Specification: VXClick (`_spec5_qa_acceptance`)

> **Sản phẩm:** VXClick — Tiện ích Tự động hóa Macro Chuột & Bàn phím Siêu Tối giản  
> **Thư mục tài liệu:** `vxclick/docs/spec/`  
> **Phiên bản:** 1.1.1  
> **Ngày cập nhật:** 2026-10-15  

---

## Trạng thái kiểm chứng độc lập — 2026-10-15 (lượt mới)

**BLOCKED vì regression tail-trim mới**, xem [bàn giao độc lập](../independent_qa_2026_10_15.md). Hai fixture cũ đã PASS; 13 Rust tests, frontend và 8 Node tests PASS. Fixture mới chứng minh tail-trim xóa KeyUp xen giữa mouse pair sát mép widget. Native QA chỉ permission-blocked/Pin/cửa sổ, chưa capture/inject hoặc Mission Control/cross-Space. Báo cáo final QA đầu ngày là lịch sử, không đại diện toàn bộ source hiện tại. Windows dummy được release theo AGENTS1.6 sau khi có thông báo giới hạn/capability guard và updater thật; không cần đợi engine Win32.

---

## 1. Tiêu chuẩn Nghiệm thu Theo Chuẩn Gherkin (Acceptance Criteria)

### Kịch bản 1: Ghi và Phát lại Chuỗi Thao tác Chuột Cơ bản
```gherkin
Feature: Thu nạp và Tái hiện Thao tác Chuột
  Scenario: Ghi lại 3 cú click chuột và phát lại thành công
    Given Người dùng đã khởi chạy VXClick và cấp đủ quyền hệ thống
    And Ứng dụng đang ở trạng thái "IDLE_EMPTY" với nút Play bị làm mờ
    When Người dùng nhấn phím tắt "⌥⇧⌘R" (macOS) hoặc "Ctrl+Alt+Shift+R" (Windows) (hoặc click "● Rec")
    Then Nút Rec chuyển thành "■ Stop" màu đỏ với hiệu ứng viền nhấp nháy nhẹ
    When Người dùng click chuột trái vào vị trí A (x=200, y=300)
    And Người dùng chờ 1 giây rồi click chuột phải vào vị trí B (x=400, y=500)
    And Người dùng nhấn lại phím "⌥⇧⌘R" / "Ctrl+Alt+Shift+R" (hoặc click "■ Stop")
    Then Nút Rec trở về "● Rec"
    And Cú click vào nút Stop trên VXClick bị loại trừ khỏi MacroTimeline (Self-exclusion)
    And Nút Play chuyển sang màu xanh lá "▶ Play" (Enabled)
    When Người dùng nhấn phím tắt "⌥⇧⌘P" (macOS) hoặc "Ctrl+Alt+Shift+P" (Windows) (hoặc click "▶ Play")
    Then Cửa sổ tự động mở rộng Dynamic Mini Bar (chiều cao 62px)
    And Con trỏ chuột tự động di chuyển đến vị trí A và kích hoạt Left Click
    And Sau đúng 1 giây, con trỏ chuột di chuyển đến vị trí B và kích hoạt Right Click
    And Khi hoàn tất, cửa sổ tự động thu gọn về 38px và nút Play trở về "▶ Play" sẵn sàng
```

---

### Kịch bản 2: Ghi và Phát lại Tổ hợp Phím Tắt Bàn phím
```gherkin
Feature: Bắt và Tái hiện Sự kiện Bàn phím
  Scenario: Ghi nhận tổ hợp phím Ctrl+A, Ctrl+C và gõ văn bản
    Given VXClick đang ở trạng thái ghi thao tác (RECORDING)
    When Người dùng nhấn giữ phím "Ctrl", nhấn phím "A", nhả phím "A", nhả phím "Ctrl"
    And Người dùng gõ chuỗi ký tự "zTools"
    And Người dùng nhấn phím Enter
    And Người dùng dừng ghi thao tác bằng "⌥⇧⌘R" / "Ctrl+Alt+Shift+R"
    When Người dùng chọn một ô văn bản trống và kích hoạt "▶ Play" (hoặc "⌥⇧⌘P" / "Ctrl+Alt+Shift+P")
    Then Toàn bộ văn bản cũ được bôi đen (tái hiện Ctrl+A)
    And Chuỗi ký tự "zTools" được gõ chính xác kèm thao tác xuống dòng Enter
    And ActiveInputLedger xác nhận không có bất kỳ phím nào bị kẹt lại sau khi hoàn tất
```

---

### Kịch bản 3: Chế độ Lặp Đến Tận Thế (Loop Until Doomsday) & Phản Hồi ESC An Toàn
```gherkin
Feature: Vòng lặp Đến Tận Thế và Dynamic Mini Expand Bar
  Scenario: Kích hoạt Continuous Playback, hiển thị Mini Status Bar và ngắt bằng phím ESC
    Given Người dùng đã có bản ghi macro sẵn sàng trong RAM
    When Người dùng mở menu "⚙ Setting" và bật "Lặp đến tận thế (Loop until doomsday) = ON"
    Then Ô nhập "Repeat Count" chuyển sang trạng thái bị vô hiệu hóa (Disabled)
    When Người dùng bấm nút "▶ Play" (hoặc nhấn "⌥⇧⌘P" / "Ctrl+Alt+Shift+P")
    Then Cửa sổ tự động mở rộng chiều cao từ 38px lên 62px
    And Mini Expand Bar hiển thị: "♾️ Lặp đến tận thế #{vòng_lặp}" và nút "ESC"
    And Nút Play hiển thị "■ Stop" màu xanh nhấp nháy
    And Macro bắt đầu chạy chu kỳ lặp liên tục
    When Người dùng nhấn phím cứng "ESC" trên bàn phím vật lý (hoặc bấm nút ESC trên widget)
    Then Condvar đánh thức Playback Thread ngay lập tức trong vòng < 1 mili-giây
    And Hệ thống khóa Injector và quét ActiveInputLedger để gửi Up cho toàn bộ phím/chuột còn giữ
    And Mini Expand Bar chuyển sang trạng thái dừng: "⏹ Đã dừng lặp đến tận thế [ESC]" trong 1.4 giây
    And Sau 1.4 giây, cửa sổ tự động thu gọn chiều cao từ 62px về lại 38px mà không có popup nào che đè nút bấm
    And Giao diện VXClick chuyển về trạng thái sẵn sàng "IDLE_READY", bảo toàn nguyên vẹn macro trong RAM
```

---

### Kịch bản 4: Chế độ Lặp X Lần & Thanh Tiến Trình Mini Expand Bar
```gherkin
Feature: Tiến trình Lặp X lần trên Dynamic Mini Bar
  Scenario: Chạy macro lặp 10 lần và theo dõi tiến trình
    Given Cấu hình "Đến tận thế = OFF" và "Repeat Count = 10"
    When Người dùng kích hoạt Playback
    Then Cửa sổ tự động mở rộng chiều cao lên 62px
    And Mini Expand Bar hiển thị trạng thái bắt đầu: "🔁 Đã lặp 0 / 10 lần (0%)"
    When Hoàn thành chu kỳ lặp thứ nhất
    Then Mini Expand Bar cập nhật: "🔁 Đã lặp 1 / 10 lần (10%)" kèm progress bar 10%
    When Hoàn thành chu kỳ lặp thứ 10
    Then Hệ thống dọn dẹp timer và xả Ledger
    And Cửa sổ tự động thu gọn về 38px
    And Nút Play trở về trạng thái "▶ Play"
```

---

### Kịch bản 5: Cấp Quyền Trợ Năng macOS & Khởi Động Lại 1-Chạm (Zero-Restart Permission Flow)
```gherkin
Feature: Quy trình Cấp quyền Trợ năng trên macOS
  Scenario: Người dùng chưa cấp quyền mở ứng dụng và cấp quyền thành công
    Given Ứng dụng VXClick vừa khởi chạy trên macOS nhưng chưa được cấp quyền Accessibility
    Then Nút Rec hiển thị trạng thái mờ xám ("opacity-40 hover:opacity-80", chấm tròn xám)
    And Trạng thái hệ thống là "PERMISSION_BLOCKED"
    When Người dùng nhấp vào nút Rec mờ
    Then Hiển thị Modal Hướng Dẫn Cấp Quyền ("PermissionModal") với 3 bước rõ ràng
    When Người dùng nhấp vào nút "Mở Cài đặt hệ thống"
    Then Hệ thống mở ứng dụng Cài đặt macOS trỏ đúng vào mục Quyền riêng tư & Bảo mật > Trợ năng
    When Người dùng gạt BẬT công tắc cho "VXClick"
    And Người dùng quay lại ứng dụng và nhấp nút "Khởi động lại ứng dụng"
    Then Ứng dụng tự động đóng và khởi chạy lại tức thì (Relaunch)
    And Token TCC mới được nạp vào tiến trình
    And Nút Rec chuyển sang màu đỏ "● Rec" bình thường, sẵn sàng ghi macro
```

---

### Kịch bản 6: Kiểm định identity bundle macOS và quyền qua update
```gherkin
Feature: Tính hợp lệ của Chữ ký Số Bundle ứng dụng macOS
  Scenario: Xác thực Bundle VXClick.app sau khi build release
    Given Bundle "VXClick.app" đã được tạo ra trong thư mục release
    When Chạy lệnh kiểm tra chữ ký: "codesign --verify --deep --strict --verbose=4 VXClick.app"
    Then Lệnh trả về exit code 0
    And Đầu ra xác nhận "valid on disk" và "satisfies its Designated Requirement"
    And Chạy node scripts/verify_macos_identity.mjs với bundle và nhận exit code 0
    And Requirement gắn đúng bundle ID và certificate hiện hành, không chỉ cdhash
    And Kết quả này chỉ nghiệm thu artifact, chưa nghiệm thu runtime TCC
```

---

### Kịch bản 7: Bảo Toàn Thao Tác Vẽ & Kéo Thả (Drag Fidelity)
```gherkin
Feature: Bảo toàn nét vẽ và kéo thả khi nén thích ứng
  Scenario: Người dùng giữ chuột trái vẽ một đường cong chữ S trong Paint
    Given VXClick đang ở trạng thái ghi thao tác (RECORDING)
    When Người dùng nhấn giữ chuột trái (MouseDown) và vẽ đường cong chữ S trong 3 giây
    And Người dùng nhả chuột trái (MouseUp) và dừng ghi
    Then Bộ lọc nén nhận diện trạng thái Drag Mode (is_mouse_down = true)
    And Giữ lại 100% tọa độ tại điểm MouseDown, MouseUp và các mốc lấy mẫu >= 60Hz
    When Người dùng phát lại macro trong Paint ở tốc độ 2.0x hoặc 5.0x
    Then Nét vẽ chữ S được tái hiện liền mạch, không bị đứt đoạn hay nhảy cóc đường thẳng
```

---

### Kịch bản 8: Ghim Cửa sổ Trên Cùng (Always on Top)
```gherkin
Feature: Quản lý Cửa sổ Thanh Công cụ Nổi
  Scenario: Bật và tắt Always on Top
    Given VXClick đang hiển thị trên màn hình
    When Người dùng nhấp vào nút "📌 Pin" trên thanh chính (chuyển sang màu xanh sáng text-sky-400)
    And Người dùng nhấp chuột vào cửa sổ trình duyệt Chrome ở chế độ toàn màn hình
    Then Thanh công cụ VXClick vẫn nổi phía trên cửa sổ Chrome, không bị chìm xuống dưới
    When Người dùng nhấp lại vào nút "📌 Pin" (chuyển sang màu xám Slate)
    And Người dùng nhấp vào cửa sổ Chrome
    Then Thanh công cụ VXClick chìm xuống phía sau cửa sổ đang hoạt động
```

---

### Kịch bản 9: Tự Động Nhấp Chuột (Auto Click) & Cấu Hình Chu Kỳ / Nút Chuột / Số Lần
```gherkin
Feature: Tính năng Auto Click Nhanh
  Scenario: Kích hoạt Auto Click với cấu hình 100ms, nút trái và lặp đến khi dừng
    Given VXClick đang ở trạng thái sẵn sàng (IDLE_EMPTY hoặc IDLE_READY)
    When Người dùng bấm nút "Auto Click" trên thanh chính (hoặc nhấn "⌥⇧⌘C" / "Ctrl+Alt+Shift+C")
    Then Trạng thái hệ thống chuyển sang "AUTOCLICKING"
    And Nút Auto Click sáng màu hổ phách (Amber) với hiệu ứng pulse nhẹ và hiển thị số click
    And Cửa sổ tự động mở rộng Dynamic Mini Bar (chiều cao 62px)
    And Luồng nền tự động inject sự kiện Click liên tục tại vị trí con trỏ chuột hiện tại với chu kỳ 100ms
    When Người dùng di chuyển chuột sang các vị trí khác nhau trên màn hình
    Then Cú click tự động bám theo đúng tọa độ con trỏ chuột thời gian thực
    When Người dùng bấm lại nút "Auto Click" (hoặc nhấn "⌥⇧⌘C")
    Then Auto Click dừng ngay lập tức, xả phím chuột
    And Mini Bar hiển thị thông báo đã dừng trong 1.2s rồi thu gọn về 38px
    And Trạng thái hệ thống khôi phục về "IDLE_EMPTY" hoặc "IDLE_READY"
```

---

### Kịch bản 10: Ngắt Khẩn Cấp Auto Click Bằng Phím Cứng ESC
```gherkin
Feature: Mạch Ngắt Khẩn Cấp Failsafe Cho Auto Click
  Scenario: Người dùng đang bật Auto Click tốc độ cao và nhấn ESC để ngắt
    Given Ứng dụng đang ở trạng thái "AUTOCLICKING" với chu kỳ 10ms
    When Người dùng nhấn phím cứng "ESC" trên bàn phím vật lý
    Then Luồng Auto Click bị đánh thức và ngắt tức thì trong vòng < 1ms
    And Nếu chuột đang ở trạng thái Down, hệ thống tự động bắn Up giải phóng
    And Mini Bar hiển thị thông báo "Đã dừng tự nhấp [ESC]" trong 1.4s
    And Cửa sổ tự động thu gọn về 38px
    And Trạng thái hệ thống trở về trạng thái Idle an toàn
```

---

## 2. Ma trận Tình huống Biên Khắc nghiệt (Edge Cases Matrix)

| STT | Tình huống Biên (Edge Case) | Nguy cơ Tiềm ẩn | Cơ chế Phòng vệ & Hành vi Chuẩn của VXClick |
| :--- | :--- | :--- | :--- |
| **01** | Chưa cấp quyền Accessibility trên macOS | Không bắt được sự kiện chuột/phím toàn cục | Nút Rec hiển thị mờ xám (`opacity-40`), click mở `PermissionModal` 3 bước và nút Khởi động lại 1-chạm. |
| **02** | Bundle macOS ký ad-hoc (`--sign -`) bị đổi `cdhash` mỗi lần build lại | TCC không ghi nhận toggle dù user đã bật trong Settings hoặc mất quyền sau update | Bắt buộc ký số qua Certificate-bound Designated Requirement (`scripts/build_signed_macos.mjs` với identity Keychain) để DR gắn với certificate leaf cố định, không dùng ad-hoc cho gói đem cài; cần QA N → N+1 để xác minh giữ quyền, không cam kết vĩnh viễn. |
| **03** | Tổ hợp phím tắt bị xung đột với phần mềm văn phòng (`Cmd+Opt+1/2`) | Nhảy heading trong Word/Docs/Notion, mở tool trong Photoshop/Figma | Chuẩn hóa bộ phím tắt Hyper 3-modifier: `⌥⇧⌘R` (Rec) và `⌥⇧⌘P` (Play) độc bản, không trùng bất kỳ app nào. |
| **04** | Nhấn phím `ESC` trong khi đang Record thao tác | Nuốt mất phím ESC của ứng dụng người dùng đang thao tác | Phím `ESC` **chỉ được lắng nghe khi đang ở trạng thái PLAYING** để làm mạch ngắt khẩn cấp; khi RECORDING phím ESC được ghi lại như phím thường. |
| **05** | Chuột gaming có Polling Rate cực cao (1000Hz - 8000Hz) | Làm nghẽn bộ nhớ với hàng chục vạn sự kiện `MouseMove` | Hàng đợi giới hạn Bounded Queue (10k slots); tự động nén gộp `MouseMove`, bảo toàn 100% sự kiện click và phím. |
| **06** | Cửa sổ mục tiêu chạy quyền Administrator trên Windows | `SendInput` từ VXClick bị Windows UIPI chặn, click không ăn | Kiểm tra số lượng event inject; hiển thị cảnh báo gợi ý chạy VXClick dưới quyền Admin nếu bị chặn. |
| **07** | Người dùng bấm Stop khi đang giữ chuột kéo thả (Drag & Drop) | Nút chuột trái bị dính trạng thái `Down` vĩnh viễn trên OS | Quét `ActiveInputLedger` và gửi lệnh `MouseUp` giải phóng ngay lập tức khi ngắt luồng. |
| **08** | Nhấn nút Rec nhưng không làm bất kỳ thao tác nào rồi bấm Stop ngay | Bản ghi macro rỗng (0 sự kiện) | Hệ thống từ chối chuyển sang `IDLE_READY`, giữ nguyên nút Play ở trạng thái Disabled và thông báo chưa có thao tác. |
| **09** | Màn hình Retina macOS thay đổi độ phân giải khi cắm/rút màn hình rời | Lệch tọa độ chuột (Coordinate Drift) | Lưu kèm ScreenTopology lúc ghi; kiểm tra bounds trước khi phát lại, cảnh báo nếu màn hình đích bị thay đổi. |
| **10** | Chạy lặp vô tận (Continuous) trong khi máy tính Sleep/Lock | Macro bắn loạn xạ vào màn hình khóa | Lắng nghe sự kiện Lock/Sleep từ OS; tự động dừng phát lại an toàn và xả sạch ActiveInputLedger. |
| **11** | Focus vào ô nhập mật khẩu trên macOS (Secure Event Input) | macOS tự động vô hiệu hóa Event Tap bàn phím vì lý do an toàn | Phát hiện trạng thái `IsSecureEventInputEnabled()`; thông báo người dùng bàn phím bị OS chặn ghi trong ô mật khẩu. |
| **12** | Đang giữ phím thường (ví dụ: phím 'W' di chuyển game) lúc bấm ngắt | Phím 'W' bị dính kẹt vĩnh viễn trên hệ điều hành | `ActiveInputLedger` ghi nhận keycode 'W' đang Down; hàm flush tự động phát `KeyUp('W')` giải phóng triệt để. |
| **13** | Quá tải hàng đợi Bounded Queue khi ghi thao tác quá dài | Bộ nhớ RAM bị phình to | Khi chạm ngưỡng 10.000 sự kiện, hệ thống tự động chốt dừng ghi an toàn và thông báo đạt dung lượng tối đa. |
| **14** | Tổ hợp phím phức tạp có nhiều modifier (Ctrl + Shift + Alt + Windows + Key) | Thứ tự nhả phím bị sai lệch | Ghi nhận chính xác chuỗi `KeyDown` và `KeyUp` riêng rẽ cho từng phím thành phần, không phụ thuộc vào trạng thái gộp. |
| **15** | Tệp kịch bản `.vxclick` bị lỗi cấu trúc hoặc hỏng checksum | Crash tiến trình hoặc làm mất macro hiện có trong RAM | Kiểm tra toàn vẹn định dạng nhị phân và CRC32 trước khi nạp; nếu lỗi từ chối nạp và bảo toàn macro cũ trong RAM. |
| **16** | Bấm phím tắt Auto Click (`⌥⇧⌘C`) trong khi đang Recording | Gây nhiễu loạn luồng ghi dữ liệu | Backend từ chối lệnh `start_autoclick` nếu `SystemState == RECORDING` hoặc `PLAYING`, bảo vệ tuyệt đối chuỗi ghi. |
| **17** | Người dùng di chuyển chuột tốc độ cao trong lúc Auto Click | Tọa độ click bị đơ tại vị trí xuất phát ban đầu | Mỗi chu kỳ nhấp chuột gọi `get_current_mouse_location()` thời gian thực từ OS, đảm bảo click luôn bám sát vị trí con trỏ. |
| **18** | Đặt chu kỳ Auto Click cực nhỏ (ví dụ 10ms) | Tràn luồng IPC và đơ giao diện UI | Luồng nền Rust chỉ phát emit `autoclick_progress` theo tần suất tiết lưu (Throttled 100ms) kết hợp `condvar.wait_timeout`. |



## Regression cửa sổ macOS — 2026-10-15

- Main widget hiện trong Mission Control ở Desktop sở hữu, cả Pin ON/OFF.
- Từ Desktop khác, chọn lại app chuyển về cửa sổ/Space đang có; lặp lại khi cửa sổ minimized/hidden. Không nhân đôi cửa sổ, không gọi capture/playback hoặc xin thêm quyền.
- Bật/tắt Pin nhiều lần vẫn giữ Mission Control/window cycling, đóng app vẫn shutdown engine.
- Traffic lights giữ bezel native đúng đường kính sau launch/focus/resize; không ép frame12×12 hoặc bounds vuông. Lấy frame/bounds/controlSize mới từ AppKit và giữ padding, QA bằng SDK/profile của release.
- Các tiêu chí là contract, chỉ đánh dấu PASS khi có evidence native tương ứng.

## QA bổ sung trước release 2026-10-27

Auto Click backend chỉ bắt đầu từ Idle, từ chối giai đoạn dừng khẩn cấp/engine bận. Kiểm tra IPC: interval10–60000ms, nút Left/Right, finite repeat1–999999; input không hợp lệ không tạo worker. Windows dummy từ chối Record/Play/Click trong backend. Serialization legacy/roundtrip chạy bằng Cargo; harness compressor plain-data tách khỏi test serde. Native GUI Mac đã mở, Settings cuộn được, thiếu Accessibility thì Click chỉ mở hướng dẫn; user yêu cầu bỏ qua test nhấp thật lần này. Không claim hardware hotkey/nhấp/stop hoặc giữ quyền qua updater đã nghiệm thu.
