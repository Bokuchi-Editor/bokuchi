import React from 'react';
import {
  Box,
  Dialog,
  IconButton,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Alert,
  RadioGroup,
  Radio,
  FormControl,
} from '@mui/material';

import { Close, Brightness4, Brightness7, Settings as SettingsIcon, Code, Palette, Language, ViewColumn } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { Slide } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  onDarkModeChange: (darkMode: boolean) => void;
  globalVariables: Record<string, string>;
  onGlobalVariablesChange: (variables: Record<string, string>) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  tabLayout: 'horizontal' | 'vertical';
  onTabLayoutChange: (layout: 'horizontal' | 'vertical') => void;
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
  darkMode,
  onDarkModeChange,
  globalVariables,
  onGlobalVariablesChange,
  language,
  onLanguageChange,
  tabLayout,
  onTabLayoutChange,
}) => {
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
    if (globalVariables[newVariableKey]) {
      setError(t('settings.globalVariables.errors.alreadyExists'));
      return;
    }

    const updatedVariables = {
      ...globalVariables,
      [newVariableKey]: newVariableValue,
    };
    onGlobalVariablesChange(updatedVariables);
    setNewVariableKey('');
    setNewVariableValue('');
    setError('');
  };

  const handleRemoveVariable = (key: string) => {
    const updatedVariables = { ...globalVariables };
    delete updatedVariables[key];
    onGlobalVariablesChange(updatedVariables);
  };

  const handleUpdateVariable = (key: string, value: string) => {
    const updatedVariables = {
      ...globalVariables,
      [key]: value,
    };
    onGlobalVariablesChange(updatedVariables);
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
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {/* Appearance Settings */}
            <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
              <Card>
                <CardHeader
                  title={t('settings.appearance.title')}
                  avatar={<Palette color="primary" />}
                />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={darkMode}
                        onChange={(e) => onDarkModeChange(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {darkMode ? <Brightness7 /> : <Brightness4 />}
                        <Typography>{t('settings.appearance.darkMode')}</Typography>
                      </Box>
                    }
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t('settings.appearance.darkModeDescription')}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Language Settings */}
            <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
              <Card>
                <CardHeader
                  title={t('settings.language.title')}
                  avatar={<Language color="primary" />}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('settings.language.description')}
                  </Typography>
                  <FormControl component="fieldset">
                    <RadioGroup
                      value={language}
                      onChange={(e) => onLanguageChange(e.target.value)}
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
            </Box>

            {/* Tab Layout Settings */}
            <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
              <Card>
                <CardHeader
                  title={t('settings.tabLayout.title')}
                  avatar={<ViewColumn color="primary" />}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('settings.tabLayout.description')}
                  </Typography>
                  <FormControl component="fieldset">
                    <RadioGroup
                      value={tabLayout}
                      onChange={(e) => onTabLayoutChange(e.target.value as 'horizontal' | 'vertical')}
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
            </Box>

            {/* Global Variables */}
            <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
              <Card>
                <CardHeader
                  title={t('settings.globalVariables.title')}
                  avatar={<Code color="primary" />}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('settings.globalVariables.description')}
                  </Typography>

                  {/* Add new variable */}
                  <Box sx={{ mb: 3 }}>
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
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Existing variables */}
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {t('settings.globalVariables.existingVariables')}
                  </Typography>
                  {Object.keys(globalVariables).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t('settings.globalVariables.noVariables')}
                    </Typography>
                  ) : (
                    <List>
                      {Object.entries(globalVariables).map(([key, value]) => (
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
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default Settings;
