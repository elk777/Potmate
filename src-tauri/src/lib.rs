use tauri::{
    AppHandle, Emitter,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use std::sync::atomic::{AtomicBool, Ordering};

static GLOBAL_ACTIVITY_MONITOR_STARTED: AtomicBool = AtomicBool::new(false);

#[derive(Clone, serde::Serialize)]
struct ActivityPayload {
    kind: &'static str,
}

#[derive(Clone, serde::Serialize)]
struct ActivityMonitorErrorPayload {
    reason: String,
}

#[tauri::command]
fn start_global_activity_monitor(app: AppHandle) -> Result<bool, String> {
    if GLOBAL_ACTIVITY_MONITOR_STARTED.swap(true, Ordering::SeqCst) {
        return Ok(false);
    }

    std::thread::spawn(move || {
        let activity_app = app.clone();
        let callback = move |event: rdev::Event| {
            let kind = match event.event_type {
                rdev::EventType::ButtonPress(_) => Some("click"),
                rdev::EventType::KeyPress(_) => Some("key"),
                _ => None,
            };

            if let Some(kind) = kind {
                let _ = activity_app.emit("global-activity", ActivityPayload { kind });
            }
        };

        if let Err(error) = rdev::listen(callback) {
            GLOBAL_ACTIVITY_MONITOR_STARTED.store(false, Ordering::SeqCst);
            let _ = app.emit(
                "global-activity-monitor-failed",
                ActivityMonitorErrorPayload {
                    reason: format!("{error:?}"),
                },
            );
        }
    });

    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![start_global_activity_monitor])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "显示花盆", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "隐藏花盆", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

            TrayIconBuilder::with_id("main")
                .tooltip("Potmate")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);

                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
