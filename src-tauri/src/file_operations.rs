//! # File Operations Module
//!
//! This module provides file-related utility functions for the Bokuchi application.
//!
//! ## Features
//! - **File Hash Calculation**: Generate SHA256 hashes for file content
//! - **Large File Handling**: Skip hash calculation for files larger than 10MB
//! - **Metadata Extraction**: Get file modification time and size information
//!
//! ## Performance Considerations
//! - Files larger than 10MB are marked with a special "large_file" hash to avoid
//!   memory issues during hash calculation
//! - Hash calculation is performed on the entire file content for integrity checking

use sha2::{Digest, Sha256};
use std::fs;
use std::time::SystemTime;

use crate::types::FileHashInfo;

// Calculate file hash
pub fn calculate_file_hash(path: &str) -> Result<FileHashInfo, String> {
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