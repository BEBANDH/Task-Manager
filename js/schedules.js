import { el } from './dom.js';
import { state, persistFolders, persistTasks } from './state.js';
import { uid, now, readStorage, writeStorage } from './storage.js';

export const SCHEDULE_STORAGE_KEY = 'tm_schedules_v1';

export function loadSchedules() {
  state.schedulesByFolder = readStorage(SCHEDULE_STORAGE_KEY, {});
}

export function persistSchedules() {
  writeStorage(SCHEDULE_STORAGE_KEY, state.schedulesByFolder);
}

export function createSchedule(folderId, title, time, daysOfWeek, startDate, endDate) {
  if (!state.schedulesByFolder[folderId]) {
    state.schedulesByFolder[folderId] = [];
  }

  const newSchedule = {
    id: uid(),
    title: title.trim(),
    time: time, // "HH:mm" format
    daysOfWeek: daysOfWeek, // Array of numbers 0-6 (Sun-Sat)
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || null,
    enabled: true,
    createdAt: now()
  };

  state.schedulesByFolder[folderId].push(newSchedule);
  persistSchedules();
  return newSchedule;
}

export function toggleScheduleEnabled(folderId, scheduleId) {
  const list = state.schedulesByFolder[folderId] || [];
  const schedule = list.find(s => s.id === scheduleId);
  if (schedule) {
    schedule.enabled = !schedule.enabled;
    persistSchedules();
  }
}

export function deleteSchedule(folderId, scheduleId) {
  if (!state.schedulesByFolder[folderId]) return;
  state.schedulesByFolder[folderId] = state.schedulesByFolder[folderId].filter(s => s.id !== scheduleId);
  persistSchedules();
}

export function renderScheduledView(folderId) {
  const container = el.tasks;
  if (!container) return;

  container.innerHTML = '';
  const schedules = state.schedulesByFolder[folderId] || [];

  if (schedules.length === 0) {
    if (el.empty) {
      el.empty.hidden = false;
      const titleEl = el.empty.querySelector('h3');
      if (titleEl) titleEl.textContent = 'No alarms scheduled yet';
    }
    return;
  }

  if (el.empty) el.empty.hidden = true;

  const fragment = document.createDocumentFragment();

  schedules.forEach(schedule => {
    const card = document.createElement('div');
    card.className = `alarm-card ${schedule.enabled ? 'enabled' : 'disabled'}`;
    card.dataset.scheduleId = schedule.id;

    // Time format 12-hour
    const [h, m] = schedule.time.split(':');
    const hourNum = parseInt(h, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = (hourNum % 12 || 12).toString().padStart(2, '0');
    const timeDisplayStr = `${displayHour}:${m} <span class="ampm">${ampm}</span>`;

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const dayPillsHtml = dayLabels.map((label, idx) => {
      const active = schedule.daysOfWeek.includes(idx) ? 'active' : '';
      return `<span class="day-pill ${active}">${label}</span>`;
    }).join('');

    card.innerHTML = `
      <div class="alarm-header">
        <div class="alarm-time">${timeDisplayStr}</div>
        <label class="alarm-switch">
          <input type="checkbox" ${schedule.enabled ? 'checked' : ''} class="alarm-toggle-input">
          <span class="alarm-slider"></span>
        </label>
      </div>
      <div class="alarm-title">${escapeHtml(schedule.title)}</div>
      <div class="alarm-days">${dayPillsHtml}</div>
      <div class="alarm-footer">
        <span class="alarm-range">${schedule.endDate ? `Ends ${schedule.endDate}` : 'Recurring daily'}</span>
        <button class="alarm-delete-btn" title="Delete Schedule">×</button>
      </div>
    `;

    // Event handlers
    const toggleInput = card.querySelector('.alarm-toggle-input');
    toggleInput.addEventListener('change', () => {
      toggleScheduleEnabled(folderId, schedule.id);
      renderScheduledView(folderId);
    });

    const deleteBtn = card.querySelector('.alarm-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete alarm schedule "${schedule.title}"?`)) {
        deleteSchedule(folderId, schedule.id);
        renderScheduledView(folderId);
      }
    });

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
