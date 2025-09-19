//! # Bokuchi - Main Library
//!
//! This is the main entry point for the Bokuchi Markdown editor application.
//!
//! ## Architecture
//! The application is organized into several modules:
//! - `types`: Core data structures and global state
//! - `variable_processor`: Variable substitution in Markdown content
//! - `file_operations`: File-related utility functions
//! - `file_association`: File association handling (macOS)
//! - `commands`: Tauri commands for frontend communication
//!
//! ## Features
//! - **Markdown Editing**: Full-featured Markdown editor with live preview
//! - **Variable Substitution**: Dynamic content with `{{variable}}` syntax
//! - **File Association**: Open files by double-clicking in Finder (macOS)
//! - **Multi-tab Interface**: Edit multiple files simultaneously
//! - **Cross-platform**: Built with Tauri for native performance
//!
//! ## Application Lifecycle
//! 1. `run()` function initializes the Tauri application
//! 2. Plugins are registered for file system, dialogs, and clipboard access
//! 3. Custom menu is set up with application-specific items
//! 4. Event handlers are registered for menu actions and file associations
//! 5. Application runs with event loop handling user interactions

use tauri::menu::{Menu, MenuItem, MenuItemKind};
use tauri::{Emitter, Manager, RunEvent};

// Module declarations
mod types;
mod variable_processor;
mod file_operations;
mod file_association;
mod commands;

// Re-export types
pub use types::*;
// Re-export variable processor
pub use variable_processor::*;
// Re-export file operations
pub use file_operations::*;
// Re-export file association
pub use file_association::*;
// Re-export commands
pub use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus existing window when new instance is launched
            println!("New instance detected, attempting to focus existing window");
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.unminimize();
                let _ = main_window.set_focus();
            }
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            set_global_variable,
            get_global_variables,
            load_variables_from_yaml,
            export_variables_to_yaml,
            process_markdown,
            get_expanded_markdown,
            read_file,
            save_file,
            get_file_hash,
            get_pending_file_paths_command,
            log_from_frontend,
            set_frontend_ready_command
        ])
        .setup(|app| {
            // Get command line arguments
            let args: Vec<String> = std::env::args().collect();
            println!("Command line args: {:?}", args);

            // Debug output for environment variables (for macOS file association debugging)
            #[cfg(target_os = "macos")]
            {
                println!("Environment variables:");
                for (key, value) in std::env::vars() {
                    if key.contains("CF")
                        || key.contains("APPLE")
                        || key.contains("BUNDLE")
                        || key.contains("LAUNCH")
                    {
                        println!("  {}: {}", key, value);
                    }
                }
                println!("Process ID: {}", std::process::id());
                println!("Current directory: {:?}", std::env::current_dir());
            }

            // If file path is passed as argument (macOS only)
            #[cfg(target_os = "macos")]
            if args.len() > 1 {
                let file_path = &args[1];
                println!("File path from args: {}", file_path);
                handle_open_file_event(app.handle(), file_path.to_string());
            } else {
                println!("No command line arguments provided");
            }

            #[cfg(not(target_os = "macos"))]
            {
                println!("Command line argument handling is only available on macOS");
            }

            // Custom menu setup (macOS only)
            #[cfg(target_os = "macos")]
            {
                println!("Setting up custom menu...");

                // 1) 既定メニューを生成
                let menu = Menu::default(&app.handle())?;
                println!("Default menu created");

                // 2) "File" サブメニューを探して中に項目を差し込む
                for item in menu.items()? {
                    if let MenuItemKind::Submenu(file_sm) = item {
                        let text = file_sm.text()?;
                        println!("Found submenu: {}", text);

                        if text == "File" || text == "ファイル" {
                            println!("Found File menu, adding custom items...");

                            // デフォルトのFileメニュー項目を確認
                            println!("Default File menu items:");
                            for (i, item) in file_sm.items()?.iter().enumerate() {
                                if let MenuItemKind::MenuItem(menu_item) = item {
                                    if let Ok(item_text) = menu_item.text() {
                                        println!("  {}: {}", i, item_text);
                                    }
                                }
                            }

                            // 1. New File
                            let new_file = MenuItem::with_id(
                                app, "new_file", "New File",
                                true, Some("CmdOrCtrl+N")
                            )?;
                            file_sm.insert(&new_file, 1)?;
                            println!("Inserted New File menu item at position 1");

                            // 2. Open File
                            let open_file = MenuItem::with_id(
                                app, "open_file", "Open File",
                                true, Some("CmdOrCtrl+O")
                            )?;
                            file_sm.insert(&open_file, 2)?;
                            println!("Inserted Open File menu item at position 2");

                            // 3. Save
                            let save = MenuItem::with_id(
                                app, "save", "Save",
                                true, Some("CmdOrCtrl+S")
                            )?;
                            file_sm.insert(&save, 3)?;
                            println!("Inserted Save menu item at position 3");

                            // 4. Save As
                            let save_as = MenuItem::with_id(
                                app, "save_as", "Save As",
                                true, Some("CmdOrCtrl+Shift+S")
                            )?;
                            file_sm.insert(&save_as, 4)?;
                            println!("Inserted Save As menu item at position 4");

                            // 5. Save with Variables
                            let save_with_variables = MenuItem::with_id(
                                app, "save_with_variables", "Save with Variables Applied",
                                true, None::<&str>
                            )?;
                            file_sm.insert(&save_with_variables, 5)?;
                            println!("Inserted Save with Variables menu item at position 5");
                        }
                        // Help メニューを探して項目を追加
                        else if text == "Help" || text == "ヘルプ" {
                            println!("Found Help menu, adding custom items...");

                            // Help メニュー項目を追加
                            let help = MenuItem::with_id(
                                app, "help", "Help",
                                true, Some("F1")
                            )?;
                            file_sm.insert(&help, 0)?; // 先頭に挿入
                            println!("Inserted Help menu item at position 0");
                        }
                    }
                }

                // 3) アプリメニューとして反映
                app.set_menu(menu)?;
                println!("Menu set successfully");

                // 4) クリックイベントの受け口
                app.on_menu_event(|app, ev| {
                    let timestamp = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis();
                    println!("[{}] Menu event received: {} (thread: {:?})",
                        timestamp, ev.id().0, std::thread::current().id());

                    match ev.id().0.as_str() {
                        "save" => {
                            println!("[{}] Save menu item clicked - calling frontend function", timestamp);
                            // フロントエンドの関数を直接呼び出し
                            let result = app.emit("menu-save", ());
                            println!("[{}] Emit result: {:?}", timestamp, result);
                        }
                        "new_file" => {
                            println!("[{}] New File menu item clicked - calling frontend function", timestamp);
                            let result = app.emit("menu-new-file", ());
                            println!("[{}] Emit result: {:?}", timestamp, result);
                        }
                        "open_file" => {
                            println!("[{}] Open File menu item clicked - calling frontend function", timestamp);
                            let result = app.emit("menu-open-file", ());
                            println!("[{}] Emit result: {:?}", timestamp, result);
                        }
                        "save_as" => {
                            println!("[{}] Save As menu item clicked - calling frontend function", timestamp);
                            let result = app.emit("menu-save-as", ());
                            println!("[{}] Emit result: {:?}", timestamp, result);
                        }
                        "save_with_variables" => {
                            println!("[{}] Save with Variables menu item clicked - calling frontend function", timestamp);
                            let result = app.emit("menu-save-with-variables", ());
                            println!("[{}] Emit result: {:?}", timestamp, result);
                        }
                        "help" => {
                            println!("[{}] Help menu item clicked - calling frontend function", timestamp);
                            let result = app.emit("menu-help", ());
                            println!("[{}] Emit result: {:?}", timestamp, result);
                        }
                        _ => {
                            println!("[{}] Unknown menu item clicked: {}", timestamp, ev.id().0);
                        }
                    }
                });
                println!("Menu event handler set up");
            }

            Ok(())
        })
        .on_window_event(|_window, event| {
            #[cfg(target_os = "macos")]
            {
                use tauri::WindowEvent;
                match event {
                    WindowEvent::CloseRequested { .. } => {
                        println!("Window close requested");
                    }
                    _ => {}
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::Ready => {
                    println!("Tauri app is ready");
                }
                #[cfg(target_os = "macos")]
                RunEvent::Opened { urls } => {
                    handle_run_event_opened(&app_handle, urls);
                }
                _ => {}
            }
        });
}

// テストモジュールを追加
#[cfg(test)]
mod tests;
