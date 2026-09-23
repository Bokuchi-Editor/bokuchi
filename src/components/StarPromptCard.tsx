import React from 'react';
import { Box, Button, IconButton, Link, Paper, Typography } from '@mui/material';
import { Close, OpenInNew, Star } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface StarPromptCardProps {
  open: boolean;
  /** Offer "Don't show again" (only after the user has declined once). */
  showNever: boolean;
  onStar: () => void;
  onLater: () => void;
  onNever: () => void;
}

// GitHub's star yellow. Deliberately theme-independent: it is the one accent
// that says "star" in every theme; everything else follows the palette.
const STAR_AMBER = '#f5a623';

/**
 * Small non-modal card at the bottom-right asking for a GitHub star.
 * It never steals focus and never auto-dismisses; visibility is decided by
 * useStarPrompt. Closing the card counts the same as "Later".
 */
const StarPromptCard: React.FC<StarPromptCardProps> = ({ open, showNever, onStar, onLater, onNever }) => {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <Paper
      role="complementary"
      aria-labelledby="star-prompt-title"
      elevation={8}
      sx={(theme) => ({
        position: 'fixed',
        insetInlineEnd: 16,
        // Clear the 24px status bar.
        bottom: 40,
        width: 320,
        maxWidth: 'calc(100vw - 32px)',
        p: 1.75,
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        // Why: stay below dialogs and menus so the card never covers a modal.
        zIndex: theme.zIndex.modal - 1,
        '@keyframes starPromptIn': {
          from: { opacity: 0, transform: 'translateY(18px)' },
          to: { opacity: 1, transform: 'none' },
        },
        animation: 'starPromptIn 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Star sx={{ fontSize: 20, color: STAR_AMBER }} />
        <Typography id="star-prompt-title" variant="subtitle2" component="h3" sx={{ flex: 1, fontWeight: 600 }}>
          {t('starPrompt.title')}
        </Typography>
        <IconButton size="small" onClick={onLater} aria-label={t('starPrompt.close')} sx={{ m: -0.5 }}>
          <Close sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1.5, lineHeight: 1.65 }}>
        {t('starPrompt.body')}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          size="small"
          onClick={onStar}
          endIcon={<OpenInNew sx={{ fontSize: '14px !important' }} />}
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            border: `1px solid ${STAR_AMBER}99`,
            backgroundColor: `${STAR_AMBER}29`,
            color: theme.palette.mode === 'dark' ? '#ffdf9e' : '#8a5300',
            '&:hover': { backgroundColor: `${STAR_AMBER}47` },
          })}
        >
          {t('starPrompt.star')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={onLater}
          sx={{ minWidth: 84, textTransform: 'none', borderRadius: 2, borderColor: 'divider', color: 'text.secondary' }}
        >
          {t('starPrompt.later')}
        </Button>
      </Box>

      {showNever && (
        <Link
          component="button"
          type="button"
          variant="caption"
          color="text.secondary"
          onClick={onNever}
          sx={{ mt: 1.25, display: 'inline-block' }}
        >
          {t('starPrompt.never')}
        </Link>
      )}
    </Paper>
  );
};

export default StarPromptCard;
