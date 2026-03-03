//! # Commands Module
//!
//! This module defines all Tauri commands that can be called from the frontend.
//!
//! ## Command Categories
//!
//! ### Variable Management
//! - `set_global_variable`: Set a global variable for Markdown processing
//! - `get_global_variables`: Retrieve all global variables
//! - `load_variables_from_yaml`: Import variables from YAML content
//! - `export_variables_to_yaml`: Export current variables to YAML format
//!
//! ### Markdown Processing
//! - `process_markdown`: Process Markdown content with variable substitution
//! - `get_expanded_markdown`: Get expanded Markdown with variables resolved
//!
//! ### File Operations
//! - `read_file`: Read file content with validation (10MB limit, .md/.txt only)
//! - `save_file`: Save content to file with validation
//! - `get_file_hash`: Calculate file hash for change detection
//!
//! ### File Association
//! - `get_pending_file_paths_command`: Retrieve buffered file paths from file association
//! - `set_frontend_ready_command`: Notify that frontend is ready to receive events
//!
//! ### Utility
//! - `log_from_frontend`: Log messages from frontend to Rust console
//! - `greet`: Simple test command
//!
//! ## Error Handling
//! All commands return `Result<T, String>` for proper error handling and user feedback.

use std::collections::HashMap;
use std::fs;
use std::path::Path;

use tauri::Emitter;

use crate::variable_processor::VARIABLE_PROCESSOR;
use crate::file_operations::calculate_file_hash;
use crate::file_association::{get_pending_file_paths, set_frontend_ready};
use crate::types::FileHashInfo;

// Tauri command: Set global variable
#[tauri::command]
pub fn set_global_variable(name: String, value: String) -> Result<(), String> {
    VARIABLE_PROCESSOR.set_global_variable(name, value);
    Ok(())
}

// Tauri command: Get global variables
#[tauri::command]
pub fn get_global_variables() -> Result<HashMap<String, String>, String> {
    Ok(VARIABLE_PROCESSOR.get_all_global_variables())
}

// Tauri command: Load variables from YAML
#[tauri::command]
pub fn load_variables_from_yaml(yaml_content: String) -> Result<(), String> {
    VARIABLE_PROCESSOR
        .load_variables_from_yaml(&yaml_content)
        .map_err(|e| e.to_string())
}

// Tauri command: Export variables to YAML format
#[tauri::command]
pub fn export_variables_to_yaml() -> Result<String, String> {
    VARIABLE_PROCESSOR
        .export_variables_to_yaml()
        .map_err(|e| e.to_string())
}

// Tauri command: Process Markdown (variable expansion)
#[tauri::command]
pub fn process_markdown(
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
pub fn get_expanded_markdown(
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

// Tauri command: Read file
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
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
pub async fn save_file(path: String, content: String) -> Result<(), String> {
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
pub async fn get_file_hash(path: String) -> Result<FileHashInfo, String> {
    calculate_file_hash(&path)
}

// Tauri command: Get pending file paths
#[tauri::command]
pub fn get_pending_file_paths_command() -> Vec<String> {
    get_pending_file_paths()
}

// Log message from frontend to Rust console
#[tauri::command]
pub fn log_from_frontend(message: String) {
    println!("[FRONTEND] {}", message);
}

// Tauri command: Set frontend ready and emit any buffered file paths
#[tauri::command]
pub fn set_frontend_ready_command(app_handle: tauri::AppHandle) {
    set_frontend_ready();

    // Emit any buffered pending file paths immediately
    let pending = get_pending_file_paths();
    if !pending.is_empty() {
        println!("Emitting {} buffered file paths after frontend ready", pending.len());
        for file_path in pending {
            let _ = app_handle.emit(
                "open-file",
                crate::types::OpenFileEvent { file_path },
            );
        }
    }
}

// Tauri command: Read directory entries (for folder tree)
#[tauri::command]
pub async fn read_directory(path: String, show_all_files: bool) -> Result<Vec<crate::types::DirEntry>, String> {
    let dir_path = Path::new(&path);
    if !dir_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let entries = fs::read_dir(dir_path).map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut dirs: Vec<crate::types::DirEntry> = Vec::new();
    let mut files: Vec<crate::types::DirEntry> = Vec::new();

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files (starting with '.')
        if file_name.starts_with('.') {
            continue;
        }

        let file_path = entry.path().to_string_lossy().to_string();
        let is_dir = entry.path().is_dir();

        if is_dir {
            dirs.push(crate::types::DirEntry {
                name: file_name,
                path: file_path,
                is_directory: true,
            });
        } else {
            // Filter files based on show_all_files flag
            if !show_all_files {
                let ext = Path::new(&file_name)
                    .extension()
                    .map(|e| e.to_string_lossy().to_lowercase())
                    .unwrap_or_default();
                if ext != "md" && ext != "txt" && ext != "markdown" {
                    continue;
                }
            }

            files.push(crate::types::DirEntry {
                name: file_name,
                path: file_path,
                is_directory: false,
            });
        }
    }

    // Sort: directories first (alphabetical), then files (alphabetical)
    dirs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    dirs.append(&mut files);
    Ok(dirs)
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}