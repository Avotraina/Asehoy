import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  sendVerse: (data: { verse: string; version: string; reference?: string }) => {
    ipcRenderer.send('verse-update', data);
  },
  openProjection: (data: { verse: string; version: string; reference?: string }) =>
    ipcRenderer.invoke('open-projection', data),
  listBooks: () => ipcRenderer.invoke('list-books'),
  readBook: (bookId: string) => ipcRenderer.invoke('read-book', bookId),
  closeProjection: () => ipcRenderer.invoke('close-projection'),
  onVerseUpdate: (callback: (data: { verse: string; version: string }) => void) => {
    ipcRenderer.on('verse-update', (_event, data) => callback(data));
  },
  // send a command to the projection window and await boolean handled response
  sendProjectionCommand: (cmd: string) => ipcRenderer.invoke('projection-command', cmd),
  // allow projection window to listen for commands from main process
  onProjectionCommand: (callback: (cmd: string) => void) => {
    ipcRenderer.on('projection-command', (_event, cmd) => callback(cmd));
  },
  // projection window uses this to reply whether it handled the command
  projectionReply: (data: { cmd: string; handled: boolean }) => ipcRenderer.send('projection-reply', data),
});

