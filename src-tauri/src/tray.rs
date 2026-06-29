// =============================================
//  Neon Desktop — System Tray (tray.rs)
//  Manages the tray icon handle for showing,
//  hiding and quitting the application.
// =============================================

use tauri::{
    AppHandle,
    tray::TrayIcon,
};

use std::sync::Mutex;

/// Global handle to the tray so we can manipulate it from commands.
static TRAY_HANDLE: once_cell::sync::Lazy<Mutex<Option<TrayIcon>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(None));

/// Store a reference to the tray icon for later use.
pub fn set_tray_handle(app: &AppHandle, tray: TrayIcon) {
    let mut handle = TRAY_HANDLE.lock().unwrap();
    *handle = Some(tray);
}

/// Toggle tray tooltip text.
#[allow(dead_code)]
pub fn set_tooltip(text: &str) {
    if let Some(ref tray) = *TRAY_HANDLE.lock().unwrap() {
        let _ = tray.set_tooltip(Some(text));
    }
}
