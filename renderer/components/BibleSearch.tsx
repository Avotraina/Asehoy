import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

interface BibleSearchProps {
  onSearch: (query: string) => void;
}

export const BibleSearch: React.FC<BibleSearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, width: '100%' }}>
      <TextField
        fullWidth
        label="Search Bible Verse"
        placeholder="e.g., John 3:16"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        variant="outlined"
      />
      <Button type="submit" variant="contained" size="large">
        Search
      </Button>
    </Box>
  );
};

