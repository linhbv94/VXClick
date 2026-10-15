use types::{MacroAction,MacroEvent,MouseBtn};
#[test]
fn external_drag_release_on_widget_retains_balanced_pair() {
 let input=vec![MacroEvent{timestamp_us:0,action:MacroAction::MouseDown{button:MouseBtn::Left,x:10,y:10}},MacroEvent{timestamp_us:1000000,action:MacroAction::MouseUp{button:MouseBtn::Left,x:150,y:150}}];
 let output=compressor::compress_macro_events(&input,Some(compressor::WindowRect{min_x:100.,min_y:100.,max_x:200.,max_y:200.}));
 let balance:i32=output.iter().map(|e|match e.action {MacroAction::MouseDown{..}=>1,MacroAction::MouseUp{..}=>-1,_=>0}).sum();
 assert_eq!(balance,0,"external drag must not lose release: {:?}",output);
}
#[test]
fn widget_drag_release_outside_does_not_emit_orphan_up() {
 let input=vec![MacroEvent{timestamp_us:0,action:MacroAction::MouseDown{button:MouseBtn::Left,x:150,y:150}},MacroEvent{timestamp_us:1000000,action:MacroAction::MouseUp{button:MouseBtn::Left,x:10,y:10}}];
 let output=compressor::compress_macro_events(&input,Some(compressor::WindowRect{min_x:100.,min_y:100.,max_x:200.,max_y:200.}));
 let balance:i32=output.iter().map(|e|match e.action {MacroAction::MouseDown{..}=>1,MacroAction::MouseUp{..}=>-1,_=>0}).sum();
 assert_eq!(balance,0,"widget drag must not leave orphan release: {:?}",output);
}
