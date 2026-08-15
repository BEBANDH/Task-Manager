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

export function createFolder(name, description = '', type = 'standard', labelsInput = 'General') {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (state.folders.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
    alert('A list with this name already exists.');
    return null;
  }
  
  const labels = labelsInput.split(',').map(l => l.trim()).filter(Boolean);
  if (labels.length === 0) labels.push('General');

  const folder = { 
    id: uid(), 
    name: trimmed, 
    description: description.trim(), 
    labels: labels,
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

export function renameFolder(id, newName, newDescription = '', newLabelsInput = 'General') {
  const trimmed = newName.trim();
  if (!trimmed) return;
  const folder = state.folders.find(f => f.id === id);
  if (!folder) return;
  if (state.folders.some(f => f.id !== id && f.name.toLowerCase() === trimmed.toLowerCase())) {
    alert('A list with this name already exists.');
    return;
  }
  
  const labels = newLabelsInput.split(',').map(l => l.trim()).filter(Boolean);
  if (labels.length === 0) labels.push('General');

  folder.name = trimmed;
  folder.description = newDescription.trim();
  folder.labels = labels;
  delete folder.category;
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
  const container = document.getElementById('categoriesContainerSidebar');
  if (!container) return;
  container.innerHTML = '';
  
  const filteredFolders = state.folders.filter(folder => {
    if (!state.listSearchQuery) return true;
    const desc = folder.description || '';
    return desc.toLowerCase().includes(state.listSearchQuery) || folder.name.toLowerCase().includes(state.listSearchQuery);
  });

  if (filteredFolders.length === 0) {
    container.innerHTML = '<div style="padding: 12px; color: var(--text-dim); font-size: 13px; text-align: center;">No lists found.</div>';
    return;
  }

  // Group by labels
  const categoriesMap = {};
  filteredFolders.forEach(folder => {
    const labels = (folder.labels && folder.labels.length > 0) ? folder.labels : ['General'];
    labels.forEach(catName => {
      const trimmedCatName = catName.trim() || 'General';
      if (!categoriesMap[trimmedCatName]) {
        categoriesMap[trimmedCatName] = [];
      }
      categoriesMap[trimmedCatName].push(folder);
    });
  });

  const categoryNames = Object.keys(categoriesMap).sort((a, b) => {
    const aIdx = state.categoryOrder.indexOf(a);
    const bIdx = state.categoryOrder.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    if (a === 'General') return 1;
    if (b === 'General') return -1;
    return a.localeCompare(b);
  });

  categoryNames.forEach(catName => {
    const folders = categoriesMap[catName];
    const isCategoryCollapsed = state.collapsedCategories.has(catName);

    const accordionSection = document.createElement('div');
    accordionSection.className = 'sidebar-accordion';
    accordionSection.dataset.categoryName = catName;
    
    accordionSection.draggable = true;
    accordionSection.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', catName); // Needed for Firefox
      e.dataTransfer.setData('categoryName', catName);
      e.dataTransfer.effectAllowed = 'move';
      accordionSection.style.opacity = '0.5';
      e.stopPropagation();
    });
    accordionSection.addEventListener('dragend', () => {
      accordionSection.style.opacity = '1';
    });
    accordionSection.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      accordionSection.style.borderTop = '2px solid var(--accent)';
    });
    accordionSection.addEventListener('dragleave', () => {
      accordionSection.style.borderTop = '';
    });
    accordionSection.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      accordionSection.style.borderTop = '';
      const draggedCat = e.dataTransfer.getData('categoryName');
      if (draggedCat && draggedCat !== catName && categoriesMap[draggedCat]) {
        let currentOrder = [...categoryNames];
        const fromIdx = currentOrder.indexOf(draggedCat);
        const toIdx = currentOrder.indexOf(catName);
        if (fromIdx !== -1 && toIdx !== -1) {
          currentOrder.splice(fromIdx, 1);
          currentOrder.splice(toIdx, 0, draggedCat);
          state.categoryOrder = currentOrder;
          import('./storage.js').then(module => {
            module.writeStorage('tm_category_order_v2', state.categoryOrder);
          });
          renderFolders();
        }
      }
    });

    // Header
    const header = document.createElement('div');
    header.className = 'sidebar-accordion-header';
    header.addEventListener('click', () => {
      if (state.collapsedCategories.has(catName)) {
        state.collapsedCategories.delete(catName);
      } else {
        state.collapsedCategories.add(catName);
      }
      renderFolders();
    });

    const chevron = document.createElement('svg');
    chevron.setAttribute('width', '14');
    chevron.setAttribute('height', '14');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2');
    chevron.setAttribute('stroke-linecap', 'round');
    chevron.setAttribute('stroke-linejoin', 'round');
    chevron.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
    chevron.style.transform = isCategoryCollapsed ? 'rotate(-90deg)' : 'rotate(0)';
    chevron.style.transition = 'transform 0.2s ease';

    const title = document.createElement('span');
    title.textContent = catName;
    title.style.fontWeight = '600';
    title.style.fontSize = '12px';
    title.style.textTransform = 'uppercase';
    title.style.letterSpacing = '0.5px';
    title.style.color = 'var(--accent)';

    header.appendChild(chevron);
    header.appendChild(title);
    accordionSection.appendChild(header);

    // List Container
    if (!isCategoryCollapsed) {
      const listContainer = document.createElement('ul');
      listContainer.className = 'folders-list';
      listContainer.style.marginTop = '4px';

      folders.forEach(folder => {
        const li = document.createElement('li');
    li.className = `folder-item${(folder.id === state.currentFolderId && state.currentView === 'tasks') ? ' active' : ''}`;
    li.dataset.folderId = folder.id;

    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = `${folder.type === 'scheduled' ? '⏰ ' : ''}${folder.name}`;
    name.setAttribute('title', folder.name);

    if (folder.labels && folder.labels.length > 0 && (folder.labels.length > 1 || folder.labels[0] !== 'General')) {
      const catBadge = document.createElement('span');
      catBadge.className = 'category-badge-label';
      catBadge.textContent = folder.labels.join(', ');
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

    listContainer.appendChild(li);
  });
  accordionSection.appendChild(listContainer);
}

container.appendChild(accordionSection);
});
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
    currentCategory = folder?.labels ? folder.labels.join(', ') : 'General';
  }
  if (el.folderDescriptionInput) {
    el.folderDescriptionInput.value = currentDescription;
  }

  const categoryInput = document.getElementById('folderCategoryInput');
  const datalist = document.getElementById('categorySuggestions');
  if (datalist) {
    const existingCats = Array.from(new Set(state.folders.flatMap(f => f.labels || ['General']))).filter(Boolean);
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
