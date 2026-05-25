use std::sync::Mutex;

#[derive(Default)]
pub struct BffState {
    pub port: Mutex<Option<u16>>,
    pub token: Mutex<Option<String>>,
}

#[tauri::command]
pub fn bff_info(state: tauri::State<'_, BffState>) -> serde_json::Value {
    serde_json::json!({
        "port": state.port.lock().unwrap().clone(),
        "token": state.token.lock().unwrap().clone(),
    })
}
