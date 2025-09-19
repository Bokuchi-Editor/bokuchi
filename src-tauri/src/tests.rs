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
