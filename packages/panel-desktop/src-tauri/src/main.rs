#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod hermes;
mod bff;
mod tray;
mod license;
mod updater;

use tauri::Manager;

fn main() {
    let app = tauri::Builder::default()
        .manage(bff::BffState::default())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            hermes::hermes_status,
            bff::bff_info,
            license::validate_license,
            license::verify_activation_response,
            license::get_device_fingerprint_cmd,
            updater::check_update,
        ])
        .setup(|app| {
            bff::ensure_started(app.handle());
            if let Err(e) = tray::build(app.handle()) {
                eprintln!("[tray] failed to create tray icon: {e}");
            }
            let window = app.get_webview_window("main").unwrap();
            window.restore_state("main").ok();
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut("CmdOrCtrl+Shift+H", move |_app, _shortcut, event| {
                if event.state == tauri::global_shortcut::ShortcutState::Pressed {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
            }).expect("failed to register global shortcut");
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building tauri app");

    app.run(|app_handle, event| {
        if matches!(
            event,
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
        ) {
            bff::shutdown(app_handle);
        }
    });
}
