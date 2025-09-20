//! # Variable Processor Module
//!
//! This module handles variable processing and substitution in Markdown content.
//!
//! ## Features
//! - **Variable Definition**: Parse variables from Markdown comments (`<!-- @var name: value -->`)
//! - **Variable Substitution**: Replace `{{variable}}` placeholders with actual values
//! - **Global Variable Management**: Store and retrieve global variables across the application
//! - **YAML Import/Export**: Load variables from YAML files and export current variables
//!
//! ## Usage
//! The `VARIABLE_PROCESSOR` is a global singleton instance that can be used throughout the application
//! to process Markdown content with variable substitution.
//!
//! ## Variable Priority
//! 1. File-level variables (defined in `<!-- @var -->` comments)
//! 2. Global variables (set via `set_global_variable`)

use anyhow::Result;
use regex::Regex;
use serde_yaml;
use std::collections::HashMap;
use std::sync::Mutex;
use lazy_static::lazy_static;

use crate::types::{Variable, VariableSet};

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
lazy_static! {
    pub static ref VARIABLE_PROCESSOR: VariableProcessor = VariableProcessor::new();
}