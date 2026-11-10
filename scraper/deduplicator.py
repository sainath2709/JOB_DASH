"""
Deduplication, Deterministic Hash Generation, and Freshness Engine.
Guarantees zero duplicate job postings and maintains freshness states.
"""

import hashlib
import re
from datetime import datetime, timedelta
from scraper.config import IST

def normalize_text(text: str) -> str:
    """Normalize text for consistent hashing (lowercase, alphanumeric only)."""
    if not text:
        return ""
    text = text.lower().strip()
    return re.sub(r'[^a-z0-9]', '', text)

def generate_job_id(company: str, title: str, post_date: str, location: str = "") -> str:
    """
    Generate deterministic SHA-256 hash from company name, job title, post date, and location.
    Ensures listings are updated idempotently without duplication.
    """
    norm_comp = normalize_text(company)
    norm_title = normalize_text(title)
    # Use YYYY-MM-DD portion of post_date for stability
    norm_date = normalize_text(str(post_date)[:10])
    norm_loc = normalize_text(location)

    key = f"{norm_comp}::{norm_title}::{norm_date}::{norm_loc}"
    sha = hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]
    return f"job_{sha}"

def parse_iso_or_date(date_str: str) -> datetime:
    """Parse various date formats into timezone-aware IST datetime."""
    if not date_str:
        return datetime.now(IST)
    
    date_clean = date_str.strip()
    
    # Try full ISO format first (preserves hours/minutes)
    try:
        dt = datetime.fromisoformat(date_clean.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            return dt.replace(tzinfo=IST)
        return dt.astimezone(IST)
    except Exception:
        pass

    # Fallback to date only: YYYY-MM-DD
    try:
        dt = datetime.strptime(date_clean[:10], "%Y-%m-%d")
        return dt.replace(hour=8, minute=0, second=0, tzinfo=IST)
    except ValueError:
        pass

    return datetime.now(IST)

def compute_freshness(discovered_at_str: str, now: datetime = None) -> bool:
    """
    Check if a job was discovered in the last 24 hours.
    Returns True to show "New Today" pulsing badge.
    """
    if now is None:
        now = datetime.now(IST)
    discovered_dt = parse_iso_or_date(discovered_at_str)
    diff = now - discovered_dt
    # Within last 24 hours (and not in the future beyond clock skew)
    return 0 <= diff.total_seconds() <= (24 * 3600)

def compute_walkin_expiry(drive_date_str: str, now: datetime = None) -> tuple[bool, str]:
    """
    Check if a walk-in drive date has passed relative to current IST date.
    Returns (is_expired: bool, status_label: str)
    """
    if not drive_date_str:
        return False, "Active"
    
    if now is None:
        now = datetime.now(IST)
    
    try:
        drive_date = datetime.strptime(drive_date_str[:10], "%Y-%m-%d").date()
        today = now.date()
        
        if drive_date < today:
            return True, "Expired"
        elif drive_date == today:
            return False, "Happening Today"
        elif drive_date == today + timedelta(days=1):
            return False, "Tomorrow"
        else:
            days_left = (drive_date - today).days
            return False, f"In {days_left} Days"
    except Exception:
        return False, "Active"

def merge_and_deduplicate(new_listings: list[dict], existing_listings: list[dict] = None) -> list[dict]:
    """
    Deduplicate and merge incoming listings with existing database.
    Preserves original discovery timestamps and user application tracking status.
    """
    now = datetime.now(IST)
    now_iso = now.isoformat()
    existing_map = {}
    
    if existing_listings:
        for item in existing_listings:
            job_id = item.get("id")
            if job_id:
                existing_map[job_id] = item
    
    merged = {}
    
    for item in new_listings:
        job_id = item.get("id") or generate_job_id(
            item.get("company_name", ""),
            item.get("job_title", ""),
            item.get("post_date", now.strftime("%Y-%m-%d")),
            item.get("location", "")
        )
        item["id"] = job_id
        
        # If item already existed, preserve first_discovered_at & tracker state
        if job_id in existing_map:
            prev = existing_map[job_id]
            item["first_discovered_at"] = prev.get("first_discovered_at", item.get("first_discovered_at", now_iso))
            item["last_synced_at"] = now_iso
            # Preserve user tracking status if present in existing database
            if "user_status" in prev:
                item["user_status"] = prev["user_status"]
        else:
            item["first_discovered_at"] = item.get("first_discovered_at", now_iso)
            item["last_synced_at"] = now_iso
            item.setdefault("user_status", "Not Applied")
        
        # Calculate freshness ("New Today" badge)
        item["is_new_today"] = compute_freshness(item["first_discovered_at"], now)
        
        # Check walk-in expiry if category is walkin_hyd
        if item.get("category_id") == "walkin_hyd" and item.get("walkin_details"):
            drive_date = item["walkin_details"].get("drive_date", "")
            is_expired, walkin_status = compute_walkin_expiry(drive_date, now)
            item["walkin_details"]["is_expired"] = is_expired
            item["walkin_details"]["expiry_status"] = walkin_status
            item["is_expired"] = is_expired
        else:
            item.setdefault("is_expired", False)
            
        merged[job_id] = item

    # Also keep existing valid listings that were not in the new batch, refreshing their freshness flags
    for job_id, prev in existing_map.items():
        if job_id not in merged:
            prev["last_synced_at"] = now_iso
            prev["is_new_today"] = compute_freshness(prev.get("first_discovered_at", now_iso), now)
            if prev.get("category_id") == "walkin_hyd" and prev.get("walkin_details"):
                drive_date = prev["walkin_details"].get("drive_date", "")
                is_expired, walkin_status = compute_walkin_expiry(drive_date, now)
                prev["walkin_details"]["is_expired"] = is_expired
                prev["walkin_details"]["expiry_status"] = walkin_status
                prev["is_expired"] = is_expired
            merged[job_id] = prev

    # Sort listings: Active first, New Today next, latest post_date first
    sorted_items = sorted(
        merged.values(),
        key=lambda x: (
            0 if not x.get("is_expired", False) else 1,
            0 if x.get("is_new_today", False) else 1,
            x.get("post_date", "")
        ),
        reverse=False
    )
    
    return sorted_items
