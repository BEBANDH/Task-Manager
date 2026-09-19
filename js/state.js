import { writeStorage, STORAGE_KEYS } from './storage.js';

export const state = {
  folders: [],
  tasksByFolder: {},
  notes: [],
  notesLocked: false,
  currentFolderId: null,
  currentView: 'tasks', // 'tasks' | 'dashboard' | 'settings' | 'notes'
  activeFilter: 'all',  // 'all' | 'active' | 'completed'
  searchQuery: '',
  selectedMonth: '',
  selectedYear: '',
  expandedTasks: new Set(),
  collapsedCategories: new Set(),
  collapsedLists: new Set(),
  confirmDeleteResolve: null,
  listSearchQuery: '',
  categoryOrder: [],
  ACCENT_COLORS: {
    vermilion: { light: '#e8453c', dark: '#e8453c' }, // Shinkou (Tokyo Vermilion / Torii Red)
    yamabuki: { light: '#ffaa00', dark: '#ffaa00' },  // Yamabuki (Golden Mountain Marigold)
    matcha: { light: '#48b870', dark: '#48b870' },    // Matcha / Tokiwa (Saturated Bamboo Green)
    ai: { light: '#38a4ff', dark: '#38a4ff' },        // Ai / Ruri (Lapis Lazuili / Tokyo Cyber Blue)
    sakura: { light: '#ff5c98', dark: '#ff5c98' },    // Saturated Sakura Pink
    fuji: { light: '#b86bff', dark: '#b86bff' },      // Fuji / Murasaki (Vibrant Iris Purple)
    sumi: { light: '#f5f5f5', dark: '#f5f5f5' }       // Sumi Shiro (Bright Silver Ink)
  },
};

export const getCurrentTasks = () => {
  if (!state.currentFolderId) return [];
  return state.tasksByFolder[state.currentFolderId] || [];
};

export const isCurrentFolderLocked = () => {
  if (!state.currentFolderId) return false;
  const folder = state.folders.find(f => f.id === state.currentFolderId);
  return folder ? !!folder.locked : false;
};

// Cloud Sync
let syncTimeoutId = null;
export function triggerCloudSync() {
  if (!window.syncCurrentData) return;
  if (syncTimeoutId) clearTimeout(syncTimeoutId);
  syncTimeoutId = setTimeout(() => {
    window.syncCurrentData();
  }, 1500);
}

// Persist Folders
let persistFoldersTimeoutId = null;
export function persistFolders() {
  if (persistFoldersTimeoutId) clearTimeout(persistFoldersTimeoutId);
  persistFoldersTimeoutId = setTimeout(() => {
    const write = () => {
      writeStorage(STORAGE_KEYS.folders, state.folders);
      triggerCloudSync();
    };
    if (window.requestIdleCallback) {
      window.requestIdleCallback(write);
    } else {
      write();
    }
  }, 300);
}

// Persist Tasks
let persistTasksTimeoutId = null;
export function persistTasks() {
  if (persistTasksTimeoutId) clearTimeout(persistTasksTimeoutId);
  persistTasksTimeoutId = setTimeout(() => {
    const write = () => {
      writeStorage(STORAGE_KEYS.tasks, state.tasksByFolder);
      triggerCloudSync();
    };
    if (window.requestIdleCallback) {
      window.requestIdleCallback(write);
    } else {
      write();
    }
  }, 300);
}

// Persist Notes
let persistNotesTimeoutId = null;
export function persistNotes() {
  if (persistNotesTimeoutId) clearTimeout(persistNotesTimeoutId);
  persistNotesTimeoutId = setTimeout(() => {
    const write = () => {
      writeStorage(STORAGE_KEYS.notes, state.notes);
      writeStorage(STORAGE_KEYS.notesLocked, !!state.notesLocked);
      triggerCloudSync();
    };
    if (window.requestIdleCallback) {
      window.requestIdleCallback(write);
    } else {
      write();
    }
  }, 300);
}
