// Thuật toán Nén Thích ứng Sự kiện Di Chuột (Bảo Toàn Drag Nét Vẽ) & Bộ Lọc Tự Loại Trừ (Self-exclusion)
// Tuân thủ nghiêm ngặt mục 3 và mục 5 trong docs/spec/04_api_data.md và docs/spec/00_system_overview.md

use crate::types::{MacroAction, MacroEvent};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WindowRect {
    pub min_x: f64,
    pub min_y: f64,
    pub max_x: f64,
    pub max_y: f64,
}

impl WindowRect {
    pub fn contains_point(&self, x: i32, y: i32, padding: f64) -> bool {
        let px = x as f64;
        let py = y as f64;
        px >= (self.min_x - padding)
            && px <= (self.max_x + padding)
            && py >= (self.min_y - padding)
            && py <= (self.max_y + padding)
    }
}

pub fn compress_macro_events(
    raw_events: &[MacroEvent],
    window_bounds: Option<WindowRect>,
) -> Vec<MacroEvent> {
    if raw_events.is_empty() {
        return Vec::new();
    }

    // ==========================================
    // BƯỚC 1: LỌC TỰ LOẠI TRỪ (SELF-EXCLUSION)
    // ==========================================
    // Loại bỏ các tương tác với chính thanh công cụ VXClick (nút Stop, Pin, kéo bar)
    let mut step1_events = Vec::with_capacity(raw_events.len());

    for ev in raw_events {
        let is_self_interaction = match &ev.action {
            MacroAction::MouseDown { x, y, .. } | MacroAction::MouseUp { x, y, .. } => {
                if let Some(bounds) = window_bounds {
                    bounds.contains_point(*x, *y, 8.0)
                } else {
                    false
                }
            }
            _ => false,
        };

        if !is_self_interaction {
            step1_events.push(ev.clone());
        }
    }

    // Nếu cú click cuối cùng trước khi bấm Stop vẫn còn sót lại ở đuôi,
    // ta kiểm tra và tỉa bỏ cú click cuối cùng nếu nó xảy ra gần thời điểm kết thúc
    while let Some(last) = step1_events.last() {
        if matches!(last.action, MacroAction::MouseDown { .. } | MacroAction::MouseUp { .. }) {
            // Kiểm tra xem cú click này có nằm trong window_bounds không
            if let Some(bounds) = window_bounds {
                let (x, y) = match last.action {
                    MacroAction::MouseDown { x, y, .. } | MacroAction::MouseUp { x, y, .. } => (x, y),
                    _ => (0, 0),
                };
                if bounds.contains_point(x, y, 16.0) {
                    step1_events.pop();
                    continue;
                }
            }
            break;
        } else {
            break;
        }
    }

    if step1_events.is_empty() {
        return Vec::new();
    }

    // ==========================================
    // BƯỚC 2: NÉN THÍCH ỨNG (ADAPTIVE COMPRESSION)
    // ==========================================
    let mut compressed = Vec::with_capacity(step1_events.len());
    let mut is_mouse_down = false;

    // Lưu lại điểm di chuột gần nhất được chấp nhận
    let mut last_accepted_move: Option<(i32, i32, u64)> = None;
    // Điểm di chuột trước đó nữa để tính góc quay vector
    let mut prev_vector_point: Option<(i32, i32)> = None;

    for ev in step1_events {
        match ev.action {
            MacroAction::MouseDown { .. } => {
                is_mouse_down = true;
                last_accepted_move = None;
                prev_vector_point = None;
                // BẢO TOÀN 100% MOUSE DOWN
                compressed.push(ev);
            }
            MacroAction::MouseUp { .. } => {
                is_mouse_down = false;
                last_accepted_move = None;
                prev_vector_point = None;
                // BẢO TOÀN 100% MOUSE UP
                compressed.push(ev);
            }
            MacroAction::KeyDown { .. }
            | MacroAction::KeyUp { .. }
            | MacroAction::MouseScroll { .. } => {
                // BẢO TOÀN 100% PHÍM VÀ CUỘN CHUỘT
                compressed.push(ev);
            }
            MacroAction::MouseMove { x, y } => {
                let ts = ev.timestamp_us;

                if is_mouse_down {
                    // TRƯỜNG HỢP 1: ĐANG GIỮ CHUỘT (DRAG MODE / VẼ NÉT)
                    // Lấy mẫu với tần số ổn định 60Hz - 120Hz (khoảng cách 8ms - 16ms)
                    if let Some((last_x, last_y, last_ts)) = last_accepted_move {
                        let dt_us = ts.saturating_sub(last_ts);
                        let dx = (x - last_x) as f64;
                        let dy = (y - last_y) as f64;
                        let dist = (dx * dx + dy * dy).sqrt();

                        // Nếu thời gian >= 8.3ms (tương đương 120Hz) hoặc di chuyển quãng đường đáng kể (> 4px)
                        if dt_us >= 8_333 || dist >= 4.0 || dt_us >= 16_666 {
                            last_accepted_move = Some((x, y, ts));
                            compressed.push(ev);
                        }
                    } else {
                        // Điểm move đầu tiên sau MouseDown luôn được giữ
                        last_accepted_move = Some((x, y, ts));
                        compressed.push(ev);
                    }
                } else {
                    // TRƯỜNG HỢP 2: DI CHUỘT TỰ DO (FREE MOVE)
                    if let Some((last_x, last_y, last_ts)) = last_accepted_move {
                        let dt_us = ts.saturating_sub(last_ts);
                        let dx = (x - last_x) as f64;
                        let dy = (y - last_y) as f64;
                        let dist = (dx * dx + dy * dy).sqrt();

                        // 1. Vi rung: Nếu delta_time < 16ms và Euclidean distance < 3 pixel -> BỎ QUA ĐIỂM
                        if dt_us < 16_000 && dist < 3.0 {
                            continue;
                        }

                        // 2. Góc ngoặt: Kiểm tra xem góc lệch giữa 3 điểm vector >= 15 độ
                        let mut is_sharp_turn = false;
                        if let Some((px, py)) = prev_vector_point {
                            let v1_x = (last_x - px) as f64;
                            let v1_y = (last_y - py) as f64;
                            let v2_x = (x - last_x) as f64;
                            let v2_y = (y - last_y) as f64;
                            let len1 = (v1_x * v1_x + v1_y * v1_y).sqrt();
                            let len2 = (v2_x * v2_x + v2_y * v2_y).sqrt();

                            if len1 > 2.0 && len2 > 2.0 {
                                let dot = v1_x * v2_x + v1_y * v2_y;
                                let cos_angle = dot / (len1 * len2);
                                // cos(15 độ) ≈ 0.9659. Nếu cos_angle < 0.9659 nghĩa là góc rẽ >= 15 độ
                                if cos_angle < 0.9659 {
                                    is_sharp_turn = true;
                                }
                            }
                        }

                        // 3. Nếu là góc ngoặt hoặc thời gian >= 32ms hoặc quãng đường dài
                        if is_sharp_turn || dt_us >= 32_000 || dist >= 12.0 {
                            prev_vector_point = Some((last_x, last_y));
                            last_accepted_move = Some((x, y, ts));
                            compressed.push(ev);
                        }
                    } else {
                        last_accepted_move = Some((x, y, ts));
                        compressed.push(ev);
                    }
                }
            }
        }
    }

    compressed
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::MouseBtn;

    #[test]
    fn test_preserve_clicks_and_keys() {
        let raw = vec![
            MacroEvent {
                timestamp_us: 1000,
                action: MacroAction::MouseDown {
                    button: MouseBtn::Left,
                    x: 100,
                    y: 200,
                },
            },
            MacroEvent {
                timestamp_us: 2000,
                action: MacroAction::MouseUp {
                    button: MouseBtn::Left,
                    x: 100,
                    y: 200,
                },
            },
            MacroEvent {
                timestamp_us: 3000,
                action: MacroAction::KeyDown {
                    key_code: 0x35,
                    modifiers: 0,
                },
            },
            MacroEvent {
                timestamp_us: 4000,
                action: MacroAction::KeyUp {
                    key_code: 0x35,
                    modifiers: 0,
                },
            },
        ];

        let compressed = compress_macro_events(&raw, None);
        assert_eq!(compressed.len(), 4);
    }

    #[test]
    fn test_self_exclusion_window_clicks() {
        let bounds = WindowRect {
            min_x: 50.0,
            min_y: 50.0,
            max_x: 360.0,
            max_y: 88.0,
        };

        let raw = vec![
            MacroEvent {
                timestamp_us: 1000,
                action: MacroAction::MouseDown {
                    button: MouseBtn::Left,
                    x: 500,
                    y: 500,
                },
            },
            MacroEvent {
                timestamp_us: 2000,
                action: MacroAction::MouseUp {
                    button: MouseBtn::Left,
                    x: 500,
                    y: 500,
                },
            },
            // Click inside window (Stop button)
            MacroEvent {
                timestamp_us: 3000,
                action: MacroAction::MouseDown {
                    button: MouseBtn::Left,
                    x: 100,
                    y: 60,
                },
            },
            MacroEvent {
                timestamp_us: 4000,
                action: MacroAction::MouseUp {
                    button: MouseBtn::Left,
                    x: 100,
                    y: 60,
                },
            },
        ];

        let compressed = compress_macro_events(&raw, Some(bounds));
        assert_eq!(compressed.len(), 2);
        assert_eq!(
            compressed[0].action,
            MacroAction::MouseDown {
                button: MouseBtn::Left,
                x: 500,
                y: 500
            }
        );
    }

    #[test]
    fn test_jitter_removal_on_free_move() {
        let raw = vec![
            MacroEvent {
                timestamp_us: 0,
                action: MacroAction::MouseMove { x: 100, y: 100 },
            },
            // Jitter < 3px and < 16ms
            MacroEvent {
                timestamp_us: 5_000,
                action: MacroAction::MouseMove { x: 101, y: 100 },
            },
            MacroEvent {
                timestamp_us: 10_000,
                action: MacroAction::MouseMove { x: 101, y: 101 },
            },
            // Significant move
            MacroEvent {
                timestamp_us: 40_000,
                action: MacroAction::MouseMove { x: 150, y: 150 },
            },
        ];

        let compressed = compress_macro_events(&raw, None);
        assert_eq!(compressed.len(), 2);
        assert_eq!(compressed[0].action, MacroAction::MouseMove { x: 100, y: 100 });
        assert_eq!(compressed[1].action, MacroAction::MouseMove { x: 150, y: 150 });
    }

    #[test]
    fn test_drag_mode_preserves_sampling() {
        let mut raw = vec![
            MacroEvent {
                timestamp_us: 0,
                action: MacroAction::MouseDown {
                    button: MouseBtn::Left,
                    x: 100,
                    y: 100,
                },
            },
        ];

        // Simulate 10 drag moves at 10ms intervals
        for i in 1..=10 {
            raw.push(MacroEvent {
                timestamp_us: (i * 10_000) as u64,
                action: MacroAction::MouseMove {
                    x: 100 + i * 5,
                    y: 100 + i * 5,
                },
            });
        }

        raw.push(MacroEvent {
            timestamp_us: 110_000,
            action: MacroAction::MouseUp {
                button: MouseBtn::Left,
                x: 150,
                y: 150,
            },
        });

        let compressed = compress_macro_events(&raw, None);
        // All 10 drag points + Down + Up should be preserved because interval is 10ms >= 8.3ms
        assert_eq!(compressed.len(), 12);
    }
}
