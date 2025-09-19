//! # File Association Module
//!
//! This module handles file association functionality, allowing the application to open files
//! when they are double-clicked in the file system.
//!
//! ## Features
//! - **macOS File Association**: Handle `RunEvent::Opened` events from the macOS system
//! - **File Type Validation**: Only process `.md` and `.txt` files
//! - **Frontend State Management**: Track whether the frontend is ready to receive events
//! - **Event Buffering**: Buffer file open events when frontend is not ready
//! - **URL Processing**: Convert file URLs to file paths for processing
//!
//! ## Event Flow
//! 1. User double-clicks a `.md` or `.txt` file
//! 2. macOS sends `RunEvent::Opened` with file URLs
//! 3. URLs are converted to file paths
//! 4. If frontend is ready, emit `open-file` event immediately
//! 5. If frontend is not ready, buffer the file path for later retrieval
//!
//! ## Platform Support
//! Currently supports macOS file association. Other platforms can be added by implementing
//! similar event handling logic.

use std::path::Path;
use std::sync::Mutex;
use tauri::Emitter;

use crate::types::{OpenFileEvent, PENDING_FILE_PATHS, FRONTEND_READY};

// Check if frontend is ready
pub fn is_frontend_ready() -> bool {
    let ready = FRONTEND_READY.get_or_init(|| Mutex::new(false));
    if let Ok(is_ready) = ready.lock() {
        *is_ready
    } else {
        false
    }
}

// Get buffered file paths (for frontend to retrieve after initialization)
pub fn get_pending_file_paths() -> Vec<String> {
    let pending_paths = PENDING_FILE_PATHS.get_or_init(|| Mutex::new(Vec::new()));
    if let Ok(mut paths) = pending_paths.lock() {
        let result = paths.clone();
        paths.clear(); // Clear buffer after retrieving
        println!("Retrieved {} pending file paths: {:?}", result.len(), result);
        result
    } else {
        println!("Failed to lock pending file paths");
        Vec::new()
    }
}

// Set frontend ready state
pub fn set_frontend_ready() {
    let ready = FRONTEND_READY.get_or_init(|| Mutex::new(false));
    if let Ok(mut is_ready) = ready.lock() {
        *is_ready = true;
        println!("Frontend is now ready");
    }
}

// macOS Apple Events handling
#[cfg(target_os = "macos")]
pub fn handle_open_file_event(app_handle: &tauri::AppHandle, file_path: String) {
    println!("Handling open file event for: {}", file_path);

    // If file exists and has md or txt extension
    if Path::new(&file_path).exists() {
        if let Some(ext) = Path::new(&file_path).extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            if ext_str == "md" || ext_str == "txt" {
                println!("Valid file type, attempting to emit open-file event");

                // Check if frontend is ready before emitting
                if is_frontend_ready() {
                    // Try to emit event to frontend immediately
                    match app_handle.emit(
                        "open-file",
                        OpenFileEvent {
                            file_path: file_path.clone(),
                        },
                    ) {
                        Ok(_) => {
                            println!("Successfully emitted open-file event (frontend ready)");
                            return;
                        }
                        Err(e) => {
                            println!("Failed to emit open-file event: {}", e);
                        }
                    }
                } else {
                    println!("Frontend not ready, will buffer file path");
                }

                // If immediate emit failed, buffer the file path for later retrieval
                println!("Buffering file path for later retrieval: {}", file_path);
                let pending_paths = PENDING_FILE_PATHS.get_or_init(|| Mutex::new(Vec::new()));
                if let Ok(mut paths) = pending_paths.lock() {
                    paths.push(file_path);
                    println!("File path added to buffer. Total buffered: {}", paths.len());
                }
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

// Handle RunEvent::Opened for macOS
#[cfg(target_os = "macos")]
pub fn handle_run_event_opened(app_handle: &tauri::AppHandle, urls: Vec<url::Url>) {
    println!("RunEvent::Opened received with {} URLs", urls.len());
    for url in urls {
        println!("Processing URL: {}", url);
        if let Ok(path_buf) = url.to_file_path() {
            let file_path = path_buf.to_string_lossy().to_string();
            println!("Converted to file path: {}", file_path);
            handle_open_file_event(app_handle, file_path);
        } else {
            println!("Failed to convert URL to file path: {}", url);
        }
    }
}