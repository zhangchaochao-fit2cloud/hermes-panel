use std::{
    fs::{self, OpenOptions},
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use tauri::{AppHandle, Manager, Runtime};

pub struct BffState {
    pub port: Mutex<Option<u16>>,
    pub token: Mutex<Option<String>>,
    child: Mutex<Option<Child>>,
    error: Mutex<Option<String>>,
}

impl Default for BffState {
    fn default() -> Self {
        Self {
            port: Mutex::new(None),
            token: Mutex::new(None),
            child: Mutex::new(None),
            error: Mutex::new(None),
        }
    }
}

impl BffState {
    fn stop_child(&self) {
        if let Ok(mut child) = self.child.lock() {
            if let Some(mut child) = child.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
        if let Ok(mut port) = self.port.lock() {
            *port = None;
        }
        if let Ok(mut token) = self.token.lock() {
            *token = None;
        }
    }
}

impl Drop for BffState {
    fn drop(&mut self) {
        self.stop_child();
    }
}

pub fn ensure_started<R: Runtime>(app: &AppHandle<R>) {
    let state = app.state::<BffState>();
    if state.port.lock().map(|p| p.is_some()).unwrap_or(false) {
        return;
    }

    match start_bff(app) {
        Ok((port, token, child)) => {
            *state.port.lock().expect("bff port lock") = Some(port);
            *state.token.lock().expect("bff token lock") = Some(token);
            *state.child.lock().expect("bff child lock") = Some(child);
            *state.error.lock().expect("bff error lock") = None;
        }
        Err(err) => {
            eprintln!("[bff] failed to start: {err}");
            *state.error.lock().expect("bff error lock") = Some(err);
        }
    }
}

pub fn shutdown<R: Runtime>(app: &AppHandle<R>) {
    let state = app.state::<BffState>();
    state.stop_child();
}

fn start_bff<R: Runtime>(app: &AppHandle<R>) -> Result<(u16, String, Child), String> {
    let runtime = find_bff_runtime(app)?;
    let port = find_free_port(5667, 5686).ok_or_else(|| "no free port in 5667..5686".to_string())?;
    let token = make_token();
    let log_path = panel_home().join("desktop-bff.log");
    if let Some(parent) = log_path.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("create log dir: {err}"))?;
    }
    let stdout = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|err| format!("open bff log: {err}"))?;
    let stderr = stdout.try_clone().map_err(|err| format!("clone bff log: {err}"))?;

    // Prefer bundled Node.js (Windows: resources/nodejs/node.exe) over system Node.js
    let bundled = resource_dir.join("nodejs").join("node.exe");
    let node = if bundled.exists() {
        bundled
    } else {
        which::which("node").map_err(|_| {
            "Node.js not found. Please install Node.js 20+ from https://nodejs.org".to_string()
        })?
    };
    let server = runtime.join("dist/server.js");
    if !server.exists() {
        return Err(format!("BFF build output missing: {}", server.display()));
    }

    let mut child = Command::new(node)
        .arg(server)
        .current_dir(&runtime)
        .env("PANEL_TOKEN", &token)
        .env("BFF_PORT", port.to_string())
        .env("NODE_ENV", "production")
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr))
        .spawn()
        .map_err(|err| format!("spawn bff: {err}"))?;

    if wait_for_port(port, Duration::from_secs(8)) {
        Ok((port, token, child))
    } else {
        let _ = child.kill();
        Err(format!("BFF did not listen on 127.0.0.1:{port}; see {}", log_path.display()))
    }
}

fn find_bff_runtime<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    if let Ok(dir) = app.path().resource_dir() {
        for rel in ["bff", "resources/bff"] {
            let packaged = dir.join(rel);
            if packaged.join("dist/server.js").exists() {
                return Ok(packaged);
            }
        }
    }

    let repo = find_repo_root(app)?;
    Ok(repo.join("packages/panel-bff"))
}

fn find_repo_root<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let mut starts = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        starts.push(exe);
    }
    if let Ok(dir) = app.path().resource_dir() {
        starts.push(dir);
    }
    if let Ok(dir) = std::env::current_dir() {
        starts.push(dir);
    }

    for start in starts {
        for ancestor in start.ancestors() {
            if ancestor.join("pnpm-workspace.yaml").exists()
                && ancestor.join("packages/panel-bff/package.json").exists()
            {
                return Ok(ancestor.to_path_buf());
            }
        }
    }
    Err("could not locate Hermes Panel repo root from app bundle".to_string())
}

fn find_free_port(start: u16, end: u16) -> Option<u16> {
    (start..=end).find(|port| !is_port_open(*port))
}

fn wait_for_port(port: u16, timeout: Duration) -> bool {
    let deadline = std::time::Instant::now() + timeout;
    while std::time::Instant::now() < deadline {
        if is_port_open(port) {
            return true;
        }
        thread::sleep(Duration::from_millis(120));
    }
    false
}

fn is_port_open(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(120)).is_ok()
}

fn make_token() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or_default();
    format!("desktop-{nanos:x}-{}", std::process::id())
}

fn panel_home() -> PathBuf {
    if let Ok(home) = std::env::var("PANEL_HOME") {
        return PathBuf::from(home);
    }
    std::env::var("HOME")
        .map(|home| Path::new(&home).join(".hermes-panel"))
        .unwrap_or_else(|_| PathBuf::from("."))
}

#[tauri::command]
pub fn bff_info(state: tauri::State<'_, BffState>) -> serde_json::Value {
    serde_json::json!({
        "port": state.port.lock().unwrap().clone(),
        "token": state.token.lock().unwrap().clone(),
        "error": state.error.lock().unwrap().clone(),
    })
}
