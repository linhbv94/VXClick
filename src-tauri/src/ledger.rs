// Sổ Đăng Ký Input Đang Giữ (Active Input Ledger)
// Đảm bảo không bao giờ bị dính phím hay kẹt nút chuột trên hệ điều hành khi dừng/ngắt khẩn cấp

use std::collections::HashSet;
use crate::types::MouseBtn;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum LedgerInput {
    Key(u16),
    MouseButton(MouseBtn),
}

#[derive(Debug, Default, Clone)]
pub struct ActiveInputLedger {
    pub held_inputs: HashSet<LedgerInput>,
}

impl ActiveInputLedger {
    pub fn new() -> Self {
        Self {
            held_inputs: HashSet::new(),
        }
    }

    pub fn record_down(&mut self, input: LedgerInput) {
        self.held_inputs.insert(input);
    }

    pub fn record_up(&mut self, input: &LedgerInput) {
        self.held_inputs.remove(input);
    }

    pub fn is_mouse_down(&self) -> bool {
        self.held_inputs.iter().any(|item| matches!(item, LedgerInput::MouseButton(_)))
    }

    pub fn is_button_down(&self, btn: MouseBtn) -> bool {
        self.held_inputs.contains(&LedgerInput::MouseButton(btn))
    }

    pub fn flush_all(&mut self) -> Vec<LedgerInput> {
        self.held_inputs.drain().collect()
    }

    pub fn clear(&mut self) {
        self.held_inputs.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ledger_record_and_flush() {
        let mut ledger = ActiveInputLedger::new();
        assert!(!ledger.is_mouse_down());

        ledger.record_down(LedgerInput::MouseButton(MouseBtn::Left));
        assert!(ledger.is_mouse_down());
        assert!(ledger.is_button_down(MouseBtn::Left));
        assert!(!ledger.is_button_down(MouseBtn::Right));

        ledger.record_down(LedgerInput::Key(0x35)); // ESC
        ledger.record_down(LedgerInput::Key(0x00)); // 'A'

        ledger.record_up(&LedgerInput::Key(0x00));

        let flushed = ledger.flush_all();
        assert_eq!(flushed.len(), 2);
        assert!(flushed.contains(&LedgerInput::MouseButton(MouseBtn::Left)));
        assert!(flushed.contains(&LedgerInput::Key(0x35)));
        assert!(!ledger.is_mouse_down());
        assert_eq!(ledger.flush_all().len(), 0);
    }
}
