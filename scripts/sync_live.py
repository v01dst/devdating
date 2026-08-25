import asyncio
import sys
from app.github_ingest import sync_all

languages = sys.argv[1:] or ["Python", "TypeScript", "Rust"]

result = asyncio.run(sync_all(languages))
print(result)
