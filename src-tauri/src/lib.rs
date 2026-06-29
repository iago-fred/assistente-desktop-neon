// =============================================
//  Neon Desktop — Library (lib.rs)
//  Tauri command definitions, window setup,
//  system tray management.
// =============================================

mod tray;

use tauri::{
    Manager,
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent},
    image::Image,
};

/// Reposition the window without giving it focus.
#[tauri::command]
async fn set_window_position(
    app_handle: tauri::AppHandle,
    x: i32,
    y: i32,
) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Resize the window.
#[tauri::command]
async fn set_window_size(
    app_handle: tauri::AppHandle,
    width: u32,
    height: u32,
) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width,
                height,
            }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Start native window drag.
#[tauri::command]
async fn start_window_drag(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .start_dragging()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Hide the main window.
#[tauri::command]
async fn hide_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Show the main window.
#[tauri::command]
async fn show_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Get the current window position.
#[tauri::command]
async fn get_window_position(app_handle: tauri::AppHandle) -> Result<(i32, i32), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        let pos = window.outer_position().map_err(|e| e.to_string())?;
        Ok((pos.x, pos.y))
    } else {
        Ok((0, 0))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            set_window_position,
            set_window_size,
            start_window_drag,
            hide_window,
            show_window,
            get_window_position,
        ])
        .setup(|app| {
            // ── System Tray ──────────────────────
            let show_hide = MenuItem::with_id(app, "toggle", "Mostrar/Esconder", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Sair", true, Some("CmdOrCtrl+Q"))?;
            let menu = Menu::with_items(app, &[&show_hide, &quit])?;

            let icon_bytes = include_bytes!("../icons/icon.png");
            let icon = Image::from_bytes(icon_bytes)
                .expect("Failed to load tray icon");

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip("Neon 👻")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "toggle" => {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                }
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            tray::set_tray_handle(app, _tray);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
