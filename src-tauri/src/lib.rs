use anyhow::Result;
use regex::Regex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::SystemTime;
use tauri::menu::{Menu, MenuItem, MenuItemKind};
use tauri::{Emitter, Manager};

// Variable definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub name: String,
    pub value: String,
}

// Variable set
#[derive(Debug, Serialize, Deserialize)]
pub struct VariableSet {
    pub variables: Vec<Variable>,
}

// File hash information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHashInfo {
    pub hash: String,
    pub modified_time: u64,
    pub file_size: u64,
}

// File open event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenFileEvent {
    pub file_path: String,
}

// Variable processor
pub struct VariableProcessor {
    global_variables: Mutex<HashMap<String, String>>,
}

impl VariableProcessor {
    pub fn new() -> Self {
        Self {
            global_variables: Mutex::new(HashMap::new()),
        }
    }

    // Set global variable
    pub fn set_global_variable(&self, name: String, value: String) {
        let mut vars = self.global_variables.lock().unwrap();
        vars.insert(name, value);
    }

    // Get global variable
    pub fn get_global_variable(&self, name: &str) -> Option<String> {
        let vars = self.global_variables.lock().unwrap();
        vars.get(name).cloned()
    }

    // Get all global variables
    pub fn get_all_global_variables(&self) -> HashMap<String, String> {
        let vars = self.global_variables.lock().unwrap();
        vars.clone()
    }

    // Extract variable definitions from Markdown
    pub fn parse_variables_from_markdown(&self, content: &str) -> (Vec<Variable>, String) {
        let mut variables = Vec::new();
        let lines: Vec<&str> = content.lines().collect();
        let mut processed_lines = Vec::new();

        for line in lines {
            let trimmed = line.trim();

            // Check for variable definition pattern
            if trimmed.starts_with("<!-- @var ") && trimmed.ends_with(" -->") {
                // <!-- @var name: value --> format
                let var_content = trimmed
                    .strip_prefix("<!-- @var ")
                    .unwrap()
                    .strip_suffix(" -->")
                    .unwrap();

                if let Some(colon_index) = var_content.find(':') {
                    let name = var_content[..colon_index].trim().to_string();
                    let value = var_content[colon_index + 1..].trim().to_string();
                    variables.push(Variable { name, value });
                }
            } else if trimmed.starts_with("<!-- @include:") && trimmed.ends_with(" -->") {
                // <!-- @include: filename --> format (future implementation)
                // Currently skipped
            } else {
                processed_lines.push(line);
            }
        }

        (variables, processed_lines.join("\n"))
    }

    // Expand variables in Markdown content
    pub fn process_variables(&self, content: &str) -> String {
        // Extract variable definitions from file
        let (file_variables, processed_content) = self.parse_variables_from_markdown(content);

        // Convert file variables to map
        let mut file_var_map = HashMap::new();
        for v in file_variables {
            file_var_map.insert(v.name, v.value);
        }

        // Regular expression for variable expansion
        let re = Regex::new(r"\{\{([^}]+)\}\}").unwrap();

        // Expand variables
        let result = re.replace_all(&processed_content, |caps: &regex::Captures| {
            let var_name = caps.get(1).unwrap().as_str().trim();

            // Prioritize file variables, then global variables
            if let Some(value) = file_var_map.get(var_name) {
                return value.clone();
            }
            if let Some(value) = self.get_global_variable(var_name) {
                return value;
            }

            // Return original string if variable not found
            caps[0].to_string()
        });

        result.to_string()
    }

    // Load variables from YAML file
    pub fn load_variables_from_yaml(&self, yaml_content: &str) -> Result<()> {
        let var_set: VariableSet = serde_yaml::from_str(yaml_content)?;
        let mut vars = self.global_variables.lock().unwrap();

        for v in var_set.variables {
            vars.insert(v.name, v.value);
        }

        Ok(())
    }

    // Export variables to YAML format
    pub fn export_variables_to_yaml(&self) -> Result<String> {
        let vars = self.get_all_global_variables();
        let variables: Vec<Variable> = vars
            .into_iter()
            .map(|(name, value)| Variable { name, value })
            .collect();

        let var_set = VariableSet { variables };
        let yaml_content = serde_yaml::to_string(&var_set)?;

        Ok(yaml_content)
    }
}

// Global variable processor instance
lazy_static::lazy_static! {
    static ref VARIABLE_PROCESSOR: VariableProcessor = VariableProcessor::new();
}

// Tauri command: Set global variable
#[tauri::command]
fn set_global_variable(name: String, value: String) -> Result<(), String> {
    VARIABLE_PROCESSOR.set_global_variable(name, value);
    Ok(())
}

// Tauri command: Get global variables
#[tauri::command]
fn get_global_variables() -> Result<HashMap<String, String>, String> {
    Ok(VARIABLE_PROCESSOR.get_all_global_variables())
}

// Tauri command: Load variables from YAML
#[tauri::command]
fn load_variables_from_yaml(yaml_content: String) -> Result<(), String> {
    VARIABLE_PROCESSOR
        .load_variables_from_yaml(&yaml_content)
        .map_err(|e| e.to_string())
}

// Tauri command: Export variables to YAML format
#[tauri::command]
fn export_variables_to_yaml() -> Result<String, String> {
    VARIABLE_PROCESSOR
        .export_variables_to_yaml()
        .map_err(|e| e.to_string())
}

// Tauri command: Process Markdown (variable expansion)
#[tauri::command]
fn process_markdown(
    content: String,
    global_variables: HashMap<String, String>,
) -> Result<String, String> {
    // Temporarily set global variables
    for (name, value) in global_variables {
        VARIABLE_PROCESSOR.set_global_variable(name, value);
    }

    let result = VARIABLE_PROCESSOR.process_variables(&content);
    Ok(result)
}

// Tauri command: Get expanded Markdown content
#[tauri::command]
fn get_expanded_markdown(
    content: String,
    global_variables: HashMap<String, String>,
) -> Result<String, String> {
    // Temporarily set global variables
    for (name, value) in global_variables {
        VARIABLE_PROCESSOR.set_global_variable(name, value);
    }

    let result = VARIABLE_PROCESSOR.process_variables(&content);
    Ok(result)
}

// Calculate file hash
fn calculate_file_hash(path: &str) -> Result<FileHashInfo, String> {
    let metadata = fs::metadata(path).map_err(|_| "File not found".to_string())?;

    let modified_time = metadata
        .modified()
        .map_err(|_| "Failed to get modified time".to_string())?
        .duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|_| "Failed to convert time".to_string())?
        .as_secs();

    let file_size = metadata.len();

    // Skip hash calculation for large files
    if file_size > 10 * 1024 * 1024 {
        return Ok(FileHashInfo {
            hash: "large_file".to_string(),
            modified_time,
            file_size,
        });
    }

    // Read file content and calculate hash
    let content = fs::read_to_string(path).map_err(|_| "Failed to read file".to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let hash = format!("{:x}", hasher.finalize());

    Ok(FileHashInfo {
        hash,
        modified_time,
        file_size,
    })
}

// Tauri command: Read file
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    // File size check (10MB limit)
    let metadata = fs::metadata(&path).map_err(|_| "File not found".to_string())?;
    if metadata.len() > 10 * 1024 * 1024 {
        return Err("File too large (max 10MB)".to_string());
    }

    // File extension check
    if let Some(ext) = Path::new(&path).extension() {
        let ext_str = ext.to_string_lossy().to_lowercase();
        if ext_str != "md" && ext_str != "txt" {
            return Err("Unsupported file type. Only .md and .txt files are supported".to_string());
        }
    }

    // Read file
    fs::read_to_string(&path).map_err(|_| "Failed to read file".to_string())
}

// Tauri command: Save file
#[tauri::command]
async fn save_file(path: String, content: String) -> Result<(), String> {
    // File extension check
    if let Some(ext) = Path::new(&path).extension() {
        let ext_str = ext.to_string_lossy().to_lowercase();
        if ext_str != "md" && ext_str != "txt" {
            return Err("Unsupported file type. Only .md and .txt files are supported".to_string());
        }
    }

    // Create directory
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|_| "Failed to create directory".to_string())?;
    }

    // Save file
    fs::write(&path, content).map_err(|_| "Failed to save file".to_string())
}

// Tauri command: Get file hash
#[tauri::command]
async fn get_file_hash(path: String) -> Result<FileHashInfo, String> {
    calculate_file_hash(&path)
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// macOS Apple Events handling
#[cfg(target_os = "macos")]
fn handle_open_file_event(app_handle: &tauri::AppHandle, file_path: String) {
    println!("Handling open file event for: {}", file_path);

    // If file exists and has md or txt extension
    if Path::new(&file_path).exists() {
        if let Some(ext) = Path::new(&file_path).extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            if ext_str == "md" || ext_str == "txt" {
                println!("Valid file type, emitting open-file event");
                let app_handle = app_handle.clone();
                let file_path = file_path.clone();

                // Emit event immediately (removed delay)
                println!("Emitting open-file event for: {}", file_path);
                let _ = app_handle.emit(
                    "open-file",
                    OpenFileEvent {
                        file_path: file_path,
                    },
                );
            } else {
                println!("Invalid file extension: {}", ext_str);
            }
        } else {
            println!("No file extension found");
        }
    } else {
        println!("File does not exist: {}", file_path);
    }
}

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
            get_file_hash
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// テストモジュールを追加
#[cfg(test)]
mod tests;
