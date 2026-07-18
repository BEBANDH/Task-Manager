import { writeStorage, STORAGE_KEYS } from './storage.js';

export const state = {
  folders: [],
  tasksByFolder: {},
  currentFolderId: null,
  currentView: 'tasks', // 'tasks' | 'dashboard' | 'settings'
  activeFilter: 'all',  // 'all' | 'active' | 'completed'
  searchQuery: '',
  selectedMonth: '',
  selectedYear: '',
  expandedTasks: new Set(),
  confirmDeleteResolve: null,
  listSearchQuery: '',
  ACCENT_COLORS: {
    green: { light: '#22c55e', dark: '#4ade80' },
    blue: { light: '#3b82f6', dark: '#60a5fa' },
    indigo: { light: '#6366f1', dark: '#818cf8' },
    purple: { light: '#a855f7', dark: '#c084fc' },
    pink: { light: '#ec4899', dark: '#f472b6' },
    red: { light: '#ef4444', dark: '#f87171' },
    orange: { light: '#f97316', dark: '#fb923c' },
    amber: { light: '#f59e0b', dark: '#fbbf24' },
    teal: { light: '#14b8a6', dark: '#2dd4bf' },
    cyan: { light: '#06b6d4', dark: '#22d3ee' }
  }
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
