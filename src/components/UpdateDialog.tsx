import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import { SystemUpdateAlt, Schedule } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { UpdateInfo, DownloadProgress } from '../api/updaterApi';

export type UpdateDialogPhase = 'notify' | 'downloading' | 'installing';

interface UpdateDialogProps {
  open: boolean;
  phase: UpdateDialogPhase;
  updateInfo: UpdateInfo | null;
  downloadProgress: DownloadProgress | null;
  onUpdate: () => void;
  onDismiss: () => void;
}

const UpdateDialog: React.FC<UpdateDialogProps> = ({
  open,
  phase,
  updateInfo,
  downloadProgress,
  onUpdate,
  onDismiss,
}) => {
  const { t } = useTranslation();

  const progressPercent =
    downloadProgress?.contentLength && downloadProgress.contentLength > 0
      ? Math.round((downloadProgress.downloaded / downloadProgress.contentLength) * 100)
      : undefined;

  return (
    <Dialog
      open={open}
      onClose={phase === 'notify' ? onDismiss : undefined}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SystemUpdateAlt color="primary" />
        <Typography variant="h6" component="div">
          {t('dialogs.update.title')}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {phase === 'notify' && updateInfo && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('dialogs.update.newVersion', { version: updateInfo.version })}
            </Typography>

            {updateInfo.body && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('dialogs.update.releaseNotes')}
                </Typography>
                <Box
                  sx={{
                    maxHeight: 200,
                    overflow: 'auto',
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.875rem',
                  }}
                >
                  <Typography variant="body2" component="div">
                    {updateInfo.body}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}

        {phase === 'downloading' && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('dialogs.update.downloading')}
            </Typography>
            <LinearProgress
              variant={progressPercent !== undefined ? 'determinate' : 'indeterminate'}
              value={progressPercent}
              sx={{ mb: 1 }}
            />
            {progressPercent !== undefined && (
              <Typography variant="body2" color="text.secondary" align="center">
                {progressPercent}%
              </Typography>
            )}
          </Box>
        )}

        {phase === 'installing' && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('dialogs.update.installing')}
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {phase === 'notify' && (
          <>
            <Button
              onClick={onDismiss}
              variant="outlined"
              startIcon={<Schedule />}
              sx={{ minWidth: 100 }}
            >
              {t('dialogs.update.later')}
            </Button>
            <Button
              onClick={onUpdate}
              variant="contained"
              startIcon={<SystemUpdateAlt />}
              sx={{ minWidth: 100 }}
            >
              {t('dialogs.update.updateNow')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UpdateDialog;
