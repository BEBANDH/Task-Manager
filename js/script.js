(function () {
  'use strict';

  /**
   * Local storage keys
   */
  const STORAGE_KEYS = {
    folders: 'tm_folders_v2',
    tasks: 'tm_tasks_v2',
    currentFolder: 'tm_current_folder_v2',
    theme: 'tm_theme_v1',
    filter: 'tm_filter_v1',
    search: 'tm_search_v1',
    monthFilter: 'tm_month_filter_v1',
    yearFilter: 'tm_year_filter_v1'
  };

  /**
   * State
   */
  /** @type {{ id: string; name: string; createdAt: number; }[]} */
  let folders = [];
  /** @type {Record<string, { id: string; title: string; completed: boolean; createdAt: number; updatedAt: number; completedAt?: number | null; }[]>} */
  let tasksByFolder = {};
  let currentFolderId = null;
  let currentView = 'tasks'; // tasks | dashboard
  let activeFilter = 'all'; // all | active | completed
  let searchQuery = '';
  let selectedMonth = ''; // '' for all months, or 'YYYY-MM' format
  let selectedYear = ''; // '' for all years, or 'YYYY'
  const expandedTasks = new Set(); // Track expanded sublists
  let confirmDeleteResolve = null;
  let listSearchQuery = '';

  const ACCENT_COLORS = {
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
  };

  // Get current folder's tasks
  const getCurrentTasks = () => {
    if (!currentFolderId) return [];
    return tasksByFolder[currentFolderId] || [];
  };

  const isCurrentFolderLocked = () => {
    if (!currentFolderId) return false;
    const folder = folders.find(f => f.id === currentFolderId);
    return folder ? !!folder.locked : false;
  };

  /**
   * DOM elements
   */
  let el = {};

  function initElements() {
    el = {
      form: document.getElementById('taskForm'),
      input: document.getElementById('taskInput'),
      tasks: document.getElementById('tasks'),
      empty: document.getElementById('emptyState'),
      progressText: document.getElementById('progressText'),
      progressBar: document.querySelector('.progress-bar'),
      progressFill: document.querySelector('.progress-fill'),
      themeToggle: document.getElementById('themeToggle'),
      clearCompleted: document.getElementById('clearCompleted'),
      filterButtons: Array.from(document.querySelectorAll('.filters .chip')),
      search: document.getElementById('searchInput'),
      yearFilter: document.getElementById('yearFilter'),
      monthFilter: document.getElementById('monthFilter'),
      monthlyChart: document.getElementById('monthlyChart'),
      activityLabel: document.getElementById('activityLabel'),
      activityTotals: document.getElementById('activityTotals'),
      yAxisMax: document.getElementById('yAxisMax'),
      yAxisMid: document.getElementById('yAxisMid'),
      yAxisMin: document.getElementById('yAxisMin'),
      xAxisLabels: document.getElementById('xAxisLabels'),
      exportBtn: document.getElementById('exportBtn'),
      exportMultipleBtn: document.getElementById('exportMultipleBtn'),
      exportMultipleModal: document.getElementById('exportMultipleModal'),
      exportListsContainer: document.getElementById('exportListsContainer'),
      exportMultipleCancel: document.getElementById('exportMultipleCancel'),
      exportMultipleSelectAll: document.getElementById('exportMultipleSelectAll'),
      exportMultipleExport: document.getElementById('exportMultipleExport'),
      importBtn: document.getElementById('importBtn'),
      importFile: document.getElementById('importFile'),
      foldersList: document.getElementById('foldersList'),
      addFolderBtn: document.getElementById('addFolderBtn'),
      folderModal: document.getElementById('folderModal'),
      folderForm: document.getElementById('folderForm'),
      folderNameInput: document.getElementById('folderNameInput'),
      folderDescriptionInput: document.getElementById('folderDescriptionInput'),
      folderModalCancel: document.getElementById('folderModalCancel'),
      folderModalTitle: document.getElementById('folderModalTitle'),
      listDescriptionDisplay: document.getElementById('listDescriptionDisplay'),
      listSearchInput: document.getElementById('listSearchInput'),
      sidebarToggle: document.getElementById('sidebarToggle'),
      sidebarOverlay: document.getElementById('sidebarOverlay'),
      leftPanel: document.querySelector('.left-panel'),
      confirmDeleteModal: document.getElementById('confirmDeleteModal'),
      confirmDeleteMessage: document.getElementById('confirmDeleteMessage'),
      confirmDeleteCancel: document.getElementById('confirmDeleteCancel'),
      confirmDeleteConfirm: document.getElementById('confirmDeleteConfirm'),
      dashboardBtn: document.getElementById('dashboardBtn'),
      tasksView: document.getElementById('tasksView'),
      dashboardView: document.getElementById('dashboardView'),
      dashCompletionRate: document.getElementById('dashCompletionRate'),
      dashCurrentStreak: document.getElementById('dashCurrentStreak'),
      dashMaxStreak: document.getElementById('dashMaxStreak'),
      dashActiveTasks: document.getElementById('dashActiveTasks'),
      dashAvgTime: document.getElementById('dashAvgTime'),
      dashBusiestDay: document.getElementById('dashBusiestDay'),
      dashListDistribution: document.getElementById('dashListDistribution'),
      dashPriorityList: document.getElementById('dashPriorityList'),
      accentColorContainer: document.getElementById('accentColorContainer'),
      lockToggleBtn: document.getElementById('lockToggleBtn'),
      lockToggleIcon: document.getElementById('lockToggleIcon'),
      lockToggleText: document.getElementById('lockToggleText'),
      activeListNameDisplay: document.getElementById('activeListNameDisplay'),
      toggleChartBtn: document.getElementById('toggleChartBtn'),
      changelogBtn: document.getElementById('changelogBtn'),
      changelogModal: document.getElementById('changelogModal'),
      changelogModalClose: document.getElementById('changelogModalClose'),
      dashClearCompletedBtn: document.getElementById('dashClearCompletedBtn'),
      clearMultipleModal: document.getElementById('clearMultipleModal'),
      clearListsContainer: document.getElementById('clearListsContainer'),
      clearMultipleCancel: document.getElementById('clearMultipleCancel'),
      clearMultipleSelectAll: document.getElementById('clearMultipleSelectAll'),
      clearMultipleProceed: document.getElementById('clearMultipleProceed'),
      confirmClearMultipleModal: document.getElementById('confirmClearMultipleModal'),
      confirmClearMultipleCancel: document.getElementById('confirmClearMultipleCancel'),
      confirmClearMultipleConfirm: document.getElementById('confirmClearMultipleConfirm'),
    };
  }

  // Utilities
  const now = () => Date.now();
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      // ignore storage errors (quota/private mode)
    }
  }
  // Attempt to read JSON from cookies (for legacy data recovery)
  function readCookieJSON(name) {
    try {
      const cookies = document.cookie ? document.cookie.split('; ') : [];
      for (const c of cookies) {
        const [k, ...rest] = c.split('=');
        if (k === name) {
          const raw = rest.join('=');
          if (!raw) return null;
          const decoded = decodeURIComponent(raw);
          try {
            return JSON.parse(decoded);
          } catch (_) {
            return null;
          }
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // Theme
  // Theme logic removed
  function toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    writeStorage(STORAGE_KEYS.theme, next);
    applyAccentColor();
    if (currentView === 'dashboard') {
      renderAccentColorPicker();
    }
  }

  function cycleAccentColor() {
    const keys = Object.keys(ACCENT_COLORS);
    const currentAccent = readStorage('tm_accent_color', 'green');
    let nextIndex = (keys.indexOf(currentAccent) + 1) % keys.length;
    if (nextIndex === -1) nextIndex = 0;
    const nextAccent = keys[nextIndex];
    
    writeStorage('tm_accent_color', nextAccent);
    applyAccentColor();
    if (currentView === 'dashboard') {
      renderAccentColorPicker();
    }
    render();
  }

  function initTheme() {
    // 1. Check storage
    let theme = readStorage(STORAGE_KEYS.theme, null);
    // 2. Fallback to system
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    // 3. Apply
    document.documentElement.setAttribute('data-theme', theme);
    applyAccentColor();

    if (el.themeToggle) {
      el.themeToggle.addEventListener('click', toggleTheme);
    }
  }

  function applyAccentColor() {
    const currentAccent = readStorage('tm_accent_color', 'green');
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const colorVal = ACCENT_COLORS[currentAccent] ? ACCENT_COLORS[currentAccent][theme] : ACCENT_COLORS.green[theme];
    document.documentElement.style.setProperty('--accent', colorVal);
  }

  // Folders CRUD
  function createFolder(name, description = '') {
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (folders.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A list with this name already exists.');
      return null;
    }
    const folder = { id: uid(), name: trimmed, description: description.trim(), createdAt: now() };
    folders.push(folder);
    tasksByFolder[folder.id] = [];
    persistFolders();
    persistTasks();
    renderFolders();
    switchFolder(folder.id);
    return folder;
  }

  function renameFolder(id, newName, newDescription = '') {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    if (folders.some(f => f.id !== id && f.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A list with this name already exists.');
      return;
    }
    folder.name = trimmed;
    folder.description = newDescription.trim();
    persistFolders();
    renderFolders();
    render();
  }

  function deleteFolder(id) {
    if (folders.length <= 1) {
      alert('You must have at least one list.');
      return;
    }

    const folder = folders.find(f => f.id === id);
    const folderName = folder ? folder.name : 'this list';
    const taskCount = tasksByFolder[id] ? tasksByFolder[id].length : 0;

    const message = taskCount > 0
      ? `Are you sure you want to delete "${folderName}"? This will permanently delete ${taskCount} task(s).`
      : `Are you sure you want to delete "${folderName}"?`;

    if (!confirm(message)) {
      return;
    }

    folders = folders.filter(f => f.id !== id);
    delete tasksByFolder[id];
    if (currentFolderId === id) {
      currentFolderId = folders[0]?.id || null;
      writeStorage(STORAGE_KEYS.currentFolder, currentFolderId);
    }
    persistFolders();
    persistTasks();
    renderFolders();
    render();
  }

  function switchFolder(id) {
    if (!folders.find(f => f.id === id)) return;
    currentFolderId = id;
    currentView = 'tasks';
    writeStorage(STORAGE_KEYS.currentFolder, currentFolderId);
    renderFolders();
    render();
  }

  function toggleCurrentFolderLock() {
    if (!currentFolderId) return;
    const folder = folders.find(f => f.id === currentFolderId);
    if (!folder) return;
    folder.locked = !folder.locked;
    persistFolders();
    render();
  }

  function persistFolders() {
    writeStorage(STORAGE_KEYS.folders, folders);
    // Trigger cloud sync if available
    if (window.syncCurrentData) {
      setTimeout(() => window.syncCurrentData(), 100);
    }
  }

  function persistTasks() {
    writeStorage(STORAGE_KEYS.tasks, tasksByFolder);
    // Trigger cloud sync if available
    if (window.syncCurrentData) {
      setTimeout(() => window.syncCurrentData(), 100);
    }
  }

  // Tasks CRUD
  function addTask(title) {
    if (!currentFolderId) {
      alert('Please select or create a list first.');
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) return;
    const task = { id: uid(), title: trimmed, completed: false, createdAt: now(), updatedAt: now(), completedAt: null, subtasks: [] };
    if (!tasksByFolder[currentFolderId]) {
      tasksByFolder[currentFolderId] = [];
    }
    tasksByFolder[currentFolderId].unshift(task);
    persistTasks();
    render();
  }

  function updateTask(id, updates) {
    if (!currentFolderId || !tasksByFolder[currentFolderId]) return;
    const index = tasksByFolder[currentFolderId].findIndex(t => t.id === id);
    if (index === -1) return;
    tasksByFolder[currentFolderId][index] = { ...tasksByFolder[currentFolderId][index], ...updates, updatedAt: now() };
    persistTasks();
    render();
  }

  async function deleteTask(id) {
    if (!currentFolderId || !tasksByFolder[currentFolderId]) return;
    const task = tasksByFolder[currentFolderId].find(t => t.id === id);
    if (!task) return;
    const confirmed = await showConfirmDeleteModal(`Are you sure you want to delete the task "${task.title}"?`);
    if (!confirmed) return;
    const next = tasksByFolder[currentFolderId].filter(t => t.id !== id);
    if (next.length === tasksByFolder[currentFolderId].length) return;
    tasksByFolder[currentFolderId] = next;
    persistTasks();
    render();
  }

  function initConfirmDeleteModal() {
    if (!el.confirmDeleteModal) return;
    el.confirmDeleteCancel.addEventListener('click', () => {
      closeConfirmDeleteModal(false);
    });
    el.confirmDeleteConfirm.addEventListener('click', () => {
      closeConfirmDeleteModal(true);
    });
    el.confirmDeleteModal.addEventListener('click', (e) => {
      if (e.target === el.confirmDeleteModal) {
        closeConfirmDeleteModal(false);
      }
    });
  }

  function showConfirmDeleteModal(message) {
    el.confirmDeleteMessage.textContent = message;
    el.confirmDeleteModal.hidden = false;
    el.confirmDeleteModal.removeAttribute('hidden');
    return new Promise((resolve) => {
      confirmDeleteResolve = resolve;
    });
  }

  function closeConfirmDeleteModal(result) {
    el.confirmDeleteModal.hidden = true;
    el.confirmDeleteModal.setAttribute('hidden', '');
    if (confirmDeleteResolve) {
      confirmDeleteResolve(result);
      confirmDeleteResolve = null;
    }
  }



  function addSubtask(taskId, title) {
    const tasks = getCurrentTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const task = tasks[idx];
    const sub = { id: uid(), title: trimmed, completed: false, createdAt: now(), updatedAt: now() };
    const list = Array.isArray(task.subtasks) ? task.subtasks : [];
    list.unshift(sub);
    updateTask(taskId, { subtasks: list });
  }

  function updateSubtask(taskId, subtaskId, updates) {
    const tasks = getCurrentTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const task = tasks[idx];
    const list = Array.isArray(task.subtasks) ? task.subtasks.slice() : [];
    const sIdx = list.findIndex(s => s.id === subtaskId);
    if (sIdx === -1) return;
    list[sIdx] = { ...list[sIdx], ...updates, updatedAt: now() };
    updateTask(taskId, { subtasks: list });
  }

  function deleteSubtask(taskId, subtaskId) {
    const tasks = getCurrentTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const task = tasks[idx];
    const list = Array.isArray(task.subtasks) ? task.subtasks : [];
    const next = list.filter(s => s.id !== subtaskId);
    updateTask(taskId, { subtasks: next });
  }

  // Rendering
  function renderFolders() {
    el.foldersList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const filteredFolders = folders.filter(folder => {
      if (!listSearchQuery) return true;
      const desc = folder.description || '';
      return desc.toLowerCase().includes(listSearchQuery);
    });

    filteredFolders.forEach(folder => {
      const li = document.createElement('li');
      li.className = `folder-item${(folder.id === currentFolderId && currentView === 'tasks') ? ' active' : ''}`;
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

  let currentModalFolderId = null;
  let submitHandler = null;
  let cancelHandler = null;

  function openFolderModal(folderId = null, currentName = '') {
    currentModalFolderId = folderId;
    el.folderModal.hidden = false;
    el.folderModal.removeAttribute('hidden');
    el.folderModalTitle.textContent = folderId ? 'Rename List' : 'Create New List';
    el.folderNameInput.value = currentName;

    let currentDescription = '';
    if (folderId) {
      const folder = folders.find(f => f.id === folderId);
      currentDescription = folder?.description || '';
    }
    if (el.folderDescriptionInput) {
      el.folderDescriptionInput.value = currentDescription;
    }

    // Remove old handlers if they exist
    if (submitHandler) {
      el.folderForm.removeEventListener('submit', submitHandler);
    }
    if (cancelHandler) {
      el.folderModalCancel.removeEventListener('click', cancelHandler);
    }

    // Create new handlers
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

    // Focus input after a short delay to ensure modal is visible
    setTimeout(() => {
      el.folderNameInput.focus();
      if (!currentName) {
        el.folderNameInput.select();
      }
    }, 10);
  }

  function closeFolderModal() {
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
    el.folderNameInput.value = '';
    if (el.folderDescriptionInput) {
      el.folderDescriptionInput.value = '';
    }
    currentModalFolderId = null;
    // Reset form to clear any validation states
    el.folderForm.reset();
  }

  function render() {
    if (currentView === 'dashboard') {
      if (el.tasksView) el.tasksView.style.display = 'none';
      if (el.dashboardView) el.dashboardView.style.display = 'block';
      if (el.dashboardBtn) el.dashboardBtn.classList.add('active');
      renderDashboard();
      return;
    }

    if (el.tasksView) el.tasksView.style.display = 'block';
    if (el.dashboardView) el.dashboardView.style.display = 'none';
    if (el.dashboardBtn) el.dashboardBtn.classList.remove('active');

    const tasks = getCurrentTasks();
    const { total, completed, filtered } = getRenderData(tasks);

    // Render list description
    const currentFolder = folders.find(f => f.id === currentFolderId);
    if (currentFolder) {
      if (el.activeListNameDisplay) {
        el.activeListNameDisplay.textContent = currentFolder.name;
      }
      const isLocked = !!currentFolder.locked;
      if (el.lockToggleIcon) {
        el.lockToggleIcon.innerHTML = isLocked 
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>';
      }
      if (el.lockToggleText) {
        el.lockToggleText.textContent = isLocked ? 'Locked' : 'Unlocked';
      }
      if (el.lockToggleBtn) {
        el.lockToggleBtn.title = isLocked ? 'Unlock List (L)' : 'Lock List (L)';
      }
      if (el.input) {
        el.input.disabled = isLocked;
        el.input.placeholder = isLocked ? 'This list is locked...' : 'Add a task...';
      }
      const addBtn = el.form ? el.form.querySelector('button[type="submit"]') : null;
      if (addBtn) {
        addBtn.disabled = isLocked;
      }
    }
    if (el.listDescriptionDisplay) {
      if (currentFolder && currentFolder.description) {
        el.listDescriptionDisplay.textContent = currentFolder.description;
        el.listDescriptionDisplay.style.display = 'block';
      } else {
        el.listDescriptionDisplay.textContent = '';
        el.listDescriptionDisplay.style.display = 'none';
      }
    }
    // Empty state
    el.empty.hidden = filtered.length !== 0 || (searchQuery.length > 0 || activeFilter !== 'all' || selectedMonth);
    // Progress
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    el.progressText.textContent = `${percent}% • ${completed}/${total} completed`;
    el.progressBar.setAttribute('aria-valuenow', String(percent));
    el.progressFill.style.width = `${percent}%`;
    // List
    el.tasks.innerHTML = '';
    const fragment = document.createDocumentFragment();
    let lastDateStr = null;
    filtered.forEach(task => {
      try {
        const taskDate = new Date(task.createdAt);
        const dateStr = taskDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        
        if (dateStr !== lastDateStr) {
          const dateHeader = document.createElement('div');
          dateHeader.className = 'task-date-header';
          dateHeader.style.display = 'flex';
          dateHeader.style.alignItems = 'center';
          dateHeader.style.gap = '12px';
          dateHeader.style.margin = '16px 0 8px 0';
          
          const text = document.createElement('span');
          text.textContent = dateStr;
          text.style.fontSize = '12px';
          text.style.fontWeight = '600';
          text.style.color = 'var(--text-dim)';
          text.style.whiteSpace = 'nowrap';
          
          const hr = document.createElement('hr');
          hr.style.flex = '1';
          hr.style.border = 'none';
          hr.style.borderTop = '1px solid var(--border)';
          hr.style.margin = '0';
          
          dateHeader.append(text, hr);
          fragment.appendChild(dateHeader);
          
          lastDateStr = dateStr;
        }

        fragment.appendChild(renderTaskItem(task));
      } catch (err) {
        console.error('Render task failed', err);
      }
    });
    el.tasks.appendChild(fragment);
    // Activity
    renderActivity(tasks);
  }

  function getRenderData(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const filtered = tasks.filter(task => {
      // Filter by status (all/active/completed)
      if (activeFilter === 'active' && task.completed) return false;
      if (activeFilter === 'completed' && !task.completed) return false;

      // Filter by search query
      if (searchQuery) {
        return task.title.toLowerCase().includes(searchQuery);
      }

      return true;
    });
    return { total, completed, filtered };
  }

  function renderTaskItem(task) {
    const li = document.createElement('li');
    li.className = `task${task.completed ? ' completed' : ''}`;
    li.dataset.id = task.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', 'Mark complete');
    checkbox.addEventListener('change', () => {
      const checked = checkbox.checked;
      updateTask(task.id, { completed: checked, completedAt: checked ? now() : null });
    });

    const content = document.createElement('div');
    content.className = 'task-content-wrapper';

    // Header (Title + Date)
    const header = document.createElement('div');
    header.className = 'task-header';

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = task.title;
    title.setAttribute('tabindex', '0');
    title.setAttribute('role', 'textbox');
    title.setAttribute('aria-label', 'Task title');
    title.contentEditable = 'false';

    const meta = document.createElement('span');
    meta.className = 'meta';
    const metaText = document.createTextNode(formatDateTime(task.createdAt));
    meta.appendChild(metaText);

    header.append(title, meta);

    // Subtasks List (Always Visible)
    const subList = document.createElement('ul');
    subList.className = 'subtasks';

    // Subtasks Add Form (Toggleable)
    const subPanel = document.createElement('div');
    subPanel.className = 'subtasks-panel';
    // Initialize form visibility based on expandedTasks set
    if (expandedTasks.has(task.id)) {
      subPanel.hidden = false;
    } else {
      subPanel.hidden = true;
    }

    const subForm = document.createElement('form');
    subForm.className = 'subtask-form';
    subForm.autocomplete = 'off';
    subForm.noValidate = true;
    const subInput = document.createElement('input');
    subInput.type = 'text';
    subInput.placeholder = 'Add a subtask...';
    subInput.maxLength = 120;
    const subAddBtn = document.createElement('button');
    subAddBtn.type = 'submit';
    subAddBtn.className = 'primary small';
    subAddBtn.textContent = 'Add';
    subForm.append(subInput, subAddBtn);
    subPanel.append(subForm);

    content.append(header, subList, subPanel);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const priorityBtn = document.createElement('button');
    priorityBtn.type = 'button';
    priorityBtn.className = 'priority';
    priorityBtn.innerHTML = task.highPriority 
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--danger);"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>' 
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>';
    priorityBtn.title = task.highPriority ? 'Remove high priority' : 'Mark as high priority';
    priorityBtn.style.padding = '6px 8px';
    priorityBtn.style.fontSize = '12px';
    priorityBtn.style.border = 'none';
    priorityBtn.style.background = 'transparent';
    priorityBtn.style.cursor = 'pointer';
    priorityBtn.style.transition = 'transform 0.15s ease';
    priorityBtn.addEventListener('mouseenter', () => priorityBtn.style.transform = 'scale(1.25)');
    priorityBtn.addEventListener('mouseleave', () => priorityBtn.style.transform = 'scale(1)');
    priorityBtn.addEventListener('click', () => {
      updateTask(task.id, { highPriority: !task.highPriority });
    });

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'edit';
    editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
    editBtn.title = 'Edit';

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete';
    delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    delBtn.title = 'Delete';

    const subToggle = document.createElement('button');
    subToggle.type = 'button';
    subToggle.className = 'ghost-button';
    subToggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'; 
    subToggle.title = 'Add subtask';

    function renderSubtasks() {
      subList.innerHTML = '';
      const list = Array.isArray(task.subtasks) ? task.subtasks : [];
      const frag = document.createDocumentFragment();
      list.forEach(sub => {
        const sLi = document.createElement('li');
        sLi.className = `subtask${sub.completed ? ' completed' : ''}`;
        sLi.dataset.id = sub.id;
        const sCb = document.createElement('input');
        sCb.type = 'checkbox';
        sCb.checked = !!sub.completed;
        sCb.className = 'sub-checkbox';
        const sTitle = document.createElement('span');
        sTitle.className = 'sub-title';
        sTitle.textContent = sub.title;
        const sDel = document.createElement('button');
        sDel.type = 'button';
        sDel.className = 'ghost-button danger small';
        sDel.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        sDel.title = 'Delete subtask';
        if (isCurrentFolderLocked()) {
          sCb.style.display = 'none';
          sDel.style.display = 'none';
        }
        sCb.addEventListener('change', () => {
          const checked = sCb.checked;
          updateSubtask(task.id, sub.id, { completed: checked });
        });
        sDel.addEventListener('click', () => {
          deleteSubtask(task.id, sub.id);
        });
        sLi.append(sCb, sTitle, sDel);
        frag.appendChild(sLi);
      });
      subList.appendChild(frag);
    }

    // Always render contents
    renderSubtasks();

    subForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = subInput.value.trim();
      if (!val) return;
      addSubtask(task.id, val);
      subInput.value = '';
      subInput.focus();
    });

    subToggle.addEventListener('click', () => {
      const isHidden = subPanel.hidden;
      subPanel.hidden = !isHidden;
      if (!subPanel.hidden) {
        expandedTasks.add(task.id);
        setTimeout(() => subInput.focus(), 10);
      } else {
        expandedTasks.delete(task.id);
      }
    });

    if (isCurrentFolderLocked()) {
      checkbox.style.display = 'none';
      editBtn.style.display = 'none';
      delBtn.style.display = 'none';
      subToggle.style.display = 'none';
      priorityBtn.style.display = 'none';
      subPanel.style.display = 'none';
    }

    actions.append(priorityBtn, editBtn, delBtn, subToggle);

    li.append(checkbox, content, actions);

    // Editing behavior
    function enterEdit() {
      li.classList.add('editing');
      title.contentEditable = 'true';
      title.focus();
      placeCaretAtEnd(title);
      editBtn.hidden = true;
    }
    function exitEdit(commit) {
      li.classList.remove('editing');
      title.contentEditable = 'false';
      editBtn.hidden = false;
      if (commit) {
        const newTitle = title.textContent || '';
        const trimmed = newTitle.trim().slice(0, 120);
        if (trimmed.length === 0) {
          // Revert to previous title if emptied
          title.textContent = task.title;
          return;
        }
        if (trimmed !== task.title) {
          updateTask(task.id, { title: trimmed });
        }
      } else {
        title.textContent = task.title;
      }
    }

    editBtn.addEventListener('click', () => enterEdit());
    delBtn.addEventListener('click', () => deleteTask(task.id));

    title.addEventListener('keydown', (e) => {
      if (title.contentEditable !== 'true') return;
      if (e.key === 'Enter') { e.preventDefault(); exitEdit(true); }
      if (e.key === 'Escape') { e.preventDefault(); exitEdit(false); }
    });
    title.addEventListener('blur', () => {
      if (title.contentEditable === 'true') exitEdit(true);
    });

    return li;
  }

  function placeCaretAtEnd(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Filters and search
  function setFilter(nextFilter) {
    if (!['all', 'active', 'completed'].includes(nextFilter)) return;
    activeFilter = nextFilter;
    writeStorage(STORAGE_KEYS.filter, activeFilter);
    el.filterButtons.forEach(btn => {
      const isActive = btn.dataset.filter === activeFilter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    render();
  }

  function initFilters() {
    const savedFilter = readStorage(STORAGE_KEYS.filter, 'all');
    setFilter(savedFilter);
    el.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => setFilter(btn.dataset.filter || 'all'));
    });
  }

  function initSearch() {
    const saved = readStorage(STORAGE_KEYS.search, '');
    el.search.value = saved;
    searchQuery = saved.toLowerCase();
    el.search.addEventListener('input', () => {
      searchQuery = el.search.value.trim().toLowerCase();
      writeStorage(STORAGE_KEYS.search, el.search.value.trim());
      render();
    });

    if (el.listSearchInput) {
      el.listSearchInput.addEventListener('input', () => {
        listSearchQuery = el.listSearchInput.value.trim().toLowerCase();
        renderFolders();
      });
    }
  }

  // Removed month/year filter logic

  // Form
  function initForm() {
    el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = el.input.value.trim();
      if (value.length === 0) {
        // simple visual nudge
        el.input.focus();
        el.input.setAttribute('aria-invalid', 'true');
        setTimeout(() => el.input.removeAttribute('aria-invalid'), 500);
        return;
      }
      addTask(value);
      el.input.value = '';
      el.input.focus();
    });
  }

  // Bulk actions
  function initBulk() {
    if (el.dashClearCompletedBtn) {
      el.dashClearCompletedBtn.addEventListener('click', openClearMultipleModal);
    }
    
    if (el.clearMultipleCancel) el.clearMultipleCancel.addEventListener('click', closeClearMultipleModal);
    if (el.confirmClearMultipleCancel) el.confirmClearMultipleCancel.addEventListener('click', closeConfirmClearMultipleModal);
    
    if (el.clearMultipleSelectAll) {
      el.clearMultipleSelectAll.addEventListener('click', () => {
        const checkboxes = el.clearListsContainer.querySelectorAll('.export-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => cb.checked = !allChecked);
        el.clearMultipleSelectAll.textContent = allChecked ? 'Select All' : 'Deselect All';
      });
    }

    if (el.clearMultipleProceed) {
      el.clearMultipleProceed.addEventListener('click', () => {
        const checkboxes = el.clearListsContainer.querySelectorAll('.export-checkbox:checked');
        if (checkboxes.length === 0) {
          alert('Please select at least one list.');
          return;
        }
        openConfirmClearMultipleModal();
      });
    }

    if (el.confirmClearMultipleConfirm) {
      el.confirmClearMultipleConfirm.addEventListener('click', () => {
        const checkboxes = el.clearListsContainer.querySelectorAll('.export-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        executeClearMultipleLists(selectedIds);
      });
    }
  }

  function openClearMultipleModal() {
    if (folders.length === 0) return;
    el.clearMultipleModal.hidden = false;
    el.clearMultipleModal.removeAttribute('hidden');
    el.clearListsContainer.innerHTML = '';
    
    let hasAnyCompleted = false;
    folders.forEach(folder => {
      const folderTasks = tasksByFolder[folder.id] || [];
      const completedCount = folderTasks.filter(t => t.completed).length;
      if (completedCount === 0) return;
      hasAnyCompleted = true;
      
      const label = document.createElement('label');
      label.className = 'export-list-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = folder.id;
      checkbox.checked = true;
      checkbox.className = 'export-checkbox';
      
      const span = document.createElement('span');
      span.textContent = `${folder.name} (${completedCount} completed)`;
      
      label.appendChild(checkbox);
      label.appendChild(span);
      el.clearListsContainer.appendChild(label);
    });
    
    if (!hasAnyCompleted) {
      el.clearListsContainer.innerHTML = '<p style="color: var(--text-dim); font-size: 14px; text-align: center; padding: 20px 0;">No completed tasks found in any list.</p>';
      el.clearMultipleSelectAll.style.display = 'none';
      el.clearMultipleProceed.style.display = 'none';
    } else {
      el.clearMultipleSelectAll.style.display = 'inline-block';
      el.clearMultipleProceed.style.display = 'inline-block';
      el.clearMultipleSelectAll.textContent = 'Deselect All';
    }
  }

  function closeClearMultipleModal() {
    if (el.clearMultipleModal) el.clearMultipleModal.hidden = true;
  }

  function openConfirmClearMultipleModal() {
    el.clearMultipleModal.hidden = true;
    el.confirmClearMultipleModal.hidden = false;
    el.confirmClearMultipleModal.removeAttribute('hidden');
  }
  
  function closeConfirmClearMultipleModal() {
    el.confirmClearMultipleModal.hidden = true;
    if (el.clearMultipleModal) {
      el.clearMultipleModal.hidden = false;
      el.clearMultipleModal.removeAttribute('hidden');
    }
  }

  function executeClearMultipleLists(selectedIds) {
    let totalCleared = 0;
    selectedIds.forEach(folderId => {
      const folderTasks = tasksByFolder[folderId] || [];
      const beforeCount = folderTasks.length;
      tasksByFolder[folderId] = folderTasks.filter(t => !t.completed);
      totalCleared += (beforeCount - tasksByFolder[folderId].length);
    });
    
    if (totalCleared > 0) {
      persistTasks();
      render();
    }
    
    el.confirmClearMultipleModal.hidden = true;
  }

  // Export to Excel
  function exportToExcel() {
    if (!currentFolderId) {
      alert('Please select a list to export.');
      return;
    }
    if (typeof XLSX === 'undefined' || !XLSX || !XLSX.utils) {
      alert('Export library not loaded. Please check your internet connection.');
      return;
    }
    const tasks = getCurrentTasks();
    if (tasks.length === 0) {
      alert('No tasks to export in this list.');
      return;
    }

    const currentFolder = folders.find(f => f.id === currentFolderId);
    const folderName = currentFolder ? currentFolder.name.replace(/[^a-z0-9]/gi, '_') : 'tasks';

    // Prepare data for Excel
    const data = tasks.map(task => ({
      'Title': task.title,
      'Status': task.completed ? 'Completed' : 'Active',
      'Created Date': formatDate(task.createdAt),
      'Created Time': formatTime(task.createdAt),
      'Completed Date': task.completedAt ? formatDate(task.completedAt) : '',
      'Completed Time': task.completedAt ? formatTime(task.completedAt) : '',
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

    // Generate filename with folder name and current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `${folderName}_${date}.xlsx`;

    // Write file
    XLSX.writeFile(wb, filename);
  }

  // Export multiple lists to Excel
  function exportMultipleLists(selectedFolderIds) {
    if (selectedFolderIds.length === 0) {
      alert('Please select at least one list to export.');
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    let sheetCount = 0;

    // Add a sheet for each selected folder
    selectedFolderIds.forEach(folderId => {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;

      const folderTasks = tasksByFolder[folderId] || [];

      // Skip empty folders
      if (folderTasks.length === 0) return;

      // Prepare data for Excel
      const data = folderTasks.map(task => ({
        'Title': task.title,
        'Status': task.completed ? 'Completed' : 'Active',
        'Created Date': formatDate(task.createdAt),
        'Created Time': formatTime(task.createdAt),
        'Completed Date': task.completedAt ? formatDate(task.completedAt) : '',
        'Completed Time': task.completedAt ? formatTime(task.completedAt) : '',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Clean folder name for sheet name (Excel sheet names have limitations: max 31 chars, no special chars)
      let sheetName = folder.name.replace(/[\\\/\?\*\[\]:]/g, '_').substring(0, 31);
      if (!sheetName) sheetName = 'List';

      // Ensure unique sheet names
      let finalSheetName = sheetName;
      let counter = 1;
      while (wb.SheetNames.includes(finalSheetName)) {
        const baseName = sheetName.substring(0, Math.max(1, 28 - String(counter).length));
        finalSheetName = `${baseName}_${counter}`;
        counter++;
        if (counter > 99) break; // Safety limit
      }

      XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
      sheetCount++;
    });

    if (sheetCount === 0) {
      alert('No tasks found in the selected lists.');
      return;
    }

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `multiple_lists_${date}.xlsx`;

    // Write file
    XLSX.writeFile(wb, filename);
    closeExportMultipleModal();
    alert(`Successfully exported ${sheetCount} list(s) to ${filename}`);
  }

  // Open export multiple modal
  function openExportMultipleModal() {
    if (folders.length === 0) {
      alert('No lists available to export.');
      return;
    }

    el.exportMultipleModal.hidden = false;
    el.exportMultipleModal.removeAttribute('hidden');

    // Clear container
    el.exportListsContainer.innerHTML = '';

    // Create checkboxes for each folder
    folders.forEach(folder => {
      const taskCount = tasksByFolder[folder.id] ? tasksByFolder[folder.id].length : 0;

      const label = document.createElement('label');
      label.className = 'export-list-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = folder.id;
      checkbox.checked = true; // Select all by default
      checkbox.className = 'export-checkbox';

      const span = document.createElement('span');
      span.textContent = `${folder.name} (${taskCount} task${taskCount !== 1 ? 's' : ''})`;

      label.appendChild(checkbox);
      label.appendChild(span);
      el.exportListsContainer.appendChild(label);
    });

    // Update Select All button text
    el.exportMultipleSelectAll.textContent = 'Deselect All';
  }

  // Close export multiple modal
  function closeExportMultipleModal() {
    el.exportMultipleModal.hidden = true;
    el.exportMultipleModal.setAttribute('hidden', '');
  }

  // Import from Excel
  function importFromExcel(file) {
    if (!currentFolderId) {
      alert('Please select a list to import into.');
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          alert('The Excel file appears to be empty.');
          return;
        }

        // Ask user if they want to replace or merge
        const shouldReplace = confirm(
          `Found ${jsonData.length} tasks in the file.\n\n` +
          'Click OK to replace all existing tasks in this list, or Cancel to merge with existing tasks.'
        );

        const importedTasks = [];
        jsonData.forEach((row, index) => {
          // Try to map common column names
          const title = row['Title'] || row['title'] || row['Task'] || row['task'] || row['Name'] || row['name'] || '';
          const status = row['Status'] || row['status'] || row['Completed'] || row['completed'] || '';
          const isCompleted = status.toString().toLowerCase() === 'completed' || status === true || status === 1;

          if (title && title.toString().trim()) {
            // Parse dates from Excel
            const createdDateStr = row['Created Date'] || row['created date'] || row['CreatedDate'] || '';
            const createdTimeStr = row['Created Time'] || row['created time'] || row['CreatedTime'] || '';
            const completedDateStr = row['Completed Date'] || row['completed date'] || row['CompletedDate'] || '';
            const completedTimeStr = row['Completed Time'] || row['completed time'] || row['CompletedTime'] || '';

            // Parse created date/time
            let createdAt = parseDateTime(createdDateStr, createdTimeStr);
            if (!createdAt) {
              createdAt = now(); // Fallback to current time if parsing fails
            }

            // Parse completed date/time
            let completedAt = null;
            if (isCompleted && completedDateStr) {
              completedAt = parseDateTime(completedDateStr, completedTimeStr);
              if (!completedAt) {
                completedAt = createdAt; // Fallback to created date if parsing fails
              }
            } else if (isCompleted) {
              completedAt = createdAt; // Use created date if no completed date provided
            }

            importedTasks.push({
              id: uid(),
              title: title.toString().trim().slice(0, 120),
              completed: isCompleted,
              createdAt: createdAt,
              updatedAt: completedAt || createdAt,
              completedAt: completedAt,
            });
          }
        });

        if (importedTasks.length === 0) {
          alert('No valid tasks found in the Excel file. Please ensure the file has a "Title" column.');
          return;
        }

        if (!tasksByFolder[currentFolderId]) {
          tasksByFolder[currentFolderId] = [];
        }

        if (shouldReplace) {
          tasksByFolder[currentFolderId] = importedTasks;
        } else {
          // Merge: add imported tasks to existing ones
          tasksByFolder[currentFolderId] = [...importedTasks, ...tasksByFolder[currentFolderId]];
        }

        persistTasks();
        render();
        alert(`Successfully imported ${importedTasks.length} task(s) into the current list.`);
      } catch (error) {
        console.error('Import error:', error);
        alert('Error importing file. Please ensure it is a valid Excel file.');
      }
    };
    reader.onerror = function () {
      alert('Error reading file.');
    };
    reader.readAsArrayBuffer(file);
  }

  // Initialize import/export
  function initImportExport() {
    if (el.exportBtn) {
      el.exportBtn.addEventListener('click', exportToExcel);
    }

    // Export multiple lists
    if (el.exportMultipleBtn) {
      el.exportMultipleBtn.addEventListener('click', openExportMultipleModal);
    }

    // Export multiple modal handlers
    if (el.exportMultipleCancel) {
      el.exportMultipleCancel.addEventListener('click', closeExportMultipleModal);
    }

    if (el.exportMultipleSelectAll) {
      el.exportMultipleSelectAll.addEventListener('click', () => {
        const checkboxes = el.exportListsContainer.querySelectorAll('.export-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => {
          cb.checked = !allChecked;
        });
        el.exportMultipleSelectAll.textContent = allChecked ? 'Select All' : 'Deselect All';
      });
    }

    if (el.exportMultipleExport) {
      el.exportMultipleExport.addEventListener('click', () => {
        const checkboxes = el.exportListsContainer.querySelectorAll('.export-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        exportMultipleLists(selectedIds);
      });
    }

    // Click outside modal to close
    if (el.exportMultipleModal) {
      el.exportMultipleModal.addEventListener('click', (e) => {
        if (e.target === el.exportMultipleModal) {
          closeExportMultipleModal();
        }
      });
    }

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
      if (el.exportMultipleModal && e.key === 'Escape' && !el.exportMultipleModal.hidden) {
        closeExportMultipleModal();
      }
    });

    if (el.importBtn) {
      el.importBtn.addEventListener('click', () => {
        if (!currentFolderId) {
          alert('Please select a list to import into.');
          return;
        }
        el.importFile.click();
      });
    }
    if (el.importFile) {
      el.importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          importFromExcel(file);
          // Reset file input so same file can be selected again
          e.target.value = '';
        }
      });
    }
  }

  // Initialize folders
  function initFolders() {
    // Ensure modal starts closed
    el.folderModal.hidden = true;
    el.folderModal.setAttribute('hidden', '');

    el.addFolderBtn.addEventListener('click', () => openFolderModal());

    // Click outside modal to close
    el.folderModal.addEventListener('click', (e) => {
      if (e.target === el.folderModal) {
        closeFolderModal();
      }
    });

    // Prevent modal content clicks from closing modal
    const modalContent = el.folderModal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !el.folderModal.hidden) {
        closeFolderModal();
      }
    });
  }

  // Load
  function load() {
    // Load folders
    folders = readStorage(STORAGE_KEYS.folders, []);
    if (!Array.isArray(folders)) folders = [];

    // Load tasks by folder
    tasksByFolder = readStorage(STORAGE_KEYS.tasks, {});
    if (typeof tasksByFolder !== 'object') tasksByFolder = {};

    // Attempt cookie recovery if localStorage is empty
    try {
      if (folders.length === 0) {
        const cookieFolders = readCookieJSON(STORAGE_KEYS.folders);
        if (Array.isArray(cookieFolders) && cookieFolders.length > 0) {
          folders = cookieFolders;
        }
      }
      if (Object.keys(tasksByFolder).length === 0) {
        const cookieTasks = readCookieJSON(STORAGE_KEYS.tasks) ||
          readCookieJSON('tm_tasks_v1') || readCookieJSON('tm_tasks') || readCookieJSON('tasks') || readCookieJSON('todo_list');
        if (cookieTasks && typeof cookieTasks === 'object') {
          tasksByFolder = cookieTasks;
        }
      }
    } catch (_) {
      // ignore cookie parsing errors
    }

    // Migration: if old format exists, migrate to new format
    // Migration: Attempt to recover data from older versions
    // Check for v1 data
    const oldTasksV1 = readStorage('tm_tasks_v1', []);
    // Check for legacy data (pre-v1, commonly used keys)
    const oldTasksLegacy = readStorage('tm_tasks', []) || readStorage('tasks', []) || readStorage('todo_list', []);

    const hasV1Data = Array.isArray(oldTasksV1) && oldTasksV1.length > 0;
    const hasLegacyData = Array.isArray(oldTasksLegacy) && oldTasksLegacy.length > 0;

    // Only migrate if we have no current data (to avoid overwriting or duplicates on every reload)
    // OR if the user explicitly asks for it (but we don't have a button for that yet)
    // We'll migrate if folders list is empty, assuming it's a fresh or broken state.
    if (folders.length === 0 && (hasV1Data || hasLegacyData)) {
      console.log('Migrating old data...');

      const defaultFolder = { id: uid(), name: 'Recovered Tasks', createdAt: now() };
      folders.push(defaultFolder);

      // Combine sources if compatible, or prioritize V1
      let tasksToMigrate = hasV1Data ? oldTasksV1 : oldTasksLegacy;

      // Sanitize and format tasks
      tasksToMigrate = tasksToMigrate.map(t => {
        // Ensure basic structure
        if (typeof t === 'string') return { id: uid(), title: t, completed: false, createdAt: now(), updatedAt: now() };
        return {
          id: t.id || uid(),
          title: t.title || t.name || 'Untitled Task',
          completed: !!(t.completed || t.done),
          createdAt: t.createdAt || now(),
          updatedAt: t.updatedAt || now(),
          completedAt: typeof t.completedAt === 'number' ? t.completedAt : (t.completed ? (t.updatedAt || t.createdAt || now()) : null),
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : []
        };
      });

      tasksByFolder[defaultFolder.id] = tasksToMigrate;

      persistFolders();
      persistTasks();
      alert('We found tasks from a previous version and recovered them into "Recovered Tasks".');
    }

    // Ensure at least one folder exists
    if (folders.length === 0) {
      const defaultFolder = { id: uid(), name: 'My Tasks', createdAt: now() };
      folders.push(defaultFolder);
      tasksByFolder[defaultFolder.id] = [];
      persistFolders();
      persistTasks();
    }

    // Load current folder
    currentFolderId = readStorage(STORAGE_KEYS.currentFolder, null);
    if (!currentFolderId || !folders.find(f => f.id === currentFolderId)) {
      currentFolderId = folders[0].id;
      writeStorage(STORAGE_KEYS.currentFolder, currentFolderId);
    }

    // Ensure all folders have task arrays
    folders.forEach(folder => {
      if (!tasksByFolder[folder.id]) {
        tasksByFolder[folder.id] = [];
      }
      tasksByFolder[folder.id] = tasksByFolder[folder.id].map(t => {
        const completedAt = typeof t.completedAt === 'number' ? t.completedAt : (t.completed ? (t.updatedAt || t.createdAt || now()) : null);
        const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
        return { ...t, completedAt, subtasks };
      });
    });

    // Do not overwrite storage unless we actually migrated/created defaults above
  }

  // Sidebar Toggle
  function initSidebarToggle() {
    if (!el.sidebarToggle || !el.sidebarOverlay || !el.leftPanel) return;

    const container = document.querySelector('.container');

    function isMobile() {
      return window.innerWidth <= 1024;
    }

    function openSidebar() {
      if (isMobile()) {
        el.leftPanel.classList.add('active');
        el.sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        el.leftPanel.classList.remove('collapsed');
        if (container) container.classList.remove('sidebar-collapsed');
      }
    }

    function closeSidebar() {
      if (isMobile()) {
        el.leftPanel.classList.remove('active');
        el.sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
      } else {
        el.leftPanel.classList.add('collapsed');
        if (container) container.classList.add('sidebar-collapsed');
      }
    }

    function isSidebarOpen() {
      if (isMobile()) {
        return el.leftPanel.classList.contains('active');
      } else {
        return !el.leftPanel.classList.contains('collapsed');
      }
    }

    el.sidebarToggle.addEventListener('click', () => {
      if (isSidebarOpen()) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    el.sidebarOverlay.addEventListener('click', closeSidebar);

    el.foldersList.addEventListener('click', (e) => {
      if (e.target.closest('.folder-item') && isMobile()) {
        setTimeout(closeSidebar, 150);
      }
    });

    window.addEventListener('resize', () => {
      const wasMobile = el.leftPanel.classList.contains('active');
      const wasDesktopCollapsed = el.leftPanel.classList.contains('collapsed');

      if (isMobile()) {
        el.leftPanel.classList.remove('collapsed');
        if (container) container.classList.remove('sidebar-collapsed');
        if (!wasDesktopCollapsed) closeSidebar();
      } else {
        el.leftPanel.classList.remove('active');
        el.sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
        if (wasMobile) openSidebar();
      }
    });
  }

  function cycleFolder() {
    if (folders.length <= 1) return;
    const currentIndex = folders.findIndex(f => f.id === currentFolderId);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % folders.length;
    switchFolder(folders[nextIndex].id);
  }

  // Keyboard Shortcuts
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable;

      if (isInput && e.key !== 'Escape') {
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        cycleFolder();
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key.toLowerCase();
      const isModalOpen = !el.folderModal.hidden || !el.exportMultipleModal.hidden || (document.getElementById('profileModal') && !document.getElementById('profileModal').hidden) || (el.confirmDeleteModal && !el.confirmDeleteModal.hidden) || (el.changelogModal && !el.changelogModal.hidden);

      if (e.key === 'Escape') {
        if (!el.folderModal.hidden) closeFolderModal();
        if (!el.exportMultipleModal.hidden) el.exportMultipleModal.hidden = true;
        if (el.confirmDeleteModal && !el.confirmDeleteModal.hidden) {
          closeConfirmDeleteModal(false);
        }
        if (el.changelogModal && !el.changelogModal.hidden) {
          el.changelogModal.hidden = true;
        }

        const profileModal = document.getElementById('profileModal');
        if (profileModal && !profileModal.hidden) profileModal.hidden = true;

        if (isInput) {
          active.blur();
        }
        return;
      }

      if (isModalOpen) return;
      if (key === 'n') {
        e.preventDefault();
        el.input.focus();
      } else if (key === '/') {
        e.preventDefault();
        el.search.focus();
      } else if (key === 't') {
        toggleTheme();
      } else if (key === 'a') {
        setFilter('all');
      } else if (key === '1') {
        setFilter('active');
      } else if (key === '2') {
        setFilter('completed');
      } else if (key === 'l') {
        e.preventDefault();
        toggleCurrentFolderLock();
      } else if (key === 's') {
        e.preventDefault();
        if (el.sidebarToggle) {
          el.sidebarToggle.click();
        }
      } else if (key === 'c') {
        e.preventDefault();
        cycleAccentColor();
      }
    });
  }

  function renderAccentColorPicker() {
    const container = el.accentColorContainer;
    if (!container) return;
    container.innerHTML = '';
    
    const currentAccent = readStorage('tm_accent_color', 'green');
    const theme = document.documentElement.getAttribute('data-theme') || 'light';

    Object.keys(ACCENT_COLORS).forEach(colorKey => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const colorHex = ACCENT_COLORS[colorKey][theme];
      btn.style.width = '36px';
      btn.style.height = '36px';
      btn.style.borderRadius = '50%';
      btn.style.backgroundColor = colorHex;
      btn.style.border = colorKey === currentAccent ? '3px solid var(--text)' : '1px solid var(--border)';
      btn.style.cursor = 'pointer';
      btn.style.padding = '0';
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.setAttribute('title', colorKey.charAt(0).toUpperCase() + colorKey.slice(1));
      btn.setAttribute('aria-label', `Select ${colorKey} accent color`);

      if (colorKey === currentAccent) {
        const check = document.createElement('span');
        check.textContent = '✓';
        check.style.color = theme === 'dark' ? '#000000' : '#ffffff';
        check.style.fontWeight = 'bold';
        check.style.fontSize = '14px';
        btn.appendChild(check);
      }

      btn.addEventListener('click', () => {
        writeStorage('tm_accent_color', colorKey);
        applyAccentColor();
        renderAccentColorPicker();
        render();
      });

      container.appendChild(btn);
    });
  }

  function initDashboard() {
    if (!el.dashboardBtn) return;

    el.dashboardBtn.addEventListener('click', () => {
      currentView = 'dashboard';
      renderFolders();
      render();
    });
  }

  function renderDashboard() {
    renderAccentColorPicker();

    let totalTasksCount = 0;
    let totalCompletedCount = 0;
    Object.values(tasksByFolder).forEach(listTasks => {
      totalTasksCount += listTasks.length;
      totalCompletedCount += listTasks.filter(t => t.completed).length;
    });
    const rate = totalTasksCount > 0 ? Math.round((totalCompletedCount / totalTasksCount) * 100) : 0;
    el.dashCompletionRate.textContent = `${rate}% (${totalCompletedCount}/${totalTasksCount})`;

    const completedDates = [];
    Object.values(tasksByFolder).forEach(listTasks => {
      listTasks.forEach(task => {
        if (task.completed && task.completedAt) {
          completedDates.push(new Date(task.completedAt).toDateString());
        }
      });
    });
    
    const uniqueDates = Array.from(new Set(completedDates)).map(d => new Date(d));
    uniqueDates.sort((a, b) => b - a);

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const normalizedTimes = uniqueDates.map(d => {
      const copy = new Date(d);
      copy.setHours(0,0,0,0);
      return copy.getTime();
    });

    if (normalizedTimes.length > 0) {
      if (normalizedTimes[0] === today.getTime() || normalizedTimes[0] === yesterday.getTime()) {
        currentStreak = 1;
        let expectedTime = normalizedTimes[0];
        for (let i = 1; i < normalizedTimes.length; i++) {
          expectedTime -= 24 * 60 * 60 * 1000;
          if (normalizedTimes[i] === expectedTime) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
    el.dashCurrentStreak.textContent = `${currentStreak} day${currentStreak !== 1 ? 's' : ''}`;

    let maxStreak = 0;
    let tempStreak = 0;
    if (normalizedTimes.length > 0) {
      tempStreak = 1;
      maxStreak = 1;
      for (let i = 1; i < normalizedTimes.length; i++) {
        const diff = normalizedTimes[i - 1] - normalizedTimes[i];
        if (diff === 24 * 60 * 60 * 1000) {
          tempStreak++;
        } else if (diff > 24 * 60 * 60 * 1000) {
          if (tempStreak > maxStreak) {
            maxStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    }
    el.dashMaxStreak.textContent = `${maxStreak} day${maxStreak !== 1 ? 's' : ''}`;

    let activeTasksCount = 0;
    let totalCompletionTime = 0;
    let completedCountWithDates = 0;
    
    Object.values(tasksByFolder).forEach(listTasks => {
      listTasks.forEach(task => {
        if (!task.completed) {
          activeTasksCount++;
        } else if (task.completedAt && task.createdAt) {
          const diffMs = task.completedAt - task.createdAt;
          if (diffMs >= 0) {
            totalCompletionTime += diffMs;
            completedCountWithDates++;
          }
        }
      });
    });

    el.dashActiveTasks.textContent = activeTasksCount;

    let avgCompletionTimeStr = "N/A";
    if (completedCountWithDates > 0) {
      const avgMs = totalCompletionTime / completedCountWithDates;
      const avgHours = avgMs / (1000 * 60 * 60);
      if (avgHours < 24) {
        const roundedHours = Math.round(avgHours);
        avgCompletionTimeStr = `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
      } else {
        const avgDays = avgHours / 24;
        const roundedDays = Math.round(avgDays);
        avgCompletionTimeStr = `${roundedDays} day${roundedDays !== 1 ? 's' : ''}`;
      }
    }
    el.dashAvgTime.textContent = avgCompletionTimeStr;

    const weekdayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let maxDay = -1;
    let maxCount = 0;
    Object.values(tasksByFolder).forEach(listTasks => {
      listTasks.forEach(task => {
        if (task.completed && task.completedAt) {
          const day = new Date(task.completedAt).getDay();
          weekdayCounts[day]++;
        }
      });
    });
    for (let i = 0; i < 7; i++) {
      if (weekdayCounts[i] > maxCount) {
        maxCount = weekdayCounts[i];
        maxDay = i;
      }
    }
    el.dashBusiestDay.textContent = maxDay !== -1 && maxCount > 0 ? `${weekdayNames[maxDay]} (${maxCount} completed)` : "No tasks completed yet";

    // Distribution
    el.dashListDistribution.innerHTML = '';
    folders.forEach(folder => {
      const listTasks = tasksByFolder[folder.id] || [];
      const count = listTasks.length;
      const completed = listTasks.filter(t => t.completed).length;
      const pct = count > 0 ? Math.round((completed / count) * 100) : 0;

      const item = document.createElement('div');
      item.style.marginBottom = '4px';

      const labelRow = document.createElement('div');
      labelRow.style.display = 'flex';
      labelRow.style.justifyContent = 'space-between';
      labelRow.style.fontSize = '13px';
      labelRow.style.marginBottom = '6px';

      const folderNameSpan = document.createElement('span');
      folderNameSpan.textContent = folder.name;
      folderNameSpan.style.fontWeight = '500';

      const statsSpan = document.createElement('span');
      statsSpan.textContent = `${pct}% (${completed}/${count})`;
      statsSpan.style.color = 'var(--text-dim)';

      labelRow.append(folderNameSpan, statsSpan);

      const track = document.createElement('div');
      track.style.height = '6px';
      track.style.background = 'var(--bg-subtle)';
      track.style.borderRadius = '3px';
      track.style.overflow = 'hidden';

      const bar = document.createElement('div');
      bar.style.height = '100%';
      bar.style.width = `${pct}%`;
      bar.style.background = 'var(--accent)';
      bar.style.transition = 'width 0.5s ease-out';

      track.appendChild(bar);
      item.append(labelRow, track);
      el.dashListDistribution.appendChild(item);
    });

    // High Priority List
    el.dashPriorityList.innerHTML = '';
    let priorityCount = 0;

    folders.forEach(folder => {
      const listTasks = tasksByFolder[folder.id] || [];
      listTasks.forEach(task => {
        if (task.highPriority) {
          priorityCount++;
          
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.justifyContent = 'space-between';
          row.style.padding = '8px 12px';
          row.style.background = 'var(--bg-subtle)';
          row.style.borderRadius = 'var(--radius)';
          row.style.border = '1px solid var(--border)';

          const left = document.createElement('div');
          left.style.display = 'flex';
          left.style.alignItems = 'center';
          left.style.gap = '8px';
          left.style.flex = '1';
          left.style.minWidth = '0';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = task.completed;
          cb.addEventListener('change', () => {
            const checked = cb.checked;
            const idx = tasksByFolder[folder.id].findIndex(t => t.id === task.id);
            if (idx !== -1) {
              tasksByFolder[folder.id][idx] = {
                ...tasksByFolder[folder.id][idx],
                completed: checked,
                completedAt: checked ? now() : null,
                updatedAt: now()
              };
              persistTasks();
              renderDashboard();
              render();
            }
          });

          const titleSpan = document.createElement('span');
          titleSpan.textContent = task.title;
          titleSpan.style.fontSize = '13px';
          titleSpan.style.textDecoration = task.completed ? 'line-through' : 'none';
          titleSpan.style.color = task.completed ? 'var(--text-dim)' : 'var(--text)';
          titleSpan.style.overflow = 'hidden';
          titleSpan.style.textOverflow = 'ellipsis';
          titleSpan.style.whiteSpace = 'nowrap';

          const folderSpan = document.createElement('span');
          folderSpan.textContent = ` [${folder.name}]`;
          folderSpan.style.fontSize = '10px';
          folderSpan.style.color = 'var(--text-muted)';
          folderSpan.style.marginLeft = '4px';

          left.append(cb, titleSpan, folderSpan);

          const right = document.createElement('button');
          right.type = 'button';
          right.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
          right.style.border = 'none';
          right.style.background = 'transparent';
          right.style.cursor = 'pointer';
          right.style.color = 'var(--danger)';
          right.style.padding = '0 4px';
          right.setAttribute('title', 'Remove high priority');
          
          right.addEventListener('click', () => {
            const idx = tasksByFolder[folder.id].findIndex(t => t.id === task.id);
            if (idx !== -1) {
              tasksByFolder[folder.id][idx] = {
                ...tasksByFolder[folder.id][idx],
                highPriority: false,
                updatedAt: now()
              };
              persistTasks();
              renderDashboard();
              render();
            }
          });

          row.append(left, right);
          el.dashPriorityList.appendChild(row);
        }
      });
    });

    document.getElementById('dashPriorityCount').textContent = priorityCount;
    if (priorityCount === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'No high priority tasks yet.';
      emptyMsg.style.fontSize = '12px';
      emptyMsg.style.color = 'var(--text-muted)';
      emptyMsg.style.margin = '4px 0';
      el.dashPriorityList.appendChild(emptyMsg);
    }
  }

  // Init
  function init() {
    // Ensure modal is closed on startup
    if (el.folderModal) {
      el.folderModal.hidden = true;
      el.folderModal.setAttribute('hidden', '');
    }
    if (el.confirmDeleteModal) {
      el.confirmDeleteModal.hidden = true;
      el.confirmDeleteModal.setAttribute('hidden', '');
    }

    initElements(); // Must be first!
    load();
    initTheme();
    initFolders();
    initFilters();
    initSearch();
    initForm();
    initBulk();
    initImportExport();
    initConfirmDeleteModal();
    initDashboard();
    initLockToggle();
    initChartVisibility();
    initChangelog();
    initKeyboardShortcuts();
    initSidebarToggle();
    renderFolders();
    render();
  }

  function initLockToggle() {
    if (!el.lockToggleBtn) return;
    el.lockToggleBtn.addEventListener('click', () => {
      toggleCurrentFolderLock();
    });
  }

  function initChartVisibility() {
    if (!el.toggleChartBtn) return;
    
    let isVisible = readStorage('tm_show_chart_v2', true);
    
    const updateVisibility = (visible) => {
      const container = el.monthlyChart ? el.monthlyChart.closest('.chart-container') : null;
      if (container) {
        container.style.display = visible ? '' : 'none';
      }
      el.toggleChartBtn.textContent = visible ? 'Hide Chart' : 'Show Chart';
    };
    
    updateVisibility(isVisible);
    
    el.toggleChartBtn.addEventListener('click', () => {
      isVisible = !isVisible;
      writeStorage('tm_show_chart_v2', isVisible);
      updateVisibility(isVisible);
    });
  }

  function initChangelog() {
    if (!el.changelogBtn || !el.changelogModal) return;
    
    el.changelogModal.hidden = true;
    el.changelogModal.setAttribute('hidden', '');
    
    el.changelogBtn.addEventListener('click', () => {
      el.changelogModal.hidden = false;
      el.changelogModal.removeAttribute('hidden');
    });
    
    if (el.changelogModalClose) {
      el.changelogModalClose.addEventListener('click', () => {
        el.changelogModal.hidden = true;
        el.changelogModal.setAttribute('hidden', '');
      });
    }
    
    el.changelogModal.addEventListener('click', (e) => {
      if (e.target === el.changelogModal) {
        el.changelogModal.hidden = true;
        el.changelogModal.setAttribute('hidden', '');
      }
    });
  }

  // Activity (monthly chart)
  // Activity (contribution chart)
  function renderActivity(tasks) {
    if (!el.monthlyChart || !el.activityTotals) return;
    const boxSize = 12;
    const boxGap = 4;
    const daysInYear = 365;
    
    // 7 rows (Sunday - Saturday)
    // 53 columns maximum for 365 days + starting offset
    const chartHeight = 7 * (boxSize + boxGap);
    const chartWidth = 53 * (boxSize + boxGap);

    let chartArea = el.monthlyChart.querySelector('#chartArea');
    if (!chartArea) {
      chartArea = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      chartArea.id = 'chartArea';
      el.monthlyChart.appendChild(chartArea);
    }
    chartArea.innerHTML = '';
    el.monthlyChart.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Create an array of the last 365 days
    const days = [];
    for (let i = daysInYear - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      days.push({
        date: d,
        dateStr: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        count: 0
      });
    }

    // Tally completed tasks
    let totalCompleted = 0;
    tasks.forEach(t => {
      if (!t.completedAt) return;
      const d = new Date(t.completedAt);
      const diffTime = today.getTime() - d.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < daysInYear) {
        const index = daysInYear - 1 - diffDays;
        days[index].count += 1;
        totalCompleted += 1;
      }
    });

    if (el.activityLabel) {
      el.activityLabel.textContent = `Activity in the last 365 days`;
    }
    el.activityTotals.textContent = `${totalCompleted} tasks`;

    let tooltip = document.querySelector('.chart-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'chart-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.display = 'none';
      tooltip.style.background = 'var(--bg-panel)';
      tooltip.style.border = '1px solid var(--border)';
      tooltip.style.padding = '6px 12px';
      tooltip.style.borderRadius = '6px';
      tooltip.style.fontSize = '12px';
      tooltip.style.color = 'var(--text)';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.whiteSpace = 'nowrap';
      tooltip.style.zIndex = '9999';
      tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      tooltip.style.fontWeight = '500';
      tooltip.style.transition = 'opacity 0.2s';
      tooltip.style.opacity = '0';
      document.body.appendChild(tooltip);
    }

    // Determine max to scale colors
    const max = Math.max(1, ...days.map(d => d.count));

    // Determine starting column offset (day of week for the first day)
    const firstDay = days[0].date.getDay(); 
    let currentCol = 0;
    let currentRow = firstDay;

    days.forEach((day, i) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const x = currentCol * (boxSize + boxGap);
      const y = currentRow * (boxSize + boxGap);
      
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', boxSize);
      rect.setAttribute('height', boxSize);
      rect.setAttribute('rx', 3);
      
      if (day.count === 0) {
        rect.setAttribute('fill', 'var(--border)'); // subtle grey/border color
        rect.style.opacity = '0.4';
      } else {
        const intensity = Math.min(1, 0.3 + (day.count / max) * 0.7);
        rect.setAttribute('fill', 'var(--accent)');
        rect.style.opacity = intensity;
      }

      rect.addEventListener('mouseenter', (e) => {
        if (window.innerWidth <= 1024) return; // Disable tooltip on mobile
        
        tooltip.textContent = `${day.count} task${day.count === 1 ? '' : 's'} on ${day.dateStr}`;
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        
        const tooltipX = e.pageX;
        const tooltipY = e.pageY - 30; // above cursor
        
        tooltip.style.left = `${tooltipX}px`;
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.top = `${tooltipY}px`;
      });
      
      rect.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.display = 'none';
      });

      chartArea.appendChild(rect);

      currentRow++;
      if (currentRow === 7) {
        currentRow = 0;
        currentCol++;
      }
    });
  }

  function formatDateTime(ts) {
    try {
      const d = new Date(ts);
      const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
      const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      return `${date}, ${time}`;
    } catch (_) {
      return '';
    }
  }

  function formatDate(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    } catch (_) {
      return '';
    }
  }

  function formatTime(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '';
    }
  }

  // Parse date and time from Excel import
  function parseDateTime(dateStr, timeStr) {
    if (!dateStr) return null;

    try {
      // Handle Date objects (Excel sometimes returns these)
      if (dateStr instanceof Date) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          // Add time if provided
          if (timeStr) {
            const timeParts = parseTime(timeStr);
            if (timeParts) {
              date.setHours(timeParts.hours, timeParts.minutes, timeParts.seconds || 0, 0);
            }
          }
          return date.getTime();
        }
      }

      // Try parsing as Excel serial date (number)
      if (typeof dateStr === 'number') {
        // Excel serial date: days since January 1, 1900
        const excelEpoch = new Date(1900, 0, 1);
        const days = dateStr - 2; // Excel has a bug where it treats 1900 as a leap year
        const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);

        // Add time if provided
        if (timeStr) {
          const timeParts = parseTime(timeStr);
          if (timeParts) {
            date.setHours(timeParts.hours, timeParts.minutes, timeParts.seconds || 0, 0);
          }
        }

        return date.getTime();
      }

      // Try parsing as date string
      let date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Try common date formats
        const formats = [
          /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
          /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
          /(\w{3})\s+(\d{1,2}),\s+(\d{4})/, // Mon DD, YYYY
        ];

        for (const format of formats) {
          const match = dateStr.match(format);
          if (match) {
            if (format === formats[0]) {
              // MM/DD/YYYY or DD/MM/YYYY - try both
              const month = parseInt(match[1]);
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              if (month > 12) {
                // Likely DD/MM/YYYY
                date = new Date(year, day - 1, month);
              } else {
                // Likely MM/DD/YYYY
                date = new Date(year, month - 1, day);
              }
            } else if (format === formats[1]) {
              // YYYY-MM-DD
              date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            } else if (format === formats[2]) {
              // Mon DD, YYYY
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const month = monthNames.indexOf(match[1]);
              date = new Date(parseInt(match[3]), month, parseInt(match[2]));
            }
            break;
          }
        }
      }

      if (isNaN(date.getTime())) {
        return null;
      }

      // Add time if provided
      if (timeStr) {
        const timeParts = parseTime(timeStr);
        if (timeParts) {
          date.setHours(timeParts.hours, timeParts.minutes, timeParts.seconds || 0, 0);
        }
      }

      return date.getTime();
    } catch (_) {
      return null;
    }
  }

  // Parse time string (HH:MM AM/PM or HH:MM:SS)
  function parseTime(timeStr) {
    if (!timeStr) return null;

    try {
      // Handle Excel time format (decimal fraction of a day)
      if (typeof timeStr === 'number') {
        const totalSeconds = Math.floor(timeStr * 24 * 60 * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return { hours, minutes, seconds };
      }

      // Handle string formats
      const timeStrClean = timeStr.toString().trim();

      // Try 12-hour format (HH:MM AM/PM)
      const amPmMatch = timeStrClean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
      if (amPmMatch) {
        let hours = parseInt(amPmMatch[1]);
        const minutes = parseInt(amPmMatch[2]);
        const seconds = amPmMatch[3] ? parseInt(amPmMatch[3]) : 0;
        const amPm = amPmMatch[4].toUpperCase();

        if (amPm === 'PM' && hours !== 12) hours += 12;
        if (amPm === 'AM' && hours === 12) hours = 0;

        return { hours, minutes, seconds };
      }

      // Try 24-hour format (HH:MM or HH:MM:SS)
      const timeMatch = timeStrClean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
        return { hours, minutes, seconds };
      }

      return null;
    } catch (_) {
      return null;
    }
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
