import { createTheme, Theme } from '@mui/material/styles';

export type ThemeName = 'default' | 'dark' | 'pastel' | 'vivid' | 'darcula';

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  theme: Theme;
}

// Default Theme (Light)
const defaultTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
  },
});

// Dark Theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
    },
  },
});

// Pastel Theme (Soft, gentle colors)
const pastelTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#a8d5ba', // Soft mint green
    },
    secondary: {
      main: '#f7cac9', // Soft pink
    },
    background: {
      default: '#fefefe',
      paper: '#fafafa',
    },
    text: {
      primary: '#5a5a5a',
      secondary: '#8a8a8a',
    },
    divider: '#e8e8e8',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#e8f5e8',
          color: '#5a5a5a',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#fafafa',
          border: '1px solid #e8e8e8',
        },
      },
    },
  },
  // カスタムCSS変数でコードシンタックスハイライトの視認性を向上
  shape: {
    borderRadius: 8,
  },
});

// Vivid Theme (Bold, vibrant colors)
const vividTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#ff6b35', // Vibrant orange
    },
    secondary: {
      main: '#7209b7', // Vibrant purple
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#2d3748',
      secondary: '#4a5568',
    },
    divider: '#e2e8f0',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(45deg, #ff6b35 30%, #f7931e 90%)',
          color: '#ffffff',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 4px 8px rgba(255, 107, 53, 0.3)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
  // カスタムCSS変数でコードシンタックスハイライトの視認性を向上
  shape: {
    borderRadius: 12,
  },
});

// Darcula Theme (JetBrains IDE inspired)
const darculaTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#CC7832', // Orange-brown for keywords
    },
    secondary: {
      main: '#6A8759', // Muted green for strings
    },
    background: {
      default: '#2B2B2B', // Dark charcoal background
      paper: '#3C3F41', // Slightly lighter for cards
    },
    text: {
      primary: '#A9B7C6', // Soft light blue-gray for plain text
      secondary: '#808080', // Medium gray for comments
    },
    divider: '#323232',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#3C3F41',
          color: '#A9B7C6',
          borderBottom: '1px solid #323232',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#3C3F41',
          border: '1px solid #323232',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          backgroundColor: '#CC7832',
          color: '#2B2B2B',
          '&:hover': {
            backgroundColor: '#D18F4A',
          },
        },
        outlined: {
          borderColor: '#CC7832',
          color: '#CC7832',
          '&:hover': {
            backgroundColor: 'rgba(204, 120, 50, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#3C3F41',
            '& fieldset': {
              borderColor: '#323232',
            },
            '&:hover fieldset': {
              borderColor: '#CC7832',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#CC7832',
            },
          },
        },
      },
    },
  },
  shape: {
    borderRadius: 4,
  },
});

export const themes: ThemeConfig[] = [
  {
    name: 'default',
    displayName: 'Default',
    theme: defaultTheme,
  },
  {
    name: 'dark',
    displayName: 'Dark',
    theme: darkTheme,
  },
  {
    name: 'pastel',
    displayName: 'Pastel',
    theme: pastelTheme,
  },
  {
    name: 'vivid',
    displayName: 'Vivid',
    theme: vividTheme,
  },
  {
    name: 'darcula',
    displayName: 'Darcula',
    theme: darculaTheme,
  },
];

export const getThemeByName = (name: ThemeName): Theme => {
  const themeConfig = themes.find(t => t.name === name);
  return themeConfig ? themeConfig.theme : defaultTheme;
};

export const getThemeDisplayName = (name: ThemeName): string => {
  const themeConfig = themes.find(t => t.name === name);
  return themeConfig ? themeConfig.displayName : 'Default';
};

// HTML要素にdata-theme属性を設定する関数
export const applyThemeToDocument = (themeName: ThemeName): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', themeName);
  }
};
