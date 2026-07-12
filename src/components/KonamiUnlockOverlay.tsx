import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Full-screen retro "AS/400 THEME UNLOCKED" flash played once when the Konami
 * code unlocks the hidden theme. Purely decorative and non-interactive.
 */
const KonamiUnlockOverlay: React.FC = () => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 9999,
      animation: 'konamiUnlock 2.5s ease-out forwards',
      '@keyframes konamiUnlock': {
        '0%': {
          backgroundColor: 'rgba(0, 255, 0, 0)',
          boxShadow: 'inset 0 0 0px rgba(0, 255, 0, 0)',
        },
        '15%': {
          backgroundColor: 'rgba(0, 255, 0, 0.15)',
          boxShadow: 'inset 0 0 60px rgba(0, 255, 0, 0.4)',
        },
        '30%': {
          backgroundColor: 'rgba(0, 255, 0, 0.05)',
          boxShadow: 'inset 0 0 30px rgba(0, 255, 0, 0.2)',
        },
        '45%': {
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
          boxShadow: 'inset 0 0 40px rgba(0, 255, 0, 0.3)',
        },
        '100%': {
          backgroundColor: 'rgba(0, 255, 0, 0)',
          boxShadow: 'inset 0 0 0px rgba(0, 255, 0, 0)',
        },
      },
    }}
  >
    {/* Scanline effect */}
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(0deg, rgba(0,255,0,0.03) 0px, rgba(0,255,0,0.03) 1px, transparent 1px, transparent 3px)',
        animation: 'scanlineScroll 0.1s linear infinite',
        '@keyframes scanlineScroll': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 3px' },
        },
      }}
    />
    {/* Theme unlocked text */}
    <Typography
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#00FF00',
        fontFamily: '"IBM Plex Mono", "Courier New", Courier, monospace',
        fontSize: '24px',
        fontWeight: 'bold',
        textShadow: '0 0 10px rgba(0,255,0,0.8), 0 0 20px rgba(0,255,0,0.4)',
        animation: 'unlockTextFade 2.5s ease-out forwards',
        whiteSpace: 'nowrap',
        '@keyframes unlockTextFade': {
          '0%': { opacity: 0 },
          '20%': { opacity: 1 },
          '70%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
      }}
    >
      {'> AS/400 THEME UNLOCKED_'}
    </Typography>
  </Box>
);

export default KonamiUnlockOverlay;
