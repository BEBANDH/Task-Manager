import { writeStorage, STORAGE_KEYS } from './storage.js';

export const state = {
  folders: [],
  tasksByFolder: {},
  schedulesByFolder: {},
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
    blue: { light: '#4A56B3', dark: '#5E6AD2' },
    purple: { light: '#725BB8', dark: '#8E76D6' },
    pink: { light: '#B35897', dark: '#D472B7' },
    red: { light: '#C44C4C', dark: '#E46464' },
    orange: { light: '#C27040', dark: '#E18A58' },
    yellow: { light: '#B3893F', dark: '#D4A853' },
    green: { light: '#3D825E', dark: '#51A176' },
    cyan: { light: '#4196A3', dark: '#56B5C3' },
    teal: { light: '#367A73', dark: '#4B9990' },
    slate: { light: '#5A6370', dark: '#8A94A6' }
  }
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
