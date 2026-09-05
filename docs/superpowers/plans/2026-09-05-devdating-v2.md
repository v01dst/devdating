# DevDating v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship DevDating v2 onboarding-first: never-empty first run, sidebar + CmdK dashboard UI, notifications + contribution tracking + onboarding quiz.

**Architecture:** Keep FastAPI + Next.js 14 + SQLite-default. Add 2 tables + 7 APIs + CLI bootstrap + 6 web components. No new services, no workers, BackgroundTasks only.

**Tech Stack:** FastAPI 0.111, SQLAlchemy 2 async, Alembic 1.13, Pydantic v2, Next.js 14, React 18, Tailwind 3.4, TanStack Query 5, Socket.IO (unchanged).

**Spec:** `docs/superpowers/specs/2026-09-05-devdating-v2-design.md`

## Global Constraints

- DB stays portable: `DATABASE_URL=sqlite+aiosqlite:///$ROOT/devdating.db` default, Postgres must still work (use `sa.UUID()` + `batch_alter_table` pattern).
- Match threshold stays 65 (`app/config.py: match_threshold: float = 65`).
- `calculate_compatibility` scoring unchanged — only surface reasons.
- Socket.IO stays direct-to-API origin (do not reintroduce proxy).
- Light theme default, dark via `data-theme`; respect `prefers-reduced-motion`.
- Every backend task needs pytest; frontend tasks need `npm run build` green.

---

## File Structure

- `api/app/models.py` — add `Notification`, `Contribution` + enums + User relationships. One responsibility: ORM.
- `api/migrations/versions/c41f2a9b77e3_v2_notifications_contributions.py` — create 2 tables. Only DDL.
- `api/app/schemas.py` — add `StatusRead`, `NotificationRead`, `ContributionRead`, `ContributionClaim`, `ContributionUpdate`.
- `api/app/notifications.py` — new small helper `notify(db, user_id, type, title, body, link)`. Single purpose.
- `api/app/routes.py` — add 7 endpoints + emit hooks in swipe/message/respond flows.
- `api/tests/test_v2.py` — new tests for status/notifications/contributions/onboarding-persist.
- `scripts/ensure_bootstrapped.py` — new bootstrapper (count → seed if empty).
- `bin/devdating` — modify `up` case to call migrator + bootstrapper + print picks URL.
- `web/components/Sidebar.tsx` — new nav (Discover/Projects/Issues/Inbox/Matches/Profile).
- `web/components/AuthBanner.tsx` — new local-mode vs OAuth banner.
- `web/components/CommandPalette.tsx` — new CmdK palette.
- `web/components/OnboardingWizard.tsx` — new 3-step quiz.
- `web/app/layout.tsx` — host Sidebar + AuthBanner + theme var.
- `web/app/globals.css` — add light vars + inbox/badge styles.
- `web/lib/api.ts` — extend with status/notifications/contributions/onboarding calls.
- `web/app/onboarding/page.tsx`, `web/app/inbox/page.tsx`, `web/app/contributions/page.tsx` — new pages.
- `web/app/page.tsx` — Today's Picks home (keep `/discover` swipe hero untouched).
- `README.md` — shrink quickstart to 2 lines.

---

### Task 1: Backend models + migration

**Files:**
- Modify: `api/app/models.py`
- Create: `api/migrations/versions/c41f2a9b77e3_v2_notifications_contributions.py`
- Test: `api/tests/test_v2.py`

**Interfaces:**
- Consumes: `Base`, `utcnow`, `new_id` from `api/app/models.py:23-28`.
- Produces: `Notification`, `Contribution`, `NotificationType`, `ContributionState` for Task 2 imports.

- [ ] **Step 1: Write the failing test**

```python
# api/tests/test_v2.py
def test_v2_models_importable():
    from app.models import Contribution, Notification
    assert Notification.__tablename__ == "notifications"
    assert Contribution.__tablename__ == "contributions"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && ../.venv/bin/pytest tests/test_v2.py::test_v2_models_importable -v`
Expected: FAIL with "No module named" / ImportError (models don't exist yet).

- [ ] **Step 3: Write minimal implementation**

Append to `api/app/models.py` (after `Issue` class at end of file):

```python
class NotificationType(str, enum.Enum):
    MATCH = "MATCH"
    MESSAGE = "MESSAGE"
    APPROVAL = "APPROVAL"
    SYSTEM = "SYSTEM"


class ContributionState(str, enum.Enum):
    INTERESTED = "INTERESTED"
    CLAIMED = "CLAIMED"
    PR_OPEN = "PR_OPEN"
    MERGED = "MERGED"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), default="SYSTEM")
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, default="")
    link: Mapped[str] = mapped_column(Text, default="")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Contribution(Base):
    __tablename__ = "contributions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("issues.id", ondelete="SET NULL"), nullable=True)
    repo: Mapped[str] = mapped_column(String(200), default="")
    issue_number: Mapped[int] = mapped_column(Integer, default=0)
    state: Mapped[ContributionState] = mapped_column(Enum(ContributionState, name="contribution_state"), default=ContributionState.INTERESTED)
    pr_url: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
```

Also add to `User` (after `onboarding_completed_at` line) two relationships:

```python
    notifications: Mapped[list["Notification"]] = relationship(cascade="all, delete-orphan")
    contributions: Mapped[list["Contribution"]] = relationship(cascade="all, delete-orphan")
```

- [ ] **Step 4: Create the migration**

Create `api/migrations/versions/c41f2a9b77e3_v2_notifications_contributions.py`:

```python
"""v2 notifications + contributions

Revision ID: c41f2a9b77e3
Revises: 1098f8fd7969
Create Date: 2026-09-05
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'c41f2a9b77e3'
down_revision: Union[str, None] = '1098f8fd7969'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.String(20), server_default='SYSTEM', nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('body', sa.Text(), server_default='', nullable=False),
        sa.Column('link', sa.Text(), server_default='', nullable=False),
        sa.Column('read', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_table(
        'contributions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('issue_id', sa.UUID(), nullable=True),
        sa.Column('repo', sa.String(200), server_default='', nullable=False),
        sa.Column('issue_number', sa.Integer(), server_default='0', nullable=False),
        sa.Column('state', sa.Enum('INTERESTED', 'CLAIMED', 'PR_OPEN', 'MERGED', name='contribution_state'), server_default='INTERESTED', nullable=False),
        sa.Column('pr_url', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_contributions_user_id', 'contributions', ['user_id'])

def downgrade() -> None:
    op.drop_index('ix_contributions_user_id', table_name='contributions')
    op.drop_table('contributions')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_table('notifications')
    sa.Enum(name='contribution_state').drop(op.get_bind(), checkfirst=True)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd api && ../.venv/bin/pytest tests/test_v2.py::test_v2_models_importable -v`
Expected: PASS

- [ ] **Step 6: Run migration on test DB**

Run: `cd api && ../.venv/bin/alembic upgrade head && ../.venv/bin/alembic downgrade -1 && ../.venv/bin/alembic upgrade head`
Expected: no error, both tables created.

- [ ] **Step 7: Commit**

```bash
git add api/app/models.py api/migrations/versions/c41f2a9b77e3_v2_notifications_contributions.py api/tests/test_v2.py
git commit -m "feat(v2): notification + contribution models and migration"
```

---

### Task 2: Status + Notifications + Contributions APIs

**Files:**
- Create: `api/app/notifications.py`
- Modify: `api/app/schemas.py`, `api/app/routes.py`
- Test: `api/tests/test_v2.py` (append)

**Interfaces:**
- Consumes: `Notification`, `Contribution`, `ContributionState` from Task 1; `require_user`, `get_db` existing.
- Produces: `GET /api/v1/status`, `GET /api/v1/notifications`, `PATCH /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all`, `GET /api/v1/contributions`, `POST /api/v1/contributions/claim`, `PATCH /api/v1/contributions/{id}` for web Task 5.

- [ ] **Step 1: Write the failing tests**

Append to `api/tests/test_v2.py`:

```python
def test_status_never_empty(client):
    s = client.get("/api/v1/status").json()
    assert {"project_count", "issue_count", "needs_onboarding"} <= set(s)
    assert s["project_count"] >= 1

def test_notifications_crud(client):
    n = client.get("/api/v1/notifications").json()
    assert isinstance(n, list)
    # swipe LIKE creates a match + notification
    cards = client.get("/api/v1/discovery/cards").json()
    pid = next(c["project"]["id"] for c in cards if c["project"]["name"] == "alpha")
    client.post("/api/v1/swipes", json={"project_id": pid, "direction": "LIKE"})
    after = client.get("/api/v1/notifications").json()
    assert len(after) >= len(n) + 1
    nid = after[0]["id"]
    r = client.patch(f"/api/v1/notifications/{nid}/read")
    assert r.status_code == 200
    assert r.json()["read"] is True

def test_contributions_claim_flow(client):
    cards = client.get("/api/v1/discovery/cards").json()
    # alpha project has issues via seed? use repo fallback
    c = client.post("/api/v1/contributions/claim", json={"repo": "example/alpha", "issue_number": 1})
    assert c.status_code == 201
    cid = c.json()["id"]
    u = client.patch(f"/api/v1/contributions/{cid}", json={"state": "PR_OPEN", "pr_url": "https://github.com/example/alpha/pull/1"})
    assert u.json()["state"] == "PR_OPEN"
    lst = client.get("/api/v1/contributions").json()
    assert any(x["id"] == cid for x in lst)
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd api && ../.venv/bin/pytest tests/test_v2.py -v`
Expected: FAIL — 404 on `/api/v1/status` etc.

- [ ] **Step 3: Implement helper + schemas**

Create `api/app/notifications.py`:

```python
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Notification

async def notify(db: AsyncSession, user_id: uuid.UUID, type: str, title: str, body: str = "", link: str = "") -> Notification:
    n = Notification(user_id=user_id, type=type, title=title, body=body, link=link)
    db.add(n)
    await db.flush()
    return n
```

Append to `api/app/schemas.py`:

```python
class StatusRead(BaseModel):
    project_count: int
    issue_count: int
    needs_onboarding: bool
    seeded: bool

class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    type: str
    title: str
    body: str
    link: str
    read: bool
    created_at: datetime

class ContributionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    repo: str
    issue_number: int
    state: str
    pr_url: str | None
    created_at: datetime

class ContributionClaim(BaseModel):
    repo: str = Field(min_length=1, max_length=200)
    issue_number: int = Field(default=0, ge=0)
    issue_id: uuid.UUID | None = None

class ContributionUpdate(BaseModel):
    state: str = Field(pattern="^(INTERESTED|CLAIMED|PR_OPEN|MERGED)$")
    pr_url: str | None = None
```

- [ ] **Step 4: Implement routes**

In `api/app/routes.py` add imports:

```python
from app.models import Contribution, ContributionState, Notification
from app.notifications import notify
from app.schemas import ContributionClaim, ContributionRead, ContributionUpdate, NotificationRead, StatusRead
```

Append endpoints at end of file (before EOF):

```python
@router.get("/status", response_model=StatusRead)
async def status(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    pc = await db.scalar(select(func.count()).select_from(Project)) or 0
    ic = await db.scalar(select(func.count()).select_from(Issue)) or 0
    needs = not bool((user.tech_stack or []) or user.onboarding_completed_at)
    return {"project_count": pc, "issue_count": ic, "needs_onboarding": needs, "seeded": pc > 0}

@router.get("/notifications", response_model=list[NotificationRead])
async def list_notifications(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50))
    return list(r.scalars().all())

@router.patch("/notifications/{nid}/read", response_model=NotificationRead)
async def read_notification(nid: uuid.UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    n = await db.scalar(select(Notification).where(Notification.id == nid, Notification.user_id == user.id))
    if n is None:
        raise HTTPException(404, "Not found")
    n.read = True
    await db.commit()
    return n

@router.post("/notifications/read-all")
async def read_all(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Notification).where(Notification.user_id == user.id, Notification.read.is_(False)))
    for n in r.scalars().all():
        n.read = True
    await db.commit()
    return {"ok": True}

@router.get("/contributions", response_model=list[ContributionRead])
async def list_contributions(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Contribution).where(Contribution.user_id == user.id).order_by(Contribution.created_at.desc()))
    rows = r.scalars().all()
    return [ContributionRead(id=x.id, repo=x.repo, issue_number=x.issue_number, state=x.state.value if hasattr(x.state, "value") else str(x.state), pr_url=x.pr_url, created_at=x.created_at) for x in rows]

@router.post("/contributions/claim", response_model=ContributionRead, status_code=201)
async def claim_contribution(payload: ContributionClaim, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    c = Contribution(user_id=user.id, repo=payload.repo, issue_number=payload.issue_number, issue_id=payload.issue_id, state=ContributionState.CLAIMED)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    await notify(db, user.id, "SYSTEM", f"Claimed {payload.repo}#{payload.issue_number}", "", "/contributions")
    await db.commit()
    await db.refresh(c)
    return ContributionRead(id=c.id, repo=c.repo, issue_number=c.issue_number, state="CLAIMED", pr_url=c.pr_url, created_at=c.created_at)

@router.patch("/contributions/{cid}", response_model=ContributionRead)
async def update_contribution(cid: uuid.UUID, payload: ContributionUpdate, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    c = await db.scalar(select(Contribution).where(Contribution.id == cid, Contribution.user_id == user.id))
    if c is None:
        raise HTTPException(404, "Not found")
    c.state = ContributionState(payload.state)
    if payload.pr_url is not None:
        c.pr_url = payload.pr_url
    await db.commit()
    await db.refresh(c)
    return ContributionRead(id=c.id, repo=c.repo, issue_number=c.issue_number, state=payload.state, pr_url=c.pr_url, created_at=c.created_at)
```

Emit hooks: in existing swipe handler where `match_created is True`, after commit add `await notify(db, user.id, "MATCH", f"Matched {project.name}", f"Score {score}", f"/matches")`. In message-send handler after insert, notify match owner. In match respond-accept handler, notify requester. If handler names differ, search for `match_created` and `messages` POST in `routes.py` and insert 2 lines each — keep inside same DB transaction before final commit.

- [ ] **Step 5: Run tests**

Run: `cd api && ../.venv/bin/pytest tests/test_v2.py tests/test_routes_smoke.py -v`
Expected: PASS (all, including 10 existing smoke tests).

- [ ] **Step 6: Lint**

Run: `cd api && ../.venv/bin/ruff check app tests`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add api/app/notifications.py api/app/schemas.py api/app/routes.py api/tests/test_v2.py
git commit -m "feat(v2): status, notifications, contributions APIs"
```

---

### Task 3: CLI bootstrap — never-empty first run

**Files:**
- Create: `scripts/ensure_bootstrapped.py`
- Modify: `bin/devdating`
- Test: manual `devdating up` on empty DB (no pytest — shell behavior).

**Interfaces:**
- Consumes: `alembic upgrade head`, `scripts/seed_local.py::reset_and_seed`.
- Produces: bootstrapped DB with `project_count > 0` for Task 5 home page.

- [ ] **Step 1: Create bootstrapper**

Create `scripts/ensure_bootstrapped.py`:

```python
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
    from seed_local import reset_and_seed
    # seed_local lives in scripts/, import by path
    import importlib.util
    spec = importlib.util.spec_from_file_location("seed_local", os.path.join(os.path.dirname(__file__), "seed_local.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    await mod.reset_and_seed()

if __name__ == "__main__":
    asyncio.run(main())
```

Simplify: the file above double-imports; keep only the importlib path (delete the `from seed_local` line when writing). Final file must run with `PYTHONPATH=api python3 scripts/ensure_bootstrapped.py`.

- [ ] **Step 2: Verify it runs**

Run: `PYTHONPATH=api .venv/bin/python scripts/ensure_bootstrapped.py`
Expected: prints "Bootstrapped: N projects present." (or seeds if empty).

- [ ] **Step 3: Wire into `bin/devdating` up flow**

In `bin/devdating`, in the `up)` case right after `ensure_port_clear http://localhost:8000/healthz` block and before web start, insert:

```bash
      migrate_db || exit 1
      export PYTHONPATH="$ROOT/api:${PYTHONPATH:-}"
      .venv/bin/python "$ROOT/scripts/ensure_bootstrapped.py" >>"$ROOT/logs/api.log" 2>&1 || true
```

If `migrate_db` already runs in `install` only, ensure `up` also calls it (add the two lines above). Keep `[[ "$seed" == true ]] && "$0" seed` as-is for explicit reseed.

- [ ] **Step 4: Verify help text**

Run: `bin/devdating help | head -20`
Expected: shows up/seed/sync commands, no crash.

- [ ] **Step 5: Commit**

```bash
git add scripts/ensure_bootstrapped.py bin/devdating
git commit -m "feat(v2): never-empty first run bootstrap on up"
```

---

### Task 4: Web shell B — Sidebar + AuthBanner + theme

**Files:**
- Create: `web/components/Sidebar.tsx`, `web/components/AuthBanner.tsx`
- Modify: `web/app/layout.tsx`, `web/app/globals.css`
- Test: `cd web && npm run build`

**Interfaces:**
- Consumes: existing `TopNav`, `Footer`, `Providers` (keep them, Sidebar supplements on desktop).
- Produces: `<Sidebar/>`, `<AuthBanner/>` layout slots used by Task 5 pages.

- [ ] **Step 1: Write Sidebar**

Create `web/components/Sidebar.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/discover", label: "Discover", icon: "◈" },
  { href: "/projects", label: "Projects", icon: "▦" },
  { href: "/issues", label: "Issues", icon: "●" },
  { href: "/inbox", label: "Inbox", icon: "✉" },
  { href: "/matches", label: "Matches", icon: "💜" },
  { href: "/contributions", label: "Tracking", icon: "✓" },
  { href: "/profile", label: "Profile", icon: "○" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-black/10 p-3 dark:border-white/10 lg:flex">
      {links.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href} className={active ? "nav-active" : "nav-link"}>
            <span aria-hidden>{icon}</span> {label}
          </Link>
        );
      })}
      <div className="mt-auto rounded-xl bg-black/5 p-3 text-xs dark:bg-white/5">
        <div className="font-semibold">Tip: press Ctrl-K</div>
        <div className="opacity-70">Search projects, issues, actions</div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Write AuthBanner**

Create `web/components/AuthBanner.tsx`:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";

export function AuthBanner() {
  const { data } = useQuery({
    queryKey: ["status"],
    queryFn: async () => {
      const r = await fetch("/backend/api/v1/status", { credentials: "same-origin" });
      if (!r.ok) return null;
      return r.json() as Promise<{ needs_onboarding: boolean; project_count: number }>;
    },
  });
  if (!data) return null;
  return (
    <div className="border-b border-black/10 bg-amber-100 px-4 py-2 text-center text-xs text-amber-900 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
      Local mode — no login needed. {data.needs_onboarding ? (<a className="underline" href="/onboarding">Finish onboarding →</a>) : (<span>{data.project_count} projects ready.</span>)}
    </div>
  );
}
```

- [ ] **Step 3: Update layout + CSS**

Modify `web/app/layout.tsx`: import Sidebar + AuthBanner, wrap in flex row:

```tsx
import { Sidebar } from "@/components/Sidebar";
import { AuthBanner } from "@/components/AuthBanner";
// inside Providers, after <TopNav />:
<AuthBanner />
<div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 sm:px-6">
  <Sidebar />
  <div className="min-w-0 flex-1">{children}</div>
</div>
```

Append to `web/app/globals.css`:

```css
.nav-link { display:flex; align-items:center; gap:.5rem; border-radius:.75rem; padding:.6rem .9rem; font-size:.85rem; font-weight:600; color:rgba(0,0,0,.65); }
.dark .nav-link, :root .nav-link { color:rgba(255,255,255,.7); }
.nav-link:hover { background:rgba(0,0,0,.06); }
.nav-active { display:flex; align-items:center; gap:.5rem; border-radius:.75rem; padding:.6rem .9rem; font-size:.85rem; font-weight:700; background:#7c5cff; color:white; }
:root { color-scheme: light dark; }
```

- [ ] **Step 4: Extend lib/api.ts**

Append to `web/lib/api.ts`:

```ts
export type Status = { project_count: number; issue_count: number; needs_onboarding: boolean; seeded: boolean };
export type Notification = { id: string; type: string; title: string; body: string; link: string; read: boolean; created_at: string };
export type Contribution = { id: string; repo: string; issue_number: number; state: string; pr_url: string | null; created_at: string };

Object.assign(api, {
  status: () => request<Status>("/api/v1/status"),
  notifications: () => request<Notification[]>("/api/v1/notifications"),
  markRead: (id: string) => request<Notification>(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
  readAll: () => request<{ ok: boolean }>("/api/v1/notifications/read-all", { method: "POST" }),
  contributions: () => request<Contribution[]>("/api/v1/contributions"),
  claim: (repo: string, issue_number: number) => request<Contribution>("/api/v1/contributions/claim", { method: "POST", body: JSON.stringify({ repo, issue_number }) }),
  onboarding: (prefs: Record<string, unknown>) => request<unknown>("/api/v1/me/preferences", { method: "PATCH", body: JSON.stringify(prefs) }),
});
```

- [ ] **Step 5: Build**

Run: `cd web && npm run build`
Expected: green, route count grows by 0 (no new pages yet).

- [ ] **Step 6: Commit**

```bash
git add web/components/Sidebar.tsx web/components/AuthBanner.tsx web/app/layout.tsx web/app/globals.css web/lib/api.ts
git commit -m "feat(v2): dashboard shell with sidebar and auth banner"
```

---

### Task 5: CmdK + Onboarding + Home + Inbox + Tracking pages

**Files:**
- Create: `web/components/CommandPalette.tsx`, `web/components/OnboardingWizard.tsx`, `web/app/onboarding/page.tsx`, `web/app/inbox/page.tsx`, `web/app/contributions/page.tsx`
- Modify: `web/app/page.tsx`
- Test: `cd web && npm run build`

**Interfaces:**
- Consumes: `api` helpers from Task 4, existing `/api/v1/discovery/cards`, `/projects`, `/issues` endpoints.
- Produces: working `/`, `/onboarding`, `/inbox`, `/contributions` routes.

- [ ] **Step 1: CommandPalette**

Create `web/components/CommandPalette.tsx` (Ctrl-K, filters projects via `/backend/api/v1/projects?search=` — fall back to discovery cards if search param unsupported):

```tsx
"use client";
import { useEffect, useState } from "react";
import { api, type DiscoveryCard } from "@/lib/api";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<DiscoveryCard[]>([]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!open) return;
    api.cards().then(setCards).catch(() => setCards([]));
  }, [open ]);
  if (!open) return null;
  const filtered = cards.filter((c) => (c.project.name + c.project.description).toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-24 max-w-lg rounded-2xl bg-white p-3 text-black dark:bg-[#15151f] dark:text-white" onClick={(e) => e.stopPropagation()}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects, or type: inbox, onboarding, tracking" className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-3 outline-none" />
        <div className="mt-2 flex flex-col">
          {filtered.map((c) => (
            <a key={c.project.id} href="/discover" className="rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10">
              <span className="font-semibold">{c.project.name}</span> <span className="opacity-60">· {Math.round(c.compatibility_score)}% · {c.project.languages.join(", ")}</span>
            </a>
          ))}
          {filtered.length === 0 && <div className="px-3 py-4 text-sm opacity-60">No matches — try a language like python or typescript.</div>}
        </div>
      </div>
    </div>
  );
}
```

Mount it in `web/app/layout.tsx` inside Providers (add `<CommandPalette />` next to Sidebar).

- [ ] **Step 2: OnboardingWizard + page**

Create `web/components/OnboardingWizard.tsx`:

```tsx
"use client";
import { useState } from "react";
import { api } from "@/lib/api";

const LANGS = ["TypeScript", "Python", "Go", "Rust", "Java", "Kotlin", "Swift", "C++", "Ruby", "Dart"];

export function OnboardingWizard() {
  const [langs, setLangs] = useState<string[]>(["TypeScript"]);
  const [level, setLevel] = useState("INTERMEDIATE");
  const [done, setDone] = useState(false);
  const toggle = (l: string) => setLangs((v) => (v.includes(l) ? v.filter((x) => x !== l) : [...v, l]));
  const save = async () => {
    await (api as unknown as { onboarding: (p: object) => Promise<unknown> }).onboarding({ tech_stack: langs, experience_level: level });
    setDone(true);
    window.location.href = "/discover";
  };
  if (done) return <div>Saved — taking you to Discover…</div>;
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Get your picks in 30 seconds</h1>
      <p className="opacity-70">Step 1/2 — pick languages. Step 2/2 — pick level.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {LANGS.map((l) => (
          <button key={l} onClick={() => toggle(l)} className={langs.includes(l) ? "rounded-full bg-[#7c5cff] px-4 py-2 text-sm font-bold text-white" : "rounded-full border border-black/15 px-4 py-2 text-sm dark:border-white/15"}>{l}</button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        {["NEWCOMER", "BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map((lv) => (
          <button key={lv} onClick={() => setLevel(lv)} className={level === lv ? "rounded-xl bg-black px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-black" : "rounded-xl border border-black/15 px-3 py-2 text-xs dark:border-white/15"}>{lv}</button>
        ))}
      </div>
      <button onClick={save} className="mt-6 w-full rounded-2xl bg-[#7c5cff] py-3 font-bold text-white">Show my picks →</button>
    </div>
  );
}
```

Create `web/app/onboarding/page.tsx`:

```tsx
import { OnboardingWizard } from "@/components/OnboardingWizard";
export const metadata = { title: "Onboarding — DevDating" };
export default function Page() {
  return (<main className="mx-auto max-w-3xl px-6 py-10"><OnboardingWizard /></main>);
}
```

- [ ] **Step 3: Home Today's Picks**

Overwrite `web/app/page.tsx`:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, type DiscoveryCard } from "@/lib/api";

export default function Home() {
  const { data } = useQuery({ queryKey: ["picks"], queryFn: () => api.cards() });
  const picks = (data as DiscoveryCard[] | undefined)?.slice(0, 3) ?? [];
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-4xl font-bold">Today&apos;s picks for you</h1>
      <p className="opacity-70">Top matches from live GitHub data. <Link className="underline" href="/discover">Open swipe deck →</Link></p>
      <div className="mt-6 flex flex-col gap-3">
        {picks.map((c) => (
          <div key={c.project.id} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <div className="font-bold">{Math.round(c.compatibility_score)}% · {c.project.owner_login}/{c.project.name}</div>
            <div className="text-sm opacity-70">{c.project.description} · {c.project.languages.join(", ")} · ★{c.project.stars}</div>
            <div className="text-xs opacity-60">{c.reasons.join(" · ")}</div>
          </div>
        ))}
        {picks.length === 0 && <div className="opacity-60">Loading picks… if empty, run onboarding or sync.</div>}
      </div>
      <div className="mt-6 flex gap-2 text-sm">
        <Link className="underline" href="/onboarding">Onboarding</Link>
        <Link className="underline" href="/inbox">Inbox</Link>
        <Link className="underline" href="/contributions">Tracking</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Inbox + Tracking pages**

Create `web/app/inbox/page.tsx`:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
export default function Inbox() {
  const { data, refetch } = useQuery({ queryKey: ["inbox"], queryFn: () => (api as unknown as { notifications: () => Promise<{ id: string; title: string; body: string; link: string; read: boolean }[]> }).notifications() });
  return (<main className="mx-auto max-w-3xl px-6 py-10">
    <h1 className="text-3xl font-bold">Inbox</h1>
    <button className="mt-2 text-sm underline" onClick={async () => { await (api as unknown as { readAll: () => Promise<unknown> }).readAll(); refetch(); }}>Mark all read</button>
    <div className="mt-4 flex flex-col gap-2">{(data ?? []).map((n) => (<div key={n.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10"><div className="font-semibold">{n.read ? "" : "• "}{n.title}</div><div className="text-sm opacity-70">{n.body}</div></div>))}</div>
  </main>);
}
```

Create `web/app/contributions/page.tsx`:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
export default function Tracking() {
  const { data } = useQuery({ queryKey: ["tracking"], queryFn: () => (api as unknown as { contributions: () => Promise<{ id: string; repo: string; issue_number: number; state: string }[]> }).contributions() });
  return (<main className="mx-auto max-w-3xl px-6 py-10">
    <h1 className="text-3xl font-bold">Contribution tracking</h1>
    <p className="opacity-70">interested → claimed → pr_open → merged</p>
    <div className="mt-4 flex flex-col gap-2">{(data ?? []).map((c) => (<div key={c.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10"><span className="font-mono text-xs">{c.state}</span> <span className="font-semibold">{c.repo}#{c.issue_number}</span></div>))}</div>
  </main>);
}
```

- [ ] **Step 5: Build**

Run: `cd web && npm run build`
Expected: green, routes include `/`, `/onboarding`, `/inbox`, `/contributions` (14+ routes).

- [ ] **Step 6: Commit**

```bash
git add web/components/CommandPalette.tsx web/components/OnboardingWizard.tsx web/app/onboarding/page.tsx web/app/inbox/page.tsx web/app/contributions/page.tsx web/app/page.tsx web/app/layout.tsx
git commit -m "feat(v2): CmdK, onboarding, picks home, inbox, tracking"
```

---

### Task 6: Verify + docs

**Files:**
- Modify: `README.md`
- Test: full suite + build + live HTTP checks.

- [ ] **Step 1: Run backend suite**

Run: `cd api && ../.venv/bin/pytest -q`
Expected: all PASS (26 existing + 4 new v2 tests).

- [ ] **Step 2: Run frontend build**

Run: `cd web && npm run build`
Expected: green, no type errors.

- [ ] **Step 3: Update README quickstart**

Replace Quick Start block with:

```bash
npm install -g @v01dst/devdating@latest
devdating install
devdating up
```

plus one line: `Open http://localhost:3000/ — onboarding takes 30s, Today's Picks appear even without a token. Advanced: devdating sync-bulk 500, sync-me, enrich-languages.`

- [ ] **Step 4: Live check (if services up)**

Run: `curl -fsS http://localhost:8000/healthz && curl -fsS http://localhost:8000/api/v1/status | head -c 300`
Expected: `{"status":"ok"}` + JSON with project_count.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(v2): simplified quickstart for onboarding-first flow"
```
