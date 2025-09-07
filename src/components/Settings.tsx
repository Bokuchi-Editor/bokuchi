import React from 'react';
import {
  Box,
  Dialog,
  IconButton,
  Typography,
  FormControlLabel,
  List,
  ListItem,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  RadioGroup,
  Radio,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Tabs,
  Tab,
  Slider,
  Switch,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';

import {
  Close,
  Settings as SettingsIcon,
  Code,
  Palette,
  Edit,
  Computer,
  Tune,
  Download,
  Upload,
  Refresh
} from '@mui/icons-material';
import { themes } from '../themes';
import { TransitionProps } from '@mui/material/transitions';
import { Slide } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AppSettings } from '../types/settings';
import { storeApi } from '../api/storeApi';
import { desktopApi } from '../api/desktopApi';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<HTMLElement>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const Settings: React.FC<SettingsProps> = ({
  open,
  onClose,
  settings,
  onSettingsChange,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState(0);
  const [newVariableKey, setNewVariableKey] = React.useState('');
  const [newVariableValue, setNewVariableValue] = React.useState('');
  const [error, setError] = React.useState('');
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

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

    const updatedVariables = {
      ...settings.globalVariables,
      [newVariableKey]: newVariableValue,
    };
    onSettingsChange({
      ...settings,
      globalVariables: updatedVariables,
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
    const updatedVariables = {
      ...settings.globalVariables,
      [key]: value,
    };
    onSettingsChange({
      ...settings,
      globalVariables: updatedVariables,
    });
  };

  const handleSettingChange = (category: keyof AppSettings, key: string, value: string | number | boolean) => {
    onSettingsChange({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    });
  };

  const handleExportSettings = async () => {
    try {
      const settingsJson = await storeApi.exportAppSettings();
      const result = await desktopApi.exportSettingsFile(settingsJson);

      if (result.success) {
        setSnackbar({
          open: true,
          message: t('settings.advanced.exportSuccess'),
          severity: 'success'
        });
      } else {
        if (result.error === 'Export cancelled by user') {
          // ユーザーがキャンセルした場合は通知しない
          return;
        }
        setSnackbar({
          open: true,
          message: result.error || t('settings.advanced.exportError'),
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Failed to export settings:', error);
      setSnackbar({
        open: true,
        message: t('settings.advanced.exportError'),
        severity: 'error'
      });
    }
  };

  const handleImportSettings = async () => {
    try {
      const result = await desktopApi.importSettingsFile();

      if (result.error) {
        if (result.error === 'No file selected') {
          // ユーザーがキャンセルした場合は通知しない
          return;
        }
        setSnackbar({
          open: true,
          message: result.error,
          severity: 'error'
        });
        return;
      }

      await storeApi.importAppSettings(result.content);

      // 設定を再読み込み
      const newSettings = await storeApi.loadAppSettings();
      onSettingsChange(newSettings);

      setSnackbar({
        open: true,
        message: t('settings.advanced.importSuccess'),
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to import settings:', error);
      setSnackbar({
        open: true,
        message: t('settings.advanced.importError'),
        severity: 'error'
      });
    }
  };

  const handleResetSettings = async () => {
    try {
      await storeApi.resetAppSettings();
      const defaultSettings = await storeApi.loadAppSettings();
      onSettingsChange(defaultSettings);
      setResetDialogOpen(false);

      setSnackbar({
        open: true,
        message: t('settings.advanced.resetSuccess'),
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      setSnackbar({
        open: true,
        message: t('settings.advanced.resetError'),
        severity: 'error'
      });
    }
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h5" component="h2">
              {t('settings.title')}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="large">
            <Close />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                icon={<Palette />}
                label={t('settings.appearance.title')}
                iconPosition="start"
              />
              <Tab
                icon={<Edit />}
                label={t('settings.editor.title')}
                iconPosition="start"
              />
              <Tab
                icon={<Computer />}
                label={t('settings.interface.title')}
                iconPosition="start"
              />
              <Tab
                icon={<Code />}
                label={t('settings.globalVariables.title')}
                iconPosition="start"
              />
              <Tab
                icon={<Tune />}
                label={t('settings.advanced.title')}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Appearance Tab */}
            {activeTab === 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  {t('settings.appearance.title')}
                </Typography>

                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('settings.appearance.themeDescription')}
                    </Typography>
                    <FormControl fullWidth>
                      <InputLabel id="theme-select-label">{t('settings.appearance.theme')}</InputLabel>
                      <Select
                        labelId="theme-select-label"
                        value={settings.appearance.theme}
                        label={t('settings.appearance.theme')}
                        onChange={(e) => handleSettingChange('appearance', 'theme', e.target.value)}
                      >
                        {themes.map((themeOption) => (
                          <MenuItem key={themeOption.name} value={themeOption.name}>
                            {themeOption.displayName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>

              </Box>
            )}

            {/* Editor Tab */}
            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  {t('settings.editor.title')}
                </Typography>

                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('settings.editor.fontSizeDescription')}
                    </Typography>
                    <Box sx={{ px: 2 }}>
                      <Typography gutterBottom>
                        {t('settings.editor.fontSize')}: {settings.editor.fontSize}px
                      </Typography>
                      <Slider
                        value={settings.editor.fontSize}
                        onChange={(_, value) => handleSettingChange('editor', 'fontSize', value)}
                        min={10}
                        max={24}
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.editor.showLineNumbers}
                          onChange={(e) => handleSettingChange('editor', 'showLineNumbers', e.target.checked)}
                        />
                      }
                      label={t('settings.editor.showLineNumbers')}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {t('settings.editor.showLineNumbersDescription')}
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('settings.editor.tabSizeDescription')}
                    </Typography>
                    <Box sx={{ px: 2 }}>
                      <Typography gutterBottom>
                        {t('settings.editor.tabSize')}: {settings.editor.tabSize}
                      </Typography>
                      <Slider
                        value={settings.editor.tabSize}
                        onChange={(_, value) => handleSettingChange('editor', 'tabSize', value)}
                        min={2}
                        max={8}
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.editor.wordWrap}
                          onChange={(e) => handleSettingChange('editor', 'wordWrap', e.target.checked)}
                        />
                      }
                      label={t('settings.editor.wordWrap')}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {t('settings.editor.wordWrapDescription')}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Interface Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  {t('settings.interface.title')}
                </Typography>

                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('settings.language.description')}
                    </Typography>
                    <FormControl component="fieldset">
                      <RadioGroup
                        value={settings.interface.language}
                        onChange={(e) => handleSettingChange('interface', 'language', e.target.value)}
                      >
                        <FormControlLabel
                          value="en"
                          control={<Radio />}
                          label={t('settings.language.english')}
                        />
                        <FormControlLabel
                          value="ja"
                          control={<Radio />}
                          label={t('settings.language.japanese')}
                        />
                      </RadioGroup>
                    </FormControl>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('settings.tabLayout.description')}
                    </Typography>
                    <FormControl component="fieldset">
                      <RadioGroup
                        value={settings.interface.tabLayout}
                        onChange={(e) => handleSettingChange('interface', 'tabLayout', e.target.value)}
                      >
                        <FormControlLabel
                          value="horizontal"
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1">
                                {t('settings.tabLayout.horizontal')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {t('settings.tabLayout.horizontalDescription')}
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="vertical"
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1">
                                {t('settings.tabLayout.vertical')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {t('settings.tabLayout.verticalDescription')}
                              </Typography>
                            </Box>
                          }
                        />
                      </RadioGroup>
                    </FormControl>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('settings.interface.zoomLevelDescription')}
                    </Typography>
                    <Box sx={{ px: 2 }}>
                      <Typography gutterBottom>
                        {t('settings.interface.zoomLevel')}: {Math.round(settings.interface.zoomLevel * 100)}%
                      </Typography>
                      <Slider
                        value={settings.interface.zoomLevel}
                        onChange={(_, value) => handleSettingChange('interface', 'zoomLevel', value)}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        marks
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Variables Tab */}
            {activeTab === 3 && (
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
                      <Button
                        variant="contained"
                        onClick={handleAddVariable}
                        sx={{ height: 40, minWidth: 80 }}
                      >
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
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {t('settings.globalVariables.existingVariables')}
                    </Typography>
                    {Object.keys(settings.globalVariables).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t('settings.globalVariables.noVariables')}
                      </Typography>
                    ) : (
                      <List>
                        {Object.entries(settings.globalVariables).map(([key, value]) => (
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
                                sx={{ minWidth: 'auto', px: 2 }}
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
            )}

            {/* Advanced Tab */}
            {activeTab === 4 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  {t('settings.advanced.title')}
                </Typography>

                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.advanced.autoSave}
                          onChange={(e) => handleSettingChange('advanced', 'autoSave', e.target.checked)}
                        />
                      }
                      label={t('settings.advanced.autoSave')}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {t('settings.advanced.autoSaveDescription')}
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.advanced.showWhitespace}
                          onChange={(e) => handleSettingChange('advanced', 'showWhitespace', e.target.checked)}
                        />
                      }
                      label={t('settings.advanced.showWhitespace')}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {t('settings.advanced.showWhitespaceDescription')}
                    </Typography>
                  </CardContent>
                </Card>


                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {t('settings.advanced.importExport')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleExportSettings}
                      >
                        {t('settings.advanced.exportSettings')}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Upload />}
                        onClick={handleImportSettings}
                      >
                        {t('settings.advanced.importSettings')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Refresh />}
                        onClick={() => setResetDialogOpen(true)}
                      >
                        {t('settings.advanced.resetSettings')}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('settings.advanced.resetSettings')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('settings.advanced.resetConfirm')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={handleResetSettings}
            color="error"
            variant="contained"
          >
            {t('settings.advanced.resetSettings')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default Settings;
