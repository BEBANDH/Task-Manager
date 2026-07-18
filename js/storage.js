export const STORAGE_KEYS = {
  folders: 'tm_folders_v2',
  tasks: 'tm_tasks_v2',
  currentFolder: 'tm_current_folder_v2',
  theme: 'tm_theme_v1',
  filter: 'tm_filter_v1',
  search: 'tm_search_v1',
  monthFilter: 'tm_month_filter_v1',
  yearFilter: 'tm_year_filter_v1'
};

export const now = () => Date.now();
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // ignore storage errors
  }
}

export function readCookieJSON(name) {
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
