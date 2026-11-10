"""
Main Executable Entrypoint for the Automated Job Aggregator.
Runs deduplication, location verification, and freshness computations,
then updates data/jobs.json.
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta

# Ensure parent directory is in path for standalone execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scraper.config import CATEGORIES, JOBS_FILE, IST
from scraper.deduplicator import merge_and_deduplicate
from scraper.scrapers import scrape_all_sources

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("MainAggregator")

def calculate_next_sync_time(now_ist: datetime) -> str:
    """Computes next scheduled 08:00 AM or 06:00 PM IST cron run."""
    today = now_ist.date()
    slot_morning = datetime(today.year, today.month, today.day, 8, 0, tzinfo=IST)
    slot_evening = datetime(today.year, today.month, today.day, 18, 0, tzinfo=IST)
    
    if now_ist < slot_morning:
        next_sync = slot_morning
    elif now_ist < slot_evening:
        next_sync = slot_evening
    else:
        tomorrow = today + timedelta(days=1)
        next_sync = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 8, 0, tzinfo=IST)
        
    return next_sync.strftime("%d %b %Y, %I:%M %p IST")

def run_pipeline() -> dict:
    """Executes the aggregation, deduplication, and export pipeline."""
    now_ist = datetime.now(IST)
    logger.info(f"Starting Job Aggregator & Walk-in Pipeline at {now_ist.strftime('%Y-%m-%d %I:%M:%S %p IST')}")

    # 1. Load existing database if available
    existing_listings = []
    if os.path.exists(JOBS_FILE):
        try:
            with open(JOBS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                existing_listings = data.get("listings", [])
                logger.info(f"Loaded {len(existing_listings)} existing listings from {JOBS_FILE}")
        except Exception as e:
            logger.warning(f"Could not read existing {JOBS_FILE}: {e}")

    # 2. Scrape from sources
    new_raw_listings = scrape_all_sources()
    logger.info(f"Scraped {len(new_raw_listings)} listings from all active channels.")

    # 3. Deduplicate and merge
    merged_listings = merge_and_deduplicate(new_raw_listings, existing_listings)
    logger.info(f"Deduplicated total listings: {len(merged_listings)}")

    # 4. Generate statistics
    category_counts = {cat_id: 0 for cat_id in CATEGORIES.keys()}
    new_today_count = 0
    active_walkins = 0
    expired_walkins = 0
    
    for item in merged_listings:
        cid = item.get("category_id")
        if cid in category_counts:
            category_counts[cid] += 1
            
        if item.get("is_new_today"):
            new_today_count += 1
            
        if cid == "walkin_hyd":
            if item.get("is_expired"):
                expired_walkins += 1
            else:
                active_walkins += 1

    metadata = {
        "last_updated_ist": now_ist.strftime("%d %b %Y, %I:%M %p IST"),
        "last_updated_iso": now_ist.isoformat(),
        "next_scheduled_sync_ist": calculate_next_sync_time(now_ist),
        "total_listings": len(merged_listings),
        "new_today_count": new_today_count,
        "active_walkins_count": active_walkins,
        "expired_walkins_count": expired_walkins,
        "target_batch": "2025 / 2026 Batch",
        "target_experience": "0-1 Years / Freshers",
        "category_counts": category_counts,
        "sync_cadence": "Twice Daily (08:00 AM & 06:00 PM IST)"
    }

    output_payload = {
        "metadata": metadata,
        "listings": merged_listings
    }

    # 5. Save to disk
    os.makedirs(os.path.dirname(JOBS_FILE), exist_ok=True)
    with open(JOBS_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_payload, f, indent=2, ensure_ascii=False)
        
    logger.info(f"Successfully saved {len(merged_listings)} listings to {JOBS_FILE}")

    # Print summary table
    print("\n" + "=" * 65)
    print(" 🚀 AUTOMATED JOB AGGREGATOR & WALK-IN ENGINE - SYNC REPORT")
    print("=" * 65)
    print(f" Last Updated: {metadata['last_updated_ist']}")
    print(f" Next Sync   : {metadata['next_scheduled_sync_ist']}")
    print(f" Total Jobs  : {metadata['total_listings']} listings")
    print(f" 🔥 New Today: {metadata['new_today_count']} fresh jobs discovered")
    print(f" 📍 Hyd Walk-ins: {metadata['active_walkins_count']} active ({metadata['expired_walkins_count']} archived)")
    print("-" * 65)
    print(" CATEGORY BREAKDOWN:")
    for cat_id, info in CATEGORIES.items():
        print(f"  • {info['name']:<28}: {category_counts.get(cat_id, 0):>2} openings")
    print("=" * 65 + "\n")

    return output_payload

if __name__ == "__main__":
    run_pipeline()
