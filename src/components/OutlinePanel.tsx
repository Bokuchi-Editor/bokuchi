import React from 'react';
import { Box, Typography, IconButton, List, ListItemButton, ListItemText } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { HeadingItem } from '../types/outline';

interface OutlinePanelProps {
  headings: HeadingItem[];
  onHeadingClick: (lineNumber: number) => void;
  onClose?: () => void;
  width?: number;
}

const OutlinePanel: React.FC<OutlinePanelProps> = ({
  headings,
  onHeadingClick,
  onClose,
  width = 240,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        width,
        minWidth: width,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderLeft: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {t('outline.title')}
        </Typography>
        {onClose && (
          <IconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {headings.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('outline.noHeadings')}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {headings.map((heading, index) => (
              <ListItemButton
                key={`${heading.lineNumber}-${index}`}
                onClick={() => onHeadingClick(heading.lineNumber)}
                sx={{
                  pl: 1.5 + (heading.level - 1) * 2,
                  py: 0.5,
                  minHeight: 32,
                }}
              >
                <ListItemText
                  primary={heading.text}
                  primaryTypographyProps={{
                    variant: 'body2',
                    noWrap: true,
                    sx: {
                      fontSize: heading.level <= 2 ? '0.85rem' : '0.8rem',
                      fontWeight: heading.level === 1 ? 600 : heading.level === 2 ? 500 : 400,
                      color: heading.level <= 2 ? 'text.primary' : 'text.secondary',
                    },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default OutlinePanel;
