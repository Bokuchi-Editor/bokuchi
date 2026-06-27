import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slide,
  Snackbar,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  Close,
  Code,
  Computer,
  Edit,
  Palette,
  Settings as SettingsIcon,
  Tune,
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { useTranslation } from 'react-i18next';
import { AppSettings } from '../types/settings';
import {
  SettingsFocusTarget,
  SETTINGS_FOCUS_TAB_INDEX,
  SETTINGS_FOCUS_ELEMENT_ID,
} from '../types/settingsFocus';
import AppearanceTab from './settings/AppearanceTab';
import EditorTab from './settings/EditorTab';
import InterfaceTab from './settings/InterfaceTab';
import VariablesTab from './settings/VariablesTab';
import AdvancedTab from './settings/AdvancedTab';
import { useSettingsActions, SNACKBAR_AUTO_HIDE_DURATION_MS } from './settings/useSettingsActions';

/** How long a deep-linked setting stays highlighted after the dialog opens (ms). */
const FOCUS_HIGHLIGHT_DURATION_MS = 2400;

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  as400Unlocked?: boolean;
  focusTarget?: SettingsFocusTarget | null;
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
  as400Unlocked,
  focusTarget,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState(0);
  const [highlightedTarget, setHighlightedTarget] = React.useState<SettingsFocusTarget | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);

  const {
    snackbar,
    closeSnackbar,
    notify,
    handleSettingChange,
    handleExportSettings,
    handleImportSettings,
    handleResetSettings,
  } = useSettingsActions(settings, onSettingsChange);

  // Jump to the requested setting when the dialog opens with a focus target.
  // Switch to the right tab synchronously, then scroll-into-view on the next tick
  // (the section needs to actually mount before we can find it).
  React.useEffect(() => {
    if (!open || !focusTarget) return;
    setActiveTab(SETTINGS_FOCUS_TAB_INDEX[focusTarget]);

    const elementId = SETTINGS_FOCUS_ELEMENT_ID[focusTarget];

    // Wait for tab content to render, then scroll + highlight
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedTarget(focusTarget);
        }
      });
    });

    const clearId = window.setTimeout(() => setHighlightedTarget(null), FOCUS_HIGHLIGHT_DURATION_MS);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(clearId);
    };
  }, [open, focusTarget]);

  const handleConfirmReset = async () => {
    const succeeded = await handleResetSettings();
    if (succeeded) {
      setResetDialogOpen(false);
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
              <Tab icon={<Palette />} label={t('settings.appearance.title')} iconPosition="start" />
              <Tab icon={<Edit />} label={t('settings.editor.title')} iconPosition="start" />
              <Tab icon={<Computer />} label={t('settings.interface.title')} iconPosition="start" />
              <Tab icon={<Code />} label={t('settings.globalVariables.title')} iconPosition="start" />
              <Tab icon={<Tune />} label={t('settings.advanced.title')} iconPosition="start" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <AppearanceTab
                settings={settings}
                onSettingChange={handleSettingChange}
                as400Unlocked={as400Unlocked}
              />
            )}
            {activeTab === 1 && (
              <EditorTab settings={settings} onSettingChange={handleSettingChange} />
            )}
            {activeTab === 2 && (
              <InterfaceTab settings={settings} onSettingChange={handleSettingChange} onSettingsChange={onSettingsChange} />
            )}
            {activeTab === 3 && (
              <VariablesTab
                settings={settings}
                onSettingsChange={onSettingsChange}
                notify={notify}
              />
            )}
            {activeTab === 4 && (
              <AdvancedTab
                settings={settings}
                onSettingChange={handleSettingChange}
                highlightedTarget={highlightedTarget}
                onExportSettings={handleExportSettings}
                onImportSettings={handleImportSettings}
                onResetClick={() => setResetDialogOpen(true)}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('settings.advanced.resetSettings')}</DialogTitle>
        <DialogContent>
          <Typography>{t('settings.advanced.resetConfirm')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>{t('buttons.cancel')}</Button>
          <Button onClick={handleConfirmReset} color="error" variant="contained">
            {t('settings.advanced.resetSettings')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={SNACKBAR_AUTO_HIDE_DURATION_MS} onClose={closeSnackbar}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default Settings;
