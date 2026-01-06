import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface DisplayVerseProps {
  verse: string;
  version: string;
}

export const DisplayVerse: React.FC<DisplayVerseProps> = ({ verse, version }) => {
  return (
    <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 800 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body1" sx={{ mb: 2, fontSize: '1.2rem', color: 'text.secondary' }}>
          {version}
        </Typography>
        <Typography variant="h5" sx={{ lineHeight: 1.8 }}>
          {verse || 'Select a verse to display'}
        </Typography>
      </Box>
    </Paper>
  );
};

