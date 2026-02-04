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
  let activeFilter = 'all'; // all | active | completed
  let searchQuery = '';
  let selectedMonth = ''; // '' for all months, or 'YYYY-MM' format
  let selectedYear = ''; // '' for all years, or 'YYYY'
  const expandedTasks = new Set(); // Track expanded sublists

  // Get current folder's tasks
  const getCurrentTasks = () => {
    if (!currentFolderId) return [];
    return tasksByFolder[currentFolderId] || [];
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
      folderModalCancel: document.getElementById('folderModalCancel'),
      folderModalTitle: document.getElementById('folderModalTitle'),
      keyboardHintBtn: document.getElementById('keyboardHintBtn'),
      shortcutsModal: document.getElementById('shortcutsModal'),
      shortcutsClose: document.getElementById('shortcutsClose'),
      sidebarToggle: document.getElementById('sidebarToggle'),
      sidebarOverlay: document.getElementById('sidebarOverlay'),
      leftPanel: document.querySelector('.left-panel'),
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

    if (el.themeToggle) {
      el.themeToggle.addEventListener('click', toggleTheme);
    }
  }

  // Folders CRUD
  function createFolder(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (folders.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A list with this name already exists.');
      return null;
    }
    const folder = { id: uid(), name: trimmed, createdAt: now() };
    folders.push(folder);
    tasksByFolder[folder.id] = [];
    persistFolders();
    persistTasks();
    renderFolders();
    switchFolder(folder.id);
    return folder;
  }

  function renameFolder(id, newName) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    if (folders.some(f => f.id !== id && f.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A list with this name already exists.');
      return;
    }
    folder.name = trimmed;
    persistFolders();
    renderFolders();
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
    writeStorage(STORAGE_KEYS.currentFolder, currentFolderId);
    renderFolders();
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

  function deleteTask(id) {
    if (!currentFolderId || !tasksByFolder[currentFolderId]) return;
    const next = tasksByFolder[currentFolderId].filter(t => t.id !== id);
    if (next.length === tasksByFolder[currentFolderId].length) return;
    tasksByFolder[currentFolderId] = next;
    persistTasks();
    render();
  }

  function clearCompleted() {
    if (!currentFolderId || !tasksByFolder[currentFolderId]) return;
    const tasks = tasksByFolder[currentFolderId];
    const anyCompleted = tasks.some(t => t.completed);
    if (!anyCompleted) return;
    tasksByFolder[currentFolderId] = tasks.filter(t => !t.completed);
    persistTasks();
    render();
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
    folders.forEach(folder => {
      const li = document.createElement('li');
      li.className = `folder-item${folder.id === currentFolderId ? ' active' : ''}`;
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
      if (!name) {
        el.folderNameInput.focus();
        return;
      }

      if (currentModalFolderId) {
        renameFolder(currentModalFolderId, name);
      } else {
        createFolder(name);
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
    currentModalFolderId = null;
    // Reset form to clear any validation states
    el.folderForm.reset();
  }

  function render() {
    const tasks = getCurrentTasks();
    const { total, completed, filtered } = getRenderData(tasks);
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
    filtered.forEach(task => {
      try {
        fragment.appendChild(renderTaskItem(task));
      } catch (err) {
        console.error('Render task failed', err);
      }
    });
    el.tasks.appendChild(fragment);
    // Activity
    renderActivity(tasks);
    // Update month filter dropdown
    populateMonthFilter();
  }

  function getRenderData(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const filtered = tasks.filter(task => {
      // Filter by status (all/active/completed)
      if (activeFilter === 'active' && task.completed) return false;
      if (activeFilter === 'completed' && !task.completed) return false;

      // Filter by year and month (createdAt-based for list)
      if (selectedYear) {
        const taskYear = new Date(task.createdAt).getFullYear().toString();
        if (taskYear !== selectedYear) return false;
      }
      if (selectedMonth) {
        const taskDate = new Date(task.createdAt);
        const taskMonth = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}`;
        if (taskMonth !== selectedMonth) return false;
      }

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

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'edit';
    editBtn.textContent = 'Edit';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'save';
    saveBtn.textContent = 'Save';
    saveBtn.hidden = true;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete';
    delBtn.textContent = 'Delete';

    const subToggle = document.createElement('button');
    subToggle.type = 'button';
    subToggle.className = 'ghost-button';
    subToggle.textContent = '+'; // Minimal add button
    subToggle.setAttribute('title', 'Add subtask');

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
        sDel.textContent = '×';
        sDel.title = 'Delete subtask';
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

    actions.append(editBtn, saveBtn, delBtn, subToggle);

    li.append(checkbox, content, actions);

    // Editing behavior
    function enterEdit() {
      li.classList.add('editing');
      title.contentEditable = 'true';
      title.focus();
      placeCaretAtEnd(title);
      editBtn.hidden = true;
      saveBtn.hidden = false;
    }
    function exitEdit(commit) {
      li.classList.remove('editing');
      title.contentEditable = 'false';
      editBtn.hidden = false;
      saveBtn.hidden = true;
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
    saveBtn.addEventListener('click', () => exitEdit(true));
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
  }

  function populateMonthFilter() {
    if (!el.monthFilter) return;

    const tasks = getCurrentTasks();
    const monthsSet = new Set();

    // Add months from tasks (consider both createdAt and completedAt)
    tasks.forEach(task => {
      const sources = [task.createdAt, task.completedAt].filter(Boolean);
      sources.forEach(ts => {
        const d = new Date(ts);
        const year = d.getFullYear();
        const month = d.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        // If a year is selected, only include months from that year
        if (!selectedYear || selectedYear === String(year)) {
          monthsSet.add(JSON.stringify({ key: monthKey, year, month }));
        }
      });
    });

    // Sort months (newest first)
    const months = Array.from(monthsSet)
      .map(str => JSON.parse(str))
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    // Store current selection
    const currentSelection = el.monthFilter.value;

    // Clear and populate dropdown
    el.monthFilter.innerHTML = '<option value="">All Months</option>';
    months.forEach(({ key, year, month }) => {
      const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const option = document.createElement('option');
      option.value = key;
      option.textContent = monthName;
      el.monthFilter.appendChild(option);
    });

    // Restore selection if it still exists
    if (currentSelection && months.some(m => m.key === currentSelection)) {
      el.monthFilter.value = currentSelection;
    } else {
      // Set saved value
      const savedMonth = readStorage(STORAGE_KEYS.monthFilter, '');
      if (savedMonth && months.some(m => m.key === savedMonth)) {
        el.monthFilter.value = savedMonth;
        selectedMonth = savedMonth;
      } else {
        el.monthFilter.value = '';
        selectedMonth = '';
      }
    }
  }

  function populateYearFilter() {
    if (!el.yearFilter) return;
    const tasks = getCurrentTasks();
    const yearsSet = new Set();
    tasks.forEach(task => {
      const sources = [task.createdAt, task.completedAt].filter(Boolean);
      sources.forEach(ts => {
        const y = new Date(ts).getFullYear();
        yearsSet.add(y);
      });
    });
    const years = Array.from(yearsSet).sort((a, b) => b - a);
    const currentSelection = el.yearFilter.value;
    el.yearFilter.innerHTML = '<option value="">All Years</option>';
    years.forEach(y => {
      const option = document.createElement('option');
      option.value = String(y);
      option.textContent = String(y);
      el.yearFilter.appendChild(option);
    });
    if (currentSelection && years.includes(parseInt(currentSelection, 10))) {
      el.yearFilter.value = currentSelection;
    } else {
      const savedYear = readStorage(STORAGE_KEYS.yearFilter, '');
      if (savedYear && years.includes(parseInt(savedYear, 10))) {
        el.yearFilter.value = savedYear;
        selectedYear = savedYear;
      } else {
        el.yearFilter.value = '';
        selectedYear = '';
      }
    }
  }

  function initMonthFilter() {
    populateYearFilter();
    populateMonthFilter();

    el.monthFilter.addEventListener('change', () => {
      selectedMonth = el.monthFilter.value;
      writeStorage(STORAGE_KEYS.monthFilter, selectedMonth);
      render();
    });
    if (el.yearFilter) {
      el.yearFilter.addEventListener('change', () => {
        selectedYear = el.yearFilter.value;
        writeStorage(STORAGE_KEYS.yearFilter, selectedYear);
        // Reset month if it no longer matches the selected year
        if (selectedMonth && (!selectedYear || selectedMonth.split('-')[0] !== selectedYear)) {
          selectedMonth = '';
          writeStorage(STORAGE_KEYS.monthFilter, selectedMonth);
        }
        populateMonthFilter();
        render();
      });
    }
  }

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
    el.clearCompleted.addEventListener('click', clearCompleted);
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

  // Keyboard Shortcuts Modal
  function initKeyboardShortcuts() {
    if (!el.keyboardHintBtn || !el.shortcutsModal || !el.shortcutsClose) return;

    el.keyboardHintBtn.addEventListener('click', () => {
      el.shortcutsModal.hidden = false;
    });

    el.shortcutsClose.addEventListener('click', () => {
      el.shortcutsModal.hidden = true;
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !el.shortcutsModal.hidden) {
        el.shortcutsModal.hidden = true;
      }
    });

    // Close on outside click
    el.shortcutsModal.addEventListener('click', (e) => {
      if (e.target === el.shortcutsModal) {
        el.shortcutsModal.hidden = true;
      }
    });
  }

  // Init
  function init() {
    // Ensure modal is closed on startup
    if (el.folderModal) {
      el.folderModal.hidden = true;
      el.folderModal.setAttribute('hidden', '');
    }

    initElements(); // Must be first!
    load();
    initTheme();
    initFolders();
    initFilters();
    initSearch();
    initMonthFilter();
    initForm();
    initBulk();
    initImportExport();
    initSidebarToggle();
    initKeyboardShortcuts();
    renderFolders();
    render();
  }

  // Activity (monthly chart)
  function renderActivity(tasks) {
    if (!el.monthlyChart || !el.activityTotals) return;
    const chartHeight = 180;
    const chartWidth = 1000;
    const padding = 40;
    const plotHeight = chartHeight - padding * 2;
    const plotWidth = chartWidth - padding * 2;
    let chartArea = el.monthlyChart.querySelector('#chartArea');
    if (!chartArea) {
      chartArea = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      chartArea.id = 'chartArea';
      el.monthlyChart.appendChild(chartArea);
    }
    chartArea.innerHTML = '';

    // Helper to draw a single bar
    const drawBar = (x, y, width, height, title) => {
      if (height <= 0) return;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', width);
      rect.setAttribute('height', height);
      rect.setAttribute('fill', 'var(--accent)');
      rect.setAttribute('rx', '2'); // rounded corners
      if (title) {
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        titleEl.textContent = title;
        rect.appendChild(titleEl);
      }
      chartArea.appendChild(rect);
    };

    if (selectedMonth) {
      // Days of the Month View
      const parts = selectedMonth.split('-');
      const ySel = parseInt(parts[0], 10);
      const mSel = parseInt(parts[1], 10) - 1;
      const daysInMonth = new Date(ySel, mSel + 1, 0).getDate();
      const dayCounts = Array.from({ length: daysInMonth }, () => 0);
      let totalCompleted = 0;
      tasks.forEach(t => {
        if (!t.completedAt) return;
        const d = new Date(t.completedAt);
        if (d.getFullYear() === ySel && d.getMonth() === mSel) {
          const day = d.getDate() - 1;
          dayCounts[day] += 1;
          totalCompleted += 1;
        }
      });
      const max = Math.max(1, ...dayCounts);

      // Draw bars
      const barWidth = Math.max(2, (plotWidth / daysInMonth) - 2); // Dynamic width
      dayCounts.forEach((count, idx) => {
        const xCenter = padding + (idx / (daysInMonth - 1)) * plotWidth; // rough positioning
        // Better positioning for bars:
        const x = padding + (idx * (plotWidth / daysInMonth)) + ((plotWidth / daysInMonth) - barWidth) / 2;

        const barHeight = (count / max) * plotHeight;
        const y = padding + plotHeight - barHeight;

        drawBar(x, y, barWidth, barHeight, `${new Date(ySel, mSel, idx + 1).toLocaleDateString()}: ${count} tasks`);
      });

      // Axis labels (Simplified)
      if (el.xAxisLabels) {
        el.xAxisLabels.innerHTML = '';
        const interval = daysInMonth > 20 ? 5 : 2;
        for (let d = 1; d <= daysInMonth; d++) {
          if (d === 1 || d === daysInMonth || d % interval === 0) {
            const label = document.createElement('span');
            label.textContent = String(d);
            label.className = 'x-axis-label';
            label.style.left = `${((d - 1) / (daysInMonth - 1)) * 100}%`;
            el.xAxisLabels.appendChild(label);
          }
        }
      }
      if (el.activityLabel) {
        const monthName = new Date(ySel, mSel, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        el.activityLabel.textContent = `Completed • ${monthName}`;
      }
      el.activityTotals.textContent = `${totalCompleted} tasks`;

      // Y-Axis
      if (el.yAxisMax) {
        el.yAxisMax.textContent = max;
        el.yAxisMid.textContent = Math.round(max / 2);
        el.yAxisMin.textContent = 0;
      }

    } else {
      // Year View (Months)
      const year = selectedYear ? parseInt(selectedYear, 10) : new Date().getFullYear();
      const monthCounts = Array.from({ length: 12 }, () => 0);
      let totalCompleted = 0;
      tasks.forEach(t => {
        if (!t.completedAt) return;
        const d = new Date(t.completedAt);
        if (d.getFullYear() === year) {
          const month = d.getMonth();
          monthCounts[month] += 1;
          totalCompleted += 1;
        }
      });
      const max = Math.max(1, ...monthCounts);

      const barWidth = (plotWidth / 12) - 10; // Wider bars for months

      monthCounts.forEach((count, idx) => {
        const x = padding + (idx * (plotWidth / 12)) + ((plotWidth / 12) - barWidth) / 2;
        const barHeight = (count / max) * plotHeight;
        const y = padding + plotHeight - barHeight;

        const monthName = new Date(year, idx, 1).toLocaleDateString('en-US', { month: 'long' });
        drawBar(x, y, barWidth, barHeight, `${monthName}: ${count} tasks`);
      });

      if (el.yAxisMax) {
        el.yAxisMax.textContent = max.toString();
        el.yAxisMid.textContent = Math.ceil(max / 2).toString();
        el.yAxisMin.textContent = '0';
      }

      if (el.xAxisLabels) {
        el.xAxisLabels.innerHTML = '';
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthNames.forEach((monthName, idx) => {
          const label = document.createElement('span');
          label.textContent = monthName;
          label.className = 'x-axis-label';
          // Fix centering for month labels
          label.style.left = `${(idx / 12 * 100) + (100 / 24)}%`;
          label.style.transform = 'translateX(-50%)';
          el.xAxisLabels.appendChild(label);
        });
      }
      if (el.activityLabel) {
        el.activityLabel.textContent = `Activity • ${year}`;
      }
      el.activityTotals.textContent = `${totalCompleted} tasks`;
    }
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
