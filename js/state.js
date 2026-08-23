import { writeStorage, STORAGE_KEYS } from './storage.js';

export const state = {
  folders: [],
  tasksByFolder: {},
  notes: [],
  currentFolderId: null,
  currentView: 'tasks', // 'tasks' | 'dashboard' | 'settings'
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
    black: { light: '#ffffff', dark: '#ffffff' },
    mustard: { light: '#E1AD01', dark: '#E1AD01' },
    brown: { light: '#C19A6B', dark: '#C19A6B' },
    sky: { light: '#8FBCD3', dark: '#8FBCD3' },
    sage: { light: '#A9C4A6', dark: '#A9C4A6' },
    rose: { light: '#D88C9A', dark: '#D88C9A' },
    mauve: { light: '#B39EB5', dark: '#B39EB5' }
  },
};

export const getCurrentTasks = () => {
  if (state.currentView === 'allTasks') {
    const all = [];
    state.folders.forEach(folder => {
      const listTasks = state.tasksByFolder[folder.id] || [];
      listTasks.forEach(t => {
        all.push({ ...t, _folderId: folder.id, _folderName: folder.name });
      });
    });
    all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return all;
  }
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
      triggerCloudSync();
    };
    if (window.requestIdleCallback) {
      window.requestIdleCallback(write);
    } else {
      write();
    }
  }, 300);
}
