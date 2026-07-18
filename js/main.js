import { el } from './dom.js';
import { state, getCurrentTasks, isCurrentFolderLocked, persistFolders, persistTasks } from './state.js';
import { readStorage, writeStorage, readCookieJSON, now, uid, STORAGE_KEYS } from './storage.js';
import { initTimer } from './timer.js';
import { renderDashboardChart, populateChartDropdown } from './charts.js';
import { renderFolders, openFolderModal, closeFolderModal, switchFolder, toggleCurrentFolderLock } from './folders.js';
import { addTask, initConfirmDeleteModal, closeConfirmDeleteModal, getRenderData, renderTaskItem } from './tasks.js';

// DOM elements cache builder
function initElements() {
  el.form = document.getElementById('taskForm');
  el.input = document.getElementById('taskInput');
  el.tasks = document.getElementById('tasks');
  el.empty = document.getElementById('emptyState');
  el.progressText = document.getElementById('progressText');
  el.progressBar = document.querySelector('.progress-bar');
  el.progressFill = document.querySelector('.progress-fill');
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
  el.exportMultipleBtn = document.getElementById('exportMultipleBtn');
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
  el.tasksView = document.getElementById('tasksView');
  el.dashboardView = document.getElementById('dashboardView');
  el.settingsView = document.getElementById('settingsView');
  el.amoledToggle = document.getElementById('amoledToggle');
  el.dashCompletionRate = document.getElementById('dashCompletionRate');
  el.dashCurrentStreak = document.getElementById('dashCurrentStreak');
  el.dashMaxStreak = document.getElementById('dashMaxStreak');
  el.dashActiveTasks = document.getElementById('dashActiveTasks');
  el.dashAvgTime = document.getElementById('dashAvgTime');
  el.dashBusiestDay = document.getElementById('dashBusiestDay');
  el.dashListDistribution = document.getElementById('dashListDistribution');
  el.dashPriorityList = document.getElementById('dashPriorityList');
  el.accentColorContainer = document.getElementById('accentColorContainer');
  el.lockToggleBtn = document.getElementById('lockToggleBtn');
  el.lockToggleIcon = document.getElementById('lockToggleIcon');
  el.lockToggleText = document.getElementById('lockToggleText');
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
  if (state.currentView === 'settings') {
    if (el.tasksView) el.tasksView.style.display = 'none';
    if (el.dashboardView) el.dashboardView.style.display = 'none';
    if (el.settingsView) el.settingsView.style.display = 'block';
    if (el.dashboardBtn) el.dashboardBtn.classList.remove('active');
    if (el.settingsBtn) el.settingsBtn.classList.add('active');
    renderAccentColorPicker();
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
  el.empty.hidden = filtered.length !== 0 || (state.searchQuery.length > 0 || state.activeFilter !== 'all' || state.selectedMonth);

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

  // Activity chart
  if (state.currentView === 'dashboard') renderDashboardChart();
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

  if (el.exportMultipleBtn) {
    el.exportMultipleBtn.addEventListener('click', openExportMultipleModal);
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
  state.folders = readStorage(STORAGE_KEYS.folders, []);
  if (!Array.isArray(state.folders)) state.folders = [];

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
    persistFolders();
    persistTasks();
  }

  state.currentFolderId = readStorage(STORAGE_KEYS.currentFolder, null);
  if (!state.currentFolderId || !state.folders.find(f => f.id === state.currentFolderId)) {
    state.currentFolderId = state.folders[0].id;
    writeStorage(STORAGE_KEYS.currentFolder, state.currentFolderId);
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
  if (state.folders.length <= 1) return;
  const currentIndex = state.folders.findIndex(f => f.id === state.currentFolderId);
  if (currentIndex === -1) return;
  const nextIndex = (currentIndex + 1) % state.folders.length;
  switchFolder(state.folders[nextIndex].id);
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
  
  let searchDebounceId = null;
  el.search.addEventListener('input', () => {
    if (searchDebounceId) clearTimeout(searchDebounceId);
    searchDebounceId = setTimeout(() => {
      state.searchQuery = el.search.value.trim().toLowerCase();
      writeStorage(STORAGE_KEYS.search, el.search.value.trim());
      render();
    }, 250);
  });

  let listSearchDebounceId = null;
  if (el.listSearchInput) {
    el.listSearchInput.addEventListener('input', () => {
      if (listSearchDebounceId) clearTimeout(listSearchDebounceId);
      listSearchDebounceId = setTimeout(() => {
        state.listSearchQuery = el.listSearchInput.value.trim().toLowerCase();
        renderFolders();
      }, 200);
    });
  }
}

// Form
function initForm() {
  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
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
}

// Dashboard/Settings initialization
function initDashboard() {
  if (!el.dashboardBtn) return;
  el.dashboardBtn.addEventListener('click', () => {
    state.currentView = 'dashboard';
    if (el.settingsBtn) el.settingsBtn.classList.remove('active');
    renderFolders();
    render();
  });
}

function initSettings() {
  if (!el.settingsBtn) return;
  el.settingsBtn.addEventListener('click', () => {
    state.currentView = 'settings';
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
}

function renderDashboard() {
  populateChartDropdown();
  renderDashboardChart();

  let totalTasksCount = 0;
  let totalCompletedCount = 0;
  Object.values(state.tasksByFolder).forEach(listTasks => {
    totalTasksCount += listTasks.length;
    totalCompletedCount += listTasks.filter(t => t.completed).length;
  });
  const rate = totalTasksCount > 0 ? Math.round((totalCompletedCount / totalTasksCount) * 100) : 0;
  el.dashCompletionRate.textContent = `${rate}% (${totalCompletedCount}/${totalTasksCount})`;

  const completedDates = [];
  Object.values(state.tasksByFolder).forEach(listTasks => {
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
  
  Object.values(state.tasksByFolder).forEach(listTasks => {
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
  Object.values(state.tasksByFolder).forEach(listTasks => {
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
  state.folders.forEach(folder => {
    const listTasks = state.tasksByFolder[folder.id] || [];
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

function initDashboardChart() {
  if (!el.chartListSelector) return;
  el.chartListSelector.addEventListener('change', () => {
    renderDashboardChart();
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

// Bootstrap
function init() {
  initElements();
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
  initTimer();
  initDashboardChart();
  initLockToggle();
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
