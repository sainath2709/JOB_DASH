/**
 * LocalStorage Job Application Status Tracker
 * Persists statuses: "Not Applied" | "Applied" | "Interview" | "Rejected"
 */

const STORAGE_KEY = 'job_tracker_status_v1';
const HISTORY_KEY = 'job_tracker_history_v1';

export const STATUSES = {
  NOT_APPLIED: 'Not Applied',
  APPLIED: 'Applied',
  INTERVIEW: 'Interview',
  REJECTED: 'Rejected'
};

export const STATUS_COLORS = {
  'Not Applied': {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
    badge: 'bg-slate-700/60 text-slate-300 border-slate-600'
  },
  'Applied': {
    bg: 'bg-indigo-950/80',
    text: 'text-indigo-300',
    border: 'border-indigo-600',
    badge: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
  },
  'Interview': {
    bg: 'bg-emerald-950/80',
    text: 'text-emerald-300',
    border: 'border-emerald-600',
    badge: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
  },
  'Rejected': {
    bg: 'bg-rose-950/80',
    text: 'text-rose-300',
    border: 'border-rose-600',
    badge: 'bg-rose-600/20 text-rose-300 border-rose-500/40'
  }
};

class TrackerManager {
  constructor() {
    this.statusMap = this.loadStatuses();
    this.historyMap = this.loadHistory();
  }

  loadStatuses() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Failed to load status map from localStorage', e);
      return {};
    }
  }

  loadHistory() {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.statusMap));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.historyMap));
    } catch (e) {
      console.error('Failed to save status map to localStorage', e);
    }
  }

  getStatus(jobId, fallbackStatus = 'Not Applied') {
    return this.statusMap[jobId] || fallbackStatus;
  }

  setStatus(jobId, newStatus) {
    if (!Object.values(STATUSES).includes(newStatus)) {
      console.warn(`Invalid status: ${newStatus}`);
      return;
    }

    const previousStatus = this.getStatus(jobId);
    this.statusMap[jobId] = newStatus;
    
    // Record history timestamp
    if (!this.historyMap[jobId]) {
      this.historyMap[jobId] = [];
    }
    this.historyMap[jobId].push({
      status: newStatus,
      timestamp: new Date().toISOString()
    });

    this.save();

    // Dispatch global event for responsive UI updates
    window.dispatchEvent(new CustomEvent('job-status-changed', {
      detail: { jobId, newStatus, previousStatus }
    }));
  }

  getCounts(allJobIds = []) {
    const counts = {
      [STATUSES.NOT_APPLIED]: 0,
      [STATUSES.APPLIED]: 0,
      [STATUSES.INTERVIEW]: 0,
      [STATUSES.REJECTED]: 0
    };

    allJobIds.forEach(id => {
      const s = this.getStatus(id);
      if (counts[s] !== undefined) {
        counts[s]++;
      } else {
        counts[STATUSES.NOT_APPLIED]++;
      }
    });

    return counts;
  }

  getAll() {
    return { ...this.statusMap };
  }
}

export const tracker = new TrackerManager();
