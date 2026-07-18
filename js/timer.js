import { el } from './dom.js';
import { readStorage, writeStorage } from './storage.js';

// Simple Timer State Variables
let timerDuration = parseInt(readStorage('tm_timer_duration', 25)) * 60; // default 25 minutes
let timerTimeLeft = timerDuration;
let isTimerRunning = false;
let timerInterval = null;
let timerHistoryData = [];

export function initTimer() {
  if (!el.timerDisplay) return;

  timerHistoryData = readStorage('tm_timer_history', []);
  renderTimerHistory();

  // Quick adjuster controls (-10m, -5m, +5m, +10m)
  document.querySelectorAll('.pomo-adjust-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const changeSecs = parseInt(btn.dataset.change) || 0;
      
      let newDuration = timerDuration + changeSecs;
      // Bound between 1 minute (60s) and 180 minutes (10800s)
      newDuration = Math.max(60, Math.min(10800, newDuration));
      
      timerDuration = newDuration;
      writeStorage('tm_timer_duration', Math.round(timerDuration / 60));
      
      if (!isTimerRunning) {
        timerTimeLeft = timerDuration;
      } else {
        timerTimeLeft = Math.max(0, Math.min(timerDuration, timerTimeLeft + changeSecs));
      }
      updateTimerUI();
    });
  });

  // Main Control Handlers
  el.timerStartPauseBtn.addEventListener('click', () => {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  el.timerResetBtn.addEventListener('click', () => {
    resetTimer();
  });

  // Initialize layout
  updateTimerUI();
}

export function startTimer() {
  if (timerTimeLeft <= 0) return;
  isTimerRunning = true;
  updateTimerUI();

  timerInterval = setInterval(() => {
    timerTimeLeft--;
    if (timerTimeLeft <= 0) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      
      // Alert visually (flash)
      alertVisualTimerFinished();

      // Log completion to history
      addTimerToHistory(timerDuration);
    }
    updateTimerUI();
  }, 1000);
}

export function pauseTimer() {
  isTimerRunning = false;
  if (timerInterval) clearInterval(timerInterval);
  updateTimerUI();
}

export function resetTimer() {
  pauseTimer();
  timerTimeLeft = timerDuration;
  updateTimerUI();
}

export function updateTimerUI() {
  // 1. Digital Display
  const mins = Math.floor(timerTimeLeft / 60);
  const secs = timerTimeLeft % 60;
  const minStr = String(mins).padStart(2, '0');
  const secStr = String(secs).padStart(2, '0');
  if (el.timerDisplay) {
    el.timerDisplay.textContent = `${minStr}:${secStr}`;
  }

  // 2. SVG Progress Ring
  if (el.pomodoroProgressRing) {
    const ringLength = 502.6; // Circumference of r=80 circle
    const offset = timerDuration > 0 ? (1 - (timerTimeLeft / timerDuration)) * ringLength : 0;
    el.pomodoroProgressRing.style.strokeDashoffset = offset;
  }

  // 3. Action button text & state
  if (el.timerStartPauseBtn) {
    el.timerStartPauseBtn.textContent = isTimerRunning ? 'PAUSE' : 'START';
    if (isTimerRunning) {
      el.timerStartPauseBtn.classList.add('active');
    } else {
      el.timerStartPauseBtn.classList.remove('active');
    }
  }
}

function alertVisualTimerFinished() {
  const display = el.timerDisplay;
  if (!display) return;
  let count = 0;
  const interval = setInterval(() => {
    display.style.color = count % 2 === 0 ? 'var(--danger)' : 'var(--text)';
    count++;
    if (count >= 10) {
      clearInterval(interval);
      display.style.color = 'var(--text)';
    }
  }, 300);
}

function addTimerToHistory(durationSecs) {
  const mins = Math.round(durationSecs / 60);
  const date = new Date();
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const logStr = `${mins}m completed at ${timeStr}`;
  
  timerHistoryData.unshift(logStr);
  if (timerHistoryData.length > 5) {
    timerHistoryData.pop();
  }
  writeStorage('tm_timer_history', timerHistoryData);
  renderTimerHistory();
}

function renderTimerHistory() {
  if (!el.timerHistory) return;
  el.timerHistory.innerHTML = '';
  if (timerHistoryData.length === 0) {
    el.timerHistory.innerHTML = '<li style="font-style: italic;">No runs logged</li>';
    return;
  }
  timerHistoryData.forEach(log => {
    const li = document.createElement('span');
    li.textContent = log;
    li.style.display = 'block';
    li.style.borderBottom = '1px solid var(--border)';
    li.style.padding = '6px 0';
    el.timerHistory.appendChild(li);
  });
}
