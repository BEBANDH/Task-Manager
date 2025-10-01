(function () {
  'use strict';

  /**
   * Local storage keys
   */
  const STORAGE_KEYS = {
    tasks: 'tm_tasks_v1',
    theme: 'tm_theme_v1',
    filter: 'tm_filter_v1',
    search: 'tm_search_v1'
  };

  /**
   * State
   */
  /** @type {{ id: string; title: string; completed: boolean; createdAt: number; updatedAt: number; completedAt?: number | null; }[]} */
  let tasks = [];
  let activeFilter = 'all'; // all | active | completed
  let searchQuery = '';

  /**
   * DOM elements
   */
  const el = {
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
    monthlyChart: document.getElementById('monthlyChart'),
    activityTotals: document.getElementById('activityTotals'),
  };

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

  // Theme
  function applyTheme(theme) {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    const icon = isDark ? '🌙' : '🌞';
    el.themeToggle.querySelector('.icon').textContent = icon;
  }

  function initTheme() {
    const saved = readStorage(STORAGE_KEYS.theme, 'dark');
    applyTheme(saved);
    el.themeToggle.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      writeStorage(STORAGE_KEYS.theme, current);
      applyTheme(current);
    });
  }

  // Tasks CRUD
  function addTask(title) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const task = { id: uid(), title: trimmed, completed: false, createdAt: now(), updatedAt: now(), completedAt: null };
    tasks.unshift(task);
    persist();
    render();
  }

  function updateTask(id, updates) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;
    tasks[index] = { ...tasks[index], ...updates, updatedAt: now() };
    persist();
    render();
  }

  function deleteTask(id) {
    const next = tasks.filter(t => t.id !== id);
    if (next.length === tasks.length) return;
    tasks = next;
    persist();
    render();
  }

  function clearCompleted() {
    const anyCompleted = tasks.some(t => t.completed);
    if (!anyCompleted) return;
    tasks = tasks.filter(t => !t.completed);
    persist();
    render();
  }

  function persist() {
    writeStorage(STORAGE_KEYS.tasks, tasks);
  }

  // Rendering
  function render() {
    const { total, completed, filtered } = getRenderData();
    // Empty state
    el.empty.hidden = filtered.length !== 0 || (searchQuery.length > 0 || activeFilter !== 'all');
    // Progress
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    el.progressText.textContent = `${percent}% • ${completed}/${total} completed`;
    el.progressBar.setAttribute('aria-valuenow', String(percent));
    el.progressFill.style.width = `${percent}%`;
    // List
    el.tasks.innerHTML = '';
    const fragment = document.createDocumentFragment();
    filtered.forEach(task => fragment.appendChild(renderTaskItem(task)));
    el.tasks.appendChild(fragment);
    // Activity
    renderActivity();
  }

  function getRenderData() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const filtered = tasks.filter(task => {
      if (activeFilter === 'active' && task.completed) return false;
      if (activeFilter === 'completed' && !task.completed) return false;
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
    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = task.title;
    title.setAttribute('tabindex', '0');
    title.setAttribute('role', 'textbox');
    title.setAttribute('aria-label', 'Task title');
    title.contentEditable = 'false';
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = `Added ${formatDateTime(task.createdAt)}`;
    content.append(title, meta);

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

    actions.append(editBtn, saveBtn, delBtn);

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

  // Load
  function load() {
    tasks = readStorage(STORAGE_KEYS.tasks, []);
    if (!Array.isArray(tasks)) tasks = [];
    // Data migration: ensure completedAt key exists
    tasks = tasks.map(t => ({ ...t, completedAt: typeof t.completedAt === 'number' ? t.completedAt : (t.completed ? (t.updatedAt || t.createdAt || now()) : null) }));
  }

  // Init
  function init() {
    load();
    initTheme();
    initFilters();
    initSearch();
    initForm();
    initBulk();
    render();
  }

  // Activity (monthly chart)
  function renderActivity() {
    if (!el.monthlyChart || !el.activityTotals) return;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const counts = Array.from({ length: daysInMonth }, () => 0);
    let totalCompleted = 0;
    tasks.forEach(t => {
      if (!t.completedAt) return;
      const d = new Date(t.completedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        counts[day - 1] += 1;
        totalCompleted += 1;
      }
    });
    const max = Math.max(1, ...counts);
    el.monthlyChart.innerHTML = '';
    const frag = document.createDocumentFragment();
    counts.forEach((count, idx) => {
      const bar = document.createElement('div');
      bar.className = 'bar' + (count === 0 ? ' dim' : '');
      const height = Math.max(4, Math.round((count / max) * 60));
      bar.style.height = `${height}px`;
      const labelDay = idx + 1;
      bar.setAttribute('title', `Day ${labelDay}: ${count} completed`);
      bar.setAttribute('aria-label', `Day ${labelDay}: ${count} completed`);
      frag.appendChild(bar);
    });
    el.monthlyChart.appendChild(frag);
    el.activityTotals.textContent = `${totalCompleted} completed`;
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

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


