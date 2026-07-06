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
use std::panic::{catch_unwind, AssertUnwindSafe};
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
//
// Wrapped in catch_unwind because this is invoked on every keystroke in the
// editor — a panic here previously killed the whole Tauri main process. We
// would rather surface the panic as a command error and keep the editor alive
// than have the app exit in the middle of someone's edit.
#[tauri::command]
pub fn process_markdown(
    content: String,
    global_variables: HashMap<String, String>,
) -> Result<String, String> {
    catch_unwind(AssertUnwindSafe(|| {
        for (name, value) in global_variables {
            VARIABLE_PROCESSOR.set_global_variable(name, value);
        }
        VARIABLE_PROCESSOR.process_variables(&content)
    }))
    .map_err(|panic_payload| {
        let msg = panic_message(&panic_payload);
        eprintln!("[process_markdown] panic caught: {}", msg);
        format!("process_markdown panicked: {}", msg)
    })
}

// Tauri command: Get expanded Markdown content
#[tauri::command]
pub fn get_expanded_markdown(
    content: String,
    global_variables: HashMap<String, String>,
) -> Result<String, String> {
    catch_unwind(AssertUnwindSafe(|| {
        for (name, value) in global_variables {
            VARIABLE_PROCESSOR.set_global_variable(name, value);
        }
        VARIABLE_PROCESSOR.process_variables(&content)
    }))
    .map_err(|panic_payload| {
        let msg = panic_message(&panic_payload);
        eprintln!("[get_expanded_markdown] panic caught: {}", msg);
        format!("get_expanded_markdown panicked: {}", msg)
    })
}

// Extract a printable message from a panic payload. Panics carry their payload
// as `Box<dyn Any + Send>`; the standard library only formats &str and String
// variants, so we mirror that and fall back to a placeholder.
fn panic_message(payload: &Box<dyn std::any::Any + Send>) -> String {
    if let Some(s) = payload.downcast_ref::<&'static str>() {
        (*s).to_string()
    } else if let Some(s) = payload.downcast_ref::<String>() {
        s.clone()
    } else {
        "<non-string panic payload>".to_string()
    }
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

    // Save file. Surface the OS-level error kind so the user sees the
    // underlying cause (PermissionDenied, sharing violation from a syncing
    // cloud drive, etc.) rather than a generic "Failed to save file".
    fs::write(&path, content)
        .map_err(|e| format!("Failed to save file: {} ({:?})", e, e.kind()))
}

// Tauri command: Save raw image bytes into a document-relative asset folder.
// Used when pasting a bitmap from the clipboard, where no source file exists.
// Mirrors `save_file`'s std::fs approach so images can be written next to
// documents anywhere on disk (bypassing the fs plugin's static scope). Returns
// the written file's path relative to `dest_dir`, forward-slashed for use in a
// Markdown link (e.g. "images/foo.png").
#[tauri::command]
pub async fn save_image_bytes(
    dest_dir: String,
    subdir: String,
    filename: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let dir = Path::new(&dest_dir).join(&subdir);
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create image directory: {} ({:?})", e, e.kind()))?;
    let name = write_image_dedup(&dir, &filename, &bytes)?;
    Ok(format!("{}/{}", subdir.replace('\\', "/"), name))
}

// Tauri command: Copy an existing image file into a document-relative asset
// folder, preserving its file name. Used when an image dragged into the editor
// lives outside the document's own folder. Reads the source server-side so
// paths outside the fs plugin scope are reachable. Returns the copied file's
// path relative to `dest_dir`, forward-slashed.
#[tauri::command]
pub async fn copy_image_asset(
    src_path: String,
    dest_dir: String,
    subdir: String,
) -> Result<String, String> {
    let bytes = fs::read(&src_path)
        .map_err(|e| format!("Failed to read image: {} ({:?})", e, e.kind()))?;
    let filename = Path::new(&src_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .ok_or_else(|| "Invalid source image path".to_string())?;
    let dir = Path::new(&dest_dir).join(&subdir);
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create image directory: {} ({:?})", e, e.kind()))?;
    let name = write_image_dedup(&dir, &filename, &bytes)?;
    Ok(format!("{}/{}", subdir.replace('\\', "/"), name))
}

// Write `bytes` into `dir` under `filename`, avoiding collisions. Only the file
// name component of `filename` is used (guards against path traversal). If a
// file with the same name already holds identical bytes it is reused with no
// write (dedup); otherwise a numeric suffix (`name-1.ext`, `name-2.ext`, …) is
// tried until a free / matching name is found. Returns the final file name.
pub(crate) fn write_image_dedup(dir: &Path, filename: &str, bytes: &[u8]) -> Result<String, String> {
    let base = Path::new(filename)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "image".to_string());
    let stem = Path::new(&base)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "image".to_string());
    let ext = Path::new(&base)
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();

    for i in 0..1000 {
        let candidate = if i == 0 {
            format!("{}{}", stem, ext)
        } else {
            format!("{}-{}{}", stem, i, ext)
        };
        let target = dir.join(&candidate);
        if !target.exists() {
            fs::write(&target, bytes)
                .map_err(|e| format!("Failed to write image: {} ({:?})", e, e.kind()))?;
            return Ok(candidate);
        }
        // Reuse an identical existing file instead of piling up duplicates.
        if let Ok(existing) = fs::read(&target) {
            if existing == bytes {
                return Ok(candidate);
            }
        }
    }
    Err("Too many image name collisions".to_string())
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
                if ext != "md" && ext != "txt" {
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

// Tauri command: Rename file
#[tauri::command]
pub async fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    let old = Path::new(&old_path);
    let new = Path::new(&new_path);

    if !old.exists() {
        return Err("Source file not found".to_string());
    }

    if new.exists() {
        return Err("A file with that name already exists".to_string());
    }

    fs::rename(old, new).map_err(|e| format!("Failed to rename file: {}", e))
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}