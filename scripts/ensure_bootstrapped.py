import asyncio, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
from sqlalchemy import func, select
from app.db import SessionLocal
from app.models import Project

async def main() -> None:
    async with SessionLocal() as db:
        pc = await db.scalar(select(func.count()).select_from(Project)) or 0
        if pc > 0:
            print(f"Bootstrapped: {pc} projects present.")
            return
    print("Empty DB — seeding demo projects...")
    # seed_local lives in scripts/, import by path
    import importlib.util
    spec = importlib.util.spec_from_file_location("seed_local", os.path.join(os.path.dirname(__file__), "seed_local.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    await mod.reset_and_seed()

if __name__ == "__main__":
    asyncio.run(main())
