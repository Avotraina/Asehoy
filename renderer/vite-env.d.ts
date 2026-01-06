/// <reference types="vite/client" />

interface ElectronAPI {
  sendVerse: (verse: string, version: string) => void;
  onVerseUpdate: (callback: (data: { verse: string; version: string }) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

