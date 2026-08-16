import { el } from './dom.js';
import { state, getCurrentTasks, isCurrentFolderLocked, persistFolders, persistTasks } from './state.js';
import { readStorage, writeStorage, readCookieJSON, now, uid, STORAGE_KEYS } from './storage.js';
import { debounce } from './utils.js';
import { renderFolders, openFolderModal, closeFolderModal, switchFolder, toggleCurrentFolderLock, shareFolder } from './folders.js';
import { addTask, initConfirmDeleteModal, closeConfirmDeleteModal, getRenderData, renderTaskItem } from './tasks.js';
import { loadSchedules, renderScheduledView, createSchedule } from './schedules.js';
import { renderCategoriesView, expandAllCategories, collapseAllCategories } from './categories.js';

// DOM elements cache builder
function initElements() {
  el.form = document.getElementById('taskForm');
  el.input = document.getElementById('taskInput');
  el.tasks = document.getElementById('tasks');
  el.empty = document.getElementById('emptyState');
  el.clearCompleted = document.getElementById('clearCompleted');
  el.filterButtons = Array.from(document.querySelectorAll('.filters .chip'));
  el.search = document.getElementById('searchInput');
  el.yearFilter = document.getElementById('yearFilter');
  el.monthFilter = document.getElementById('monthFilter');
  el.monthlyChart = document.getElementById('monthlyChart');
  el.activityLabel = document.getElementById('activityLabel');
  el.activityTotals = document.getElementById('activityTotals');
  el.yAxisMax = document.getElementById('yAxisMax');
  el.yAxisMid = document.getElementById('yAxisMid');
  el.yAxisMin = document.getElementById('yAxisMin');
  el.xAxisLabels = document.getElementById('xAxisLabels');
  el.exportBtn = document.getElementById('exportBtn');
  el.exportWordBtn = document.getElementById('exportWordBtn');
  el.exportMultipleBtn = document.getElementById('exportMultipleBtn');
  el.exportMultipleWord = document.getElementById('exportMultipleWord');
  el.exportMultipleModal = document.getElementById('exportMultipleModal');
  el.exportListsContainer = document.getElementById('exportListsContainer');
  el.exportMultipleCancel = document.getElementById('exportMultipleCancel');
  el.exportMultipleSelectAll = document.getElementById('exportMultipleSelectAll');
  el.exportMultipleExport = document.getElementById('exportMultipleExport');
  el.importBtn = document.getElementById('importBtn');
  el.importFile = document.getElementById('importFile');
  el.foldersList = document.getElementById('foldersList');
  el.addFolderBtn = document.getElementById('addFolderBtn');
  el.folderModal = document.getElementById('folderModal');
  el.folderForm = document.getElementById('folderForm');
  el.folderNameInput = document.getElementById('folderNameInput');
  el.folderDescriptionInput = document.getElementById('folderDescriptionInput');
  el.folderModalCancel = document.getElementById('folderModalCancel');
  el.folderModalTitle = document.getElementById('folderModalTitle');
  el.activeListNameDisplay = document.getElementById('activeListNameDisplay');
  el.listDescriptionDisplay = document.getElementById('listDescriptionDisplay');
  el.listSearchInput = document.getElementById('listSearchInput');
  el.sidebarToggle = document.getElementById('sidebarToggle');
  el.sidebarOverlay = document.getElementById('sidebarOverlay');
  el.leftPanel = document.querySelector('.left-panel');
  el.confirmDeleteModal = document.getElementById('confirmDeleteModal');
  el.confirmDeleteMessage = document.getElementById('confirmDeleteMessage');
  el.confirmDeleteCancel = document.getElementById('confirmDeleteCancel');
  el.confirmDeleteConfirm = document.getElementById('confirmDeleteConfirm');
  el.dashboardBtn = document.getElementById('dashboardBtn');
  el.settingsBtn = document.getElementById('settingsBtn');
  el.allTasksBtn = document.getElementById('allTasksBtn');
  el.tasksView = document.getElementById('tasksView');
  el.dashboardView = document.getElementById('dashboardView');
  el.settingsView = document.getElementById('settingsView');
  el.categoriesView = document.getElementById('categoriesView');
  el.categoriesBtn = document.getElementById('categoriesBtn');
  el.expandAllCategoriesBtn = document.getElementById('expandAllCategoriesBtn');
  el.collapseAllCategoriesBtn = document.getElementById('collapseAllCategoriesBtn');
  el.amoledToggle = document.getElementById('amoledToggle');
  el.dashCompletionRate = document.getElementById('dashCompletionRate');
  el.dashCurrentStreak = document.getElementById('dashCurrentStreak');
  el.dashMaxStreak = document.getElementById('dashMaxStreak');
  el.dashActiveTasks = document.getElementById('dashActiveTasks');
  el.dashPriorityRatio = document.getElementById('dashPriorityRatio');
  el.dashWeeklyGoal = document.getElementById('dashWeeklyGoal');
  el.dashStagnantTasks = document.getElementById('dashStagnantTasks');
  el.dashBusiestDay = document.getElementById('dashBusiestDay');
  el.dashListDistribution = document.getElementById('dashListDistribution');
  el.dashPriorityList = document.getElementById('dashPriorityList');
  el.accentColorContainer = document.getElementById('accentColorContainer');
  el.lockToggleBtn = document.getElementById('lockToggleBtn');
  el.lockToggleIcon = document.getElementById('lockToggleIcon');
  el.lockToggleText = document.getElementById('lockToggleText');
  el.shareListBtn = document.getElementById('shareListBtn');
  el.activeListNameDisplay = document.getElementById('activeListNameDisplay');
  el.toggleChartBtn = document.getElementById('toggleChartBtn');
  el.changelogBtn = document.getElementById('changelogBtn');
  el.changelogModal = document.getElementById('changelogModal');
  el.changelogModalClose = document.getElementById('changelogModalClose');
  el.dashClearCompletedBtn = document.getElementById('dashClearCompletedBtn');
  el.clearMultipleModal = document.getElementById('clearMultipleModal');
  el.clearListsContainer = document.getElementById('clearListsContainer');
  el.clearMultipleCancel = document.getElementById('clearMultipleCancel');
  el.clearMultipleSelectAll = document.getElementById('clearMultipleSelectAll');
  el.clearMultipleProceed = document.getElementById('clearMultipleProceed');
  el.confirmClearMultipleModal = document.getElementById('confirmClearMultipleModal');
  el.confirmClearMultipleCancel = document.getElementById('confirmClearMultipleCancel');
  el.confirmClearMultipleConfirm = document.getElementById('confirmClearMultipleConfirm');
  el.dashboardContributionChart = document.getElementById('dashboardContributionChart');
  el.chartListSelector = document.getElementById('chartListSelector');
  el.timerDisplay = document.getElementById('pomodoroTimeDisplay');
  el.timerStartPauseBtn = document.getElementById('pomodoroStartBtn');
  el.timerResetBtn = document.getElementById('pomodoroResetBtn');
  el.timerHistory = document.getElementById('timerHistory');
  el.pomodoroCard = document.getElementById('pomodoroCard');
  el.pomodoroClockView = document.getElementById('pomodoroClockView');
  el.pomodoroStatusIcon = document.getElementById('pomodoroStatusIcon');
  el.pomodoroProgressRing = document.getElementById('pomodoroProgressRing');
}

export function render() {
  renderRightSidebarDistribution();

  if (state.currentView === 'settings') {
    if (el.tasksView) el.tasksView.style.display = 'none';
    if (el.dashboardView) el.dashboardView.style.display = 'none';
    if (el.settingsView) el.settingsView.style.display = 'block';
    if (el.dashboardBtn) el.dashboardBtn.classList.remove('active');
    if (el.settingsBtn) el.settingsBtn.classList.add('active');
    renderAccentColorPicker();
    renderShortcutsUI();
    return;
  }

  if (state.currentView === 'dashboard') {
    if (el.tasksView) el.tasksView.style.display = 'none';
    if (el.settingsView) el.settingsView.style.display = 'none';
    if (el.dashboardView) el.dashboardView.style.display = 'block';
    if (el.dashboardBtn) el.dashboardBtn.classList.add('active');
    if (el.settingsBtn) el.settingsBtn.classList.remove('active');
    renderDashboard();
    return;
  }

  if (el.tasksView) el.tasksView.style.display = 'block';
  if (el.dashboardView) el.dashboardView.style.display = 'none';
  if (el.settingsView) el.settingsView.style.display = 'none';
  if (el.dashboardBtn) el.dashboardBtn.classList.remove('active');
  if (el.settingsBtn) el.settingsBtn.classList.remove('active');

  const tasks = getCurrentTasks();
  const { total, completed, filtered } = getRenderData(tasks);

  // Render list description
  const currentFolder = state.folders.find(f => f.id === state.currentFolderId);

  const addTaskSec = document.querySelector('.add-task');
  if (addTaskSec) addTaskSec.style.display = 'block';

  if (el.tasks) el.tasks.style.display = 'grid';
  
  const controlsSec = document.querySelector('.controls');
  if (controlsSec) controlsSec.style.display = 'flex';

  const searchComp = document.querySelector('.expandable-search');
  if (searchComp) searchComp.style.display = 'flex';

  const shareBtn = document.getElementById('shareListBtn');
  if (shareBtn) shareBtn.style.display = 'inline-flex';

  if (el.lockToggleBtn) {
    el.lockToggleBtn.style.display = 'inline-flex';
  }
  if (currentFolder) {
    if (el.activeListNameDisplay) {
      el.activeListNameDisplay.textContent = `${currentFolder.type === 'scheduled' ? '⏰ ' : ''}${currentFolder.name}`;
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
      el.input.placeholder = isLocked 
        ? 'This list is locked...' 
        : (currentFolder.type === 'scheduled' ? 'Add alarm schedule (e.g. 07:30 AM Workout)...' : 'Add a task...');
    }
    const addBtn = el.form ? el.form.querySelector('button[type="submit"]') : null;
    if (addBtn) {
      addBtn.disabled = isLocked;
    }
    if (el.listDescriptionDisplay) {
      if (currentFolder.description) {
        el.listDescriptionDisplay.textContent = currentFolder.description;
        el.listDescriptionDisplay.style.display = 'block';
      } else {
        el.listDescriptionDisplay.style.display = 'none';
      }
    }
  }

  // Route to Scheduled Alarm View if type is 'scheduled'
  if (state.currentView !== 'allTasks' && currentFolder && currentFolder.type === 'scheduled') {
    renderScheduledView(currentFolder.id);
    return;
  }

  // Empty state
  el.empty.hidden = filtered.length !== 0 || (state.searchQuery.length > 0 || state.activeFilter !== 'all' || state.selectedMonth);

  // Progress (REMOVED)

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

  // Activity chart
  if (state.currentView === 'dashboard') lazyRenderDashboardChart();
}

function renderRightSidebarDistribution() {
  const container = document.getElementById('rightSidebarDistribution');
  const countSpan = document.getElementById('rightSidebarTotalCount');
  if (!container) return;

  container.innerHTML = '';

  let grandTotalTasks = 0;
  const folderData = [];

  state.folders.forEach(folder => {
    const listTasks = state.tasksByFolder[folder.id] || [];
    grandTotalTasks += listTasks.length;
    const completedCount = listTasks.filter(t => t.completed).length;
    folderData.push({
      folder,
      total: listTasks.length,
      completed: completedCount
    });
  });

  if (countSpan) {
    countSpan.textContent = `${grandTotalTasks} task${grandTotalTasks !== 1 ? 's' : ''}`;
  }

  if (folderData.length === 0) {
    container.innerHTML = '<div style="font-size: 12px; color: var(--text-dim); font-style: italic;">No task lists found.</div>';
    return;
  }

  folderData.forEach(({ folder, total, completed }) => {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isCurrent = folder.id === state.currentFolderId && state.currentView === 'tasks';

    const item = document.createElement('div');
    item.className = `right-panel-dist-item${isCurrent ? ' active' : ''}`;
    item.style.cursor = 'pointer';
    item.style.padding = '8px 10px';
    item.style.borderRadius = 'var(--radius)';
    item.style.border = '1px solid var(--border)';
    item.style.background = isCurrent ? 'var(--bg-subtle)' : 'var(--bg)';
    item.style.transition = 'all 0.2s ease';
    item.title = `Click to switch to ${folder.name}`;
    item.addEventListener('click', () => switchFolder(folder.id));

    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'space-between';
    topRow.style.alignItems = 'center';
    topRow.style.fontSize = '12.5px';
    topRow.style.fontWeight = '500';
    topRow.style.marginBottom = '6px';

    const nameSpan = document.createElement('span');
    nameSpan.style.color = isCurrent ? 'var(--accent)' : 'var(--text)';
    nameSpan.style.fontWeight = isCurrent ? '600' : '500';
    nameSpan.style.overflow = 'hidden';
    nameSpan.style.textOverflow = 'ellipsis';
    nameSpan.style.whiteSpace = 'nowrap';
    nameSpan.style.maxWidth = '150px';
    nameSpan.textContent = `${folder.type === 'scheduled' ? '⏰ ' : ''}${folder.name}`;

    const countLabel = document.createElement('span');
    countLabel.style.fontSize = '11px';
    countLabel.style.color = 'var(--text-dim)';
    countLabel.textContent = `${completed}/${total} (${pct}%)`;

    topRow.append(nameSpan, countLabel);

    const barBg = document.createElement('div');
    barBg.style.height = '6px';
    barBg.style.background = 'var(--bg-subtle)';
    barBg.style.borderRadius = '3px';
    barBg.style.overflow = 'hidden';
    barBg.style.width = '100%';

    const barFill = document.createElement('div');
    barFill.style.height = '100%';
    barFill.style.width = `${pct}%`;
    barFill.style.background = isCurrent ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 60%, var(--border))';
    barFill.style.borderRadius = '3px';
    barFill.style.transition = 'width 0.3s ease';

    barBg.appendChild(barFill);
    item.append(topRow, barBg);
    container.appendChild(item);
  });
}

// Theme
function initTheme() {
  document.documentElement.setAttribute('data-theme', 'dark');
  applyAccentColor();
}

const GRADIENT_COLORS = {
  green: 'linear-gradient(135deg, #34d399, #059669)',
  blue: 'linear-gradient(135deg, #60a5fa, #2563eb)',
  indigo: 'linear-gradient(135deg, #818cf8, #4f46e5)',
  purple: 'linear-gradient(135deg, #a855f7, #7e22ce)',
  pink: 'linear-gradient(135deg, #f472b6, #db2777)',
  red: 'linear-gradient(135deg, #f87171, #dc2626)',
  orange: 'linear-gradient(135deg, #fb923c, #ea580c)',
  amber: 'linear-gradient(135deg, #fbbf24, #d97706)',
  teal: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
  cyan: 'linear-gradient(135deg, #22d3ee, #0891b2)'
};

function applyAccentColor() {
  const currentAccent = readStorage('tm_accent_color', 'green');
  const gradVal = GRADIENT_COLORS[currentAccent] || GRADIENT_COLORS.green;
  document.documentElement.style.setProperty('--accent-gradient', gradVal);
  
  const colorVal = state.ACCENT_COLORS[currentAccent] ? state.ACCENT_COLORS[currentAccent].dark : state.ACCENT_COLORS.green.dark;
  document.documentElement.style.setProperty('--accent', colorVal);
  document.documentElement.style.removeProperty('--text');
  
  const amoled = readStorage('tm_amoled_theme', false);
  if (amoled) {
    document.documentElement.style.setProperty('--bg', '#000000');
    document.documentElement.style.setProperty('--bg-subtle', '#0a0a0a');
    document.documentElement.style.setProperty('--bg-panel', '#121212');
    document.documentElement.style.setProperty('--border', '#262626');
    document.documentElement.style.setProperty('--chart-empty', '#1a1a1a');
  } else {
    document.documentElement.style.removeProperty('--bg');
    document.documentElement.style.removeProperty('--bg-subtle');
    document.documentElement.style.removeProperty('--bg-panel');
    document.documentElement.style.removeProperty('--border');
    document.documentElement.style.removeProperty('--chart-empty');
  }
}

function cycleAccentColor() {
  const keys = Object.keys(state.ACCENT_COLORS);
  const currentAccent = readStorage('tm_accent_color', 'green');
  const idx = keys.indexOf(currentAccent);
  const nextAccent = keys[(idx + 1) % keys.length];
  writeStorage('tm_accent_color', nextAccent);
  applyAccentColor();
  if (state.currentView === 'dashboard') {
    renderAccentColorPicker();
  }
  render();
}

function renderAccentColorPicker() {
  const container = el.accentColorContainer;
  if (!container) return;
  container.innerHTML = '';
  
  const currentAccent = readStorage('tm_accent_color', 'green');
  const theme = document.documentElement.getAttribute('data-theme') || 'light';

  Object.keys(state.ACCENT_COLORS).forEach(colorKey => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const colorHex = state.ACCENT_COLORS[colorKey][theme];
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

    btn.addEventListener('click', () => {
      writeStorage('tm_accent_color', colorKey);
      applyAccentColor();
      renderAccentColorPicker();
      render();
    });

    container.appendChild(btn);
  });
}

// Bulk Actions
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
  if (state.folders.length === 0) return;
  el.clearMultipleModal.hidden = false;
  el.clearMultipleModal.removeAttribute('hidden');
  el.clearListsContainer.innerHTML = '';
  
  let hasAnyCompleted = false;
  state.folders.forEach(folder => {
    const folderTasks = state.tasksByFolder[folder.id] || [];
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
    const folderTasks = state.tasksByFolder[folderId] || [];
    const beforeCount = folderTasks.length;
    state.tasksByFolder[folderId] = folderTasks.filter(t => !t.completed);
    totalCleared += (beforeCount - state.tasksByFolder[folderId].length);
  });
  
  if (totalCleared > 0) {
    persistTasks();
    render();
  }
  
  el.confirmClearMultipleModal.hidden = true;
}

// Export to Excel
function exportToExcel() {
  if (!state.currentFolderId) {
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

  const currentFolder = state.folders.find(f => f.id === state.currentFolderId);
  const folderName = currentFolder ? currentFolder.name.replace(/[^a-z0-9]/gi, '_') : 'tasks';

  const data = tasks.map(task => ({
    'Title': task.title,
    'Status': task.completed ? 'Completed' : 'Active',
    'Created Date': formatDate(task.createdAt),
    'Created Time': formatTime(task.createdAt),
    'Completed Date': task.completedAt ? formatDate(task.completedAt) : '',
    'Completed Time': task.completedAt ? formatTime(task.completedAt) : '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

  const date = new Date().toISOString().split('T')[0];
  const filename = `${folderName}_${date}.xlsx`;

  XLSX.writeFile(wb, filename);
}

// Export to Word Document
function exportToWord(selectedFolderIds = null) {
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let foldersToExport = [];
  if (selectedFolderIds && selectedFolderIds.length > 0) {
    foldersToExport = state.folders.filter(f => selectedFolderIds.includes(f.id));
  } else if (state.currentView === 'allTasks') {
    foldersToExport = [...state.folders];
  } else if (state.currentFolderId) {
    const curr = state.folders.find(f => f.id === state.currentFolderId);
    if (curr) foldersToExport = [curr];
  } else if (state.folders.length > 0) {
    foldersToExport = [...state.folders];
  }

  if (foldersToExport.length === 0) {
    alert('No lists available to export.');
    return;
  }

  let totalTasksExported = 0;
  let htmlSections = '';

  foldersToExport.forEach(folder => {
    const tasks = state.tasksByFolder[folder.id] || [];
    if (tasks.length === 0) return;

    totalTasksExported += tasks.length;

    let descHtml = folder.description 
      ? `<div class="list-description">${escapeHtml(folder.description)}</div>` 
      : '';

    let rowsHtml = '';
    tasks.forEach(task => {
      const statusClass = task.completed ? 'status-completed' : 'status-active';
      const statusText = task.completed ? 'Completed' : 'Active';
      const titleClass = task.completed ? 'task-title completed' : 'task-title';
      const priorityBadge = task.highPriority ? '<span class="priority-badge"> 🚩 High Priority</span>' : '';
      
      let subtasksHtml = '';
      if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        subtasksHtml = '<div style="margin-top: 4px;">';
        task.subtasks.forEach(sub => {
          const subSymbol = sub.completed ? '☑' : '☐';
          subtasksHtml += `<div class="subtask-item">${subSymbol} ${escapeHtml(sub.title)}</div>`;
        });
        subtasksHtml += '</div>';
      }

      rowsHtml += `
        <tr>
          <td>
            <div class="${titleClass}">${escapeHtml(task.title)}${priorityBadge}</div>
            ${subtasksHtml}
          </td>
          <td class="${statusClass}">${statusText}</td>
          <td>${formatDate(task.createdAt)} ${formatTime(task.createdAt)}</td>
          <td>${task.completedAt ? `${formatDate(task.completedAt)} ${formatTime(task.completedAt)}` : '-'}</td>
        </tr>
      `;
    });

    htmlSections += `
      <div class="section-header">${escapeHtml(folder.type === 'scheduled' ? '⏰ ' : '')}${escapeHtml(folder.name)}</div>
      ${descHtml}
      <table class="task-table">
        <thead>
          <tr>
            <th style="width: 50%;">Task Name</th>
            <th style="width: 15%;">Status</th>
            <th style="width: 17.5%;">Created Date</th>
            <th style="width: 17.5%;">Completed Date</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  });

  if (totalTasksExported === 0) {
    alert('No tasks found in the selected lists.');
    return;
  }

  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

  const wordDocumentHtml = `
    <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
    <meta charset='utf-8'>
    <title>Squash Tasks Export</title>
    <style>
      body { font-family: 'Segoe UI', 'Calibri', Arial, sans-serif; color: #1f2937; margin: 40px; }
      .doc-title { font-size: 24pt; font-weight: bold; color: #0f172a; border-bottom: 3px solid #2563eb; padding-bottom: 8px; margin-bottom: 24px; }
      .meta-header { font-size: 10pt; color: #64748b; margin-bottom: 20px; }
      .section-header { font-size: 18pt; font-weight: bold; color: #1d4ed8; margin-top: 28px; margin-bottom: 8px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; page-break-after: avoid; }
      .list-description { font-size: 10.5pt; font-style: italic; color: #64748b; margin-bottom: 12px; }
      .task-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .task-table th { background-color: #f1f5f9; color: #334155; text-align: left; padding: 8px 10px; font-size: 10.5pt; border-bottom: 2px solid #cbd5e1; font-weight: bold; }
      .task-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10.5pt; vertical-align: top; }
      .status-active { color: #2563eb; font-weight: bold; }
      .status-completed { color: #16a34a; font-weight: bold; }
      .task-title { font-weight: 500; }
      .task-title.completed { text-decoration: line-through; color: #64748b; }
      .subtask-item { font-size: 9.5pt; color: #475569; margin-left: 12px; margin-top: 3px; }
      .priority-badge { color: #dc2626; font-weight: bold; font-size: 9pt; }
    </style>
    </head>
    <body>
      <div class="doc-title">Squash • Task Export</div>
      <div class="meta-header">Generated on ${dateStr} • ${totalTasksExported} task(s) total</div>
      ${htmlSections}
    </body>
    </html>
  `;

  const filename = foldersToExport.length === 1 
    ? `${foldersToExport[0].name.replace(/[^a-z0-9]/gi, '_')}_tasks.doc`
    : `squash_tasks_${new Date().toISOString().split('T')[0]}.doc`;

  const blob = new Blob(['\ufeff', wordDocumentHtml], {
    type: 'application/msword'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (selectedFolderIds && typeof closeExportMultipleModal === 'function') {
    closeExportMultipleModal();
  }
}

function exportMultipleLists(selectedFolderIds) {
  if (selectedFolderIds.length === 0) {
    alert('Please select at least one list to export.');
    return;
  }

  const wb = XLSX.utils.book_new();
  let sheetCount = 0;

  selectedFolderIds.forEach(folderId => {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;

    const folderTasks = state.tasksByFolder[folderId] || [];
    if (folderTasks.length === 0) return;

    const data = folderTasks.map(task => ({
      'Title': task.title,
      'Status': task.completed ? 'Completed' : 'Active',
      'Created Date': formatDate(task.createdAt),
      'Created Time': formatTime(task.createdAt),
      'Completed Date': task.completedAt ? formatDate(task.completedAt) : '',
      'Completed Time': task.completedAt ? formatTime(task.completedAt) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    let sheetName = folder.name.replace(/[\\\/\?\*\[\]:]/g, '_').substring(0, 31);
    if (!sheetName) sheetName = 'List';

    let finalSheetName = sheetName;
    let counter = 1;
    while (wb.SheetNames.includes(finalSheetName)) {
      const baseName = sheetName.substring(0, Math.max(1, 28 - String(counter).length));
      finalSheetName = `${baseName}_${counter}`;
      counter++;
      if (counter > 99) break;
    }

    XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
    sheetCount++;
  });

  if (sheetCount === 0) {
    alert('No tasks found in the selected lists.');
    return;
  }

  const date = new Date().toISOString().split('T')[0];
  const filename = `multiple_lists_${date}.xlsx`;

  XLSX.writeFile(wb, filename);
  closeExportMultipleModal();
  alert(`Successfully exported ${sheetCount} list(s) to ${filename}`);
}

function openExportMultipleModal() {
  if (state.folders.length === 0) {
    alert('No lists available to export.');
    return;
  }

  el.exportMultipleModal.hidden = false;
  el.exportMultipleModal.removeAttribute('hidden');
  el.exportListsContainer.innerHTML = '';

  state.folders.forEach(folder => {
    const taskCount = state.tasksByFolder[folder.id] ? state.tasksByFolder[folder.id].length : 0;

    const label = document.createElement('label');
    label.className = 'export-list-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = folder.id;
    checkbox.checked = true;
    checkbox.className = 'export-checkbox';

    const span = document.createElement('span');
    span.textContent = `${folder.name} (${taskCount} task${taskCount !== 1 ? 's' : ''})`;

    label.appendChild(checkbox);
    label.appendChild(span);
    el.exportListsContainer.appendChild(label);
  });

  el.exportMultipleSelectAll.textContent = 'Deselect All';
}

function closeExportMultipleModal() {
  el.exportMultipleModal.hidden = true;
  el.exportMultipleModal.setAttribute('hidden', '');
}

function importFromExcel(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      let totalImported = 0;
      let newFoldersCreated = 0;

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (jsonData.length === 0) return;

        const importedTasks = [];
        jsonData.forEach((row) => {
          const title = row['Title'] || row['title'] || row['Task'] || row['task'] || row['Name'] || row['name'] || '';
          const status = row['Status'] || row['status'] || row['Completed'] || row['completed'] || '';
          const isCompleted = status.toString().toLowerCase() === 'completed' || status === true || status === 1;

          if (title && title.toString().trim()) {
            const createdDateStr = row['Created Date'] || row['created date'] || row['CreatedDate'] || '';
            const createdTimeStr = row['Created Time'] || row['created time'] || row['CreatedTime'] || '';
            const completedDateStr = row['Completed Date'] || row['completed date'] || row['CompletedDate'] || '';
            const completedTimeStr = row['Completed Time'] || row['completed time'] || row['CompletedTime'] || '';

            let createdAt = parseDateTime(createdDateStr, createdTimeStr);
            if (!createdAt) createdAt = now();

            let completedAt = null;
            if (isCompleted && completedDateStr) {
              completedAt = parseDateTime(completedDateStr, completedTimeStr);
              if (!completedAt) completedAt = createdAt;
            } else if (isCompleted) {
              completedAt = createdAt;
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

        if (importedTasks.length > 0) {
          let finalFolderName = sheetName;
          let counter = 1;
          while (state.folders.some(f => f.name.toLowerCase() === finalFolderName.toLowerCase())) {
            finalFolderName = `${sheetName} (${counter})`;
            counter++;
          }

          const folderId = uid();
          state.folders.push({ id: folderId, name: finalFolderName, createdAt: now() });
          state.tasksByFolder[folderId] = importedTasks;
          totalImported += importedTasks.length;
          newFoldersCreated++;
          state.currentFolderId = folderId;
        }
      });

      if (totalImported === 0) {
        alert('No valid tasks found in the Excel file.');
        return;
      }

      persistFolders();
      persistTasks();
      writeStorage(STORAGE_KEYS.currentFolder, state.currentFolderId);
      renderFolders();
      render();
      alert(`Successfully imported ${totalImported} task(s) into ${newFoldersCreated} new list(s).`);
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

function initImportExport() {
  if (el.exportBtn) {
    el.exportBtn.addEventListener('click', exportToExcel);
  }

  if (el.exportWordBtn) {
    el.exportWordBtn.addEventListener('click', () => exportToWord());
  }

  if (el.exportMultipleBtn) {
    el.exportMultipleBtn.addEventListener('click', openExportMultipleModal);
  }

  if (el.exportMultipleWord) {
    el.exportMultipleWord.addEventListener('click', () => {
      const checkboxes = el.exportListsContainer.querySelectorAll('.export-checkbox:checked');
      const selectedIds = Array.from(checkboxes).map(cb => cb.value);
      exportToWord(selectedIds);
    });
  }

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

  if (el.exportMultipleModal) {
    el.exportMultipleModal.addEventListener('click', (e) => {
      if (e.target === el.exportMultipleModal) {
        closeExportMultipleModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (el.exportMultipleModal && e.key === 'Escape' && !el.exportMultipleModal.hidden) {
      closeExportMultipleModal();
    }
  });

  if (el.importBtn) {
    el.importBtn.addEventListener('click', () => {
      if (!state.currentFolderId) {
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
        e.target.value = '';
      }
    });
  }
}

// Folders Setup
function initFolders() {
  el.folderModal.hidden = true;
  el.folderModal.setAttribute('hidden', '');

  el.addFolderBtn.addEventListener('click', () => openFolderModal());

  el.folderModal.addEventListener('click', (e) => {
    if (e.target === el.folderModal) {
      closeFolderModal();
    }
  });

  const modalContent = el.folderModal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.folderModal.hidden) {
      closeFolderModal();
    }
  });
}

// Load
function load() {
  loadSchedules();
  state.folders = readStorage(STORAGE_KEYS.folders, []);
  if (!Array.isArray(state.folders)) state.folders = [];
  state.categoryOrder = readStorage('tm_category_order_v2', []);
  if (!Array.isArray(state.categoryOrder)) state.categoryOrder = [];

  // Migration: category (string) -> labels (array)
  state.folders.forEach(f => {
    if (f.category !== undefined) {
      if (!f.labels) {
        f.labels = f.category.trim() ? [f.category.trim()] : ['General'];
      }
      delete f.category;
    }
    if (!f.labels || f.labels.length === 0) f.labels = ['General'];
  });

  state.tasksByFolder = readStorage(STORAGE_KEYS.tasks, {});
  if (typeof state.tasksByFolder !== 'object') state.tasksByFolder = {};

  try {
    if (state.folders.length === 0) {
      const cookieFolders = readCookieJSON(STORAGE_KEYS.folders);
      if (Array.isArray(cookieFolders) && cookieFolders.length > 0) {
        state.folders = cookieFolders;
      }
    }
    if (Object.keys(state.tasksByFolder).length === 0) {
      const cookieTasks = readCookieJSON(STORAGE_KEYS.tasks) ||
        readCookieJSON('tm_tasks_v1') || readCookieJSON('tm_tasks') || readCookieJSON('tasks') || readCookieJSON('todo_list');
      if (cookieTasks && typeof cookieTasks === 'object') {
        state.tasksByFolder = cookieTasks;
      }
    }
  } catch (_) {}

  const oldTasksV1 = readStorage('tm_tasks_v1', []);
  const oldTasksLegacy = readStorage('tm_tasks', []) || readStorage('tasks', []) || readStorage('todo_list', []);

  const hasV1Data = Array.isArray(oldTasksV1) && oldTasksV1.length > 0;
  const hasLegacyData = Array.isArray(oldTasksLegacy) && oldTasksLegacy.length > 0;

  if (state.folders.length === 0 && (hasV1Data || hasLegacyData)) {
    const defaultFolder = { id: uid(), name: 'Recovered Tasks', createdAt: now() };
    state.folders.push(defaultFolder);

    let tasksToMigrate = hasV1Data ? oldTasksV1 : oldTasksLegacy;
    tasksToMigrate = tasksToMigrate.map(t => {
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

    state.tasksByFolder[defaultFolder.id] = tasksToMigrate;
    persistFolders();
    persistTasks();
    alert('We found tasks from a previous version and recovered them into "Recovered Tasks".');
  }

  if (state.folders.length === 0) {
    const defaultFolder = { id: uid(), name: 'My Tasks', createdAt: now() };
    state.folders.push(defaultFolder);
    state.tasksByFolder[defaultFolder.id] = [];
    writeStorage(STORAGE_KEYS.folders, state.folders);
    writeStorage(STORAGE_KEYS.tasks, state.tasksByFolder);
  }

  state.currentView = readStorage('tm_current_view_v2', 'tasks');
  state.currentFolderId = readStorage(STORAGE_KEYS.currentFolder, null);
  if (!state.currentFolderId || !state.folders.find(f => f.id === state.currentFolderId)) {
    if (state.folders.length > 0) {
      state.currentFolderId = state.folders[0].id;
      writeStorage(STORAGE_KEYS.currentFolder, state.currentFolderId);
    }
  }

  state.folders.forEach(folder => {
    if (!state.tasksByFolder[folder.id]) {
      state.tasksByFolder[folder.id] = [];
    }
    state.tasksByFolder[folder.id] = state.tasksByFolder[folder.id].map(t => {
      const completedAt = typeof t.completedAt === 'number' ? t.completedAt : (t.completed ? (t.updatedAt || t.createdAt || now()) : null);
      const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
      return { ...t, completedAt, subtasks };
    });
  });

  // Auto cleanup orphan list tasks from deleted lists
  purgeOrphanTasks(false);
}

export function purgeOrphanTasks(showAlert = true) {
  const activeIds = new Set(state.folders.map(f => f.id));
  let purgedCount = 0;

  Object.keys(state.tasksByFolder).forEach(folderId => {
    if (!activeIds.has(folderId)) {
      purgedCount += (state.tasksByFolder[folderId] || []).length;
      delete state.tasksByFolder[folderId];
    }
  });

  if (purgedCount > 0) {
    persistTasks();
  }

  if (showAlert) {
    if (purgedCount > 0) {
      alert(`Successfully purged history for ${purgedCount} task(s) from deleted lists.`);
    } else {
      alert('No orphan task history found. Your history is clean!');
    }
  }
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

  const sidebarNavContainer = document.querySelector('.folders-sidebar');
  if (sidebarNavContainer) {
    sidebarNavContainer.addEventListener('click', (e) => {
      if (e.target.closest('.folder-item') && isMobile()) {
        setTimeout(closeSidebar, 150);
      }
    });
  }

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
  if (state.folders.length <= 1) return;
  const currentIndex = state.folders.findIndex(f => f.id === state.currentFolderId);
  if (currentIndex === -1) return;
  const nextIndex = (currentIndex + 1) % state.folders.length;
  switchFolder(state.folders[nextIndex].id);
}

// Keyboard Shortcuts & Keybinding Recorder
const DEFAULT_SHORTCUTS = {
  newTask: { label: 'New Task', key: 'N' },
  search: { label: 'Search', key: '/' },
  filterAll: { label: 'Filter All', key: 'A' },
  filterActive: { label: 'Filter Active', key: '1' },
  filterCompleted: { label: 'Filter Completed', key: '2' },
  toggleLock: { label: 'Toggle Lock', key: 'L' },
  toggleSidebar: { label: 'Toggle Sidebar', key: 'S' },
  cycleFolder: { label: 'Cycle List', key: 'Alt+T' },
  cycleColor: { label: 'Cycle Color', key: 'C' },
  toggleAmoled: { label: 'Toggle AMOLED', key: 'B' },
  openCategories: { label: 'Open Categories', key: 'M' }
};

let recordingActionKey = null;

function getShortcuts() {
  const saved = readStorage(STORAGE_KEYS.shortcuts, {});
  const result = {};
  Object.keys(DEFAULT_SHORTCUTS).forEach(actionId => {
    result[actionId] = saved[actionId] !== undefined ? saved[actionId] : DEFAULT_SHORTCUTS[actionId].key;
  });
  return result;
}

function formatKeyEvent(e) {
  const isModifierOnly = ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key);
  if (isModifierOnly) return null;

  const parts = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');

  let rawKey = e.key;
  if (rawKey === ' ') rawKey = 'Space';
  
  let displayKey = rawKey;
  if (rawKey.length === 1) {
    displayKey = rawKey.toUpperCase();
  } else if (rawKey.length > 1) {
    displayKey = rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
  }

  return [...parts, displayKey].join('+');
}

function showShortcutConflictModal(combo, actionLabel) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '400px';
  content.style.textAlign = 'center';
  
  const title = document.createElement('h3');
  title.textContent = 'Shortcut Conflict';
  
  const msg = document.createElement('p');
  msg.style.color = 'var(--text-dim)';
  msg.style.fontSize = '14px';
  msg.innerHTML = `The shortcut <strong style="color: var(--text);">${combo}</strong> is already mapped to <strong>${actionLabel}</strong>.<br><br>Please choose a different key combination.`;
  
  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  actions.style.justifyContent = 'center';
  actions.style.marginTop = '24px';
  
  const okBtn = document.createElement('button');
  okBtn.className = 'primary';
  okBtn.textContent = 'Understood';
  okBtn.onclick = () => {
    modal.remove();
  };
  
  actions.appendChild(okBtn);
  content.append(title, msg, actions);
  modal.appendChild(content);
  
  document.body.appendChild(modal);
}

function showRecordingModal(actionId) {
  if (window.currentRecordingModal) {
    window.currentRecordingModal.remove();
  }
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '400px';
  content.style.textAlign = 'center';
  
  const title = document.createElement('h3');
  title.textContent = 'Record Shortcut';
  
  const msg = document.createElement('p');
  msg.style.color = 'var(--text-dim)';
  msg.style.fontSize = '14px';
  msg.innerHTML = `Press a key combination for <strong>${DEFAULT_SHORTCUTS[actionId].label}</strong>.<br><br>Or click Clear to disable this shortcut entirely.`;
  
  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  actions.style.justifyContent = 'center';
  actions.style.marginTop = '24px';
  actions.style.gap = '12px';
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'ghost-button';
  clearBtn.style.color = 'var(--danger)';
  clearBtn.style.borderColor = 'var(--danger)';
  clearBtn.textContent = 'Clear Shortcut';
  clearBtn.onclick = () => {
    const saved = readStorage(STORAGE_KEYS.shortcuts, {});
    saved[actionId] = ''; // disabled
    writeStorage(STORAGE_KEYS.shortcuts, saved);
    recordingActionKey = null;
    modal.remove();
    window.currentRecordingModal = null;
    renderShortcutsUI();
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'ghost-button';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => {
    recordingActionKey = null;
    modal.remove();
    window.currentRecordingModal = null;
    renderShortcutsUI();
  };
  
  actions.append(clearBtn, cancelBtn);
  content.append(title, msg, actions);
  modal.appendChild(content);
  
  document.body.appendChild(modal);
  window.currentRecordingModal = modal;
}

function renderShortcutsUI() {
  const container = document.getElementById('shortcutsContainer');
  if (!container) return;

  const shortcuts = getShortcuts();
  container.innerHTML = '';

  Object.keys(DEFAULT_SHORTCUTS).forEach(actionId => {
    const item = document.createElement('div');
    item.className = 'shortcut-item';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = DEFAULT_SHORTCUTS[actionId].label;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shortcut-recorder-btn';

    if (recordingActionKey === actionId) {
      btn.classList.add('recording');
      btn.textContent = 'Recording...';
    } else {
      btn.textContent = shortcuts[actionId] || 'Disabled';
    }

    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (recordingActionKey === actionId) {
        recordingActionKey = null;
        if (window.currentRecordingModal) {
          window.currentRecordingModal.remove();
          window.currentRecordingModal = null;
        }
      } else {
        recordingActionKey = actionId;
        showRecordingModal(actionId);
      }
      renderShortcutsUI();
    });

    item.append(labelSpan, btn);
    container.appendChild(item);
  });
}

function initShortcutsUI() {
  const resetBtn = document.getElementById('resetShortcutsBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      writeStorage(STORAGE_KEYS.shortcuts, {});
      recordingActionKey = null;
      renderShortcutsUI();
    });
  }
}

function initKeyboardShortcuts() {
  initShortcutsUI();

  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable;

    // Handle recording mode
    if (recordingActionKey) {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        recordingActionKey = null;
        if (window.currentRecordingModal) {
          window.currentRecordingModal.remove();
          window.currentRecordingModal = null;
        }
        renderShortcutsUI();
        return;
      }

      const combo = formatKeyEvent(e);
      if (combo) {
        const currentShortcuts = getShortcuts();
        const conflictActionId = Object.keys(currentShortcuts).find(
          a => currentShortcuts[a] && currentShortcuts[a].toLowerCase() === combo.toLowerCase() && a !== recordingActionKey
        );

        if (conflictActionId) {
          const actionLabel = DEFAULT_SHORTCUTS[conflictActionId].label;
          showShortcutConflictModal(combo, actionLabel);
        } else {
          const saved = readStorage(STORAGE_KEYS.shortcuts, {});
          saved[recordingActionKey] = combo;
          writeStorage(STORAGE_KEYS.shortcuts, saved);
        }
        recordingActionKey = null;
        if (window.currentRecordingModal) {
          window.currentRecordingModal.remove();
          window.currentRecordingModal = null;
        }
        renderShortcutsUI();
      }
      return;
    }

    if (isInput && e.key !== 'Escape') {
      return;
    }

    const isModalOpen = !el.folderModal.hidden || 
      !el.exportMultipleModal.hidden || 
      (document.getElementById('profileModal') && !document.getElementById('profileModal').hidden) || 
      (el.confirmDeleteModal && !el.confirmDeleteModal.hidden) || 
      (el.changelogModal && !el.changelogModal.hidden) ||
      (document.getElementById('scheduleModal') && !document.getElementById('scheduleModal').hidden);

    if (e.key === 'Enter') {
      const activeModal = document.querySelector('.modal:not([hidden])');
      if (activeModal) {
        if (active.tagName === 'TEXTAREA') return;
        const primaryBtn = activeModal.querySelector('.modal-actions button.primary, .modal-actions button[type="submit"]');
        if (primaryBtn) {
          e.preventDefault();
          primaryBtn.click();
          return;
        }
      }
    }

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

    // Match pressed key combo against user configured shortcuts
    const combo = formatKeyEvent(e);
    if (!combo) return;

    const shortcuts = getShortcuts();
    const normalizedCombo = combo.toLowerCase();

    const matchedAction = Object.keys(shortcuts).find(actionId => shortcuts[actionId] && shortcuts[actionId].toLowerCase() === normalizedCombo);

    if (matchedAction) {
      e.preventDefault();
      switch (matchedAction) {
        case 'newTask':
          if (el.input) el.input.focus();
          break;
        case 'search':
          if (el.search) el.search.focus();
          break;
        case 'filterAll':
          setFilter('all');
          break;
        case 'filterActive':
          setFilter('active');
          break;
        case 'filterCompleted':
          setFilter('completed');
          break;
        case 'toggleLock':
          toggleCurrentFolderLock();
          break;
        case 'toggleSidebar':
          if (el.sidebarToggle) el.sidebarToggle.click();
          break;
        case 'cycleFolder':
          cycleFolder();
          break;
        case 'cycleColor':
          cycleAccentColor();
          break;
        case 'toggleAmoled':
          const amoledToggle = document.getElementById('amoledToggle');
          if (amoledToggle) {
            amoledToggle.click();
          }
          break;
        case 'openCategories':
          const categoriesBtn = document.getElementById('allTasksBtn');
          if (categoriesBtn) {
            categoriesBtn.click();
          }
          break;
      }
    }
  });
}

// Filters and search
function setFilter(nextFilter) {
  if (!['all', 'active', 'completed'].includes(nextFilter)) return;
  state.activeFilter = nextFilter;
  writeStorage(STORAGE_KEYS.filter, state.activeFilter);
  el.filterButtons.forEach(btn => {
    const isActive = btn.dataset.filter === state.activeFilter;
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
  state.searchQuery = saved.toLowerCase();
  
  el.search.addEventListener('input', debounce(() => {
    state.searchQuery = el.search.value.trim().toLowerCase();
    writeStorage(STORAGE_KEYS.search, el.search.value.trim());
    render();
  }, 250));

  if (el.listSearchInput) {
    el.listSearchInput.addEventListener('input', debounce(() => {
      state.listSearchQuery = el.listSearchInput.value.trim().toLowerCase();
      renderFolders();
    }, 200));
  }
}

// Form
function initForm() {
  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentFolder = state.folders.find(f => f.id === state.currentFolderId);
    if (currentFolder && currentFolder.type === 'scheduled') {
      openScheduleModal();
      return;
    }

    const value = el.input.value.trim();
    if (value.length === 0) {
      el.input.focus();
      el.input.setAttribute('aria-invalid', 'true');
      setTimeout(() => el.input.removeAttribute('aria-invalid'), 500);
      return;
    }
    addTask(value);
    el.input.value = '';
    el.input.focus();
  });

  initScheduleModal();
}

function openScheduleModal() {
  const modal = document.getElementById('scheduleModal');
  if (!modal) return;
  modal.hidden = false;
  modal.removeAttribute('hidden');
  
  const input = document.getElementById('scheduleTitleInput');
  if (input) {
    if (el.input && el.input.value.trim()) {
      input.value = el.input.value.trim();
      el.input.value = '';
    }
    input.focus();
  }
}

function closeScheduleModal() {
  const modal = document.getElementById('scheduleModal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('hidden', '');
}

function initScheduleModal() {
  const modal = document.getElementById('scheduleModal');
  const form = document.getElementById('scheduleForm');
  const cancelBtn = document.getElementById('scheduleModalCancel');
  const daysContainer = document.getElementById('scheduleDaysContainer');

  if (!modal || !form) return;

  if (cancelBtn) cancelBtn.addEventListener('click', closeScheduleModal);

  if (daysContainer) {
    daysContainer.querySelectorAll('.day-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('scheduleTitleInput');
    const timeInput = document.getElementById('scheduleTimeInput');
    const endDateInput = document.getElementById('scheduleEndDateInput');

    const title = titleInput.value.trim();
    const time = timeInput.value;
    const endDate = endDateInput ? endDateInput.value : null;

    const activeDayBtns = daysContainer ? daysContainer.querySelectorAll('.day-select-btn.active') : [];
    const daysOfWeek = Array.from(activeDayBtns).map(btn => parseInt(btn.dataset.day, 10));

    if (!title || !time) return;

    createSchedule(state.currentFolderId, title, time, daysOfWeek, null, endDate);
    closeScheduleModal();
    form.reset();
    if (daysContainer) {
      daysContainer.querySelectorAll('.day-select-btn').forEach(b => b.classList.add('active'));
    }
    render();
  });
}

// Dashboard/Settings initialization
function initDashboard() {
  if (!el.dashboardBtn) return;
  el.dashboardBtn.addEventListener('click', () => {
    state.currentView = 'dashboard';
    writeStorage('tm_current_view_v2', 'dashboard');
    if (el.settingsBtn) el.settingsBtn.classList.remove('active');
    renderFolders();
    render();
  });
}

function initSettings() {
  if (!el.settingsBtn) return;
  el.settingsBtn.addEventListener('click', () => {
    state.currentView = 'settings';
    writeStorage('tm_current_view_v2', 'settings');
    if (el.dashboardBtn) el.dashboardBtn.classList.remove('active');
    renderFolders();
    render();
  });

  if (el.amoledToggle) {
    const amoled = readStorage('tm_amoled_theme', false);
    el.amoledToggle.checked = amoled;
    
    el.amoledToggle.addEventListener('change', () => {
      writeStorage('tm_amoled_theme', el.amoledToggle.checked);
      applyAccentColor();
      render();
    });
  }

  const purgeBtn = document.getElementById('purgeOrphansBtn');
  if (purgeBtn) {
    purgeBtn.addEventListener('click', () => {
      purgeOrphanTasks(true);
      render();
    });
  }
}

function initCategories() {
  if (el.categoriesBtn) {
    el.categoriesBtn.addEventListener('click', () => {
      state.currentView = 'categories';
      renderFolders();
      render();
    });
  }
  if (el.expandAllCategoriesBtn) {
    el.expandAllCategoriesBtn.addEventListener('click', expandAllCategories);
  }
  if (el.collapseAllCategoriesBtn) {
    el.collapseAllCategoriesBtn.addEventListener('click', collapseAllCategories);
  }
}

function renderDashboard() {
  lazyPopulateChartDropdown();
  lazyRenderDashboardChart();

  const activeFolderIds = new Set(state.folders.map(f => f.id));

  let totalTasksCount = 0;
  let totalCompletedCount = 0;
  Object.keys(state.tasksByFolder).forEach(folderId => {
    if (activeFolderIds.has(folderId)) {
      const listTasks = state.tasksByFolder[folderId] || [];
      totalTasksCount += listTasks.length;
      totalCompletedCount += listTasks.filter(t => t.completed).length;
    }
  });
  const rate = totalTasksCount > 0 ? Math.round((totalCompletedCount / totalTasksCount) * 100) : 0;
  el.dashCompletionRate.textContent = `${rate}% (${totalCompletedCount}/${totalTasksCount})`;

  const completedDates = [];
  Object.keys(state.tasksByFolder).forEach(folderId => {
    if (activeFolderIds.has(folderId)) {
      const listTasks = state.tasksByFolder[folderId] || [];
      listTasks.forEach(task => {
        if (task.completed && task.completedAt) {
          completedDates.push(new Date(task.completedAt).toDateString());
        }
      });
    }
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
  let highPriorityPendingCount = 0;
  let normalPriorityPendingCount = 0;
  let stagnantTaskCount = 0;
  let weeklyCompletedCount = 0;

  const FourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const nowTs = Date.now();

  // Calculate Start & End of Current Week for Weekly Target
  const startOfWeekTime = new Date();
  startOfWeekTime.setDate(startOfWeekTime.getDate() - startOfWeekTime.getDay());
  startOfWeekTime.setHours(0, 0, 0, 0);

  const endOfWeekTime = new Date(startOfWeekTime);
  endOfWeekTime.setDate(endOfWeekTime.getDate() + 6);
  endOfWeekTime.setHours(23, 59, 59, 999);

  Object.keys(state.tasksByFolder).forEach(folderId => {
    if (activeFolderIds.has(folderId)) {
      const listTasks = state.tasksByFolder[folderId] || [];
      listTasks.forEach(task => {
        if (!task.completed) {
          activeTasksCount++;
          if (task.highPriority) {
            highPriorityPendingCount++;
          } else {
            normalPriorityPendingCount++;
          }

          // Stagnant Task check (>14 days old and unedited/uncompleted)
          const createdOrUpdated = task.updatedAt || task.createdAt || nowTs;
          if (nowTs - createdOrUpdated > FourteenDaysMs) {
            stagnantTaskCount++;
          }
        } else if (task.completedAt) {
          const compTime = new Date(task.completedAt).getTime();
          if (compTime >= startOfWeekTime.getTime() && compTime <= endOfWeekTime.getTime()) {
            weeklyCompletedCount++;
          }
        }
      });
    }
  });

  if (el.dashActiveTasks) el.dashActiveTasks.textContent = activeTasksCount;
  
  // 1. Priority Breakdown Ratio (High vs Normal Tasks)
  if (el.dashPriorityRatio) {
    el.dashPriorityRatio.textContent = `${highPriorityPendingCount} High / ${normalPriorityPendingCount} Normal`;
  }

  // 2. Weekly Goal Completion Target (20 Tasks Target)
  const WEEKLY_GOAL_TARGET = 20;
  const weeklyPct = Math.round((weeklyCompletedCount / WEEKLY_GOAL_TARGET) * 100);
  if (el.dashWeeklyGoal) {
    el.dashWeeklyGoal.textContent = `${weeklyCompletedCount} / ${WEEKLY_GOAL_TARGET} (${weeklyPct}%)`;
  }

  // 3. List Health & Stagnant Task Warning (>14 Days)
  if (el.dashStagnantTasks) {
    el.dashStagnantTasks.textContent = `${stagnantTaskCount} Task${stagnantTaskCount !== 1 ? 's' : ''}`;
    el.dashStagnantTasks.style.color = stagnantTaskCount > 0 ? 'var(--amber, #f59e0b)' : 'var(--text)';
  }

  // Most Productive Day (This Week) Calculation
  const weekdayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  // Calculate Start of Current Week (Sunday 00:00:00)
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Calculate End of Current Week (Saturday 23:59:59)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  let maxDay = -1;
  let maxCount = 0;
  
  Object.keys(state.tasksByFolder).forEach(folderId => {
    if (activeFolderIds.has(folderId)) {
      const listTasks = state.tasksByFolder[folderId] || [];
      listTasks.forEach(task => {
        if (task.completed && task.completedAt) {
          const compTime = new Date(task.completedAt).getTime();
          if (compTime >= startOfWeek.getTime() && compTime <= endOfWeek.getTime()) {
            const day = new Date(task.completedAt).getDay();
            weekdayCounts[day]++;
          }
        }
      });
    }
  });

  for (let i = 0; i < 7; i++) {
    if (weekdayCounts[i] > maxCount) {
      maxCount = weekdayCounts[i];
      maxDay = i;
    }
  }
  el.dashBusiestDay.textContent = maxDay !== -1 && maxCount > 0 ? `${weekdayNames[maxDay]} (${maxCount} completed)` : "None this week";

  // High Priority List
  if (el.dashPriorityList) {
    el.dashPriorityList.innerHTML = '';
    let priorityCount = 0;

    state.folders.forEach(folder => {
      const listTasks = state.tasksByFolder[folder.id] || [];
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
          const idx = state.tasksByFolder[folder.id].findIndex(t => t.id === task.id);
          if (idx !== -1) {
            state.tasksByFolder[folder.id][idx] = {
              ...state.tasksByFolder[folder.id][idx],
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
          const idx = state.tasksByFolder[folder.id].findIndex(t => t.id === task.id);
          if (idx !== -1) {
            state.tasksByFolder[folder.id][idx] = {
              ...state.tasksByFolder[folder.id][idx],
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
}

function initDashboardChart() {
  if (!el.chartListSelector) return;
  el.chartListSelector.addEventListener('change', () => {
    lazyRenderDashboardChart();
  });
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

// Date parsing for Excel imports
function parseDateTime(dateStr, timeStr) {
  if (!dateStr) return null;

  try {
    let date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      const formats = [
        /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
        /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/,
        /^([a-zA-Z]{3})\s+(\d{1,2}),?\s+(\d{4})$/
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          if (format === formats[0]) {
            const month = parseInt(match[1]);
            const day = parseInt(match[2]);
            const year = parseInt(match[3]);
            if (month > 12) {
              date = new Date(year, day - 1, month);
            } else {
              date = new Date(year, month - 1, day);
            }
          } else if (format === formats[1]) {
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          } else if (format === formats[2]) {
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

function parseTime(timeStr) {
  if (!timeStr) return null;

  try {
    if (typeof timeStr === 'number') {
      const totalSeconds = Math.floor(timeStr * 24 * 60 * 60);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return { hours, minutes, seconds };
    }

    const timeStrClean = timeStr.toString().trim();

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

// Check URL for shared read-only list
async function checkSharedUrl() {
  const params = new URLSearchParams(window.location.search);
  const shareId = params.get('list');
  const shareData = params.get('share');

  if (!shareId && !shareData) return false;

  document.body.classList.add('read-only-share-view');

  let title = 'Shared List';
  let description = '';
  let tasks = [];

  if (shareId) {
    // Wait briefly for firebaseDb if loading asynchronously
    let retries = 0;
    while (!window.firebaseDb && retries < 20) {
      await new Promise(r => setTimeout(r, 100));
      retries++;
    }

    if (window.firebaseDb && window.firebaseDb.db) {
      try {
        const { db, doc, getDoc } = window.firebaseDb;
        const shareRef = doc(db, 'shared_lists', shareId);
        const snap = await getDoc(shareRef);

        if (snap.exists()) {
          const data = snap.data();
          title = data.folderName || 'Shared List';
          description = data.description || '';
          tasks = Array.isArray(data.tasks) ? data.tasks : [];
        } else {
          alert('Shared list not found or expired.');
          return false;
        }
      } catch (err) {
        console.error('Failed to load shared list from Firestore:', err);
        alert('Failed to load shared list.');
        return false;
      }
    }
  } else if (shareData) {
    try {
      const decoded = decodeURIComponent(atob(shareData));
      const payload = JSON.parse(decoded);
      title = payload.n || payload.folderName || 'Shared List';
      description = payload.d || payload.description || '';
      
      const rawTasks = Array.isArray(payload.t) ? payload.t : (Array.isArray(payload.tasks) ? payload.tasks : []);
      tasks = rawTasks.map(t => {
        if (t.title !== undefined) return t; // Already standard format
        return {
          title: t.t,
          completed: !!t.c,
          createdAt: t.d || 0,
          subtasks: Array.isArray(t.s) ? t.s.map(sub => ({ title: sub.t, completed: !!sub.c })) : []
        };
      });
    } catch (err) {
      console.error('Failed to decode share data:', err);
      alert('Invalid share link format.');
      return false;
    }
  }

  // Render pure read-only view
  if (el.activeListNameDisplay) el.activeListNameDisplay.textContent = title;
  if (el.listDescriptionDisplay) {
    if (description) {
      el.listDescriptionDisplay.textContent = description;
      el.listDescriptionDisplay.style.display = 'block';
    } else {
      el.listDescriptionDisplay.style.display = 'none';
    }
  }

  // Sort tasks strictly by date
  tasks.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  if (el.tasks) {
    el.tasks.innerHTML = '';
    const frag = document.createDocumentFragment();
    tasks.forEach(task => {
      try {
        frag.appendChild(renderTaskItem(task));
      } catch (_) {}
    });
    el.tasks.appendChild(frag);
  }

  if (el.empty) {
    el.empty.hidden = tasks.length !== 0;
  }

  // Display and bind Download Excel button for recipient
  const downloadBtn = document.getElementById('downloadSharedExcelBtn');
  if (downloadBtn) {
    downloadBtn.style.display = 'inline-flex';
    downloadBtn.addEventListener('click', () => {
      if (typeof XLSX === 'undefined' || !XLSX || !XLSX.utils) {
        alert('Excel library not loaded.');
        return;
      }
      const data = tasks.map(t => ({
        'Title': t.title,
        'Status': t.completed ? 'Completed' : 'Active',
        'Created Date': formatDate(t.createdAt),
        'Created Time': formatTime(t.createdAt),
        'Completed Date': t.completedAt ? formatDate(t.completedAt) : '',
        'Completed Time': t.completedAt ? formatTime(t.completedAt) : ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

      const safeName = title.replace(/[^a-z0-9]/gi, '_');
      const filename = `${safeName}_shared.xlsx`;
      XLSX.writeFile(wb, filename);
    });
  }

  return true;
}

function initShareListBtn() {
  if (!el.shareListBtn) return;
  el.shareListBtn.addEventListener('click', () => {
    if (state.currentFolderId) {
      shareFolder(state.currentFolderId);
    }
  });
}



// Bootstrap
async function init() {
  initElements();
  
  const isShared = await checkSharedUrl();
  if (isShared) return; // Stop normal app init if viewing shared list

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
  initSettings();
  initCategories();
  initDashboardChart();
  initLockToggle();
  initShareListBtn();
  initChartVisibility();
  initChangelog();
  initKeyboardShortcuts();
  initSidebarToggle();
  renderFolders();
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export chart wrappers so other modules can trigger them safely
export async function lazyRenderDashboardChart() {
  const { renderDashboardChart } = await import('./charts.js');
  renderDashboardChart();
}

export async function lazyPopulateChartDropdown() {
  const { populateChartDropdown } = await import('./charts.js');
  populateChartDropdown();
}
