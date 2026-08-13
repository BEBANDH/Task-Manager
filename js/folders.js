import { el } from './dom.js';
import { state, persistFolders, persistTasks, triggerCloudSync } from './state.js';
import { uid, now, writeStorage, STORAGE_KEYS } from './storage.js';
import { render } from './main.js';

let currentModalFolderId = null;
let submitHandler = null;
let cancelHandler = null;

export async function shareFolder(id) {
  const folder = state.folders.find(f => f.id === id);
  if (!folder) return;

  const tasks = state.tasksByFolder[id] || [];
  // Sort tasks by date (createdAt)
  const sortedTasks = [...tasks].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const payload = {
    folderName: folder.name,
    description: folder.description || '',
    tasks: sortedTasks,
    sharedAt: Date.now()
  };

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    // Fallback if clipboard API is blocked on unsecure context / localhost
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (_) {}
    document.body.removeChild(textarea);
    return success;
  };

  try {
    let shareUrl = '';
    if (window.firebaseDb && window.firebaseDb.db) {
      const { db, doc, setDoc } = window.firebaseDb;
      const shareId = uid();
      const shareRef = doc(db, 'shared_lists', shareId);

      await setDoc(shareRef, payload);
      shareUrl = `${window.location.origin}${window.location.pathname}?list=${shareId}`;
    } else {
      // Lightweight payload for URL parameter share (strip IDs, unused timestamps, metadata)
      const compactPayload = {
        n: folder.name,
        d: folder.description || '',
        t: sortedTasks.map(t => ({
          t: t.title,
          c: t.completed ? 1 : 0,
          d: t.createdAt || 0,
          s: Array.isArray(t.subtasks) ? t.subtasks.map(sub => ({ t: sub.title, c: sub.completed ? 1 : 0 })) : []
        }))
      };
      const jsonStr = JSON.stringify(compactPayload);
      const encoded = btoa(encodeURIComponent(jsonStr));
      shareUrl = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    }

    const copied = await copyToClipboard(shareUrl);
    if (copied) {
      alert(`Read-only link copied to clipboard!\n\n${shareUrl}`);
    } else {
      prompt('Copy your read-only share link below:', shareUrl);
    }
  } catch (err) {
    console.error('Error creating share link:', err);
    // If Firestore rules reject `/shared_lists`, fallback to encoding URL parameter directly
    try {
      const jsonStr = JSON.stringify(payload);
      const encoded = btoa(encodeURIComponent(jsonStr));
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        alert(`Read-only link copied to clipboard!\n\n${shareUrl}`);
      } else {
        prompt('Copy your read-only share link below:', shareUrl);
      }
    } catch (fallbackErr) {
      alert(`Failed to generate share link: ${fallbackErr.message || err.message}`);
    }
  }
}

export function createFolder(name, description = '', type = 'standard', category = 'General') {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (state.folders.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
    alert('A list with this name already exists.');
    return null;
  }
  const folder = { 
    id: uid(), 
    name: trimmed, 
    description: description.trim(), 
    category: category.trim() || 'General',
    type: type, 
    createdAt: now() 
  };
  state.folders.push(folder);
  state.tasksByFolder[folder.id] = [];
  if (type === 'scheduled') {
    state.schedulesByFolder[folder.id] = [];
  }
  persistFolders();
  persistTasks();
  renderFolders();
  switchFolder(folder.id);
  return folder;
}

export function renameFolder(id, newName, newDescription = '', newCategory = 'General') {
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
  folder.category = newCategory.trim() || 'General';
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
  writeStorage('tm_current_view_v2', 'tasks');
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
  const allTasksBtn = document.getElementById('allTasksBtn');
  if (allTasksBtn) {
    allTasksBtn.classList.toggle('active', state.currentView === 'allTasks');
  }
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
    name.textContent = `${folder.type === 'scheduled' ? '⏰ ' : ''}${folder.name}`;
    name.setAttribute('title', folder.name);

    if (folder.category && folder.category !== 'General') {
      const catBadge = document.createElement('span');
      catBadge.className = 'category-badge-label';
      catBadge.textContent = folder.category;
      name.appendChild(catBadge);
    }

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

    // Drag and Drop
    li.draggable = true;
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', folder.id);
      e.dataTransfer.effectAllowed = 'move';
      li.style.opacity = '0.5';
    });
    li.addEventListener('dragend', () => {
      li.style.opacity = '1';
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      li.style.borderTop = '2px solid var(--accent)';
    });
    li.addEventListener('dragleave', () => {
      li.style.borderTop = '';
    });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.style.borderTop = '';
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== folder.id) {
        reorderFolders(draggedId, folder.id);
      }
    });

    fragment.appendChild(li);
  });
  el.foldersList.appendChild(fragment);
}

function reorderFolders(draggedId, targetId) {
  const draggedIndex = state.folders.findIndex(f => f.id === draggedId);
  const targetIndex = state.folders.findIndex(f => f.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) return;

  const [draggedFolder] = state.folders.splice(draggedIndex, 1);
  state.folders.splice(targetIndex, 0, draggedFolder);
  
  persistFolders();
  renderFolders();
}

export function openFolderModal(folderId = null, currentName = '') {
  currentModalFolderId = folderId;
  el.folderModal.hidden = false;
  el.folderModal.removeAttribute('hidden');
  el.folderModalTitle.textContent = folderId ? 'Rename List' : 'Create New List';
  el.folderNameInput.value = currentName;

  let currentDescription = '';
  let currentCategory = 'General';
  if (folderId) {
    const folder = state.folders.find(f => f.id === folderId);
    currentDescription = folder?.description || '';
    currentCategory = folder?.category || 'General';
  }
  if (el.folderDescriptionInput) {
    el.folderDescriptionInput.value = currentDescription;
  }

  const categoryInput = document.getElementById('folderCategoryInput');
  const datalist = document.getElementById('categorySuggestions');
  if (datalist) {
    const existingCats = Array.from(new Set(state.folders.map(f => f.category || 'General'))).filter(Boolean);
    datalist.innerHTML = existingCats.map(c => `<option value="${c}"></option>`).join('');
  }
  if (categoryInput) {
    categoryInput.value = currentCategory;
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
    const category = categoryInput ? (categoryInput.value.trim() || 'General') : 'General';

    if (!name) {
      el.folderNameInput.focus();
      return;
    }

    if (currentModalFolderId) {
      renameFolder(currentModalFolderId, name, description, category);
    } else {
      const typeRadio = el.folderForm.querySelector('input[name="folderType"]:checked');
      const selectedType = typeRadio ? typeRadio.value : 'standard';
      createFolder(name, description, selectedType, category);
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
