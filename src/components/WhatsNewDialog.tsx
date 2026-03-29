import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Close,
  NewReleases,
  AutoAwesome,
  BugReport,
  TrendingUp,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { whatsNewContent, WhatsNewChange } from '../whatsNew';

interface WhatsNewDialogProps {
  open: boolean;
  onClose: () => void;
}

const changeTypeIcon = (type: WhatsNewChange['type']) => {
  switch (type) {
    case 'feature':
      return <AutoAwesome color="primary" />;
    case 'fix':
      return <BugReport color="warning" />;
    case 'improvement':
      return <TrendingUp color="success" />;
  }
};

const changeTypeColor = (type: WhatsNewChange['type']): 'primary' | 'warning' | 'success' => {
  switch (type) {
    case 'feature':
      return 'primary';
    case 'fix':
      return 'warning';
    case 'improvement':
      return 'success';
  }
};

const WhatsNewDialog: React.FC<WhatsNewDialogProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NewReleases color="primary" />
          <Typography variant="h6" component="span">
            {t('whatsNew.title')}
          </Typography>
          <Chip
            label={`v${whatsNewContent.version}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <List disablePadding>
          {whatsNewContent.changes.map((change, index) => (
            <ListItem
              key={index}
              alignItems="flex-start"
              sx={{ px: 0 }}
            >
              <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                {changeTypeIcon(change.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label={t(`whatsNew.type.${change.type}`)}
                      size="small"
                      color={changeTypeColor(change.type)}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                    <Typography variant="subtitle2">
                      {t(change.titleKey)}
                    </Typography>
                  </Box>
                }
                secondary={
                  change.descriptionKey ? (
                    <Typography variant="body2" color="text.secondary">
                      {t(change.descriptionKey)}
                    </Typography>
                  ) : undefined
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          {t('whatsNew.gotIt')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsNewDialog;
