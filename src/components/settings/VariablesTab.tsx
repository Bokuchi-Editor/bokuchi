import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  TextField,
  Typography,
} from '@mui/material';
import { Upload, Download } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '../../types/settings';
import { variableApi } from '../../api/variableApi';
import { desktopApi } from '../../api/desktopApi';
import type { SnackbarSeverity } from './useSettingsActions';

interface VariablesTabProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  notify: (message: string, severity: SnackbarSeverity) => void;
}

/** Global variables settings: add / edit / remove variables and YAML import/export. */
const VariablesTab: React.FC<VariablesTabProps> = ({ settings, onSettingsChange, notify }) => {
  const { t } = useTranslation();
  const [newVariableKey, setNewVariableKey] = React.useState('');
  const [newVariableValue, setNewVariableValue] = React.useState('');
  const [error, setError] = React.useState('');

  const handleAddVariable = () => {
    if (!newVariableKey.trim()) {
      setError(t('settings.globalVariables.errors.nameRequired'));
      return;
    }
    if (newVariableKey.includes(' ')) {
      setError(t('settings.globalVariables.errors.noSpaces'));
      return;
    }
    if (settings.globalVariables[newVariableKey]) {
      setError(t('settings.globalVariables.errors.alreadyExists'));
      return;
    }

    onSettingsChange({
      ...settings,
      globalVariables: {
        ...settings.globalVariables,
        [newVariableKey]: newVariableValue,
      },
    });
    setNewVariableKey('');
    setNewVariableValue('');
    setError('');
  };

  const handleRemoveVariable = (key: string) => {
    const updatedVariables = { ...settings.globalVariables };
    delete updatedVariables[key];
    onSettingsChange({
      ...settings,
      globalVariables: updatedVariables,
    });
  };

  const handleUpdateVariable = (key: string, value: string) => {
    onSettingsChange({
      ...settings,
      globalVariables: {
        ...settings.globalVariables,
        [key]: value,
      },
    });
  };

  const handleExportVariables = async () => {
    try {
      const yamlContent = await variableApi.exportVariablesToYAML();
      if (!yamlContent) {
        notify(t('settings.globalVariables.exportError'), 'error');
        return;
      }
      const result = await desktopApi.saveYamlFile(yamlContent, 'variables.yaml');
      if (result.success) {
        notify(t('settings.globalVariables.exportSuccess'), 'success');
      } else {
        if (result.error === 'Save cancelled by user') {
          // Don't show notification if user cancelled
          return;
        }
        notify(result.error || t('settings.globalVariables.exportError'), 'error');
      }
    } catch (err) {
      console.error('Failed to export variables:', err);
      notify(t('settings.globalVariables.exportError'), 'error');
    }
  };

  const handleImportVariables = async () => {
    try {
      const result = await desktopApi.openYamlFile();
      if (!result.content) {
        if (result.error === 'File selection cancelled by user') {
          // Don't show notification if user cancelled
          return;
        }
        notify(result.error || t('settings.globalVariables.importError'), 'error');
        return;
      }

      const importResult = await variableApi.loadVariablesFromYAML(result.content);
      if (importResult.success) {
        // Reload global variables
        const updatedVariables = await variableApi.getGlobalVariables();
        onSettingsChange({
          ...settings,
          globalVariables: updatedVariables,
        });
        notify(t('settings.globalVariables.importSuccess'), 'success');
      } else {
        notify(importResult.error || t('settings.globalVariables.importError'), 'error');
      }
    } catch (err) {
      console.error('Failed to import variables:', err);
      notify(t('settings.globalVariables.importError'), 'error');
    }
  };

  const variableEntries = Object.entries(settings.globalVariables);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {t('settings.globalVariables.title')}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('settings.globalVariables.description')}
          </Typography>

          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('settings.globalVariables.addNewVariable')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              sx={{ flex: '1 1 200px', minWidth: 0 }}
              label={t('settings.globalVariables.variableName')}
              value={newVariableKey}
              onChange={(e) => setNewVariableKey(e.target.value)}
              placeholder={t('settings.globalVariables.variableNamePlaceholder')}
              size="small"
            />
            <TextField
              sx={{ flex: '1 1 200px', minWidth: 0 }}
              label={t('settings.globalVariables.value')}
              value={newVariableValue}
              onChange={(e) => setNewVariableValue(e.target.value)}
              placeholder={t('settings.globalVariables.valuePlaceholder')}
              size="small"
            />
            <Button variant="contained" onClick={handleAddVariable} sx={{ height: 40, minWidth: 80 }}>
              {t('buttons.add')}
            </Button>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('settings.globalVariables.existingVariables')}</Typography>
            <Box>
              <Button startIcon={<Upload />} onClick={handleImportVariables} sx={{ mr: 1 }} size="small">
                {t('buttons.import')}
              </Button>
              <Button startIcon={<Download />} onClick={handleExportVariables} size="small">
                {t('buttons.export')}
              </Button>
            </Box>
          </Box>
          {variableEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('settings.globalVariables.noVariables')}
            </Typography>
          ) : (
            <List>
              {variableEntries.map(([key, value]) => (
                <ListItem key={key} sx={{ px: 0, flexDirection: 'column', alignItems: 'stretch' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip label={key} size="small" color="primary" />
                    <Typography variant="body2">
                      {t('settings.globalVariables.usageExample').replace('{{variableName}}', `{{${key}}}`)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                      fullWidth
                      value={value}
                      onChange={(e) => handleUpdateVariable(key, e.target.value)}
                      size="small"
                    />
                    <Button
                      color="error"
                      size="small"
                      onClick={() => handleRemoveVariable(key)}
                      sx={{ minWidth: 80, px: 2, flexShrink: 0 }}
                    >
                      {t('buttons.delete')}
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default VariablesTab;
