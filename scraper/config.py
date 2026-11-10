"""
Configuration and constants for Job Aggregator & Walk-in Dashboard.
Targeting 2025-2026 Batch Freshers / 0-1 Yrs Experience.
"""

from datetime import datetime, timezone, timedelta

# IST Timezone Helper (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

CATEGORIES = {
    "c_cpp": {
        "id": "c_cpp",
        "name": "C / C++ Developer",
        "badge_color": "purple",
        "subtitles": ["Embedded", "Systems", "Core C++", "Firmware", "Linux Kernel"],
        "keywords": ["c++", "c developer", "embedded c", "embedded systems", "firmware", "device driver", "rtos", "linux system", "c/c++"],
        "negative_keywords": ["senior", "lead", "architect", "5+ years", "7+ years", "10+ years", "staff", "principal"]
    },
    "java": {
        "id": "java",
        "name": "Java Developer",
        "badge_color": "orange",
        "subtitles": ["Spring Boot", "Core Java", "Microservices", "REST APIs"],
        "keywords": ["java", "spring boot", "core java", "j2ee", "hibernate", "microservices", "java developer", "java trainee", "associate java"],
        "negative_keywords": ["senior", "lead", "architect", "5+ years", "7+ years", "10+ years", "staff", "principal"]
    },
    "python": {
        "id": "python",
        "name": "Python Developer",
        "badge_color": "blue",
        "subtitles": ["Django", "FastAPI", "Automation", "Backend"],
        "keywords": ["python", "django", "fastapi", "flask", "python automation", "python developer", "backend engineer python"],
        "negative_keywords": ["senior", "lead", "architect", "5+ years", "7+ years", "10+ years", "staff", "principal"]
    },
    "data_science": {
        "id": "data_science",
        "name": "Data Science / ML",
        "badge_color": "emerald",
        "subtitles": ["Junior ML Engineer", "AI/GenAI Interns", "NLP", "PyTorch"],
        "keywords": ["data science", "machine learning", "ml engineer", "genai", "ai intern", "llm", "nlp", "deep learning", "pytorch", "tensorflow"],
        "negative_keywords": ["senior", "lead", "architect", "5+ years", "7+ years", "10+ years", "staff", "principal"]
    },
    "data_analyst": {
        "id": "data_analyst",
        "name": "Data Analyst",
        "badge_color": "cyan",
        "subtitles": ["SQL", "Power BI", "Python", "Excel", "Tableau"],
        "keywords": ["data analyst", "business analyst", "sql", "power bi", "tableau", "excel analyst", "data analytics intern", "junior analyst"],
        "negative_keywords": ["senior", "lead", "architect", "5+ years", "7+ years", "10+ years", "staff", "principal"]
    },
    "walkin_hyd": {
        "id": "walkin_hyd",
        "name": "Hyderabad Walk-in Drives",
        "badge_color": "rose",
        "subtitles": ["In-Person Drive", "Immediate Joining", "Hyderabad Only"],
        "keywords": ["walk-in", "walkin", "in-person drive", "hiring drive", "direct interview"],
        "negative_keywords": ["senior", "lead", "architect", "5+ years", "7+ years"]
    }
}

# Hyderabad Specific Localities (Mandatory for Walk-in Drives)
HYDERABAD_LOCALITIES = [
    "hyderabad", "madhapur", "hitec city", "hiteccity", "gachibowli", "begumpet",
    "kondapur", "financial district", "cyber towers", "nanakramguda", "raidurg",
    "kukatpally", "somajiguda", "banjara hills", "jubilee hills", "ameerpet", "uppal"
]

# Freshers Criteria (0-1 Years / 2025-2026 Batch)
EXPERIENCE_CRITERIA = ["0-1", "0-0", "fresher", "entry level", "graduate engineer trainee", "get", "intern", "internship", "2025", "2026", "associate", "junior"]

# Output Paths
DATA_DIR = "data"
JOBS_FILE = "data/jobs.json"
SCHEMA_FILE = "data/jobs_schema.json"
