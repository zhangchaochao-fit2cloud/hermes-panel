use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct HermesStatus {
    pub found: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

#[tauri::command]
pub fn hermes_status() -> HermesStatus {
    match which::which("hermes") {
        Ok(path) => {
            let version = Command::new(&path)
                .arg("--version")
                .output()
                .ok()
                .and_then(|o| String::from_utf8(o.stdout).ok())
                .and_then(|s| s.lines().next().map(|l| l.to_string()));
            HermesStatus {
                found: true,
                path: Some(path.display().to_string()),
                version,
            }
        }
        Err(_) => HermesStatus { found: false, path: None, version: None },
    }
}
