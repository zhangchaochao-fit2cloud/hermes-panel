use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

// Embedded public keys — replace with actual keys before release.
// pk₁ (32 bytes hex) verifies license file signatures.
// pk₂ (32 bytes hex) verifies server response signatures.
const PK1_HEX: &str = "0000000000000000000000000000000000000000000000000000000000000000";
const PK2_HEX: &str = "0000000000000000000000000000000000000000000000000000000000000000";

// ── Data types ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicensePayload {
    pub sub: String,
    pub order_id: String,
    pub tier: String,
    pub iat: i64,
    pub exp: i64,
    pub features: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyResult {
    pub valid: bool,
    pub reason: Option<String>,
    pub payload: Option<LicensePayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub fingerprint: String,
    pub os: String,
    pub arch: String,
    pub hostname: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivationResponse {
    pub approved: bool,
    pub status: String,
    pub tier: String,
    pub features: Vec<String>,
    pub expires_at: Option<i64>,
    pub server_timestamp: i64,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerVerifyResult {
    pub valid: bool,
    pub reason: Option<String>,
    pub response: Option<ActivationResponse>,
}

// ── Public key helpers ──────────────────────────────────────────

fn decode_pk(hex: &str) -> Result<VerifyingKey, String> {
    let bytes = hex::decode(hex).map_err(|e| format!("invalid public key hex: {e}"))?;
    let bytes: [u8; 32] = bytes
        .try_into()
        .map_err(|_| "public key must be 32 bytes".to_string())?;
    VerifyingKey::from_bytes(&bytes).map_err(|e| format!("invalid public key: {e}"))
}

// ── License verification ────────────────────────────────────────

/// Parse and verify a license key string: `base64url(payload).base64url(signature)`
pub fn verify_license(license_key: &str) -> Result<LicensePayload, String> {
    let parts: Vec<&str> = license_key.splitn(3, '.').collect();
    if parts.len() != 3 {
        return Err("invalid license format: expected 3 dot-separated parts".into());
    }
    let (payload_b64, sig_b64) = (parts[1], parts[2]);
    if payload_b64.is_empty() {
        return Err("empty payload".into());
    }

    // Verify Ed25519 signature
    let message = format!("{}.{}", parts[0], parts[1]);
    let sig_bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(sig_b64)
        .map_err(|e| format!("invalid signature base64: {e}"))?;
    let sig_bytes: [u8; 64] = sig_bytes
        .try_into()
        .map_err(|_| "signature must be 64 bytes".to_string())?;
    let signature = Signature::from_bytes(&sig_bytes);

    let pk = decode_pk(PK1_HEX)?;
    pk.verify(message.as_bytes(), &signature)
        .map_err(|e| format!("license signature verification failed: {e}"))?;

    // Decode and parse payload
    let payload_bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload_b64)
        .map_err(|e| format!("invalid payload base64: {e}"))?;
    let payload: LicensePayload = serde_json::from_slice(&payload_bytes)
        .map_err(|e| format!("invalid license payload JSON: {e}"))?;

    Ok(payload)
}

// ── Server response verification ────────────────────────────────

/// Verify a signed response from the activation server.
/// The response JSON contains a `signature` field which is the Ed25519
/// signature (sk₂) over all other fields (sorted keys, without signature).
pub fn verify_server_response(
    response_json: &str,
) -> Result<ActivationResponse, String> {
    let mut response: ActivationResponse =
        serde_json::from_str(response_json).map_err(|e| format!("invalid response JSON: {e}"))?;

    let signature = std::mem::take(&mut response.signature);
    if signature.is_empty() {
        return Err("response missing signature".into());
    }

    // Reconstruct the signed payload: all fields except signature, sorted keys
    let signed_part = serde_json::json!({
        "approved": response.approved,
        "expires_at": response.expires_at,
        "features": response.features,
        "server_timestamp": response.server_timestamp,
        "status": response.status,
        "tier": response.tier,
    });
    let message = serde_json::to_string(&signed_part)
        .map_err(|e| format!("failed to serialize response for verification: {e}"))?;

    let sig_bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(&signature)
        .map_err(|e| format!("invalid response signature base64: {e}"))?;
    let sig_bytes: [u8; 64] = sig_bytes
        .try_into()
        .map_err(|_| "response signature must be 64 bytes".to_string())?;
    let sig = Signature::from_bytes(&sig_bytes);

    let pk = decode_pk(PK2_HEX)?;
    pk.verify(message.as_bytes(), &sig)
        .map_err(|e| format!("server response signature verification failed: {e}"))?;

    Ok(response)
}

// ── Device fingerprint ──────────────────────────────────────────

/// Collect cross-platform device fingerprint → SHA256 hex.
/// Uses OS + arch + hostname + machine-id (Linux) / IOPlatformUUID (macOS) + MAC.
pub fn get_device_fingerprint() -> String {
    let mut hasher = Sha256::new();

    // OS and arch
    hasher.update(b"os:");
    hasher.update(std::env::consts::OS.as_bytes());
    hasher.update(b"\narch:");
    hasher.update(std::env::consts::ARCH.as_bytes());

    // Hostname
    if let Ok(hostname) = get_hostname() {
        hasher.update(b"\nhostname:");
        hasher.update(hostname.as_bytes());
    }

    // Machine ID — platform-specific
    if let Some(machine_id) = get_machine_id() {
        hasher.update(b"\nmachine-id:");
        hasher.update(machine_id.as_bytes());
    }

    // Primary MAC address
    if let Some(mac) = get_primary_mac() {
        hasher.update(b"\nmac:");
        hasher.update(mac.as_bytes());
    }

    hex::encode(hasher.finalize())
}

fn get_hostname() -> Result<String, ()> {
    std::process::Command::new("hostname")
        .output()
        .ok()
        .and_then(|out| String::from_utf8(out.stdout).ok())
        .map(|s| s.trim().to_string())
        .ok_or(())
}

fn get_machine_id() -> Option<String> {
    #[cfg(target_os = "linux")]
    {
        std::fs::read_to_string("/etc/machine-id")
            .or_else(|_| std::fs::read_to_string("/var/lib/dbus/machine-id"))
            .ok()
            .map(|s| s.trim().to_string())
    }
    #[cfg(target_os = "macos")]
    {
        // ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID
        std::process::Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
            .ok()
            .and_then(|out| {
                let s = String::from_utf8_lossy(&out.stdout);
                s.lines()
                    .find(|line| line.contains("IOPlatformUUID"))
                    .and_then(|line| line.split('"').nth(3).map(|s| s.to_string()))
            })
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("reg")
            .args([
                "query",
                r"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography",
                "/v",
                "MachineGuid",
            ])
            .output()
            .ok()
            .and_then(|out| {
                let s = String::from_utf8_lossy(&out.stdout);
                s.lines()
                    .find(|line| line.contains("MachineGuid"))
                    .and_then(|line| line.split_whitespace().last().map(|s| s.to_string()))
            })
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        None
    }
}

fn get_primary_mac() -> Option<String> {
    #[cfg(target_os = "linux")]
    {
        // Read from /sys/class/net, skip lo
        if let Ok(entries) = std::fs::read_dir("/sys/class/net") {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name == "lo" {
                    continue;
                }
                let addr_path = entry.path().join("address");
                if let Ok(addr) = std::fs::read_to_string(&addr_path) {
                    let mac = addr.trim().to_string();
                    if !mac.is_empty() && mac != "00:00:00:00:00:00" {
                        return Some(mac);
                    }
                }
            }
        }
    }
    #[cfg(target_os = "macos")]
    {
        // ifconfig en0 → ether
        if let Ok(out) = std::process::Command::new("ifconfig")
            .arg("en0")
            .output()
        {
            let s = String::from_utf8_lossy(&out.stdout);
            if let Some(line) = s.lines().find(|l| l.trim().starts_with("ether ")) {
                return line
                    .trim()
                    .split_whitespace()
                    .nth(1)
                    .map(|m| m.to_string());
            }
        }
    }
    #[cfg(target_os = "windows")]
    {
        if let Ok(out) = std::process::Command::new("getmac")
            .args(["/fo", "csv", "/nh"])
            .output()
        {
            let s = String::from_utf8_lossy(&out.stdout);
            return s
                .lines()
                .filter_map(|l| l.split(',').nth(0))
                .find(|m| !m.is_empty() && m != &"\"\"")
                .map(|m| m.trim_matches('"').replace('-', ":").to_lowercase());
        }
    }
    None
}

/// Return full device info including fingerprint, OS, arch, and hostname.
pub fn get_device_info() -> DeviceInfo {
    DeviceInfo {
        fingerprint: get_device_fingerprint(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        hostname: get_hostname().unwrap_or_else(|_| "unknown".to_string()),
    }
}

// ── Tauri commands ──────────────────────────────────────────────

#[tauri::command]
pub fn validate_license(license_key: String) -> VerifyResult {
    match verify_license(&license_key) {
        Ok(payload) => VerifyResult {
            valid: true,
            reason: None,
            payload: Some(payload),
        },
        Err(err) => VerifyResult {
            valid: false,
            reason: Some(err),
            payload: None,
        },
    }
}

#[tauri::command]
pub fn verify_activation_response(response_json: String) -> ServerVerifyResult {
    match verify_server_response(&response_json) {
        Ok(response) => ServerVerifyResult {
            valid: true,
            reason: None,
            response: Some(response),
        },
        Err(err) => ServerVerifyResult {
            valid: false,
            reason: Some(err),
            response: None,
        },
    }
}

#[tauri::command]
pub fn get_device_fingerprint_cmd() -> DeviceInfo {
    get_device_info()
}
