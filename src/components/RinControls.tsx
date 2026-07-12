import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Close, Fullscreen, FullscreenExit } from '@mui/icons-material';

interface RinControlsProps {
  /** Whether the controls are visible (mouse-move shows, typing fades them). */
  visible: boolean;
  /** Whether the editor is currently full-width (vs. 1000px centered). */
  fullWidth: boolean;
  onExit: () => void;
  onToggleWidth: () => void;
  t: (key: string) => string;
}

const fixedButtonSx = (visible: boolean, top: number) => ({
  position: 'fixed' as const,
  top,
  right: 12,
  zIndex: 1300,
  bgcolor: 'action.selected',
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? ('auto' as const) : ('none' as const),
  // Show quickly on activity; fade slowly while typing.
  transition: visible ? 'opacity 0.15s ease' : 'opacity 3s ease',
  '&:hover': { bgcolor: 'action.focus' },
});

/**
 * 臨 (Rin) focus-mode controls: an exit button and an editor-width toggle,
 * stacked top-right. Shown on mouse-move and faded while typing.
 */
const RinControls: React.FC<RinControlsProps> = ({ visible, fullWidth, onExit, onToggleWidth, t }) => (
  <>
    <Tooltip title={t('rin.exit')} placement="left">
      <IconButton onClick={onExit} aria-label={t('rin.exit')} sx={fixedButtonSx(visible, 12)}>
        <Close />
      </IconButton>
    </Tooltip>
    <Tooltip title={t('rin.toggleWidth')} placement="left">
      <IconButton onClick={onToggleWidth} aria-label={t('rin.toggleWidth')} sx={fixedButtonSx(visible, 56)}>
        {fullWidth ? <FullscreenExit /> : <Fullscreen />}
      </IconButton>
    </Tooltip>
  </>
);

export default RinControls;
