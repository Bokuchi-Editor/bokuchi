//! # Types Module
//!
//! This module defines the core data structures and global state used throughout the Bokuchi application.
//!
//! ## Structures
//! - `Variable`: Represents a key-value pair for variable substitution in Markdown
//! - `VariableSet`: Container for multiple variables, used for YAML serialization
//! - `FileHashInfo`: Contains file metadata including hash, modification time, and size
//! - `OpenFileEvent`: Event payload for file association handling
//!
//! ## Global State
//! - `PENDING_FILE_PATHS`: Buffers file paths received before frontend is ready
//! - `FRONTEND_READY`: Tracks whether the frontend is initialized and ready to receive events

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::sync::OnceLock;

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

// Global state for buffering file paths received before frontend is ready
pub static PENDING_FILE_PATHS: OnceLock<Mutex<Vec<String>>> = OnceLock::new();

// Check if frontend is ready
pub static FRONTEND_READY: OnceLock<Mutex<bool>> = OnceLock::new();