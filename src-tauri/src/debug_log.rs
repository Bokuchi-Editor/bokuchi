//! # Debug Log Module
//!
//! Appends diagnostic lines to a rotating log file inside the app log directory.
//! Intended for debug builds shipped to a limited set of testers — on Windows
//! `windows_subsystem = "windows"` suppresses stdout so a file is the only
//! reliable sink.
//!
//! ## Locations
//! - Windows: `%LocalAppData%\com.pemomomo.bokuchi\logs\debug.log`
//! - macOS:   `~/Library/Logs/com.pemomomo.bokuchi/debug.log`
//! - Linux:   `~/.local/share/com.pemomomo.bokuchi/logs/debug.log`
//!
//! On `init_log` the previous `debug.log` is renamed to `debug.log.prev` so the
//! tester can send both files and we see one session back as well.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager};

static LOG_PATH: OnceLock<Mutex<Option<PathBuf>>> = OnceLock::new();

fn iso_timestamp() -> String {
    // Lightweight ISO-8601 UTC timestamp without pulling in chrono.
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let millis = now.subsec_millis();

    // Break down seconds into date components. Algorithm from Howard Hinnant.
    let z = secs as i64 / 86_400 + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };

    let sec_of_day = secs % 86_400;
    let h = sec_of_day / 3600;
    let min = (sec_of_day % 3600) / 60;
    let s = sec_of_day % 60;

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year, m, d, h, min, s, millis
    )
}

/// Initialize the log file path and rotate the previous log.
/// Safe to call multiple times; subsequent calls are no-ops.
pub fn init_log(app_handle: &AppHandle) {
    let cell = LOG_PATH.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = cell.lock() {
        if guard.is_some() {
            return;
        }

        let log_dir = match app_handle.path().app_log_dir() {
            Ok(dir) => dir,
            Err(e) => {
                eprintln!("[debug_log] failed to resolve app_log_dir: {}", e);
                return;
            }
        };

        if let Err(e) = fs::create_dir_all(&log_dir) {
            eprintln!("[debug_log] failed to create log dir: {}", e);
            return;
        }

        let log_path = log_dir.join("debug.log");
        let prev_path = log_dir.join("debug.log.prev");

        // Rotate previous log if it exists
        if log_path.exists() {
            if prev_path.exists() {
                let _ = fs::remove_file(&prev_path);
            }
            if let Err(e) = fs::rename(&log_path, &prev_path) {
                eprintln!("[debug_log] failed to rotate log: {}", e);
            }
        }

        *guard = Some(log_path.clone());

        // Write a startup banner so we can find session boundaries.
        drop(guard);
        let banner = format!(
            "===== session start at {} / log path: {} =====",
            iso_timestamp(),
            log_path.display()
        );
        append(&banner);
    }
}

/// Append a single line to the debug log. Never panics.
pub fn append(line: &str) {
    let Some(cell) = LOG_PATH.get() else {
        return;
    };
    let Ok(guard) = cell.lock() else {
        return;
    };
    let Some(path) = guard.as_ref() else {
        return;
    };

    match OpenOptions::new().create(true).append(true).open(path) {
        Ok(mut file) => {
            let _ = writeln!(file, "{} {}", iso_timestamp(), line);
        }
        Err(e) => {
            eprintln!("[debug_log] failed to open log for append: {}", e);
        }
    }
}

/// Return the currently-configured log file path, if any.
pub fn current_log_path() -> Option<PathBuf> {
    LOG_PATH
        .get()
        .and_then(|cell| cell.lock().ok().and_then(|guard| guard.clone()))
}
