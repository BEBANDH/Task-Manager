import { el } from './dom.js';
import { state, persistFolders, persistTasks, triggerCloudSync } from './state.js';
import { uid, now, writeStorage, STORAGE_KEYS } from './storage.js';
import { render } from './main.js';

let currentModalFolderId = null;
let submitHandler = null;
let cancelHandler = null;

export function createFolder(name, description = '') {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (state.folders.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
    alert('A list with this name already exists.');
    return null;
  }
  const folder = { id: uid(), name: trimmed, description: description.trim(), createdAt: now() };
  state.folders.push(folder);
  state.tasksByFolder[folder.id] = [];
  persistFolders();
  persistTasks();
  renderFolders();
  switchFolder(folder.id);
  return folder;
}

export function renameFolder(id, newName, newDescription = '') {
  const trimmed = newName.trim();
  if (!trimmed) return;
  const folder = state.folders.find(f => f.id === id);
  if (!folder) return;
  if (state.folders.some(f => f.id !== id && f.name.toLowerCase() === trimmed.toLowerCase())) {
    alert('A list with this name already exists.');
    return;
  }
  folder.name = trimmed;
  folder.description = newDescription.trim();
  persistFolders();
  renderFolders();
  render();
}

export function deleteFolder(id) {
  if (state.folders.length <= 1) {
    alert('You must have at least one list.');
    return;
  }

  const folder = state.folders.find(f => f.id === id);
  const folderName = folder ? folder.name : 'this list';
  const taskCount = state.tasksByFolder[id] ? state.tasksByFolder[id].length : 0;

  const message = taskCount > 0
    ? `Are you sure you want to delete "${folderName}"? This will permanently delete ${taskCount} task(s).`
    : `Are you sure you want to delete "${folderName}"?`;

  if (!confirm(message)) {
    return;
  }

  state.folders = state.folders.filter(f => f.id !== id);
  delete state.tasksByFolder[id];
  if (state.currentFolderId === id) {
    state.currentFolderId = state.folders[0]?.id || null;
    writeStorage(STORAGE_KEYS.currentFolder, state.currentFolderId);
  }
  persistFolders();
  persistTasks();
  renderFolders();
  render();
}

export function switchFolder(id) {
  if (!state.folders.find(f => f.id === id)) return;
  state.currentFolderId = id;
  state.currentView = 'tasks';
  writeStorage(STORAGE_KEYS.currentFolder, state.currentFolderId);
  renderFolders();
  render();
}

export function toggleCurrentFolderLock() {
  if (!state.currentFolderId) return;
  const folder = state.folders.find(f => f.id === state.currentFolderId);
  if (!folder) return;
  folder.locked = !folder.locked;
  persistFolders();
  render();
}

export function renderFolders() {
  if (!el.foldersList) return;
  el.foldersList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const filteredFolders = state.folders.filter(folder => {
    if (!state.listSearchQuery) return true;
    const desc = folder.description || '';
    return desc.toLowerCase().includes(state.listSearchQuery);
  });

  filteredFolders.forEach(folder => {
    const li = document.createElement('li');
    li.className = `folder-item${(folder.id === state.currentFolderId && state.currentView === 'tasks') ? ' active' : ''}`;
    li.dataset.folderId = folder.id;

    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = folder.name;
    name.setAttribute('title', folder.name);

    const actions = document.createElement('div');
    actions.className = 'folder-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'folder-action edit';
    editBtn.textContent = '✎';
    editBtn.setAttribute('aria-label', 'Rename list');
    editBtn.setAttribute('title', 'Rename list');
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openFolderModal(folder.id, folder.name);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'folder-action delete';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', 'Delete list');
    deleteBtn.setAttribute('title', 'Delete list');
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteFolder(folder.id);
    });

    actions.append(editBtn, deleteBtn);
    li.append(name, actions);

    li.addEventListener('click', () => switchFolder(folder.id));

    fragment.appendChild(li);
  });
  el.foldersList.appendChild(fragment);
}

export function openFolderModal(folderId = null, currentName = '') {
  currentModalFolderId = folderId;
  el.folderModal.hidden = false;
  el.folderModal.removeAttribute('hidden');
  el.folderModalTitle.textContent = folderId ? 'Rename List' : 'Create New List';
  el.folderNameInput.value = currentName;

  let currentDescription = '';
  if (folderId) {
    const folder = state.folders.find(f => f.id === folderId);
    currentDescription = folder?.description || '';
  }
  if (el.folderDescriptionInput) {
    el.folderDescriptionInput.value = currentDescription;
  }

  if (submitHandler) {
    el.folderForm.removeEventListener('submit', submitHandler);
  }
  if (cancelHandler) {
    el.folderModalCancel.removeEventListener('click', cancelHandler);
  }

  submitHandler = (e) => {
    e.preventDefault();
    const name = el.folderNameInput.value.trim();
    const description = el.folderDescriptionInput ? el.folderDescriptionInput.value.trim() : '';
    if (!name) {
      el.folderNameInput.focus();
      return;
    }

    if (currentModalFolderId) {
      renameFolder(currentModalFolderId, name, description);
    } else {
      createFolder(name, description);
    }
    closeFolderModal();
  };

  cancelHandler = () => {
    closeFolderModal();
  };

  el.folderForm.addEventListener('submit', submitHandler);
  el.folderModalCancel.addEventListener('click', cancelHandler);

  setTimeout(() => {
    el.folderNameInput.focus();
    if (!currentName) {
      el.folderNameInput.select();
    }
  }, 10);
}

export function closeFolderModal() {
  el.folderModal.hidden = true;
  el.folderModal.setAttribute('hidden', '');
  if (submitHandler) {
    el.folderForm.removeEventListener('submit', submitHandler);
    submitHandler = null;
  }
  if (cancelHandler) {
    el.folderModalCancel.removeEventListener('click', cancelHandler);
    cancelHandler = null;
  }
}
