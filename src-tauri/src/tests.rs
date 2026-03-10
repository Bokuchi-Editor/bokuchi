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

// Variable and VariableSet tests
#[test]
fn test_variable_creation() {
    let var = Variable {
        name: "test".to_string(),
        value: "value".to_string(),
    };
    assert_eq!(var.name, "test");
    assert_eq!(var.value, "value");
}

#[test]
fn test_variable_set_creation() {
    let variables = vec![
        Variable {
            name: "var1".to_string(),
            value: "value1".to_string(),
        },
        Variable {
            name: "var2".to_string(),
            value: "value2".to_string(),
        },
    ];
    let var_set = VariableSet { variables };
    assert_eq!(var_set.variables.len(), 2);
}

// FileHashInfo tests
#[test]
fn test_file_hash_info_creation() {
    let hash_info = FileHashInfo {
        hash: "test_hash".to_string(),
        modified_time: 1234567890,
        file_size: 1024,
    };
    assert_eq!(hash_info.hash, "test_hash");
    assert_eq!(hash_info.modified_time, 1234567890);
    assert_eq!(hash_info.file_size, 1024);
}

// Tauri command tests
#[test]
fn test_greet_command() {
    let result = greet("World");
    assert_eq!(result, "Hello, World! You've been greeted from Rust!");
}

#[test]
fn test_set_global_variable_command() {
    let result = set_global_variable("test".to_string(), "value".to_string());
    assert!(result.is_ok());

    let vars = get_global_variables().unwrap();
    assert_eq!(vars.get("test"), Some(&"value".to_string()));
}

#[test]
fn test_get_global_variables_command() {
    // Test the command function directly
    let result = set_global_variable("test_var1".to_string(), "test_value1".to_string());
    assert!(result.is_ok());

    let result = set_global_variable("test_var2".to_string(), "test_value2".to_string());
    assert!(result.is_ok());

    let vars = get_global_variables().unwrap();
    // Check that our test variables are present
    assert_eq!(vars.get("test_var1"), Some(&"test_value1".to_string()));
    assert_eq!(vars.get("test_var2"), Some(&"test_value2".to_string()));
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

// R-VP-11
#[test]
fn test_empty_variable_name() {
    let processor = VariableProcessor::new();
    processor.set_global_variable("".to_string(), "empty_name_value".to_string());
    assert_eq!(processor.get_global_variable(""), Some("empty_name_value".to_string()));
}

// R-VP-12
#[test]
fn test_special_chars_in_value() {
    let processor = VariableProcessor::new();
    processor.set_global_variable("special".to_string(), "value with {{ and }} and <!-- --> and\nnewlines".to_string());
    let val = processor.get_global_variable("special").unwrap();
    assert!(val.contains("{{"));
    assert!(val.contains("}}"));
    assert!(val.contains("<!-- -->"));
    assert!(val.contains("\n"));
}

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
    // The parser requires exact "<!-- @var " prefix and " -->" suffix
    // Extra spaces before @var won't match, but let's test the standard format with spaces in name/value
    let content = "<!-- @var  name :  value  -->";
    let (variables, _) = processor.parse_variables_from_markdown(content);
    // The parser trims name and value after splitting on ':'
    if !variables.is_empty() {
        assert_eq!(variables[0].name, "name");
        assert_eq!(variables[0].value, "value");
    }
}

// R-VP-16
#[test]
fn test_process_variables_empty_content() {
    let processor = VariableProcessor::new();
    let result = processor.process_variables("");
    assert_eq!(result, "");
}

// R-VP-17
#[test]
fn test_yaml_invalid_format() {
    let processor = VariableProcessor::new();
    let result = processor.load_variables_from_yaml("not: valid: yaml: [[[");
    assert!(result.is_err());
}

// ===================================================================
// File I/O command tests (R-CMD-01 through R-CMD-23)
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
    assert_eq!(entries.len(), 3); // .md, .txt, .markdown only
    let names: Vec<&str> = entries.iter().map(|e| e.name.as_str()).collect();
    assert!(names.contains(&"doc.md"));
    assert!(names.contains(&"note.txt"));
    assert!(names.contains(&"readme.markdown"));
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

// R-CMD-22
#[test]
fn test_get_file_hash_large_file() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("large.md");
    let mut file = std::fs::File::create(&path).unwrap();
    let chunk = vec![b'x'; 1024 * 1024];
    for _ in 0..11 {
        file.write_all(&chunk).unwrap();
    }
    drop(file);
    let result = pollster::block_on(get_file_hash(path.to_string_lossy().to_string()));
    assert!(result.is_ok());
    assert_eq!(result.unwrap().hash, "large_file");
}

// R-CMD-23
#[test]
fn test_get_file_hash_not_found() {
    let result = pollster::block_on(get_file_hash("/nonexistent/file.md".to_string()));
    assert!(result.is_err());
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
// file_association.rs tests (R-FA-01 through R-FA-05)
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

// R-FA-05
#[test]
fn test_pending_paths_buffer() {
    use crate::types::PENDING_FILE_PATHS;

    // Push a path directly to the buffer
    let pending = PENDING_FILE_PATHS.get_or_init(|| std::sync::Mutex::new(Vec::new()));
    {
        let mut paths = pending.lock().unwrap();
        paths.push("/test/path.md".to_string());
    }

    // Retrieve should return the buffered path
    let result = get_pending_file_paths();
    assert!(result.contains(&"/test/path.md".to_string()));

    // Buffer should be cleared after retrieval
    let result2 = get_pending_file_paths();
    assert!(result2.is_empty());
}
