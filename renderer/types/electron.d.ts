export interface ElectronAPI {
  sendVerse: (data: { verse: string; version: string; reference?: string }) => void;
  openProjection: (data: { verse: string; version: string; reference?: string }) => Promise<void>;
  listBooks: () => Promise<{ id: string; label: string; testament: 'taloha' | 'vaovao' }[]>;
  readBook: (bookId: string) => Promise<Record<string, Record<string, string>> | null>;
  closeProjection: () => Promise<void>;
  onVerseUpdate: (callback: (data: { verse: string; version: string; reference?: string }) => void) => void;
  sendProjectionCommand?: (cmd: string) => Promise<boolean>;
  onProjectionCommand?: (callback: (cmd: string) => void) => void;
  projectionReply?: (data: { cmd: string; handled: boolean }) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

