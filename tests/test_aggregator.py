"""
Unit tests for Job Aggregator & Walk-in Dashboard.
Verifies deduplication, hashing, location filtering, and freshness logic.
"""

import unittest
from datetime import datetime, timedelta
from scraper.config import IST
from scraper.deduplicator import (
    generate_job_id,
    compute_freshness,
    compute_walkin_expiry,
    merge_and_deduplicate
)
from scraper.scrapers import is_valid_hyderabad_location, build_job_item

class TestJobAggregator(unittest.TestCase):

    def test_deterministic_sha256_hash(self):
        """Ensures identical inputs generate the exact same deterministic ID."""
        id1 = generate_job_id("Qualcomm", "Embedded C Engineer", "2026-11-10", "Hyderabad")
        id2 = generate_job_id("Qualcomm", "Embedded C Engineer", "2026-11-10", "Hyderabad")
        self.assertEqual(id1, id2)
        self.assertTrue(id1.startswith("job_"))
        self.assertEqual(len(id1), 20)  # "job_" (4) + 16 chars hash

        # Whitespace and casing insensitivity
        id3 = generate_job_id("  qualcomm  ", "EMBEDDED C ENGINEER  ", "2026-11-10", "HYDERABAD")
        self.assertEqual(id1, id3)

        # Different job title generates different hash
        id4 = generate_job_id("Qualcomm", "Java Developer", "2026-11-10", "Hyderabad")
        self.assertNotEqual(id1, id4)

    def test_hyderabad_location_filtering(self):
        """Walk-in drives must strictly be in Hyderabad."""
        # Valid Hyderabad venues & localities
        self.assertTrue(is_valid_hyderabad_location("Madhapur, Hyderabad", "Mindspace Building 12"))
        self.assertTrue(is_valid_hyderabad_location("Hitec City", "Cyber Towers, Phase 1"))
        self.assertTrue(is_valid_hyderabad_location("Gachibowli", "Financial District"))
        self.assertTrue(is_valid_hyderabad_location("Begumpet", "Near Metro Station"))
        self.assertTrue(is_valid_hyderabad_location("Kondapur, Telangana", "Tech Hub"))

        # Non-Hyderabad locations MUST be rejected for walk-ins
        self.assertFalse(is_valid_hyderabad_location("Bangalore, Karnataka", "Electronic City Phase 1"))
        self.assertFalse(is_valid_hyderabad_location("Pune, Maharashtra", "Hinjewadi Tech Park"))
        self.assertFalse(is_valid_hyderabad_location("Chennai, Tamil Nadu", "Tidel Park"))
        self.assertFalse(is_valid_hyderabad_location("Noida, Uttar Pradesh", "Sector 62"))

    def test_freshness_engine(self):
        """Jobs discovered within last 24 hours get 'New Today' badge."""
        now = datetime.now(IST)
        
        # Discovered 2 hours ago -> New Today
        two_hours_ago = (now - timedelta(hours=2)).isoformat()
        self.assertTrue(compute_freshness(two_hours_ago, now))

        # Discovered 18 hours ago -> New Today
        eighteen_hours_ago = (now - timedelta(hours=18)).isoformat()
        self.assertTrue(compute_freshness(eighteen_hours_ago, now))

        # Discovered 30 hours ago -> Not New Today
        thirty_hours_ago = (now - timedelta(hours=30)).isoformat()
        self.assertFalse(compute_freshness(thirty_hours_ago, now))

    def test_walkin_expiry_logic(self):
        """Walk-in drives with past dates must be flagged expired."""
        now = datetime(2026, 11, 10, 10, 0, tzinfo=IST)
        
        # Past date
        past_date = "2026-11-08"
        is_exp, label = compute_walkin_expiry(past_date, now)
        self.assertTrue(is_exp)
        self.assertEqual(label, "Expired")

        # Today's date
        today_date = "2026-11-10"
        is_exp, label = compute_walkin_expiry(today_date, now)
        self.assertFalse(is_exp)
        self.assertEqual(label, "Happening Today")

        # Tomorrow's date
        tomorrow_date = "2026-11-11"
        is_exp, label = compute_walkin_expiry(tomorrow_date, now)
        self.assertFalse(is_exp)
        self.assertEqual(label, "Tomorrow")

        # In 3 days
        future_date = "2026-11-13"
        is_exp, label = compute_walkin_expiry(future_date, now)
        self.assertFalse(is_exp)
        self.assertEqual(label, "In 3 Days")

    def test_deduplication_and_preservation(self):
        """Merging duplicates updates metadata while preserving user status."""
        item1 = build_job_item(
            company="Google",
            title="Software Engineer Trainee",
            category_id="python",
            location="Hyderabad",
            work_mode="Hybrid",
            experience="0-1 Years",
            batch="2026 Batch",
            salary_range="₹20 LPA",
            apply_url="https://careers.google.com/jobs/123",
            portal_type="Official Portal",
            description="Software engineer role",
            skills=["Python", "C++"],
            post_date="2026-11-10"
        )
        
        # User marks as "Applied"
        item1["user_status"] = "Applied"
        
        # Next scraper sync discovers the same job
        item2 = build_job_item(
            company="Google",
            title="Software Engineer Trainee",
            category_id="python",
            location="Hyderabad",
            work_mode="Hybrid",
            experience="0-1 Years",
            batch="2026 Batch",
            salary_range="₹20 LPA",
            apply_url="https://careers.google.com/jobs/123",
            portal_type="Official Portal",
            description="Software engineer role updated description",
            skills=["Python", "C++"],
            post_date="2026-11-10"
        )
        item2["user_status"] = "Not Applied"  # Default fresh scrape

        merged = merge_and_deduplicate([item2], [item1])
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["id"], item1["id"])
        # Verified that the user's "Applied" status was preserved!
        self.assertEqual(merged[0]["user_status"], "Applied")

if __name__ == "__main__":
    unittest.main()
