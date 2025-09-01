import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface StatusBarProps {
  line: number;
  column: number;
  totalCharacters: number;
  selectedCharacters: number;
  darkMode: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({
  line,
  column,
  totalCharacters,
  selectedCharacters,
  darkMode
}) => {
  const { t } = useTranslation();
  return (
    <Box
      className="status-bar"
      sx={{
        height: '24px',
        backgroundColor: darkMode ? '#1e1e1e' : '#f3f3f3',
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        px: 2,
        fontSize: '12px',
        color: darkMode ? '#cccccc' : '#666666',
        fontFamily: 'monospace'
      }}
    >
      <Typography variant="caption" sx={{ mr: 2 }}>
        {t('statusBar.line')} {line}, {t('statusBar.column')} {column}
      </Typography>
      <Typography variant="caption" sx={{ mr: 2 }}>
        {selectedCharacters > 0
          ? `${selectedCharacters} ${t('statusBar.selected')}`
          : `${totalCharacters} ${t('statusBar.characters')}`
        }
      </Typography>
    </Box>
  );
};

export default StatusBar;
