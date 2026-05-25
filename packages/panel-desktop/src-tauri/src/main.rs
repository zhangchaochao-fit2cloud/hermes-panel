#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod hermes;
mod bff;

fn main() {
    tauri::Builder::default()
        .manage(bff::BffState::default())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            hermes::hermes_status,
            bff::bff_info,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri app");
}
