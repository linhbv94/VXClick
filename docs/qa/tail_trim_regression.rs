use types::{MacroAction,MacroEvent,MouseBtn};
#[test]
fn tail_trim_never_drops_keyboard_release_between_mouse_pair() {
 let events = vec![
  MacroEvent { timestamp_us: 0, action: MacroAction::KeyDown { key_code: 13, modifiers: 0 } },
  MacroEvent { timestamp_us: 10, action: MacroAction::MouseDown { button: MouseBtn::Left, x: 90, y: 150 } },
  MacroEvent { timestamp_us: 20, action: MacroAction::KeyUp { key_code: 13, modifiers: 0 } },
  MacroEvent { timestamp_us: 30, action: MacroAction::MouseUp { button: MouseBtn::Left, x: 90, y: 150 } },
 ];
 let out=compressor::compress_macro_events(&events,Some(compressor::WindowRect { min_x:100., min_y:100., max_x:200., max_y:200. }));
 let keyboard:Vec<_>=out.iter().filter(|e|matches!(e.action,MacroAction::KeyDown{..}|MacroAction::KeyUp{..})).collect();
 assert_eq!(keyboard.len(),2,"self-exclusion must preserve unrelated key release: {:?}",out);
}
