# ⚡ FresherTrack 2026: Automated Job Aggregator & Hyderabad Walk-in Hub

> **End-to-End Automated Job Aggregator & Walk-in Dashboard** tailored for **2025–2026 B.Tech CSE / Data Science Freshers** seeking entry-level software/data roles (Remote/Pan-India) and in-person walk-in drives strictly in Hyderabad.

[![Automation: Twice Daily](https://img.shields.io/badge/Sync-Twice%20Daily%20(08:00%20%26%2018:00%20IST)-emerald.svg)](#3-automated-sync--freshness-engine)
[![Target: 2025-2026 Freshers](https://img.shields.io/badge/Eligibility-0--1%20Yrs%20%7C%202025--2026%20Batch-indigo.svg)](#1-categories--role-segmentation)
[![Walk-ins: Hyderabad Only](https://img.shields.io/badge/Walk--ins-Strictly%20Hyderabad-rose.svg)](#2-location-filtering-rules)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🎯 Key Objectives & Problem Solved
Entry-level engineering candidates often waste dozens of hours every week combing through fragmented job portals, outdated telegram channels, and expired listings. 

**FresherTrack 2026** solves this with an autonomous aggregation engine that:
1. **Aggregates verified fresh roles** across 6 core tech domains.
2. **Applies a strict Hyderabad filter** for in-person walk-in drives (rejecting all external locations).
3. **Runs scheduled headless syncs twice daily** (08:00 AM & 06:00 PM IST) via GitHub Actions CI/CD.
4. **Prevents duplicate job postings** using deterministic SHA-256 hashing.
5. **Tracks application statuses** (`Not Applied` ⚪, `Applied` 🔵, `Interview` 🟢, `Rejected` 🔴) persisted to `localStorage` with instant CSV export.

---

## 📂 Project Architecture

```
JOB_DASH/
├── .github/
│   └── workflows/
│       └── scrape.yml             # Headless CI/CD cron (08:00 & 18:00 IST / 02:30 & 12:30 UTC)
├── data/
│   ├── jobs.json                  # Auto-updating aggregated listings & sync metadata
│   └── jobs_schema.json           # JSON Schema Draft-07 specification
├── scraper/
│   ├── __init__.py
│   ├── config.py                  # Domain categories, Hyderabad localities, IST time helpers
│   ├── deduplicator.py            # Deterministic SHA-256 hash generator & freshness engine
│   ├── scrapers.py                # Multi-source scraper (Live ATS feeds + curated verified generator)
│   └── main.py                    # Pipeline orchestrator & terminal summary report
├── assets/
│   ├── css/
│   │   └── style.css              # Glassmorphic dark UI, pulse-ring animations, scrollbars
│   └── js/
│       ├── tracker.js             # LocalStorage application status manager ([Not Applied...])
│       ├── export.js              # CSV export engine for tracked and filtered jobs
│       └── app.js                 # SPA state, cache-busted fetch, search, filters & modal handlers
├── index.html                     # Responsive single-page dashboard with Tailwind CSS & Lucide icons
├── serve.py                       # Lightweight local dev server with no-cache headers
├── requirements.txt               # Dependencies (zero external dependencies required for core engine)
├── tests/
│   └── test_aggregator.py         # Test suite (deduplication, hashing, location rules, expiry)
└── README.md                      # Complete system documentation
```

---

## 1. Categories & Role Segmentation (0-1 Yrs / 2025-2026 Batch)

| Category ID | Display Name | Sub-domains & Keywords | Experience / Batch Criteria |
| :--- | :--- | :--- | :--- |
| `c_cpp` | **C / C++ Developer** | Embedded C, Systems Software, Core C++, Firmware, RTOS, Linux Device Drivers | 0–1 Yrs / 2025–2026 Fresher |
| `java` | **Java Developer** | Spring Boot, Core Java (JVM, Collections, Concurrency), Microservices, REST APIs | 0–1 Yrs / 2025–2026 Fresher |
| `python` | **Python Developer** | Django, FastAPI, Automation, Asynchronous Python, Flask, Scripting | 0–1 Yrs / 2025–2026 Fresher |
| `data_science` | **Data Science / ML** | Junior ML Engineer, AI/GenAI Interns, PyTorch, Transformers, LLM Prompting, NLP | 0–1 Yrs / 2025–2026 Fresher |
| `data_analyst` | **Data Analyst** | SQL, Power BI, Python (Pandas), Advanced Excel, Tableau, Data Cleaning | 0–1 Yrs / 2025–2026 Fresher |
| `walkin_hyd` | **Hyderabad Walk-in Drives** | Direct In-Person Hiring Drives, Spot Offers, Graduate Trainees | Strictly Hyderabad In-Person |

---

## 2. Location Filtering Rules

### 🌐 Regular Developer & Analyst Openings
- **100% Location-flexible**: Covers Remote, Hybrid, Bangalore, Hyderabad, Pune, Chennai, Gurgaon, Noida, Mumbai, and Pan-India.
- **Direct ATS Redirects**: One-click redirect to official company career portals (Lever, Greenhouse, Workday, SmartRecruiters, Taleo).

### 📍 Hyderabad Walk-in Drives (Hard Filter)
- **Strict Hyderabad Localities**: Every walk-in venue is strictly validated against recognized Hyderabad tech hubs:
  `Madhapur`, `Hitec City`, `Gachibowli`, `Begumpet`, `Kondapur`, `Financial District`, `Cyber Towers`, `Nanakramguda`, `Raidurg`, `Uppal`, `Banjara Hills`.
- **Automatic Non-Hyderabad Rejection**: Any walk-in drive located outside Hyderabad (e.g., Bangalore, Pune, Delhi) is **strictly rejected** by `is_valid_hyderabad_location()` before insertion into `data/jobs.json`.
- **Detailed Walk-in Schema**:
  - Exact drive date and morning/afternoon time slots.
  - Full physical address with landmark.
  - One-click **Google Maps navigation button** (`https://www.google.com/maps/search/?api=1&query=...`).
  - HR Contact person, direct email, and phone.
  - Mandatory documents checklist (Resumes, Govt ID, Semester marksheets, College NOC).
  - Eligibility criteria & round-by-round selection process.

---

## 3. Automated Sync & Freshness Engine (Twice Daily)

### ⏱️ Scheduled Headless Cron
The workflow `.github/workflows/scrape.yml` runs twice every day:
- **Morning Run**: 08:00 AM IST (`02:30 UTC`)
- **Evening Run**: 06:00 PM IST (`12:30 UTC`)
- **Manual Trigger**: Supports `workflow_dispatch` for instant execution on demand from the GitHub Actions tab.
- Automatically commits updated `data/jobs.json` back to the repository using GitHub Actions bot.

```yaml
on:
  schedule:
    # 02:30 UTC = 08:00 AM IST | 12:30 UTC = 06:00 PM IST
    - cron: '30 2,12 * * *'
  workflow_dispatch:
```

### 🔑 Deterministic SHA-256 Deduplication
To guarantee listings are never duplicated across runs, `generate_job_id()` computes a 16-character SHA-256 hash from normalized strings:
$$\text{ID} = \text{SHA256}(\text{company} \parallel \text{title} \parallel \text{post\_date} \parallel \text{location})[:16]$$
- When re-scraped, existing listings are idempotently updated.
- Original discovery timestamps and the user's application status are preserved.

### 🌟 "New Today" Pulsing Badge
Any job listing discovered in the last 12–24 hours is automatically tagged with `is_new_today: true`. The frontend renders a glowing emerald pulsing indicator:
```html
<span class="pulse-badge bg-emerald-500/20 text-emerald-300">
  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
  NEW TODAY
</span>
```

### ⏳ Expiry / Archive Logic
For walk-in drives, `compute_walkin_expiry()` checks `drive_date` against the current IST date:
- `drive_date < today`: Marked as `is_expired: true`, visually dimmed with an `EXPIRED / ARCHIVED` pill.
- `drive_date == today`: Tagged as `Happening Today`.
- `drive_date == today + 1`: Tagged as `Tomorrow`.
- Includes a user toggle: `"Hide Expired Drives"` to view only active upcoming drives.

### 🔄 Instant "Sync Now" Button
The top navigation bar features a manual **"Sync Now"** trigger with a spinning refresh animation. It queries `data/jobs.json?t=<timestamp>` to bypass browser caching and displays a real-time toast with the latest sync timestamp.

---

## 4. Application Status Tracker & CSV Export

### LocalStorage Status Sync
Each job card contains an interactive status dropdown:
- ⚪ `Not Applied` (Default)
- 🔵 `Applied`
- 🟢 `Interview`
- 🔴 `Rejected`

Changes persist across browser sessions in `localStorage` under `job_tracker_status_v1`.

### One-Click CSV Export
- **Export Tracked (CSV)**: Exports only jobs marked as `Applied` or `Interview` with full fields (Role, Company, ATS Link, Date Applied, Walk-in Venue).
- **Export View (CSV)**: Exports all currently filtered listings.

---

## 5. Quickstart Guide (Local Development)

### Prerequisites
- Python 3.10+ (Standard library only; zero mandatory third-party pip dependencies required).
- Any modern web browser (Chrome, Edge, Firefox, Safari).

### Step 1: Run the Scraper Pipeline
```powershell
python scraper/main.py
```
*Output Summary:*
```text
=================================================================
 🚀 AUTOMATED JOB AGGREGATOR & WALK-IN ENGINE - SYNC REPORT
=================================================================
 Last Updated: 10 Nov 2026, 01:00 PM IST
 Next Sync   : 10 Nov 2026, 06:00 PM IST
 Total Jobs  : 25 listings
 🔥 New Today: 13 fresh jobs discovered
 📍 Hyd Walk-ins: 4 active (1 archived)
-----------------------------------------------------------------
 CATEGORY BREAKDOWN:
  • C / C++ Developer           :  4 openings
  • Java Developer              :  4 openings
  • Python Developer            :  4 openings
  • Data Science / ML           :  4 openings
  • Data Analyst                :  4 openings
  • Hyderabad Walk-in Drives    :  5 openings
=================================================================
```

### Step 2: Run the Unit Test Suite
```powershell
python -m unittest tests/test_aggregator.py
```
*Verifies SHA-256 hashing, Hyderabad locality validation, walk-in expiry, and deduplication.*

### Step 3: Launch Local Dashboard
Run the included dev server:
```powershell
python serve.py
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

*(Alternatively, you can open `index.html` directly in your browser or run `python -m http.server 8080`)*

---

## 6. GitHub Pages Deployment & Automated Workflow Setup

1. **Push Code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: complete automated job aggregator and walk-in dashboard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Enable Workflow Write Permissions**:
   - Go to your repository **Settings** → **Actions** → **General**.
   - Under **Workflow permissions**, select **"Read and write permissions"**.
   - Click **Save**. (This allows the GitHub Actions bot to commit updated `data/jobs.json` twice daily).

3. **Enable GitHub Pages**:
   - Go to repository **Settings** → **Pages**.
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Branch: `main` / folder: `/(root)`.
   - Your live dashboard URL will be: `https://<your-username>.github.io/<your-repo-name>/`.

---

## 7. Schema Definition
The data conforms to `data/jobs_schema.json` (JSON Schema Draft-07). Sample listing structure:
```json
{
  "id": "job_e9f2a71c84b10294",
  "company_name": "Tech Mahindra",
  "job_title": "Mega Walk-in Drive: Graduate Software Trainee (2025/2026 Batch)",
  "category_id": "walkin_hyd",
  "category_name": "Hyderabad Walk-in Drives",
  "category_badge_color": "rose",
  "location": "Hitec City, Hyderabad",
  "work_mode": "Walk-in (In-Person)",
  "experience": "0-1 Years / Freshers",
  "batch": "2025 & 2026 Batch Only",
  "salary_range": "₹3.75 - 5.0 LPA",
  "apply_url": "https://careers.techmahindra.com/walkin/hyderabad-hitec-freshers",
  "portal_type": "Walk-in Venue",
  "post_date": "2026-11-10",
  "is_new_today": true,
  "is_expired": false,
  "user_status": "Not Applied",
  "walkin_details": {
    "drive_date": "2026-11-11",
    "time_slot": "09:30 AM to 02:00 PM IST",
    "venue_address": "Tech Mahindra Campus, Building 1, Plot No. 22-24, Cyber Hills, Hitec City Phase II, Madhapur, Hyderabad - 500081",
    "landmark": "Near Inorbit Mall / Raidurg Metro Station",
    "contact_person": "Priya Sharma (HR Talent Acquisition)",
    "contact_email": "priya.sharma@techmahindra.com",
    "contact_phone": "+91 40 6636 1000",
    "required_docs": [
      "2 Updated Physical Copies of Resume",
      "Government Photo ID Proof (Aadhaar / PAN Card original + photocopy)",
      "10th, 12th, and B.Tech Marksheets (All Semesters)",
      "College ID Card / Bonafide Certificate"
    ],
    "expiry_status": "Tomorrow"
  }
}
```

---

## 8. License
Distributed under the MIT License. Built with ❤️ for the 2025–2026 Fresher Engineering community.
