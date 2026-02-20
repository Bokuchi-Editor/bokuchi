import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  Paper,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { Close, Help, Code, Book, Keyboard, School } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { formatKeyboardShortcut, getPlatform } from '../utils/platform';

interface HelpProps {
  open: boolean;
  onClose: () => void;
}

type HelpPage = 'getting-started' | 'variables' | 'keyboard-shortcuts' | 'tutorials';

const HelpDialog: React.FC<HelpProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState<HelpPage>('getting-started');
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Helper function to get platform-specific shortcut display
  const getShortcutDisplay = (key: string, withShift = false): string => {
    const platform = getPlatform();
    if (platform === 'mac') {
      return formatKeyboardShortcut(key, withShift);
    } else {
      return formatKeyboardShortcut(key, withShift);
    }
  };

  // Reset scroll position when switching tabs
  useEffect(() => {
    if (dialogContentRef.current) {
      dialogContentRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  const helpPages = [
    {
      id: 'getting-started' as HelpPage,
      title: t('help.gettingStarted.title'),
      icon: <Book />,
    },
    {
      id: 'variables' as HelpPage,
      title: t('help.variables.title'),
      icon: <Code />,
    },
    {
      id: 'keyboard-shortcuts' as HelpPage,
      title: t('help.keyboardShortcuts.title'),
      icon: <Keyboard />,
    },
    {
      id: 'tutorials' as HelpPage,
      title: t('help.tutorials.title'),
      icon: <School />,
    },
  ];

  const renderGettingStarted = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t('help.gettingStarted.title')}
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.gettingStarted.basicUsage')}
      </Typography>
      <Typography paragraph>
        {t('help.gettingStarted.basicUsageDescription')}
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.gettingStarted.fileOperations')}
      </Typography>
      <List>
        <ListItem>
          <ListItemText
            primary={t('help.gettingStarted.newFile')}
            secondary={t('help.gettingStarted.newFileDescription')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t('help.gettingStarted.openFile')}
            secondary={t('help.gettingStarted.openFileDescription')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t('help.gettingStarted.saveFile')}
            secondary={t('help.gettingStarted.saveFileDescription')}
          />
        </ListItem>
      </List>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.gettingStarted.viewModes')}
      </Typography>
      <List>
        <ListItem>
          <ListItemText
            primary={t('help.gettingStarted.splitView')}
            secondary={t('help.gettingStarted.splitViewDescription')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t('help.gettingStarted.editorOnly')}
            secondary={t('help.gettingStarted.editorOnlyDescription')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t('help.gettingStarted.previewOnly')}
            secondary={t('help.gettingStarted.previewOnlyDescription')}
          />
        </ListItem>
      </List>
    </Box>
  );

  const renderVariables = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t('help.variables.title')}
      </Typography>

      <Typography paragraph>
        {t('help.variables.description')}
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.variables.howToUse')}
      </Typography>
      <Typography paragraph>
        {t('help.variables.howToUseDescription')}
      </Typography>

      <Paper sx={{
        p: 2,
        my: 2,
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
        border: (theme) => `1px solid ${theme.palette.divider}`
      }}>
        <Typography
          variant="body2"
          component="pre"
          sx={{
            fontFamily: 'monospace',
            color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'grey.900'
          }}
        >
          {t('help.variables.codeExample')}
        </Typography>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.variables.settingUp')}
      </Typography>
      <Typography paragraph>
        {t('help.variables.settingUpDescription')}
      </Typography>

      <List>
        <ListItem>
          <ListItemText
            primary={t('help.variables.step1')}
            secondary={t('help.variables.step1Description')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t('help.variables.step2')}
            secondary={t('help.variables.step2Description')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t('help.variables.step3')}
            secondary={t('help.variables.step3Description')}
          />
        </ListItem>
      </List>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.variables.examples')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('help.variables.example1.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('help.variables.example1.description')}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label="title"
                  size="small"
                  sx={{
                    mr: 1,
                    mb: 1,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                    color: (theme) => theme.palette.mode === 'dark' ? 'primary.contrastText' : 'primary.contrastText'
                  }}
                />
                <Chip
                  label="date"
                  size="small"
                  sx={{
                    mr: 1,
                    mb: 1,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                    color: (theme) => theme.palette.mode === 'dark' ? 'primary.contrastText' : 'primary.contrastText'
                  }}
                />
                <Chip
                  label="author"
                  size="small"
                  sx={{
                    mr: 1,
                    mb: 1,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                    color: (theme) => theme.palette.mode === 'dark' ? 'primary.contrastText' : 'primary.contrastText'
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('help.variables.example2.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('help.variables.example2.description')}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label="company"
                  size="small"
                  sx={{
                    mr: 1,
                    mb: 1,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                    color: (theme) => theme.palette.mode === 'dark' ? 'primary.contrastText' : 'primary.contrastText'
                  }}
                />
                <Chip
                  label="department"
                  size="small"
                  sx={{
                    mr: 1,
                    mb: 1,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                    color: (theme) => theme.palette.mode === 'dark' ? 'primary.contrastText' : 'primary.contrastText'
                  }}
                />
                <Chip
                  label="version"
                  size="small"
                  sx={{
                    mr: 1,
                    mb: 1,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                    color: (theme) => theme.palette.mode === 'dark' ? 'primary.contrastText' : 'primary.contrastText'
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.variables.localVariables')}
      </Typography>
      <Typography paragraph>
        {t('help.variables.localVariablesDescription')}
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.variables.localVariablesSyntax')}
      </Typography>
      <Typography paragraph>
        {t('help.variables.localVariablesSyntaxDescription')}
      </Typography>

      <Paper sx={{
        p: 2,
        my: 2,
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
        border: (theme) => `1px solid ${theme.palette.divider}`
      }}>
        <Typography
          variant="body2"
          component="pre"
          sx={{
            fontFamily: 'monospace',
            color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'grey.900'
          }}
        >
          {t('help.variables.localVariablesCodeExample')}
        </Typography>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.variables.priorityOrder')}
      </Typography>
      <Typography paragraph>
        {t('help.variables.priorityOrderDescription')}
      </Typography>
      <List>
        <ListItem>
          <ListItemText primary={t('help.variables.priority1')} />
        </ListItem>
        <ListItem>
          <ListItemText primary={t('help.variables.priority2')} />
        </ListItem>
        <ListItem>
          <ListItemText primary={t('help.variables.priority3')} />
        </ListItem>
      </List>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.variables.localVsGlobal')}
      </Typography>
      <Typography paragraph>
        {t('help.variables.localVsGlobalDescription')}
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.variables.tips')}
      </Typography>
      <List>
        <ListItem>
          <ListItemText
            primary={t('help.variables.tip1')}
            secondary={t('help.variables.tip1Description')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t('help.variables.tip2')}
            secondary={t('help.variables.tip2Description')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t('help.variables.tip3')}
            secondary={t('help.variables.tip3Description')}
          />
        </ListItem>
      </List>
    </Box>
  );

  const renderKeyboardShortcuts = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t('help.keyboardShortcuts.title')}
      </Typography>
      <Typography paragraph>
        {t('help.keyboardShortcuts.description')}
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.keyboardShortcuts.categories.fileOperations')}
      </Typography>
      <List>
        <ListItem>
          <ListItemText
            primary={getShortcutDisplay('N')}
            secondary={t('help.keyboardShortcuts.shortcuts.newFile')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={getShortcutDisplay('O')}
            secondary={t('help.keyboardShortcuts.shortcuts.openFile')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={getShortcutDisplay('S')}
            secondary={t('help.keyboardShortcuts.shortcuts.saveFile')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={getShortcutDisplay('S', true)}
            secondary={t('help.keyboardShortcuts.shortcuts.saveAs')}
          />
        </ListItem>
      </List>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.keyboardShortcuts.categories.navigation')}
      </Typography>
      <List>
        <ListItem>
          <ListItemText
            primary={getShortcutDisplay('R')}
            secondary={t('help.keyboardShortcuts.shortcuts.recentFiles')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Ctrl+Tab"
            secondary={t('help.keyboardShortcuts.shortcuts.nextTab')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Ctrl+Shift+Tab"
            secondary={t('help.keyboardShortcuts.shortcuts.previousTab')}
          />
        </ListItem>
      </List>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.keyboardShortcuts.categories.view')}
      </Typography>
      <List>
        <ListItem>
          <ListItemText
            primary="Ctrl+Shift+V"
            secondary={t('help.keyboardShortcuts.shortcuts.rotateViewMode')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Ctrl+Shift+1"
            secondary={t('help.keyboardShortcuts.shortcuts.splitView')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Ctrl+Shift+2"
            secondary={t('help.keyboardShortcuts.shortcuts.editorOnly')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Ctrl+Shift+3"
            secondary={t('help.keyboardShortcuts.shortcuts.previewOnly')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={getShortcutDisplay('+')}
            secondary={t('help.keyboardShortcuts.shortcuts.zoomIn')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={getShortcutDisplay('-')}
            secondary={t('help.keyboardShortcuts.shortcuts.zoomOut')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={getShortcutDisplay('0')}
            secondary={t('help.keyboardShortcuts.shortcuts.resetZoom')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={getShortcutDisplay(',')}
            secondary={t('help.keyboardShortcuts.shortcuts.settings')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="F1"
            secondary={t('help.keyboardShortcuts.shortcuts.help')}
          />
        </ListItem>
      </List>
    </Box>
  );

  const renderTutorials = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t('help.tutorials.title')}
      </Typography>
      <Typography paragraph>
        {t('help.tutorials.description')}
      </Typography>

      {/* Step 1 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            {t('help.tutorials.step1.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('help.tutorials.step1.description')}
          </Typography>
          <List dense>
            {(t('help.tutorials.step1.instructions', { returnObjects: true }) as string[]).map((instruction: string, index: number) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={`${index + 1}. ${instruction}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            {t('help.tutorials.step2.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('help.tutorials.step2.description')}
          </Typography>
          <List dense>
            {(t('help.tutorials.step2.instructions', { returnObjects: true }) as string[]).map((instruction: string, index: number) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={`${index + 1}. ${instruction}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Step 3 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            {t('help.tutorials.step3.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('help.tutorials.step3.description')}
          </Typography>
          <List dense>
            {(t('help.tutorials.step3.instructions', { returnObjects: true }) as string[]).map((instruction: string, index: number) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={`${index + 1}. ${instruction}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Step 4 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            {t('help.tutorials.step4.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('help.tutorials.step4.description')}
          </Typography>
          <List dense>
            {(t('help.tutorials.step4.instructions', { returnObjects: true }) as string[]).map((instruction: string, index: number) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={`${index + 1}. ${instruction}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Pro Tips */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom color="secondary">
            {t('help.tutorials.tips.title')}
          </Typography>
          <List dense>
            <ListItem sx={{ py: 0.5 }}>
              <ListItemText
                primary={`💡 ${t('help.tutorials.tips.tip1')}`}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem sx={{ py: 0.5 }}>
              <ListItemText
                primary={`💡 ${t('help.tutorials.tips.tip2')}`}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem sx={{ py: 0.5 }}>
              <ListItemText
                primary={`💡 ${t('help.tutorials.tips.tip3')}`}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );

  const renderContent = () => {
    switch (currentPage) {
      case 'getting-started':
        return renderGettingStarted();
      case 'variables':
        return renderVariables();
      case 'keyboard-shortcuts':
        return renderKeyboardShortcuts();
      case 'tutorials':
        return renderTutorials();
      default:
        return renderGettingStarted();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center' }}>
        <Help sx={{ mr: 1 }} />
        {t('help.title')}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex' }}>
        <Box sx={{ width: 250, borderRight: 1, borderColor: 'divider' }}>
          <List>
            {helpPages.map((page, index) => (
              <React.Fragment key={page.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    selected={currentPage === page.id}
                    onClick={() => setCurrentPage(page.id)}
                  >
                    <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                      {page.icon}
                    </Box>
                    <ListItemText primary={page.title} />
                  </ListItemButton>
                </ListItem>
                {index < helpPages.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
        <Box ref={dialogContentRef} sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          {renderContent()}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
