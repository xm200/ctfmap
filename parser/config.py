import os

API_URL = os.environ.get("API_URL", "http://api:8000")
API_TOKEN = os.environ.get("API_TOKEN", "")
CRAWL_INTERVAL = int(os.environ.get("CRAWL_INTERVAL", "300"))
