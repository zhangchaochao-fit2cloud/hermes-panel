use std::{
    env,
    fs,
    path::PathBuf,
    process::Command,
    sync::atomic::{AtomicBool, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::{
    image::Image,
    menu::{Menu, MenuBuilder, MenuItem, SubmenuBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager, Runtime,
};
use tauri_plugin_notification::NotificationExt;

use crate::bff;

static IS_ONLINE: AtomicBool = AtomicBool::new(true);

const TRAY_ICON_BYTES: &[u8] = include_bytes!("../icons/tray-icon.png");
const FIELD_SEP: char = '\x1f';
const RECORD_SEP: char = '\x1e';

#[derive(Clone, Debug)]
struct SessionMenuItem {
    id: String,
    title: String,
    source: String,
    updated_at: f64,
    token_total: i64,
}

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let menu = build_menu(app)?;

    let mut builder = TrayIconBuilder::with_id("hermes-panel-tray")
        .menu(&menu)
        .tooltip("Hermes Panel")
        .show_menu_on_left_click(true);

    if let Ok(icon) = Image::from_bytes(TRAY_ICON_BYTES) {
        builder = builder.icon(icon);
    } else if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    let tray = builder
        .on_menu_event(|app, event| handle_menu_event(app, event.id.as_ref()))
        .build(app)?;

    // 后台每 15s 刷新一次菜单，让 Pinned/Recent 反映已删除/新建的会话。
    // 注意：on_tray_icon_event 里 set_menu 会让正在弹出的菜单瞬间消失；定时
    // 刷新避开了这个问题（用户重复点击间隔通常 > 15s，即使撞上弹出，下次
    // 重开就好了）。
    let app_handle = app.clone();
    let tray_id = tray.id().clone();
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(15));
        interval.tick().await; // skip the immediate first tick
        loop {
            interval.tick().await;
            if let Some(tray) = app_handle.tray_by_id(&tray_id) {
                if let Ok(menu) = build_menu(&app_handle) {
                    let _ = tray.set_menu(Some(menu));
                }
            }
        }
    });

    Ok(())
}

fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let pinned_ids = pinned_session_ids();
    let pinned_sessions = sessions_by_ids(&pinned_ids);
    let recent = recent_sessions(12)
        .into_iter()
        .filter(|session| !pinned_ids.iter().any(|id| id == &session.id))
        .collect::<Vec<_>>();
    let rest = recent.iter().skip(3).cloned().collect::<Vec<_>>();
    let session_count = count_all_sessions();

    let status = if IS_ONLINE.load(Ordering::Relaxed) {
        "Online"
    } else {
        "Offline"
    };
    let status_item = MenuItem::with_id(app, "status:current", format!("Status: {status}"), false, None::<&str>)?;
    let session_count_item = MenuItem::with_id(app, "session:count", format!("Active Sessions: {session_count}"), false, None::<&str>)?;

    let pinned_heading = section(app, "section:pinned", "Pinned")?;
    let recent_heading = section(app, "section:recent", "Recent")?;
    let usage_heading = section(app, "section:usage", "Usage")?;
    let usage_item = MenuItem::with_id(app, "usage:summary", usage_label(), false, None::<&str>)?;

    let mut menu = MenuBuilder::new(app)
        .item(&status_item)
        .item(&session_count_item)
        .separator()
        .item(&pinned_heading);

    let panel_item = MenuItem::with_id(app, "route:dashboard", "Panel\nhermes panel", true, None::<&str>)?;
    let chat_item = MenuItem::with_id(app, "route:chat", "对话\nChats", true, None::<&str>)?;
    let workspaces_item =
        MenuItem::with_id(app, "route:workspaces", "工作环境\nProfiles", true, None::<&str>)?;
    menu = menu
        .item(&panel_item)
        .item(&chat_item)
        .item(&workspaces_item);

    for session in pinned_sessions {
        menu = menu.text(
            format!("session:{}", session.id),
            two_line(&session.title, source_label(&session.source)),
        );
    }

    menu = menu.separator().item(&recent_heading);

    let recent_top = recent.iter().take(3).cloned().collect::<Vec<_>>();
    if recent_top.is_empty() {
        let empty = MenuItem::with_id(app, "empty:recent", "No recent chats", false, None::<&str>)?;
        menu = menu.item(&empty);
    } else {
        for session in recent_top {
            menu = menu.text(
                format!("session:{}", session.id),
                two_line(&session.title, source_label(&session.source)),
            );
        }
    }

    if !rest.is_empty() {
        let mut more = SubmenuBuilder::with_id(app, "recent:more", "More");
        for session in rest {
            more = more.text(
                format!("session:{}", session.id),
                two_line(&session.title, source_label(&session.source)),
            );
        }
        let more = more.build()?;
        menu = menu.item(&more);
    }

    let new_chat = MenuItem::with_id(app, "new-chat", "New Chat", true, Some("CmdOrCtrl+N"))?;
    let settings = MenuItem::with_id(app, "open-settings", "Settings", true, Some("CmdOrCtrl+,"))?;
    let open = MenuItem::with_id(app, "open", "Open Hermes Panel", true, Some("CmdOrCtrl+Shift+O"))?;
    let quit = MenuItem::with_id(app, "quit", "Quit Hermes Panel", true, Some("CmdOrCtrl+Q"))?;

    menu.separator()
        .item(&usage_heading)
        .item(&usage_item)
        .separator()
        .item(&new_chat)
        .item(&settings)
        .separator()
        .item(&open)
        .separator()
        .item(&quit)
        .build()
}

fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    match id {
        "open" | "route:dashboard" => open_route(app, "/dashboard"),
        "route:chat" => open_route(app, "/chat"),
        "route:workspaces" => open_route(app, "/workspaces"),
        "new-chat" => {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or_default();
            open_route(app, &format!("/chat?new={now}"));
        }
        "open-settings" => open_route(app, "/settings"),
        "quit" => {
            bff::shutdown(app);
            app.exit(0);
        }
        _ if id.starts_with("session:") => {
            let session_id = &id["session:".len()..];
            open_route(app, &format!("/chat?resume={session_id}"));
        }
        _ => {}
    }
}

fn open_route<R: Runtime>(app: &AppHandle<R>, route: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();

        let hash = format!("#{route}");
        if let Ok(hash_json) = serde_json::to_string(&hash) {
            let _ = window.eval(format!(
                "window.location.hash = {hash_json}; window.dispatchEvent(new CustomEvent('hermes-panel:native-route'));",
            ));
        }
    }
}

fn section<R: Runtime>(app: &AppHandle<R>, id: &str, text: &str) -> tauri::Result<MenuItem<R>> {
    MenuItem::with_id(app, id, text, false, None::<&str>)
}

fn two_line(title: &str, subtitle: &str) -> String {
    // 30 字符与 panel 侧边栏 displaySessionTitle 一致 — 让"右上角 Recent"和
    // 应用内会话列表显示对齐，不再出现一边长一边短的视觉差。
    format!("{}\n{}", truncate(title, 30), subtitle)
}

fn source_label(source: &str) -> &'static str {
    match source {
        "cli" => "Chats",
        "cron" => "Cron",
        "api_server" => "API Server",
        _ => "Hermes",
    }
}

fn truncate(value: &str, max_chars: usize) -> String {
    let cleaned = value.split_whitespace().collect::<Vec<_>>().join(" ");
    if cleaned.chars().count() <= max_chars {
        return cleaned;
    }
    let mut out = cleaned.chars().take(max_chars.saturating_sub(1)).collect::<String>();
    out.push('…');
    out
}

fn hermes_db_path() -> Option<PathBuf> {
    if let Ok(home) = env::var("HERMES_HOME") {
        return Some(PathBuf::from(home).join("state.db"));
    }
    env::var("HOME").ok().map(|home| PathBuf::from(home).join(".hermes/state.db"))
}

fn panel_home_path() -> Option<PathBuf> {
    if let Ok(home) = env::var("PANEL_HOME") {
        return Some(PathBuf::from(home));
    }
    env::var("HOME").ok().map(|home| PathBuf::from(home).join(".hermes-panel"))
}

fn pinned_session_ids() -> Vec<String> {
    let Some(path) = panel_home_path().map(|home| home.join("pinned-sessions.json")) else {
        return Vec::new();
    };
    let Ok(raw) = fs::read_to_string(path) else {
        return Vec::new();
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(&raw) else {
        return Vec::new();
    };
    let Some(ids) = value.get("ids").and_then(|ids| ids.as_array()) else {
        return Vec::new();
    };

    let mut out: Vec<String> = Vec::new();
    for value in ids {
        let Some(id) = value.as_str().map(str::trim).filter(|id| !id.is_empty()) else {
            continue;
        };
        if !out.iter().any(|existing| existing.as_str() == id) {
            out.push(id.to_string());
        }
        if out.len() >= 10 {
            break;
        }
    }
    out
}

fn recent_sessions(limit: usize) -> Vec<SessionMenuItem> {
    let Some(db_path) = hermes_db_path() else {
        return Vec::new();
    };
    if !db_path.exists() {
        return Vec::new();
    }

    let limit = limit.clamp(1, 20);
    // display_title 优先级：
    //   1. sessions.title 非空 且 不像生成式 id（cron_xxx_20260527 / 20260527_... / sess_*）
    //   2. 首条 user message 前 60 字
    //   3. id 前 10 字
    // 与 panel 侧边栏 displaySessionTitle 保持一致，让 tray Recent 不再
    // 出现"半句对话内容"或"cron_xxx_20260527" 这种丑标题。
    let query = format!(
        "
        SELECT
          id,
          COALESCE(
            CASE
              WHEN TRIM(title) = '' THEN NULL
              WHEN title GLOB 'cron_*_20[0-9][0-9][0-9][0-9]*' THEN NULL
              WHEN title GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*' THEN NULL
              WHEN title GLOB 'sess_*' OR title GLOB 'session_*' OR title GLOB 'chat_*' THEN NULL
              ELSE TRIM(title)
            END,
            (
              SELECT substr(replace(replace(content, char(10), ' '), char(13), ' '), 1, 60)
              FROM messages
              WHERE session_id = sessions.id
                AND role = 'user'
                AND content IS NOT NULL
                AND length(trim(content)) > 0
              ORDER BY timestamp ASC
              LIMIT 1
            ),
            substr(id, 1, 10)
          ) AS display_title,
          source,
          COALESCE(ended_at, started_at),
          COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
        FROM sessions
        ORDER BY started_at DESC
        LIMIT {limit};
        "
    );

    query_sessions(&db_path, &query)
}

fn sessions_by_ids(ids: &[String]) -> Vec<SessionMenuItem> {
    if ids.is_empty() {
        return Vec::new();
    }
    let Some(db_path) = hermes_db_path() else {
        return Vec::new();
    };
    if !db_path.exists() {
        return Vec::new();
    }

    let quoted_ids = ids.iter().map(|id| sql_string(id)).collect::<Vec<_>>();
    let order = ids
        .iter()
        .enumerate()
        .map(|(index, id)| format!("WHEN {} THEN {}", sql_string(id), index))
        .collect::<Vec<_>>()
        .join(" ");
    // 与 recent_sessions 同款 display_title 过滤 — 见上文注释。
    let query = format!(
        "
        SELECT
          id,
          COALESCE(
            CASE
              WHEN TRIM(title) = '' THEN NULL
              WHEN title GLOB 'cron_*_20[0-9][0-9][0-9][0-9]*' THEN NULL
              WHEN title GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*' THEN NULL
              WHEN title GLOB 'sess_*' OR title GLOB 'session_*' OR title GLOB 'chat_*' THEN NULL
              ELSE TRIM(title)
            END,
            (
              SELECT substr(replace(replace(content, char(10), ' '), char(13), ' '), 1, 60)
              FROM messages
              WHERE session_id = sessions.id
                AND role = 'user'
                AND content IS NOT NULL
                AND length(trim(content)) > 0
              ORDER BY timestamp ASC
              LIMIT 1
            ),
            substr(id, 1, 10)
          ) AS display_title,
          source,
          COALESCE(ended_at, started_at),
          COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
        FROM sessions
        WHERE id IN ({})
        ORDER BY CASE id {} ELSE 999 END;
        ",
        quoted_ids.join(","),
        order,
    );

    query_sessions(&db_path, &query)
}

fn sql_string(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn query_sessions(db_path: &PathBuf, query: &str) -> Vec<SessionMenuItem> {
    let Ok(output) = Command::new("sqlite3")
        .arg("-readonly")
        .arg("-separator")
        .arg(FIELD_SEP.to_string())
        .arg("-newline")
        .arg(RECORD_SEP.to_string())
        .arg(db_path)
        .arg(query)
        .output()
    else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }

    let raw = String::from_utf8_lossy(&output.stdout);
    raw.split(RECORD_SEP)
        .filter_map(|record| {
            let fields = record.split(FIELD_SEP).collect::<Vec<_>>();
            if fields.len() < 5 {
                return None;
            }
            Some(SessionMenuItem {
                id: fields[0].to_string(),
                title: fields[1].to_string(),
                source: fields[2].to_string(),
                updated_at: fields[3].parse::<f64>().unwrap_or_default(),
                token_total: fields[4].parse::<i64>().unwrap_or_default(),
            })
        })
        .collect()
}

fn usage_label() -> String {
    let sessions = recent_sessions(20);
    if sessions.is_empty() {
        return "No usage yet".to_string();
    }

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs_f64())
        .unwrap_or_default();
    let week_start = now - 7.0 * 24.0 * 60.0 * 60.0;
    let weekly = sessions
        .iter()
        .filter(|session| session.updated_at >= week_start)
        .fold((0_i64, 0_usize), |(tokens, count), session| {
            (tokens + session.token_total, count + 1)
        });

    format!("1 week {} · {} chats", compact_tokens(weekly.0), weekly.1)
}

fn compact_tokens(tokens: i64) -> String {
    if tokens >= 1_000_000 {
        format!("{:.1}M tokens", tokens as f64 / 1_000_000.0)
    } else if tokens >= 1_000 {
        format!("{:.1}k tokens", tokens as f64 / 1_000.0)
    } else {
        format!("{tokens} tokens")
    }
}

fn count_all_sessions() -> usize {
    let Some(db_path) = hermes_db_path() else {
        return 0;
    };
    if !db_path.exists() {
        return 0;
    }

    let Ok(output) = Command::new("sqlite3")
        .arg("-readonly")
        .arg(db_path)
        .arg("SELECT COUNT(*) FROM sessions;")
        .output()
    else {
        return 0;
    };
    if !output.status.success() {
        return 0;
    }

    let raw = String::from_utf8_lossy(&output.stdout);
    raw.trim().parse::<usize>().unwrap_or(0)
}

pub fn set_online_status(online: bool) {
    IS_ONLINE.store(online, Ordering::Relaxed);
}

pub fn send_notification(app: &AppHandle<impl Runtime>, title: &str, body: &str) {
    let _ = app.notification().builder()
        .title(title)
        .body(body)
        .show();
}
