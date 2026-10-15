// Thuật toán Nén Thích ứng Sự kiện Di Chuột (Bảo Toàn Drag Nét Vẽ) & Bộ Lọc Tự Loại Trừ (Self-exclusion)
// Tuân thủ nghiêm ngặt mục 3 và mục 5 trong docs/spec/04_api_data.md và docs/spec/00_system_overview.md

use std::collections::HashMap;
use crate::types::{MacroAction, MacroEvent, MouseBtn};

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
    // BẢO TOÀN NGUYÊN VẸN CẶP MOUSEDOWN / MOUSEUP (QA01):
    // - Down ngoài widget, Up trên widget: Giữ cả hai (drag ngoài kết thúc trên widget).
    // - Down trên widget, Up ngoài widget: Bỏ cả hai (kéo từ widget ra ngoài).
    // Hằng số padding nhận diện thanh công cụ VXClick thống nhất giữa các giai đoạn
    pub const WIDGET_PADDING: f64 = 8.0;

    let mut step1_events = Vec::with_capacity(raw_events.len());
    let mut button_started_inside: HashMap<MouseBtn, bool> = HashMap::new();

    for ev in raw_events {
        match &ev.action {
            MacroAction::MouseDown { button, x, y } => {
                let is_inside = if let Some(bounds) = window_bounds {
                    bounds.contains_point(*x, *y, WIDGET_PADDING)
                } else {
                    false
                };
                button_started_inside.insert(*button, is_inside);
                if !is_inside {
                    step1_events.push(ev.clone());
                }
            }
            MacroAction::MouseUp { button, x, y } => {
                let started_inside = button_started_inside.remove(button);
                match started_inside {
                    Some(true) => {
                        // Thao tác bắt đầu trên widget -> Bỏ trọn vẹn cả MouseUp
                    }
                    Some(false) => {
                        // Thao tác bắt đầu ngoài widget -> BẮT BUỘC giữ MouseUp dù tọa độ rơi vào widget
                        step1_events.push(ev.clone());
                    }
                    None => {
                        // MouseUp mồ côi (không có MouseDown trước đó trong bản ghi)
                        let is_inside = if let Some(bounds) = window_bounds {
                            bounds.contains_point(*x, *y, WIDGET_PADDING)
                        } else {
                            false
                        };
                        if !is_inside {
                            // Chỉ bỏ qua nếu nằm trên widget, hoặc bỏ qua để tránh unbalance
                        }
                    }
                }
            }
            _ => {
                step1_events.push(ev.clone());
            }
        }
    }

    // Tỉa bỏ cú click vào thanh widget ở cuối bản ghi nếu còn sót lại.
    // BẢO VỆ CẶP & BẢO VỆ BÀN PHÍM:
    // - Chỉ tỉa khi cả MouseUp và MouseDown tương ứng ĐỀU nằm trên widget (cùng padding WIDGET_PADDING).
    // - Chỉ xóa đúng các sự kiện chuột của gesture đó, TUYỆT ĐỐI KHÔNG truncate làm mất phím hay nút khác.
    if let Some(bounds) = window_bounds {
        while let Some(last) = step1_events.last() {
            match &last.action {
                MacroAction::MouseUp { button, x, y } => {
                    if bounds.contains_point(*x, *y, WIDGET_PADDING) {
                        let target_btn = *button;
                        let mut matching_down_idx = None;
                        for i in (0..step1_events.len() - 1).rev() {
                            match &step1_events[i].action {
                                MacroAction::MouseDown { button: b, x: dx, y: dy } if *b == target_btn => {
                                    if bounds.contains_point(*dx, *dy, WIDGET_PADDING) {
                                        matching_down_idx = Some(i);
                                    }
                                    break;
                                }
                                MacroAction::MouseUp { button: b, .. } if *b == target_btn => {
                                    break;
                                }
                                _ => {}
                            }
                        }

                        if let Some(down_idx) = matching_down_idx {
                            let last_idx = step1_events.len() - 1;
                            let mut to_remove = vec![false; step1_events.len()];
                            to_remove[down_idx] = true;
                            to_remove[last_idx] = true;
                            for k in (down_idx + 1)..last_idx {
                                if matches!(&step1_events[k].action, MacroAction::MouseMove { x: mx, y: my } if bounds.contains_point(*mx, *my, WIDGET_PADDING)) {
                                    to_remove[k] = true;
                                }
                            }
                            let mut idx = 0;
                            step1_events.retain(|_| {
                                let keep = !to_remove[idx];
                                idx += 1;
                                keep
                            });
                            continue;
                        }
                    }
                    break;
                }
                MacroAction::MouseDown { .. } => {
                    // MouseDown lẻ loi ở cuối không có MouseUp -> tỉa bỏ để tránh kẹt chuột
                    step1_events.pop();
                }
                MacroAction::MouseMove { x, y } => {
                    // Di chuột rà lên widget ở cuối bản ghi
                    if bounds.contains_point(*x, *y, WIDGET_PADDING) {
                        step1_events.pop();
                    } else {
                        break;
                    }
                }
                _ => break,
            }
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

    #[test]
    fn test_external_drag_release_on_widget_retains_balanced_pair() {
        let input = vec![
            MacroEvent {
                timestamp_us: 0,
                action: MacroAction::MouseDown {
                    button: MouseBtn::Left,
                    x: 10,
                    y: 10,
                },
            },
            MacroEvent {
                timestamp_us: 1_000_000,
                action: MacroAction::MouseUp {
                    button: MouseBtn::Left,
                    x: 150,
                    y: 150,
                },
            },
        ];
        let output = compress_macro_events(
            &input,
            Some(WindowRect {
                min_x: 100.0,
                min_y: 100.0,
                max_x: 200.0,
                max_y: 200.0,
            }),
        );
        let balance: i32 = output
            .iter()
            .map(|e| match e.action {
                MacroAction::MouseDown { .. } => 1,
                MacroAction::MouseUp { .. } => -1,
                _ => 0,
            })
            .sum();
        assert_eq!(balance, 0, "external drag must not lose release");
        assert_eq!(output.len(), 2);
    }

    #[test]
    fn test_widget_drag_release_outside_does_not_emit_orphan_up() {
        let input = vec![
            MacroEvent {
                timestamp_us: 0,
                action: MacroAction::MouseDown {
                    button: MouseBtn::Left,
                    x: 150,
                    y: 150,
                },
            },
            MacroEvent {
                timestamp_us: 1_000_000,
                action: MacroAction::MouseUp {
                    button: MouseBtn::Left,
                    x: 10,
                    y: 10,
                },
            },
        ];
        let output = compress_macro_events(
            &input,
            Some(WindowRect {
                min_x: 100.0,
                min_y: 100.0,
                max_x: 200.0,
                max_y: 200.0,
            }),
        );
        let balance: i32 = output
            .iter()
            .map(|e| match e.action {
                MacroAction::MouseDown { .. } => 1,
                MacroAction::MouseUp { .. } => -1,
                _ => 0,
            })
            .sum();
        assert_eq!(balance, 0, "widget drag must not leave orphan release");
        assert_eq!(output.len(), 0);
    }

    #[test]
    fn test_drag_crossing_boundaries_multiple_buttons() {
        let bounds = WindowRect {
            min_x: 100.0,
            min_y: 100.0,
            max_x: 200.0,
            max_y: 200.0,
        };
        // Left button: starts outside (10, 10), ends inside (150, 150) -> KEEP
        // Right button: starts inside (150, 150), ends outside (10, 10) -> DROP
        let input = vec![
            MacroEvent {
                timestamp_us: 0,
                action: MacroAction::MouseDown {
                    button: MouseBtn::Left,
                    x: 10,
                    y: 10,
                },
            },
            MacroEvent {
                timestamp_us: 100_000,
                action: MacroAction::MouseDown {
                    button: MouseBtn::Right,
                    x: 150,
                    y: 150,
                },
            },
            MacroEvent {
                timestamp_us: 200_000,
                action: MacroAction::MouseUp {
                    button: MouseBtn::Right,
                    x: 10,
                    y: 10,
                },
            },
            MacroEvent {
                timestamp_us: 300_000,
                action: MacroAction::MouseUp {
                    button: MouseBtn::Left,
                    x: 150,
                    y: 150,
                },
            },
        ];
        let output = compress_macro_events(&input, Some(bounds));
        assert_eq!(output.len(), 2);
        assert_eq!(
            output[0].action,
            MacroAction::MouseDown {
                button: MouseBtn::Left,
                x: 10,
                y: 10
            }
        );
        assert_eq!(
            output[1].action,
            MacroAction::MouseUp {
                button: MouseBtn::Left,
                x: 150,
                y: 150
            }
        );
    }

    #[test]
    fn test_tail_trim_never_drops_keyboard_release_between_mouse_pair() {
        let events = vec![
            MacroEvent {
                timestamp_us: 0,
                action: MacroAction::KeyDown {
                    key_code: 13,
                    modifiers: 0,
                },
            },
            MacroEvent {
                timestamp_us: 10,
                action: MacroAction::MouseDown {
                    button: MouseBtn::Left,
                    x: 90,
                    y: 150,
                },
            },
            MacroEvent {
                timestamp_us: 20,
                action: MacroAction::KeyUp {
                    key_code: 13,
                    modifiers: 0,
                },
            },
            MacroEvent {
                timestamp_us: 30,
                action: MacroAction::MouseUp {
                    button: MouseBtn::Left,
                    x: 90,
                    y: 150,
                },
            },
        ];
        let out = compress_macro_events(
            &events,
            Some(WindowRect {
                min_x: 100.0,
                min_y: 100.0,
                max_x: 200.0,
                max_y: 200.0,
            }),
        );
        let keyboard: Vec<_> = out
            .iter()
            .filter(|e| matches!(e.action, MacroAction::KeyDown { .. } | MacroAction::KeyUp { .. }))
            .collect();
        assert_eq!(
            keyboard.len(),
            2,
            "self-exclusion must preserve unrelated key release: {:?}",
            out
        );
    }

    #[test]
    fn test_tail_trim_preserves_modifiers_and_multiple_buttons() {
        let bounds = WindowRect {
            min_x: 100.0,
            min_y: 100.0,
            max_x: 200.0,
            max_y: 200.0,
        };
        let events = vec![
            MacroEvent {
                timestamp_us: 0,
                action: MacroAction::KeyDown {
                    key_code: 56, // Shift
                    modifiers: 1,
                },
            },
            MacroEvent {
                timestamp_us: 10,
                action: MacroAction::MouseDown {
                    button: MouseBtn::Right,
                    x: 150,
                    y: 150,
                },
            },
            MacroEvent {
                timestamp_us: 20,
                action: MacroAction::KeyDown {
                    key_code: 0, // A
                    modifiers: 1,
                },
            },
            MacroEvent {
                timestamp_us: 30,
                action: MacroAction::MouseUp {
                    button: MouseBtn::Right,
                    x: 150,
                    y: 150,
                },
            },
            MacroEvent {
                timestamp_us: 40,
                action: MacroAction::KeyUp {
                    key_code: 0,
                    modifiers: 1,
                },
            },
            MacroEvent {
                timestamp_us: 50,
                action: MacroAction::KeyUp {
                    key_code: 56,
                    modifiers: 0,
                },
            },
        ];
        let out = compress_macro_events(&events, Some(bounds));
        let keyboard: Vec<_> = out
            .iter()
            .filter(|e| matches!(e.action, MacroAction::KeyDown { .. } | MacroAction::KeyUp { .. }))
            .collect();
        assert_eq!(keyboard.len(), 4, "all 4 key events must be preserved");
    }
}
