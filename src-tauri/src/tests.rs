//! # Tests Module
//!
//! This module contains comprehensive unit tests for the Bokuchi application.
//!
//! ## Test Coverage
//!
//! ### VariableProcessor Tests
//! - **Initialization**: Test `VariableProcessor::new()` creates empty instance
//! - **Variable Management**: Test setting, getting, and retrieving global variables
//! - **Markdown Parsing**: Test parsing variables from Markdown comments
//! - **Variable Substitution**: Test `{{variable}}` replacement in content
//! - **YAML Import/Export**: Test loading and saving variables to/from YAML
//! - **Edge Cases**: Test empty content, malformed comments, and special characters
//!
//! ### File Operations Tests
//! - **Hash Calculation**: Test SHA256 hash generation for file content
//! - **Large File Handling**: Test behavior with files larger than 10MB
//! - **Metadata Extraction**: Test file modification time and size retrieval
//! - **Error Handling**: Test proper error messages for missing files
//!
//! ### Integration Tests
//! - **End-to-End Variable Processing**: Test complete workflow from parsing to substitution
//! - **Complex Scenarios**: Test multiple variables, nested content, and mixed formats
//!
//! ## Running Tests
//! ```bash
//! # Run all tests
//! cargo test
//!
//! # Run specific test module
//! cargo test tests
//!
//! # Run with output
//! cargo test -- --nocapture
//! ```
//!
//! ## Test Data
//! Tests use various sample Markdown content and variable configurations to ensure
//! robust functionality across different use cases.

use crate::*;
use std::collections::HashMap;
use std::io::Write;
use std::sync::Mutex;
use tempfile::TempDir;

// VariableProcessor tests
#[test]
fn test_variable_processor_new() {
    let processor = VariableProcessor::new();
    assert!(processor.get_all_global_variables().is_empty());
}

#[test]
fn test_set_and_get_global_variable() {
    let processor = VariableProcessor::new();
    processor.set_global_variable("test_var".to_string(), "test_value".to_string());
    assert_eq!(processor.get_global_variable("test_var"), Some("test_value".to_string()));
    assert_eq!(processor.get_global_variable("nonexistent"), None);
}

#[test]
fn test_get_all_global_variables() {
    let processor = VariableProcessor::new();
    processor.set_global_variable("var1".to_string(), "value1".to_string());
    processor.set_global_variable("var2".to_string(), "value2".to_string());

    let all_vars = processor.get_all_global_variables();
    assert_eq!(all_vars.len(), 2);
    assert_eq!(all_vars.get("var1"), Some(&"value1".to_string()));
    assert_eq!(all_vars.get("var2"), Some(&"value2".to_string()));
}

#[test]
fn test_parse_variables_from_markdown() {
    let processor = VariableProcessor::new();
    let content = r#"# Test Document
<!-- @var name: John Doe -->
<!-- @var email: john@example.com -->
Some content here
<!-- @var age: 30 -->
More content"#;

    let (variables, processed_content) = processor.parse_variables_from_markdown(content);

    assert_eq!(variables.len(), 3);
    assert_eq!(variables[0].name, "name");
    assert_eq!(variables[0].value, "John Doe");
    assert_eq!(variables[1].name, "email");
    assert_eq!(variables[1].value, "john@example.com");
    assert_eq!(variables[2].name, "age");
    assert_eq!(variables[2].value, "30");

    assert!(!processed_content.contains("<!-- @var"));
    assert!(processed_content.contains("Some content here"));
    assert!(processed_content.contains("More content"));
}

#[test]
fn test_parse_variables_from_markdown_no_variables() {
    let processor = VariableProcessor::new();
    let content = r#"# Test Document
Some content here
More content"#;

    let (variables, processed_content) = processor.parse_variables_from_markdown(content);

    assert_eq!(variables.len(), 0);
    assert_eq!(processed_content, content);
}

#[test]
fn test_process_variables() {
    let processor = VariableProcessor::new();
    processor.set_global_variable("global_var".to_string(), "global_value".to_string());

    let content = r#"# Test Document
<!-- @var local_var: local_value -->
Hello {{local_var}} and {{global_var}}!
<!-- @var another_var: another_value -->
This is {{another_var}}."#;

    let result = processor.process_variables(content);

    assert!(result.contains("Hello local_value and global_value!"));
    assert!(result.contains("This is another_value."));
    assert!(!result.contains("{{local_var}}"));
    assert!(!result.contains("{{global_var}}"));
    assert!(!result.contains("{{another_var}}"));
}

#[test]
fn test_process_variables_priority() {
    let processor = VariableProcessor::new();
    processor.set_global_variable("test_var".to_string(), "global_value".to_string());

    let content = r#"<!-- @var test_var: local_value -->
{{test_var}}"#;

    let result = processor.process_variables(content);

    // Local variable should take priority over global
    assert_eq!(result.trim(), "local_value");
}

#[test]
fn test_process_variables_undefined_variable() {
    let processor = VariableProcessor::new();
    let content = "Hello {{undefined_var}}!";

    let result = processor.process_variables(content);

    // Undefined variables should remain unchanged
    assert_eq!(result, "Hello {{undefined_var}}!");
}

#[test]
fn test_load_variables_from_yaml() {
    let processor = VariableProcessor::new();
    let yaml_content = r#"variables:
  - name: var1
    value: value1
  - name: var2
    value: value2"#;

    let result = processor.load_variables_from_yaml(yaml_content);
    assert!(result.is_ok());

    let all_vars = processor.get_all_global_variables();
    assert_eq!(all_vars.len(), 2);
    assert_eq!(all_vars.get("var1"), Some(&"value1".to_string()));
    assert_eq!(all_vars.get("var2"), Some(&"value2".to_string()));
}

#[test]
fn test_export_variables_to_yaml() {
    let processor = VariableProcessor::new();
    processor.set_global_variable("var1".to_string(), "value1".to_string());
    processor.set_global_variable("var2".to_string(), "value2".to_string());

    let yaml_content = processor.export_variables_to_yaml().unwrap();
    assert!(yaml_content.contains("var1"));
    assert!(yaml_content.contains("value1"));
    assert!(yaml_content.contains("var2"));
    assert!(yaml_content.contains("value2"));
}

// Tauri command tests
#[test]
fn test_set_global_variable_command() {
    let result = set_global_variable("test".to_string(), "value".to_string());
    assert!(result.is_ok());

    let vars = get_global_variables().unwrap();
    assert_eq!(vars.get("test"), Some(&"value".to_string()));
}

#[test]
fn test_load_variables_from_yaml_command() {
    let yaml_content = r#"variables:
  - name: test_var
    value: test_value"#;

    let result = load_variables_from_yaml(yaml_content.to_string());
    assert!(result.is_ok());

    let vars = get_global_variables().unwrap();
    assert_eq!(vars.get("test_var"), Some(&"test_value".to_string()));
}

#[test]
fn test_export_variables_to_yaml_command() {
    set_global_variable("test_var".to_string(), "test_value".to_string()).unwrap();

    let yaml_content = export_variables_to_yaml().unwrap();
    assert!(yaml_content.contains("test_var"));
    assert!(yaml_content.contains("test_value"));
}

#[test]
fn test_process_markdown_command() {
    let content = "Hello {{name}}!";
    let mut global_variables = HashMap::new();
    global_variables.insert("name".to_string(), "World".to_string());

    let result = process_markdown(content.to_string(), global_variables).unwrap();
    assert_eq!(result, "Hello World!");
}

#[test]
fn test_get_expanded_markdown_command() {
    let content = "Hello {{name}}!";
    let mut global_variables = HashMap::new();
    global_variables.insert("name".to_string(), "World".to_string());

    let result = get_expanded_markdown(content.to_string(), global_variables).unwrap();
    assert_eq!(result, "Hello World!");
}

// Integration tests
#[test]
fn test_variable_processing_integration() {
    let processor = VariableProcessor::new();

    // Set global variables
    processor.set_global_variable("global_name".to_string(), "Global User".to_string());
    processor.set_global_variable("global_company".to_string(), "Global Corp".to_string());

    // Process markdown with both local and global variables
    let content = r#"# Welcome Document
<!-- @var local_name: Local User -->
<!-- @var local_department: Engineering -->
Hello {{local_name}} from {{local_department}}!
Your company is {{global_company}}.
<!-- @var local_role: Developer -->
You are a {{local_role}}."#;

    let result = processor.process_variables(content);

    // Check that local variables are processed
    assert!(result.contains("Hello Local User from Engineering!"));
    assert!(result.contains("You are a Developer."));

    // Check that global variables are processed
    assert!(result.contains("Your company is Global Corp."));

    // Check that variable definitions are removed
    assert!(!result.contains("<!-- @var"));
}

#[test]
fn test_yaml_roundtrip() {
    let processor = VariableProcessor::new();

    // Set some variables
    processor.set_global_variable("var1".to_string(), "value1".to_string());
    processor.set_global_variable("var2".to_string(), "value2".to_string());

    // Export to YAML
    let yaml_content = processor.export_variables_to_yaml().unwrap();

    // Create new processor and load from YAML
    let new_processor = VariableProcessor::new();
    new_processor.load_variables_from_yaml(&yaml_content).unwrap();

    // Check that variables are preserved
    let vars = new_processor.get_all_global_variables();
    assert_eq!(vars.len(), 2);
    assert_eq!(vars.get("var1"), Some(&"value1".to_string()));
    assert_eq!(vars.get("var2"), Some(&"value2".to_string()));
}

// ===================================================================
// VariableProcessor edge case tests (R-VP-11 through R-VP-17)
// ===================================================================

// R-VP-13
#[test]
fn test_duplicate_variable_override() {
    let processor = VariableProcessor::new();
    processor.set_global_variable("dup".to_string(), "first".to_string());
    processor.set_global_variable("dup".to_string(), "second".to_string());
    assert_eq!(processor.get_global_variable("dup"), Some("second".to_string()));
    assert_eq!(processor.get_all_global_variables().len(), 1);
}

// R-VP-14
#[test]
fn test_parse_malformed_var_comment() {
    let processor = VariableProcessor::new();
    // Missing colon — should be ignored (kept in output)
    let content = "<!-- @var missing_colon -->\nSome text";
    let (variables, processed_content) = processor.parse_variables_from_markdown(content);
    assert_eq!(variables.len(), 0);
    // The malformed comment line is removed from output because it matches the prefix/suffix pattern
    // but no variable is extracted since there's no colon
    assert!(processed_content.contains("Some text"));
}

// R-VP-15
#[test]
fn test_parse_var_with_extra_whitespace() {
    let processor = VariableProcessor::new();
    // Extra spaces around the name and value inside the comment must be
    // tolerated: the parser splits on the first ':' and trims both sides.
    let content = "<!-- @var  name :  value  -->";
    let (variables, _) = processor.parse_variables_from_markdown(content);
    assert_eq!(variables.len(), 1);
    assert_eq!(variables[0].name, "name");
    assert_eq!(variables[0].value, "value");
}

// R-VP-16
#[test]
fn test_process_variables_empty_content() {
    let processor = VariableProcessor::new();
    let result = processor.process_variables("");
    assert_eq!(result, "");
}

// R-VP-16b: regression — `<!-- @var -->` must not panic.
// The prefix `<!-- @var ` and suffix ` -->` share the same space character in
// this input, so stripping the prefix first leaves `-->` (3 bytes) which is
// shorter than the ` -->` (4-byte) suffix. The previous implementation called
// `.strip_suffix(...).unwrap()` and crashed the Tauri main process, taking the
// app down on every keystroke that produced this exact comment.
#[test]
fn test_parse_empty_var_comment_does_not_panic() {
    let processor = VariableProcessor::new();
    let content = "<!-- @var -->\nSome text";
    let (variables, processed_content) = processor.parse_variables_from_markdown(content);
    assert_eq!(variables.len(), 0);
    assert!(processed_content.contains("Some text"));
}

// R-VP-16c: process_variables must not panic on the same input. This is the
// entry point invoked by the `process_markdown` Tauri command on every edit.
#[test]
fn test_process_variables_with_empty_var_comment_does_not_panic() {
    let processor = VariableProcessor::new();
    let result = processor.process_variables("<!-- @var -->");
    // Either result is acceptable as long as we don't panic; this just
    // documents the current behavior so changes are caught explicitly.
    let _ = result;
}

// R-VP-16d: incremental keystrokes leading up to `<!-- @var -->` must all be
// processable. This mirrors the live editor flow where MarpPreview invokes
// process_markdown on every edit.
#[test]
fn test_parse_var_comment_incremental_keystrokes() {
    let processor = VariableProcessor::new();
    let stages = [
        "<!---->",
        "<!-- -->",
        "<!--  -->",
        "<!-- @ -->",
        "<!-- @v -->",
        "<!-- @va -->",
        "<!-- @var -->",
        "<!-- @var  -->",
        "<!-- @var n -->",
        "<!-- @var n: -->",
        "<!-- @var n: v -->",
    ];
    for stage in stages {
        let (_variables, _processed) = processor.parse_variables_from_markdown(stage);
        let _ = processor.process_variables(stage);
    }
}

// R-VP-17
#[test]
fn test_yaml_invalid_format() {
    let processor = VariableProcessor::new();
    let result = processor.load_variables_from_yaml("not: valid: yaml: [[[");
    assert!(result.is_err());
}

// R-VP-18: `<!-- @include: ... -->` lines are silently dropped from the
// output. Include is not implemented yet; this pins the current behavior so
// an implementation (or a change to keep the line) is caught explicitly.
#[test]
fn test_include_comment_silently_removed() {
    let processor = VariableProcessor::new();
    let content = "before\n<!-- @include: other.md -->\nafter";
    let (variables, processed) = processor.parse_variables_from_markdown(content);
    assert_eq!(variables.len(), 0);
    assert_eq!(processed, "before\nafter");
}

// R-VP-19: substitution is single-pass. A value containing `{{other}}` must
// be inserted verbatim, not recursively expanded (guards against infinite
// expansion via self-referencing variables).
#[test]
fn test_no_recursive_expansion() {
    let processor = VariableProcessor::new();
    processor.set_global_variable("a".to_string(), "X{{b}}Y".to_string());
    processor.set_global_variable("b".to_string(), "bval".to_string());
    let result = processor.process_variables("{{a}}");
    assert_eq!(result, "X{{b}}Y");
}

// R-VP-20: whitespace inside the braces is trimmed, so `{{ name }}` resolves
// the variable `name`.
#[test]
fn test_placeholder_inner_whitespace_trimmed() {
    let processor = VariableProcessor::new();
    processor.set_global_variable("name".to_string(), "val".to_string());
    let result = processor.process_variables("Hello {{ name }}!");
    assert_eq!(result, "Hello val!");
}

// ===================================================================
// File I/O command tests (R-CMD-01 through R-CMD-35;
// R-CMD-22/23 retired as duplicates of R-FO-03/04)
// ===================================================================

// Helper to create a temp file with given extension and content
fn create_temp_file(dir: &TempDir, name: &str, content: &str) -> String {
    let path = dir.path().join(name);
    let mut file = std::fs::File::create(&path).unwrap();
    file.write_all(content.as_bytes()).unwrap();
    path.to_string_lossy().to_string()
}

// R-CMD-01
#[test]
fn test_read_file_md() {
    let dir = TempDir::new().unwrap();
    let path = create_temp_file(&dir, "test.md", "# Hello");
    let result = pollster::block_on(read_file(path));
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "# Hello");
}

// R-CMD-02
#[test]
fn test_read_file_txt() {
    let dir = TempDir::new().unwrap();
    let path = create_temp_file(&dir, "test.txt", "Hello text");
    let result = pollster::block_on(read_file(path));
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "Hello text");
}

// R-CMD-03
#[test]
fn test_read_file_unsupported_ext() {
    let dir = TempDir::new().unwrap();
    let path = create_temp_file(&dir, "test.pdf", "pdf content");
    let result = pollster::block_on(read_file(path));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Unsupported file type"));
}

// R-CMD-04
#[test]
fn test_read_file_too_large() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("large.md");
    // Create a file just over 10MB
    let mut file = std::fs::File::create(&path).unwrap();
    let chunk = vec![b'a'; 1024 * 1024]; // 1MB
    for _ in 0..11 {
        file.write_all(&chunk).unwrap();
    }
    drop(file);
    let result = pollster::block_on(read_file(path.to_string_lossy().to_string()));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("too large"));
}

// R-CMD-05
#[test]
fn test_read_file_not_found() {
    let result = pollster::block_on(read_file("/nonexistent/path/file.md".to_string()));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

// R-CMD-06
#[test]
fn test_read_file_empty() {
    let dir = TempDir::new().unwrap();
    let path = create_temp_file(&dir, "empty.md", "");
    let result = pollster::block_on(read_file(path));
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "");
}

// R-CMD-07
#[test]
fn test_read_file_no_extension() {
    let dir = TempDir::new().unwrap();
    let path = create_temp_file(&dir, "noext", "content without ext");
    let result = pollster::block_on(read_file(path));
    // No extension means the extension check is skipped — file is allowed
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "content without ext");
}

// R-CMD-08
#[test]
fn test_read_file_utf8_content() {
    let dir = TempDir::new().unwrap();
    let path = create_temp_file(&dir, "unicode.md", "# こんにちは世界 🌍\nMarkdown テスト");
    let result = pollster::block_on(read_file(path));
    assert!(result.is_ok());
    let content = result.unwrap();
    assert!(content.contains("こんにちは世界"));
    assert!(content.contains("🌍"));
}

// R-CMD-24: read_file must return a clean error (not panic) for files that
// are not valid UTF-8 — e.g. Shift-JIS encoded .txt files that Japanese
// users commonly open. fs::read_to_string fails on invalid UTF-8 and the
// command maps it to "Failed to read file".
#[test]
fn test_read_file_invalid_utf8() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("sjis.md");
    // "日本語" encoded as Shift-JIS; invalid as UTF-8.
    std::fs::write(&path, [0x93u8, 0xFA, 0x96, 0x7B, 0x8C, 0xEA]).unwrap();
    let result = pollster::block_on(read_file(path.to_string_lossy().to_string()));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Failed to read file"));
}

// R-CMD-09
#[test]
fn test_save_file_new() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("new_file.md").to_string_lossy().to_string();
    let result = pollster::block_on(save_file(path.clone(), "# New Content".to_string()));
    assert!(result.is_ok());
    assert_eq!(std::fs::read_to_string(&path).unwrap(), "# New Content");
}

// R-CMD-10
#[test]
fn test_save_file_overwrite() {
    let dir = TempDir::new().unwrap();
    let path = create_temp_file(&dir, "existing.md", "old content");
    let result = pollster::block_on(save_file(path.clone(), "new content".to_string()));
    assert!(result.is_ok());
    assert_eq!(std::fs::read_to_string(&path).unwrap(), "new content");
}

// R-CMD-11
#[test]
fn test_save_file_creates_parent_dirs() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("sub/dir/file.md").to_string_lossy().to_string();
    let result = pollster::block_on(save_file(path.clone(), "nested content".to_string()));
    assert!(result.is_ok());
    assert_eq!(std::fs::read_to_string(&path).unwrap(), "nested content");
}

// R-CMD-12
#[test]
fn test_save_file_unsupported_ext() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("test.html").to_string_lossy().to_string();
    let result = pollster::block_on(save_file(path, "html content".to_string()));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Unsupported file type"));
}

// R-CMD-13
#[test]
fn test_save_file_utf8_content() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("utf8.md").to_string_lossy().to_string();
    let content = "# 日本語テスト\n\nこれはUTF-8のファイルです 🎉";
    let result = pollster::block_on(save_file(path.clone(), content.to_string()));
    assert!(result.is_ok());
    assert_eq!(std::fs::read_to_string(&path).unwrap(), content);
}

// R-CMD-25: hidden dotfiles have no extension (Path::extension() is None for
// ".bashrc"), which previously bypassed the .md/.txt allowlist and let IPC
// calls write shell/config files. They must be rejected and nothing written.
#[test]
fn test_save_file_dotfile_rejected() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join(".bashrc");
    let result = pollster::block_on(save_file(
        path.to_string_lossy().to_string(),
        "alias evil=1".to_string(),
    ));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Unsupported file type"));
    assert!(!path.exists());
}

// R-CMD-26: plain (non-hidden) extension-less files stay writable. The folder
// tree's "all files" mode legitimately opens them via read_file (R-CMD-07),
// and Ctrl+S on such a tab goes through save_file.
#[test]
fn test_save_file_no_extension_plain_allowed() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("README").to_string_lossy().to_string();
    let result = pollster::block_on(save_file(path.clone(), "no extension".to_string()));
    assert!(result.is_ok());
    assert_eq!(std::fs::read_to_string(&path).unwrap(), "no extension");
}

// R-CMD-27: .txt is on the save allowlist (only .md was covered before).
#[test]
fn test_save_file_txt() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("notes.txt").to_string_lossy().to_string();
    let result = pollster::block_on(save_file(path.clone(), "plain text".to_string()));
    assert!(result.is_ok());
    assert_eq!(std::fs::read_to_string(&path).unwrap(), "plain text");
}

// R-CMD-14
#[test]
fn test_read_directory_basic() {
    let dir = TempDir::new().unwrap();
    create_temp_file(&dir, "file1.md", "");
    std::fs::create_dir(dir.path().join("subdir")).unwrap();
    let result = pollster::block_on(read_directory(dir.path().to_string_lossy().to_string(), true));
    assert!(result.is_ok());
    let entries = result.unwrap();
    assert!(entries.len() >= 2);
}

// R-CMD-15
#[test]
fn test_read_directory_dirs_first() {
    let dir = TempDir::new().unwrap();
    create_temp_file(&dir, "aaa.md", "");
    std::fs::create_dir(dir.path().join("zzz_dir")).unwrap();
    let entries = pollster::block_on(read_directory(dir.path().to_string_lossy().to_string(), true)).unwrap();
    // Directory should come first even though alphabetically it's after the file
    assert!(entries[0].is_directory);
    assert_eq!(entries[0].name, "zzz_dir");
}

// R-CMD-16
#[test]
fn test_read_directory_hidden_files_excluded() {
    let dir = TempDir::new().unwrap();
    create_temp_file(&dir, ".hidden", "");
    create_temp_file(&dir, "visible.md", "");
    let entries = pollster::block_on(read_directory(dir.path().to_string_lossy().to_string(), true)).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].name, "visible.md");
}

// R-CMD-17
#[test]
fn test_read_directory_filter_md_txt() {
    let dir = TempDir::new().unwrap();
    create_temp_file(&dir, "doc.md", "");
    create_temp_file(&dir, "note.txt", "");
    create_temp_file(&dir, "readme.markdown", "");
    create_temp_file(&dir, "image.png", "");
    create_temp_file(&dir, "script.js", "");
    let entries = pollster::block_on(read_directory(dir.path().to_string_lossy().to_string(), false)).unwrap();
    assert_eq!(entries.len(), 2); // .md, .txt only
    let names: Vec<&str> = entries.iter().map(|e| e.name.as_str()).collect();
    assert!(names.contains(&"doc.md"));
    assert!(names.contains(&"note.txt"));
    assert!(!names.contains(&"readme.markdown"));
}

// R-CMD-18
#[test]
fn test_read_directory_show_all_files() {
    let dir = TempDir::new().unwrap();
    create_temp_file(&dir, "doc.md", "");
    create_temp_file(&dir, "image.png", "");
    create_temp_file(&dir, "script.js", "");
    let entries = pollster::block_on(read_directory(dir.path().to_string_lossy().to_string(), true)).unwrap();
    assert_eq!(entries.len(), 3); // All files shown
}

// R-CMD-19
#[test]
fn test_read_directory_empty() {
    let dir = TempDir::new().unwrap();
    let entries = pollster::block_on(read_directory(dir.path().to_string_lossy().to_string(), true)).unwrap();
    assert!(entries.is_empty());
}

// R-CMD-20
#[test]
fn test_read_directory_not_a_directory() {
    let dir = TempDir::new().unwrap();
    let path = create_temp_file(&dir, "file.md", "");
    let result = pollster::block_on(read_directory(path, true));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not a directory"));
}

// R-CMD-21
#[test]
fn test_get_file_hash_normal() {
    let dir = TempDir::new().unwrap();
    let path = create_temp_file(&dir, "hash_test.md", "hello world");
    let result = pollster::block_on(get_file_hash(path));
    assert!(result.is_ok());
    let info = result.unwrap();
    assert!(!info.hash.is_empty());
    assert!(info.modified_time > 0);
    assert_eq!(info.file_size, 11); // "hello world" = 11 bytes
}

// R-CMD-28: rename_file moves the file and preserves its content.
#[test]
fn test_rename_file_success() {
    let dir = TempDir::new().unwrap();
    let old_path = create_temp_file(&dir, "old.md", "rename me");
    let new_path = dir.path().join("new.md").to_string_lossy().to_string();
    let result = pollster::block_on(rename_file(old_path.clone(), new_path.clone()));
    assert!(result.is_ok());
    assert!(!std::path::Path::new(&old_path).exists());
    assert_eq!(std::fs::read_to_string(&new_path).unwrap(), "rename me");
}

// R-CMD-29: renaming a nonexistent source fails with a clear error.
#[test]
fn test_rename_file_source_missing() {
    let dir = TempDir::new().unwrap();
    let old_path = dir.path().join("missing.md").to_string_lossy().to_string();
    let new_path = dir.path().join("new.md").to_string_lossy().to_string();
    let result = pollster::block_on(rename_file(old_path, new_path));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Source file not found"));
}

// R-CMD-30: renaming onto an existing file is refused (no silent overwrite)
// and both files are left untouched.
#[test]
fn test_rename_file_destination_exists() {
    let dir = TempDir::new().unwrap();
    let old_path = create_temp_file(&dir, "src.md", "source");
    let new_path = create_temp_file(&dir, "dst.md", "destination");
    let result = pollster::block_on(rename_file(old_path.clone(), new_path.clone()));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("already exists"));
    assert_eq!(std::fs::read_to_string(&old_path).unwrap(), "source");
    assert_eq!(std::fs::read_to_string(&new_path).unwrap(), "destination");
}

// R-CMD-31: copy_image_asset copies the source into dest_dir/subdir keeping
// the file name, and returns a forward-slashed path relative to dest_dir.
#[test]
fn test_copy_image_asset_success() {
    let src_dir = TempDir::new().unwrap();
    let dest_dir = TempDir::new().unwrap();
    let src_path = src_dir.path().join("photo.png");
    std::fs::write(&src_path, b"png-bytes").unwrap();

    let result = pollster::block_on(copy_image_asset(
        src_path.to_string_lossy().to_string(),
        dest_dir.path().to_string_lossy().to_string(),
        "assets".to_string(),
    ));
    assert_eq!(result.unwrap(), "assets/photo.png");
    assert_eq!(
        std::fs::read(dest_dir.path().join("assets").join("photo.png")).unwrap(),
        b"png-bytes"
    );
}

// R-CMD-32: a missing source image yields the "Failed to read image" error.
#[test]
fn test_copy_image_asset_source_missing() {
    let dest_dir = TempDir::new().unwrap();
    let result = pollster::block_on(copy_image_asset(
        "/nonexistent/image.png".to_string(),
        dest_dir.path().to_string_lossy().to_string(),
        "assets".to_string(),
    ));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Failed to read image"));
}

// R-CMD-33: an existing file with the same name but different content gets a
// numeric suffix in the returned relative path (collision avoidance).
#[test]
fn test_copy_image_asset_name_collision() {
    let src_dir = TempDir::new().unwrap();
    let dest_dir = TempDir::new().unwrap();
    let src_path = src_dir.path().join("photo.png");
    std::fs::write(&src_path, b"new-content").unwrap();
    let assets = dest_dir.path().join("assets");
    std::fs::create_dir_all(&assets).unwrap();
    std::fs::write(assets.join("photo.png"), b"old-content").unwrap();

    let result = pollster::block_on(copy_image_asset(
        src_path.to_string_lossy().to_string(),
        dest_dir.path().to_string_lossy().to_string(),
        "assets".to_string(),
    ));
    assert_eq!(result.unwrap(), "assets/photo-1.png");
    assert_eq!(std::fs::read(assets.join("photo-1.png")).unwrap(), b"new-content");
    // The pre-existing file is untouched.
    assert_eq!(std::fs::read(assets.join("photo.png")).unwrap(), b"old-content");
}

// R-CMD-34: save_image_bytes writes the bytes and returns a forward-slashed
// path relative to dest_dir.
#[test]
fn test_save_image_bytes_success() {
    let dest_dir = TempDir::new().unwrap();
    let result = pollster::block_on(save_image_bytes(
        dest_dir.path().to_string_lossy().to_string(),
        "images".to_string(),
        "shot.png".to_string(),
        b"clipboard-bytes".to_vec(),
    ));
    assert_eq!(result.unwrap(), "images/shot.png");
    assert_eq!(
        std::fs::read(dest_dir.path().join("images").join("shot.png")).unwrap(),
        b"clipboard-bytes"
    );
}

// R-CMD-35: a backslashed subdir (Windows-style) is normalized to forward
// slashes in the returned Markdown-ready relative path.
#[test]
fn test_save_image_bytes_backslash_subdir_normalized() {
    let dest_dir = TempDir::new().unwrap();
    let result = pollster::block_on(save_image_bytes(
        dest_dir.path().to_string_lossy().to_string(),
        "images\\sub".to_string(),
        "shot.png".to_string(),
        b"bytes".to_vec(),
    ));
    let rel = result.unwrap();
    assert_eq!(rel, "images/sub/shot.png");
    assert!(!rel.contains('\\'));
    // The file is written under the directory the command itself constructed
    // (on Unix "images\sub" is a single literal component; on Windows two).
    let written = std::path::Path::new(&dest_dir.path().to_string_lossy().to_string())
        .join("images\\sub")
        .join("shot.png");
    assert_eq!(std::fs::read(written).unwrap(), b"bytes");
}

// ===================================================================
// file_operations.rs tests (R-FO-01 through R-FO-04)
// ===================================================================

// R-FO-01
#[test]
fn test_calculate_file_hash_sha256() {
    use sha2::{Digest, Sha256};
    let dir = TempDir::new().unwrap();
    let content = "test content for hashing";
    let path = create_temp_file(&dir, "hash.md", content);

    let mut expected_hasher = Sha256::new();
    expected_hasher.update(content.as_bytes());
    let expected_hash = format!("{:x}", expected_hasher.finalize());

    let result = calculate_file_hash(&path).unwrap();
    assert_eq!(result.hash, expected_hash);
}

// R-FO-02
#[test]
fn test_calculate_file_hash_metadata() {
    let dir = TempDir::new().unwrap();
    let content = "metadata test content";
    let path = create_temp_file(&dir, "meta.md", content);

    let result = calculate_file_hash(&path).unwrap();
    assert!(result.modified_time > 0);
    assert_eq!(result.file_size, content.len() as u64);
}

// R-FO-03
#[test]
fn test_calculate_file_hash_large_file() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("large.md");
    let mut file = std::fs::File::create(&path).unwrap();
    let chunk = vec![b'a'; 1024 * 1024];
    for _ in 0..11 {
        file.write_all(&chunk).unwrap();
    }
    drop(file);

    let result = calculate_file_hash(&path.to_string_lossy()).unwrap();
    assert_eq!(result.hash, "large_file");
    assert!(result.file_size > 10 * 1024 * 1024);
}

// R-FO-04
#[test]
fn test_calculate_file_hash_not_found() {
    let result = calculate_file_hash("/nonexistent/path/file.md");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

// ===================================================================
// file_association.rs tests (R-FA-01 through R-FA-04)
// ===================================================================

// R-FA-01 & R-FA-02
// Note: file_association uses OnceLock globals, so these tests observe
// the state after all tests that may have called set_frontend_ready().
// R-FA-01 & R-FA-02
// Uses global OnceLock state; run with --test-threads=1 for deterministic results.
#[test]
fn test_frontend_ready_functions() {
    use crate::types::FRONTEND_READY;

    // Reset to known state so we can verify the initial false path
    let ready = FRONTEND_READY.get_or_init(|| Mutex::new(false));
    if let Ok(mut is_ready) = ready.lock() {
        *is_ready = false;
    }

    // R-FA-01: Before set_frontend_ready, should return false
    assert!(!is_frontend_ready());

    // R-FA-02: After set_frontend_ready, should return true
    set_frontend_ready();
    assert!(is_frontend_ready());
}

// R-FA-03 & R-FA-04
// Uses global OnceLock state; run with --test-threads=1 for deterministic results.
#[test]
fn test_get_pending_file_paths_clears() {
    use crate::types::PENDING_FILE_PATHS;

    // Reset buffer to known empty state
    let pending = PENDING_FILE_PATHS.get_or_init(|| Mutex::new(Vec::new()));
    if let Ok(mut paths) = pending.lock() {
        paths.clear();
    }

    // R-FA-03: Empty buffer returns empty vec
    let paths = get_pending_file_paths();
    assert!(paths.is_empty());

    // Push test data into the buffer
    if let Ok(mut paths) = pending.lock() {
        paths.push("/test/file1.md".to_string());
        paths.push("/test/file2.md".to_string());
    }

    // R-FA-04: Retrieval returns buffered paths and clears buffer
    let paths = get_pending_file_paths();
    assert_eq!(paths.len(), 2);
    assert_eq!(paths[0], "/test/file1.md");
    assert_eq!(paths[1], "/test/file2.md");

    let paths_after = get_pending_file_paths();
    assert!(paths_after.is_empty());
}

#[test]
fn test_write_image_dedup_new_dedup_and_collision() {
    use std::fs;
    use std::path::PathBuf;

    let mut dir: PathBuf = std::env::temp_dir();
    dir.push(format!("bokuchi_img_dedup_{}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();

    // Fresh write keeps the requested name.
    let n1 = crate::commands::write_image_dedup(&dir, "a.png", b"hello").unwrap();
    assert_eq!(n1, "a.png");
    assert_eq!(fs::read(dir.join("a.png")).unwrap(), b"hello");

    // Identical content reuses the existing file (dedup, same name).
    let n2 = crate::commands::write_image_dedup(&dir, "a.png", b"hello").unwrap();
    assert_eq!(n2, "a.png");

    // Same name, different content gets a numeric suffix.
    let n3 = crate::commands::write_image_dedup(&dir, "a.png", b"world").unwrap();
    assert_eq!(n3, "a-1.png");
    assert_eq!(fs::read(dir.join("a-1.png")).unwrap(), b"world");

    // A name without an extension still works.
    let n4 = crate::commands::write_image_dedup(&dir, "noext", b"x").unwrap();
    assert_eq!(n4, "noext");

    // Path traversal in the name is reduced to its file component.
    let n5 = crate::commands::write_image_dedup(&dir, "../evil.png", b"z").unwrap();
    assert_eq!(n5, "evil.png");
    assert!(dir.join("evil.png").exists());
    assert!(!dir.parent().unwrap().join("evil.png").exists());

    let _ = fs::remove_dir_all(&dir);
}
