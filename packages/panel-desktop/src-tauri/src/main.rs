#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod hermes;
mod bff;
mod tray;
mod license;

fn main() {
    let app = tauri::Builder::default()
        .manage(bff::BffState::default())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            hermes::hermes_status,
            bff::bff_info,
            license::validate_license,
            license::verify_activation_response,
            license::get_device_fingerprint_cmd,
        ])
        .setup(|app| {
            bff::ensure_started(app.handle());
            // 创建系统托盘 — 失败不阻塞启动，只 log（如旧 macOS / Linux 缺指示器）
            if let Err(e) = tray::build(app.handle()) {
                eprintln!("[tray] failed to create tray icon: {e}");
            }
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
