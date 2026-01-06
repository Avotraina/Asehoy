import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { useTheme } from '../theme/ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Tooltip title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
      <IconButton onClick={toggleTheme} color="inherit" size="large">
        <span style={{ fontSize: 18 }}>{theme === 'light' ? '🌙' : '☀️'}</span>
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
