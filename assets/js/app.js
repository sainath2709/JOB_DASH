/**
 * Main Application Logic for Job Aggregator & Walk-in Dashboard.
 * Handles state, live fetching with cache-busting, filtering, search, and UI rendering.
 */

import { tracker, STATUSES, STATUS_COLORS } from './tracker.js';
import { exportJobsToCSV } from './export.js';

class JobDashboardApp {
  constructor() {
    this.allJobs = [];
    this.metadata = {};
    this.filteredJobs = [];
    this.activeCategory = 'all';
    this.activeStatus = 'all';
    this.activeWorkMode = 'all';
    this.activeBatch = 'all';
    this.onlyNewToday = false;
    this.hideExpiredWalkins = false;
    this.searchQuery = '';
    this.isSyncing = false;

    this.init();
  }

  async init() {
    this.bindGlobalEvents();
    await this.fetchData();
  }

  bindGlobalEvents() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.applyFilters();
      });
    }

    // "Sync Now" Button
    const syncBtn = document.getElementById('sync-now-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.syncNow());
    }

    // "New Today" toggle
    const newTodayToggle = document.getElementById('filter-new-today');
    if (newTodayToggle) {
      newTodayToggle.addEventListener('change', (e) => {
        this.onlyNewToday = e.target.checked;
        this.applyFilters();
      });
    }

    // Hide expired walkins toggle
    const hideExpiredToggle = document.getElementById('filter-hide-expired');
    if (hideExpiredToggle) {
      hideExpiredToggle.addEventListener('change', (e) => {
        this.hideExpiredWalkins = e.target.checked;
        this.applyFilters();
      });
    }

    // Work Mode Filter
    const workModeSelect = document.getElementById('filter-work-mode');
    if (workModeSelect) {
      workModeSelect.addEventListener('change', (e) => {
        this.activeWorkMode = e.target.value;
        this.applyFilters();
      });
    }

    // Batch Filter
    const batchSelect = document.getElementById('filter-batch');
    if (batchSelect) {
      batchSelect.addEventListener('change', (e) => {
        this.activeBatch = e.target.value;
        this.applyFilters();
      });
    }

    // Export CSV Buttons
    const exportTrackedBtn = document.getElementById('export-tracked-btn');
    if (exportTrackedBtn) {
      exportTrackedBtn.addEventListener('click', () => {
        const trackedOnly = this.allJobs.filter(j => {
          const s = tracker.getStatus(j.id);
          return s !== STATUSES.NOT_APPLIED;
        });
        if (trackedOnly.length === 0) {
          alert('You have not marked any jobs as Applied or Interview yet. You can mark jobs directly on any card!');
          return;
        }
        exportJobsToCSV(trackedOnly, `applied_fresher_jobs_${new Date().toISOString().slice(0, 10)}.csv`);
      });
    }

    const exportAllBtn = document.getElementById('export-all-btn');
    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', () => {
        exportJobsToCSV(this.filteredJobs, `all_fresher_jobs_${new Date().toISOString().slice(0, 10)}.csv`);
      });
    }

    // Listen to custom status changed events
    window.addEventListener('job-status-changed', () => {
      this.updateHeaderStats();
      this.renderStatusFilterPills();
    });
  }

  async fetchData() {
    this.setSyncingState(true);
    try {
      // Cache-busting timestamp parameter
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`data/jobs.json${cacheBuster}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.allJobs = data.listings || [];
      this.metadata = data.metadata || {};

      this.updateHeaderStats();
      this.renderCategoryPills();
      this.renderStatusFilterPills();
      this.applyFilters();

      this.showToast(`Sync complete! Loaded ${this.allJobs.length} verified listings.`);
    } catch (err) {
      console.error('Fetch error:', err);
      this.showToast('Could not load jobs.json. Please check file or run scraper.', true);
    } finally {
      this.setSyncingState(false);
    }
  }

  async syncNow() {
    const syncBtn = document.getElementById('sync-now-btn');
    const syncIcon = document.getElementById('sync-icon');
    if (syncIcon) syncIcon.classList.add('animate-spin-sync');
    
    await this.fetchData();
    
    setTimeout(() => {
      if (syncIcon) syncIcon.classList.remove('animate-spin-sync');
    }, 600);
  }

  setSyncingState(isSyncing) {
    this.isSyncing = isSyncing;
    const syncStatusEl = document.getElementById('sync-status-indicator');
    if (syncStatusEl) {
      syncStatusEl.textContent = isSyncing ? 'Checking for updates...' : `Last sync: ${this.metadata.last_updated_ist || 'Just now'}`;
    }
  }

  updateHeaderStats() {
    const totalCountEl = document.getElementById('stat-total-jobs');
    const newTodayCountEl = document.getElementById('stat-new-today');
    const walkinsCountEl = document.getElementById('stat-walkins');
    const trackedCountEl = document.getElementById('stat-tracked');
    const lastSyncEl = document.getElementById('sync-status-indicator');
    const nextSyncEl = document.getElementById('next-sync-indicator');

    if (totalCountEl) totalCountEl.textContent = this.allJobs.length;
    
    const newCount = this.allJobs.filter(j => j.is_new_today).length;
    if (newTodayCountEl) newTodayCountEl.textContent = newCount;

    const hydWalkins = this.allJobs.filter(j => j.category_id === 'walkin_hyd' && !j.is_expired).length;
    if (walkinsCountEl) walkinsCountEl.textContent = hydWalkins;

    const allJobIds = this.allJobs.map(j => j.id);
    const counts = tracker.getCounts(allJobIds);
    const appliedOrInterview = counts[STATUSES.APPLIED] + counts[STATUSES.INTERVIEW];
    if (trackedCountEl) trackedCountEl.textContent = `${appliedOrInterview} Active`;

    if (lastSyncEl && this.metadata.last_updated_ist) {
      lastSyncEl.textContent = `Synced: ${this.metadata.last_updated_ist}`;
    }
    if (nextSyncEl && this.metadata.next_scheduled_sync_ist) {
      nextSyncEl.textContent = `Next Auto-Sync: ${this.metadata.next_scheduled_sync_ist}`;
    }
  }

  renderCategoryPills() {
    const container = document.getElementById('category-pills-container');
    if (!container) return;

    const categories = [
      { id: 'all', name: 'All Categories', icon: 'layers' },
      { id: 'walkin_hyd', name: '📍 Hyderabad Walk-ins', badge: 'HYD ONLY', color: 'rose' },
      { id: 'c_cpp', name: 'C / C++ Developer', color: 'purple' },
      { id: 'java', name: 'Java Developer', color: 'orange' },
      { id: 'python', name: 'Python Developer', color: 'blue' },
      { id: 'data_science', name: 'Data Science / ML', color: 'emerald' },
      { id: 'data_analyst', name: 'Data Analyst', color: 'cyan' },
    ];

    container.innerHTML = categories.map(cat => {
      const count = cat.id === 'all' 
        ? this.allJobs.length 
        : this.allJobs.filter(j => j.category_id === cat.id).length;
      
      const isActive = this.activeCategory === cat.id;
      const isWalkin = cat.id === 'walkin_hyd';
      
      return `
        <button 
          data-category="${cat.id}"
          class="category-pill flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            isActive 
              ? isWalkin 
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 ring-2 ring-rose-400' 
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-2 ring-indigo-400'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
          }"
        >
          <span>${cat.name}</span>
          <span class="px-2 py-0.5 rounded-full text-[11px] ${
            isActive 
              ? 'bg-white/20 text-white' 
              : isWalkin 
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800' 
                : 'bg-slate-900 text-slate-400'
          }">
            ${count}
          </span>
        </button>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.dataset.category;
        this.renderCategoryPills();
        this.applyFilters();
      });
    });
  }

  renderStatusFilterPills() {
    const container = document.getElementById('status-filter-container');
    if (!container) return;

    const allJobIds = this.allJobs.map(j => j.id);
    const counts = tracker.getCounts(allJobIds);

    const statuses = [
      { id: 'all', label: 'All Statuses', count: this.allJobs.length },
      { id: STATUSES.NOT_APPLIED, label: 'Not Applied', count: counts[STATUSES.NOT_APPLIED] },
      { id: STATUSES.APPLIED, label: 'Applied', count: counts[STATUSES.APPLIED] },
      { id: STATUSES.INTERVIEW, label: 'Interview', count: counts[STATUSES.INTERVIEW] },
      { id: STATUSES.REJECTED, label: 'Rejected', count: counts[STATUSES.REJECTED] }
    ];

    container.innerHTML = statuses.map(s => {
      const isActive = this.activeStatus === s.id;
      return `
        <button 
          data-status="${s.id}"
          class="status-filter-pill px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            isActive
              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500'
              : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
          }"
        >
          ${s.label} (${s.count})
        </button>
      `;
    }).join('');

    container.querySelectorAll('.status-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeStatus = btn.dataset.status;
        this.renderStatusFilterPills();
        this.applyFilters();
      });
    });
  }

  applyFilters() {
    this.filteredJobs = this.allJobs.filter(job => {
      // 1. Category Filter
      if (this.activeCategory !== 'all' && job.category_id !== this.activeCategory) {
        return false;
      }

      // 2. Status Filter
      const userStatus = tracker.getStatus(job.id, job.user_status || STATUSES.NOT_APPLIED);
      if (this.activeStatus !== 'all' && userStatus !== this.activeStatus) {
        return false;
      }

      // 3. New Today Filter
      if (this.onlyNewToday && !job.is_new_today) {
        return false;
      }

      // 4. Hide Expired Walk-ins
      if (this.hideExpiredWalkins && job.is_expired) {
        return false;
      }

      // 5. Work Mode Filter
      if (this.activeWorkMode !== 'all') {
        if (this.activeWorkMode === 'Remote' && !job.work_mode.toLowerCase().includes('remote')) return false;
        if (this.activeWorkMode === 'Hybrid' && !job.work_mode.toLowerCase().includes('hybrid')) return false;
        if (this.activeWorkMode === 'Walk-in' && !job.work_mode.toLowerCase().includes('walk-in')) return false;
      }

      // 6. Batch Filter
      if (this.activeBatch !== 'all') {
        if (!job.batch.includes(this.activeBatch)) return false;
      }

      // 7. Search Query
      if (this.searchQuery) {
        const query = this.searchQuery;
        const venue = job.walkin_details ? job.walkin_details.venue_address : '';
        const skills = (job.skills || []).join(' ');
        const fullContent = `${job.job_title} ${job.company_name} ${job.location} ${skills} ${venue}`.toLowerCase();
        if (!fullContent.includes(query)) return false;
      }

      return true;
    });

    this.renderJobListings();
  }

  renderJobListings() {
    const container = document.getElementById('jobs-grid');
    const emptyState = document.getElementById('empty-state');
    const resultCountEl = document.getElementById('filtered-count');

    if (resultCountEl) {
      resultCountEl.textContent = `Showing ${this.filteredJobs.length} of ${this.allJobs.length} listings`;
    }

    if (!container) return;

    if (this.filteredJobs.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    container.innerHTML = this.filteredJobs.map(job => this.renderJobCard(job)).join('');

    // Attach card event listeners (Status buttons & walk-in details popup)
    this.bindCardEventListeners(container);
  }

  renderJobCard(job) {
    const isWalkin = job.category_id === 'walkin_hyd';
    const isExpired = job.is_expired;
    const currentStatus = tracker.getStatus(job.id, job.user_status || STATUSES.NOT_APPLIED);
    const statusStyle = STATUS_COLORS[currentStatus] || STATUS_COLORS[STATUSES.NOT_APPLIED];

    // Badge styling
    let catBadgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
    if (job.category_badge_color === 'rose' || isWalkin) catBadgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    else if (job.category_badge_color === 'purple') catBadgeColor = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    else if (job.category_badge_color === 'orange') catBadgeColor = 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    else if (job.category_badge_color === 'blue') catBadgeColor = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    else if (job.category_badge_color === 'emerald') catBadgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    else if (job.category_badge_color === 'cyan') catBadgeColor = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';

    return `
      <div 
        id="card-${job.id}"
        class="glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative ${isWalkin ? 'card-walkin' : ''} ${isExpired ? 'card-expired' : ''}"
      >
        <!-- Top Row: Category + Pulsing New Today Badge + Expiry -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-1 rounded-md text-xs font-semibold border ${catBadgeColor}">
              ${isWalkin ? '📍 ' : ''}${job.category_name}
            </span>

            ${job.is_new_today ? `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 pulse-badge">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                NEW TODAY
              </span>
            ` : ''}

            ${isExpired ? `
              <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                EXPIRED / ARCHIVED
              </span>
            ` : ''}
          </div>

          <!-- ATS Portal Type Tag -->
          <span class="text-[11px] font-mono-tag text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            ${job.portal_type || 'Direct'}
          </span>
        </div>

        <!-- Job Title & Company -->
        <div class="mb-3">
          <h3 class="text-lg font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors">
            ${job.job_title}
          </h3>
          <div class="flex items-center gap-2 text-sm text-slate-300 mt-1 font-medium">
            <span class="text-white font-semibold">${job.company_name}</span>
            <span class="text-slate-600">•</span>
            <span class="text-slate-400 flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              ${job.location}
            </span>
          </div>
        </div>

        <!-- Badges & Metadata Chips -->
        <div class="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <span class="px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium">
            💼 ${job.work_mode}
          </span>
          <span class="px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium">
            🎓 ${job.batch}
          </span>
          <span class="px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium">
            ⏳ ${job.experience}
          </span>
          ${job.salary_range ? `
            <span class="px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold">
              💰 ${job.salary_range}
            </span>
          ` : ''}
        </div>

        <!-- Description Snippet -->
        <p class="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
          ${job.description}
        </p>

        <!-- Skills / Tags -->
        <div class="flex flex-wrap gap-1.5 mb-5">
          ${(job.skills || []).slice(0, 5).map(skill => `
            <span class="text-[11px] font-mono-tag px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-800">
              ${skill}
            </span>
          `).join('')}
        </div>

        <!-- Walk-in Details Special Callout Box (For Hyderabad Walk-ins Only) -->
        ${isWalkin && job.walkin_details ? `
          <div class="mb-5 p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-rose-300">
              <span class="flex items-center gap-1.5">
                📅 Drive Date: ${job.walkin_details.drive_date}
              </span>
              <span class="px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 text-[11px]">
                ${job.walkin_details.expiry_status || 'Upcoming'}
              </span>
            </div>
            <div class="text-xs text-slate-300 flex items-start gap-1.5">
              <span class="text-rose-400 font-bold shrink-0">⏰ Slot:</span>
              <span>${job.walkin_details.time_slot}</span>
            </div>
            <div class="text-xs text-slate-300 flex items-start gap-1.5">
              <span class="text-rose-400 font-bold shrink-0">📍 Venue:</span>
              <span class="line-clamp-2">${job.walkin_details.venue_address}</span>
            </div>
            <div class="flex items-center justify-between pt-1">
              <button 
                data-walkin-id="${job.id}"
                class="view-walkin-details-btn text-xs text-rose-400 hover:text-rose-300 underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                View Full Venue & Docs Checklist →
              </button>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.walkin_details.venue_address)}"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[11px] text-slate-300 hover:text-white bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1"
              >
                🗺️ Open Maps
              </a>
            </div>
          </div>
        ` : ''}

        <!-- Bottom Action Row: Status Selector & Direct ATS Link -->
        <div class="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <!-- Status Selector Pill -->
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-slate-400 font-medium">Status:</span>
            <select 
              data-job-id="${job.id}"
              class="status-dropdown text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="${STATUSES.NOT_APPLIED}" ${currentStatus === STATUSES.NOT_APPLIED ? 'selected' : ''}>⚪ Not Applied</option>
              <option value="${STATUSES.APPLIED}" ${currentStatus === STATUSES.APPLIED ? 'selected' : ''}>🔵 Applied</option>
              <option value="${STATUSES.INTERVIEW}" ${currentStatus === STATUSES.INTERVIEW ? 'selected' : ''}>🟢 Interview</option>
              <option value="${STATUSES.REJECTED}" ${currentStatus === STATUSES.REJECTED ? 'selected' : ''}>🔴 Rejected</option>
            </select>
          </div>

          <!-- Direct ATS / Career Link -->
          <a 
            href="${job.apply_url}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white transition-all ${
              isWalkin
                ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-md shadow-rose-700/20'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20'
            }"
          >
            <span>${isWalkin ? 'Walk-in Portal / RSVP' : 'Direct Apply'}</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
        </div>
      </div>
    `;
  }

  bindCardEventListeners(container) {
    // Status change dropdowns
    container.querySelectorAll('.status-dropdown').forEach(select => {
      select.addEventListener('change', (e) => {
        const jobId = select.dataset.jobId;
        const newStatus = e.target.value;
        tracker.setStatus(jobId, newStatus);
        
        // Update current card dropdown styles dynamically
        const style = STATUS_COLORS[newStatus] || STATUS_COLORS[STATUSES.NOT_APPLIED];
        select.className = `status-dropdown text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${style.bg} ${style.text} ${style.border} focus:outline-none focus:ring-2 focus:ring-indigo-500`;
        this.showToast(`Updated to "${newStatus}"`);
      });
    });

    // Walk-in modal triggers
    container.querySelectorAll('.view-walkin-details-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const jobId = btn.dataset.walkinId;
        const job = this.allJobs.find(j => j.id === jobId);
        if (job) {
          this.openWalkinModal(job);
        }
      });
    });
  }

  openWalkinModal(job) {
    const modal = document.getElementById('walkin-modal');
    const content = document.getElementById('walkin-modal-content');
    if (!modal || !content) return;

    const w = job.walkin_details || {};
    const reqDocs = w.required_docs || [
      'Updated Resume (2 hard copies)',
      'Aadhaar / Govt Photo ID original & xerox',
      'Degree marksheets / provisional certificates'
    ];

    content.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              📍 HYDERABAD IN-PERSON WALK-IN
            </span>
            <h2 class="text-xl font-extrabold text-white mt-2">${job.job_title}</h2>
            <p class="text-sm font-semibold text-slate-300">${job.company_name} — Hyderabad</p>
          </div>
          <button id="close-modal-btn" class="text-slate-400 hover:text-white p-1 text-lg font-bold cursor-pointer">✕</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span class="text-slate-400 font-medium block">📅 Drive Date & Time</span>
            <span class="text-sm font-bold text-rose-300 mt-1 block">${w.drive_date} (${w.time_slot})</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span class="text-slate-400 font-medium block">💰 Salary Package</span>
            <span class="text-sm font-bold text-emerald-300 mt-1 block">${job.salary_range || 'Industry Standard'}</span>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
          <span class="text-slate-400 font-medium block">📍 Exact Venue Address:</span>
          <p class="text-slate-200 font-semibold text-sm leading-relaxed">${w.venue_address}</p>
          ${w.landmark ? `<p class="text-xs text-rose-400">Landmark: ${w.landmark}</p>` : ''}
          <div class="pt-2">
            <a 
              href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.venue_address)}"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
            >
              🗺️ Open in Google Maps Navigation
            </a>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
          <span class="text-slate-400 font-medium block">📄 Mandatory Documents to Carry:</span>
          <ul class="list-disc list-inside space-y-1 text-slate-300 pt-1">
            ${reqDocs.map(doc => `<li>${doc}</li>`).join('')}
          </ul>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
          <span class="text-slate-400 font-medium block">👤 Contact Coordinator:</span>
          <p class="text-slate-200 font-semibold">${w.contact_person || 'HR Recruitment Team'}</p>
          ${w.contact_email ? `<p class="text-slate-400">Email: <a href="mailto:${w.contact_email}" class="text-indigo-400 underline">${w.contact_email}</a></p>` : ''}
          ${w.contact_phone ? `<p class="text-slate-400">Phone: ${w.contact_phone}</p>` : ''}
        </div>

        ${w.eligibility_criteria ? `
          <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <span class="text-slate-400 font-medium block">🎯 Eligibility Criteria:</span>
            <p class="text-slate-300 mt-1">${w.eligibility_criteria}</p>
          </div>
        ` : ''}

        <div class="flex items-center justify-end gap-3 pt-3">
          <button id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800">
            Close
          </button>
          <a 
            href="${job.apply_url}"
            target="_blank"
            rel="noopener noreferrer"
            class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500"
          >
            Visit Walk-in Registration Portal →
          </a>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    // Close handlers
    const closeModal = () => modal.classList.add('hidden');
    document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  }

  showToast(message, isError = false) {
    const toast = document.getElementById('toast-notification');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all transform duration-300 ${
      isError 
        ? 'bg-rose-900/90 text-rose-200 border border-rose-700' 
        : 'bg-slate-900/95 text-slate-200 border border-indigo-500/40 glow-primary'
    }`;

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-20', 'opacity-0');
    }, 3200);
  }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.jobDashboard = new JobDashboardApp();
});
