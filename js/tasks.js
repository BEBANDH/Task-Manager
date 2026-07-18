import { el } from './dom.js';
import { state, getCurrentTasks, isCurrentFolderLocked, persistTasks, triggerCloudSync } from './state.js';
import { uid, now } from './storage.js';
import { render } from './main.js';
import { renderDashboardChart } from './charts.js';

export function formatDateTime(ts) {
  try {
    const d = new Date(ts);
    const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  } catch (_) {
    return '';
  }
}

export function addTask(title) {
  if (!state.currentFolderId) {
    alert('Please select or create a list first.');
    return;
  }
  const trimmed = title.trim();
  if (!trimmed) return;
  const task = { id: uid(), title: trimmed, completed: false, createdAt: now(), updatedAt: now(), completedAt: null, subtasks: [] };
  if (!state.tasksByFolder[state.currentFolderId]) {
    state.tasksByFolder[state.currentFolderId] = [];
  }
  state.tasksByFolder[state.currentFolderId].unshift(task);
  persistTasks();
  render();
}

export function updateTaskDOMState(task, tasks) {
  const li = document.querySelector(`.task[data-id="${task.id}"]`);
  if (!li) return;

  li.classList.toggle('completed', task.completed);

  const cb = li.querySelector('.checkbox');
  if (cb) cb.checked = task.completed;

  if ((state.activeFilter === 'active' && task.completed) || (state.activeFilter === 'completed' && !task.completed)) {
    li.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    li.style.opacity = '0';
    li.style.transform = 'scale(0.95)';
    setTimeout(() => {
      li.remove();
      const visibleTasks = el.tasks.querySelectorAll('.task');
      el.empty.hidden = visibleTasks.length !== 0 || (state.searchQuery.length > 0 || state.activeFilter !== 'all' || state.selectedMonth);
    }, 200);
  }

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  if (el.progressText) {
    el.progressText.textContent = `${percent}% • ${completed}/${total} completed`;
  }
  if (el.progressBar) {
    el.progressBar.setAttribute('aria-valuenow', String(percent));
  }
  if (el.progressFill) {
    el.progressFill.style.width = `${percent}%`;
  }

  if (state.currentView === 'dashboard') renderDashboardChart();
}

export function updateTask(id, updates) {
  if (!state.currentFolderId || !state.tasksByFolder[state.currentFolderId]) return;
  const index = state.tasksByFolder[state.currentFolderId].findIndex(t => t.id === id);
  if (index === -1) return;
  const task = { ...state.tasksByFolder[state.currentFolderId][index], ...updates, updatedAt: now() };
  state.tasksByFolder[state.currentFolderId][index] = task;
  persistTasks();
  
  const keys = Object.keys(updates);
  const isOnlyCompletion = keys.length <= 2 && keys.every(k => k === 'completed' || k === 'completedAt');

  if (isOnlyCompletion && state.currentView !== 'dashboard') {
    updateTaskDOMState(task, state.tasksByFolder[state.currentFolderId]);
  } else {
    render();
  }
}

export async function deleteTask(id) {
  if (!state.currentFolderId || !state.tasksByFolder[state.currentFolderId]) return;
  const task = state.tasksByFolder[state.currentFolderId].find(t => t.id === id);
  if (!task) return;
  const confirmed = await showConfirmDeleteModal(`Are you sure you want to delete the task "${task.title}"?`);
  if (!confirmed) return;
  const next = state.tasksByFolder[state.currentFolderId].filter(t => t.id !== id);
  if (next.length === state.tasksByFolder[state.currentFolderId].length) return;
  state.tasksByFolder[state.currentFolderId] = next;
  persistTasks();
  render();
}

export function initConfirmDeleteModal() {
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

export function showConfirmDeleteModal(message) {
  el.confirmDeleteMessage.textContent = message;
  el.confirmDeleteModal.hidden = false;
  el.confirmDeleteModal.removeAttribute('hidden');
  return new Promise((resolve) => {
    state.confirmDeleteResolve = resolve;
  });
}

export function closeConfirmDeleteModal(result) {
  el.confirmDeleteModal.hidden = true;
  el.confirmDeleteModal.setAttribute('hidden', '');
  if (state.confirmDeleteResolve) {
    state.confirmDeleteResolve(result);
    state.confirmDeleteResolve = null;
  }
}

export function addSubtask(taskId, title) {
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

export function updateSubtask(taskId, subtaskId, updates) {
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

export function deleteSubtask(taskId, subtaskId) {
  const tasks = getCurrentTasks();
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return;
  const task = tasks[idx];
  const list = Array.isArray(task.subtasks) ? task.subtasks : [];
  const next = list.filter(s => s.id !== subtaskId);
  updateTask(taskId, { subtasks: next });
}

export function getRenderData(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const filtered = tasks.filter(task => {
    if (state.activeFilter === 'active' && task.completed) return false;
    if (state.activeFilter === 'completed' && !task.completed) return false;

    if (state.searchQuery) {
      return task.title.toLowerCase().includes(state.searchQuery);
    }
    return true;
  });
  return { total, completed, filtered };
}

export function renderTaskItem(task) {
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

  const header = document.createElement('div');
  header.className = 'task-header';

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title;
  title.setAttribute('tabindex', '0');
  title.setAttribute('role', 'textbox');
  title.setAttribute('aria-label', 'Task title');
  title.contentEditable = 'false';

  header.append(title);

  const metaRow = document.createElement('div');
  metaRow.className = 'task-meta-row';

  const meta = document.createElement('span');
  meta.className = 'meta';
  const metaText = document.createTextNode(formatDateTime(task.createdAt));
  meta.appendChild(metaText);

  metaRow.append(meta);

  const subList = document.createElement('ul');
  subList.className = 'subtasks';

  const subPanel = document.createElement('div');
  subPanel.className = 'subtasks-panel';
  if (state.expandedTasks.has(task.id)) {
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

  content.append(header, metaRow, subList, subPanel);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const priorityBtn = document.createElement('button');
  priorityBtn.type = 'button';
  priorityBtn.className = 'priority';
  priorityBtn.innerHTML = task.highPriority 
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--danger);"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>' 
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>';
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
  editBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
  editBtn.title = 'Edit';

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'delete';
  delBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
  delBtn.title = 'Delete';

  const subToggle = document.createElement('button');
  subToggle.type = 'button';
  subToggle.className = 'ghost-button';
  subToggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'; 
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
      state.expandedTasks.add(task.id);
      setTimeout(() => subInput.focus(), 10);
    } else {
      state.expandedTasks.delete(task.id);
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
  metaRow.append(actions);

  li.append(checkbox, content);

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

export function placeCaretAtEnd(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}
