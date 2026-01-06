import React from 'react';
import { Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';

interface VersionSelectorProps {
  version: string;
  onVersionChange: (version: string) => void;
}

const BIBLE_VERSIONS = [
  'KJV',
  'NIV',
  'ESV',
  'NASB',
  'NLT',
  'CSB',
  'AMP',
  'MSG',
];

export const VersionSelector: React.FC<VersionSelectorProps> = ({
  version,
  onVersionChange,
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onVersionChange(event.target.value);
  };

  return (
    <FormControl fullWidth sx={{ minWidth: 200 }}>
      <InputLabel id="version-select-label">Bible Version</InputLabel>
      <Select
        labelId="version-select-label"
        id="version-select"
        value={version}
        label="Bible Version"
        onChange={handleChange}
      >
        {BIBLE_VERSIONS.map((v) => (
          <MenuItem key={v} value={v}>
            {v}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

