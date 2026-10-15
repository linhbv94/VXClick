Ba lỗi có nguyên nhân rõ trong frontend hiện tại: **chiều cao native cố định, drag chưa nối với API Tauri, và hai panel được vẽ như hai cửa sổ riêng**. Tôi đã review nguồn và đối chiếu ảnh; chưa chạy lại bundle, nên phần render nền đen native chưa thể kết luận tuyệt đối.

**1. Settings bị scroll và cắt nội dung**

Các điểm gây lỗi:

- [App.tsx:107](/Users/vic/_Work/zTools/vxclick/src/App.tsx:107) đặt Settings cố định **350px cho toàn cửa sổ**, bao gồm MainBar 38px. Tauri không tự tăng kích thước cửa sổ theo nội dung DOM.
- [App.tsx:261](/Users/vic/_Work/zTools/vxclick/src/App.tsx:261) cộng `mt-1.5`; [SettingsPopover.tsx:69](/Users/vic/_Work/zTools/vxclick/src/components/SettingsPopover.tsx:69) lại cộng `mt-1.5`. Hai margin cộng thành 12px, chưa kể padding, border, gap và các hàng nội dung.
- Khi bật “Tự nhập”, panel thêm một hàng input nhưng effect resize chỉ phụ thuộc `activeView`, nên chiều cao không cập nhật.
- [index.css:12](/Users/vic/_Work/zTools/vxclick/src/index.css:12) chỉ đặt `overflow-x: hidden`. Khi một trục dùng `hidden`, trục còn lại mặc định `visible` được tính thành `auto`; nội dung vượt viewport có thể sinh scroll dọc. Settings không có vùng scroll riêng: nguồn này cho thấy scroll phát sinh ở document.
- [tauri_bridge.ts:357](/Users/vic/_Work/zTools/vxclick/src/services/tauri_bridge.ts:357) bắt lỗi resize rồi trả `'down'` như thành công. `App` vẫn ghi nhận chiều cao yêu cầu dù resize có thể thất bại.

**`resizable: false` không phải nguyên nhân.** Tôi kiểm tra implementation macOS của Tao đang cài: `set_inner_size()` gọi cập nhật content size mà không kiểm tra cờ resizable. Giữ `false` để user không kéo đổi kích thước bằng mép cửa sổ.

Ngoài ra, logic vị trí hiện tại có lỗi phụ:

- Dùng `monitor.size.height` nhưng bỏ qua tọa độ gốc màn hình và `workArea`, nên sai trên màn hình phụ hoặc vùng có Dock.
- Mỗi lần mở lên trên lại trừ `targetHeight - 38` từ vị trí hiện tại. Chuyển Settings → About → Support có thể cộng dồn dịch chuyển.
- Collapse dùng chiều cao đã yêu cầu thay vì chiều cao thực tế.

**Phương án sửa:** bỏ bảng chiều cao `350/360/440`, đo container bằng `ResizeObserver`, và chỉ dùng **một bộ điều khiển resize tuần tự**.

Mẫu hook sau đo lại cả khi bật “Tự nhập”, đổi view hoặc nội dung đổi kích thước:

```tsx
import { useLayoutEffect, useRef } from 'react';
import {
  getCurrentWindow,
  LogicalSize,
} from '@tauri-apps/api/window';

function use_content_window_size(enabled: boolean) {
  const shell_ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const shell = shell_ref.current;
    if (!enabled || !shell) return;

    const app_window = getCurrentWindow();
    let disposed = false;
    let running = false;
    let requested_height = 38;
    let applied_height = -1;

    async function flush_size() {
      if (running || disposed) return;
      running = true;

      try {
        while (!disposed && requested_height !== applied_height) {
          const next_height = requested_height;

          await app_window.setSize(
            new LogicalSize(310, next_height),
          );

          applied_height = next_height;
        }
      } catch (error) {
        console.error('Không thể cập nhật kích thước VXClick:', error);
        // Nối với thông báo lỗi hiện có; không báo resize thành công.
      } finally {
        running = false;
      }
    }

    function measure_content() {
      requested_height = Math.max(38, Math.ceil(shell!.offsetHeight));
      void flush_size();
    }

    const observer = new ResizeObserver(measure_content);
    observer.observe(shell);
    measure_content();

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [enabled]);

  return shell_ref;
}
```

Anti cần **xóa effect resize cũ** khi dùng hook này. Container được đo phải có chiều cao tự nhiên, không dùng `height: 100%`, `100vh` hoặc `max-height` theo viewport; nếu không sẽ tạo vòng lặp đo → resize.

Với vị trí, khuyến nghị giữ MainBar ở trên cùng và dịch **toàn khối** vào vùng làm việc khi gần Dock. `monitor.workArea` đã có trong API 2.12.1 và loại trừ Dock/taskbar. [Tauri Window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/#monitor)

Phần tính vị trí có thể thay logic `monitorHeight` hiện tại:

```ts
const monitor = await currentMonitor();
if (!monitor) throw new Error('Không xác định được màn hình hiện tại');

const scale = await app_window.scaleFactor();
const position = await app_window.outerPosition();
const inner_size = await app_window.innerSize();
const outer_size = await app_window.outerSize();

const area = monitor.workArea;
const top = area.position.y / scale;
const bottom = (area.position.y + area.size.height) / scale;

// Tính cả phần frame native, thay vì giả định outerHeight = innerHeight.
const frame_height = (outer_size.height - inner_size.height) / scale;
const target_outer_height = target_height + frame_height;

if (target_outer_height > bottom - top) {
  throw new Error('Nội dung vượt chiều cao vùng làm việc');
}

const next_y = Math.min(
  Math.max(position.y / scale, top),
  bottom - target_outer_height,
);

await app_window.setSize(new LogicalSize(310, target_height));
await app_window.setPosition(
  new LogicalPosition(position.x / scale, next_y),
);
```

Đưa phần này vào cùng queue resize. Muốn đóng menu trở về vị trí cũ thì lưu vị trí lúc bắt đầu mở; nếu user kéo khối khi đang mở, phải cập nhật anchor theo dịch chuyển thực tế.

**2. GripVertical không kéo được**

[MainBar.tsx:33](/Users/vic/_Work/zTools/vxclick/src/components/MainBar.tsx:33) và tay nắm chỉ dùng:

```tsx
style={{ WebkitAppRegion: 'drag' }}
```

Nguồn hiện tại **không có `data-tauri-drag-region` và không gọi `startDragging()`**. CSS kiểu Electron không nối thao tác này với native drag của Tauri/WKWebView.

Capability `core:window:allow-start-dragging` **đã có**, nên không cần bổ sung quyền. Tauri hỗ trợ dùng drag attribute hoặc gọi API trực tiếp. [Tauri Window Customization](https://v2.tauri.app/learn/window-customization/)

Khuyến nghị dùng handler trực tiếp trên tay nắm:

```tsx
import { getCurrentWindow } from '@tauri-apps/api/window';

function handle_drag(event: React.MouseEvent<HTMLDivElement>) {
  if (!inTauri || event.button !== 0) return;

  event.preventDefault();
  event.stopPropagation();

  void getCurrentWindow().startDragging().catch((error) => {
    console.error('Không thể kéo cửa sổ VXClick:', error);
  });
}

<div
  onMouseDown={handle_drag}
  className="flex h-7 w-6 shrink-0 items-center justify-center
             cursor-grab active:cursor-grabbing text-slate-400"
  title="Kéo để di chuyển widget"
>
  <GripVertical className="pointer-events-none h-3.5 w-3.5" />
</div>
```

Bỏ `dragStyle`, `noDragStyle` và CSS `-webkit-app-region`. Không gắn handler drag lên toàn header chứa Rec/Play/Pin/Settings. Dùng `getCurrentWindow()` của Tauri v2, không dùng singleton `appWindow` kiểu v1.

**3. Góc và khe giữa MainBar–Settings trông thô**

Nguyên nhân xác nhận được từ mã:

- MainBar tự có nền, border, `rounded-xl`, `shadow-2xl`, blur.
- Settings cũng tự có đầy đủ các lớp đó.
- Hai khối cùng rộng 310px, sát mép WebView, nhưng cách nhau bằng margin kép.
- Shadow lớn vẽ ra ngoài hình bo tròn rồi bị giới hạn bởi viewport native. Các lớp shadow, border và blur chồng nhau tạo đường mép tối và cảm giác rời rạc.

`border-radius` trên `<header>` chỉ bo phần tử HTML đó, **không bo toàn bộ NSWindow hoặc WebView**.

Một điểm cần tránh chẩn đoán sai: `Cargo.lock` dùng **Tauri 2.12.1**. Ở phiên bản này `macOSPrivateApi` là no-op vì các API liên quan đã luôn được bật. Thêm cờ này sẽ không sửa lỗi góc. [Tauri Configuration](https://v2.tauri.app/reference/config/#macosprivateapi)

**Khuyến nghị dùng một shell duy nhất sở hữu nền, blur, viền và bo góc.**

Trong `App.tsx`:

```tsx
const shell_ref = use_content_window_size(inTauri);

const mainWidget = (
  <div ref={shell_ref} className="widget_shell">
    {mainBarNode}

    {activeView !== 'main' && (
      <section className="widget_content">
        {popoverNode}
      </section>
    )}
  </div>
);
```

CSS:

```css
html,
body,
#root {
  margin: 0;
  padding: 0;
  background: transparent;
}

/* Chỉ bật cho runtime Tauri, giữ browser preview hoạt động bình thường. */
html.tauri_runtime,
html.tauri_runtime body,
html.tauri_runtime #root {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.widget_shell {
  width: 310px;
  height: auto;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  isolation: isolate;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.35);
}

.widget_bar {
  width: 100%;
  height: 38px;
  flex: 0 0 38px;
}

.widget_content {
  flex: none;
  min-width: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.widget_panel {
  width: 100%;
  margin: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

Thiết lập class runtime tại entry point:

```ts
if (isTauri()) {
  document.documentElement.classList.add('tauri_runtime');
}
```

Anti cần sửa class gốc của MainBar thành `widget_bar` cộng các class layout hiện có; Settings/About/Support dùng `widget_panel`. **Xóa nền, border ngoài, shadow, blur, radius và margin cũ khỏi các component con.** Giữ border nội bộ của input, toggle và các nhóm nội dung.

Inset border không tăng kích thước layout, nên thanh thu gọn vẫn đúng 38px. Dùng shadow native bên ngoài; nếu cần shadow CSS ngoài shell thì phải chừa gutter và cộng gutter vào kích thước native.

Cấu hình cửa sổ nên giữ:

```json
{
  "label": "main",
  "width": 310,
  "height": 38,
  "minWidth": 310,
  "minHeight": 38,
  "resizable": false,
  "decorations": true,
  "titleBarStyle": "Overlay",
  "hiddenTitle": true,
  "transparent": true,
  "shadow": true,
  "dragDropEnabled": false
}
```

Giữ traffic lights native. **Không đảo MainBar xuống đáy khi mở lên trên:** traffic lights hiện nằm ở phía trên NSWindow và hàm Rust chỉ căn chỉnh chúng trong titlebar; đảo thứ tự DOM sẽ làm nút native lệch khỏi MainBar. Phương án dịch toàn khối gần Dock đổi lại việc thanh điều khiển có thể dịch lên lúc mở menu.

Cuối cùng, `backdrop-filter` CSS không tự bảo đảm blur desktop phía sau NSWindow. Nếu yêu cầu kính mờ desktop thực sự, cần kiểm tra native vibrancy riêng.

Anti nên nghiệm thu bằng bundle `.app`:

- Settings đủ About và Support, kể cả bật “Tự nhập”; document không scroll.
- Kéo trực tiếp GripVertical được; các nút hành động vẫn click bình thường.
- Settings → About → Support → Settings không dịch vị trí cộng dồn.
- Kiểm tra sát Dock, màn hình phụ và đổi scale.
- Chụp bốn góc trên nền desktop sáng/tối; đối chiếu chiều cao DOM với `innerSize()` sau native resize.

Các đoạn trên là mẫu để áp dụng, chưa phải bản sửa đã chạy hoặc được QA runtime.