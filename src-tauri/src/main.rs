// =============================================
//  Neon Desktop — Entry Point (main.rs)
//  Calls the library's run function.
// =============================================

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    assistente_desktop_neon_lib::run();
}
