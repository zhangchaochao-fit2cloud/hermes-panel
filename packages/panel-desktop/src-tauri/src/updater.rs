use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: String,
    pub url: String,
}

#[tauri::command]
pub async fn check_update() -> Result<UpdateInfo, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/repos/hermes-panel/hermes-panel/releases/latest")
        .header("User-Agent", "hermes-panel-desktop")
        .send()
        .await
        .map_err(|e| format!("Failed to check update: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let release: serde_json::Value = response.json().await.map_err(|e| format!("Failed to parse response: {e}"))?;
    let tag_name = release["tag_name"].as_str().unwrap_or("");
    let version = tag_name.trim_start_matches('v').to_string();

    let current_version = env!("CARGO_PKG_VERSION");

    let available = version != current_version;

    let download_url = release["html_url"].as_str().unwrap_or("").to_string();

    Ok(UpdateInfo {
        available,
        version,
        url: download_url,
    })
}