import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import { Delete, Add, Download, Upload } from '@mui/icons-material';
import { variableApi } from '../api/variableApi';
import { desktopApi } from '../api/desktopApi';

interface VariableSettingsProps {
  open: boolean;
  onClose: () => void;
}

const VariableSettings: React.FC<VariableSettingsProps> = ({ open, onClose }) => {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [newVariableName, setNewVariableName] = useState('');
  const [newVariableValue, setNewVariableValue] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    if (open) {
      loadVariables();
    }
  }, [open]);

  const loadVariables = async () => {
    const vars = await variableApi.getGlobalVariables();
    setVariables(vars);
  };

  const handleAddVariable = async () => {
    if (!newVariableName.trim()) {
      setSnackbar({ open: true, message: 'Variable name is required', severity: 'error' });
      return;
    }

    const result = await variableApi.setGlobalVariable(newVariableName.trim(), newVariableValue);
    if (result.success) {
      setNewVariableName('');
      setNewVariableValue('');
      await loadVariables();
      setSnackbar({ open: true, message: 'Variable added successfully', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: result.error || 'Failed to add variable', severity: 'error' });
    }
  };

  const handleDeleteVariable = async (name: string) => {
    const result = await variableApi.setGlobalVariable(name, '');
    if (result.success) {
      await loadVariables();
      setSnackbar({ open: true, message: 'Variable deleted successfully', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: result.error || 'Failed to delete variable', severity: 'error' });
    }
  };

  const handleExportVariables = async () => {
    try {
      const yamlContent = await variableApi.exportVariablesToYAML();
      if (yamlContent) {
        const result = await desktopApi.saveYamlFile(yamlContent, 'variables.yaml');
        if (result.success) {
          setSnackbar({ open: true, message: 'Variables exported successfully', severity: 'success' });
        } else {
          if (result.error === 'Save cancelled by user') {
            // Don't show notification if user cancelled
            return;
          }
          setSnackbar({ open: true, message: result.error || 'Failed to export variables', severity: 'error' });
        }
      } else {
        setSnackbar({ open: true, message: 'Failed to export variables', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to export variables:', error);
      setSnackbar({ open: true, message: 'Failed to export variables', severity: 'error' });
    }
  };

  const handleImportVariables = async () => {
    try {
      const result = await desktopApi.openYamlFile();
      if (result.content) {
        const importResult = await variableApi.loadVariablesFromYAML(result.content);
        if (importResult.success) {
          await loadVariables();
          setSnackbar({ open: true, message: 'Variables imported successfully', severity: 'success' });
        } else {
          setSnackbar({ open: true, message: importResult.error || 'Failed to import variables', severity: 'error' });
        }
      } else {
        if (result.error === 'File selection cancelled by user') {
          // Don't show notification if user cancelled
          return;
        }
        setSnackbar({ open: true, message: result.error || 'Failed to import variables', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to import variables:', error);
      setSnackbar({ open: true, message: 'Failed to import variables', severity: 'error' });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Global Variables
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            These variables will be available in all Markdown files
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Add New Variable
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <TextField
                label="Variable Name"
                value={newVariableName}
                onChange={(e) => setNewVariableName(e.target.value)}
                placeholder="e.g., title"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Value"
                value={newVariableValue}
                onChange={(e) => setNewVariableValue(e.target.value)}
                placeholder="e.g., My Document"
                sx={{ flex: 2 }}
              />
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddVariable}
                disabled={!newVariableName.trim()}
              >
                Add
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Current Variables
            </Typography>
            <Box>
              <Button
                startIcon={<Upload />}
                onClick={handleImportVariables}
                sx={{ mr: 1 }}
              >
                Import
              </Button>
              <Button
                startIcon={<Download />}
                onClick={handleExportVariables}
              >
                Export
              </Button>
            </Box>
          </Box>

          {Object.keys(variables).length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No variables defined. Add some variables above.
            </Typography>
          ) : (
            <List>
              {Object.entries(variables).map(([name, value]) => (
                <ListItem key={name} divider>
                  <ListItemText
                    primary={name}
                    secondary={value}
                    primaryTypographyProps={{ fontWeight: 'bold' }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteVariable(name)}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Usage Example:
            </Typography>
            <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
{`<!-- @var title: My Document -->
<!-- @var author: John Doe -->

# {{title}}
Author: {{author}}

This will be replaced with the actual values.`}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default VariableSettings;
