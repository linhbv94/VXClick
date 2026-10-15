#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(any(target_os = "windows", test))]
pub mod windows;
#[cfg(all(target_os = "windows", not(target_os = "macos")))]
pub use windows::*;

#[cfg(not(any(target_os = "macos", target_os = "windows", test)))]
pub mod windows;
#[cfg(not(any(target_os = "macos", target_os = "windows", test)))]
pub use windows::*;
