import React, { useState } from 'react';
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
import { Close, Help, Code, Book } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface HelpProps {
  open: boolean;
  onClose: () => void;
}

type HelpPage = 'getting-started' | 'variables';

const HelpDialog: React.FC<HelpProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState<HelpPage>('getting-started');

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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('help.gettingStarted.splitView')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('help.gettingStarted.splitViewDescription')}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('help.gettingStarted.editorOnly')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('help.gettingStarted.editorOnlyDescription')}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('help.gettingStarted.previewOnly')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('help.gettingStarted.previewOnlyDescription')}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        {t('help.gettingStarted.shortcuts')}
      </Typography>
      <List>
        <ListItem>
          <ListItemText
            primary={`⌘N - ${t('help.gettingStarted.shortcutNewFile')}`}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={`⌘O - ${t('help.gettingStarted.shortcutOpenFile')}`}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={`⌘S - ${t('help.gettingStarted.shortcutSave')}`}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={`⌘⇧S - ${t('help.gettingStarted.shortcutSaveAs')}`}
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

  const renderContent = () => {
    switch (currentPage) {
      case 'getting-started':
        return renderGettingStarted();
      case 'variables':
        return renderVariables();
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
        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          {renderContent()}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
