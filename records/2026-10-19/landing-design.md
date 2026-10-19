# Landing design - reference-style redesign (2026-10-19)

**Ask:** user shared a dark, playful portfolio reference (Framer gallery) and said: design like this for DevDating. Then clarified: act as the OpenDesign inner agent and use its **skills**.

## OpenDesign MCP - pipeline blockers (context)

Three pipeline attempts failed before any artifact was produced (project + brief are saved and resumable):

1. `amr` agent (OpenDesign Cloud) - `AMR_INSUFFICIENT_BALANCE` (cloud balance empty; user explicitly declined top-up).
2. `opencode` agent - OpenDesign spawns `opencode run --dir ...` from PATH; the installed OpenCode CLI (v2.0.26/V2 family) has no `--dir` flag → `AGENT_EXECUTION_FAILED`.
3. `byok-opencode` - its bundled runtime reads `~/.config/opencode/opencode.json` with a different schema (`Unrecognized key: providers`).

**Resolution:** skipped the cloud pipeline and ran the skill directly (user's request): read
`resources/open-design/skills/taste-skill/SKILL.md` (`design-taste-frontend` v2) plus craft modules
(`anti-ai-slop.md`, `color.md`, `typography.md`) and executed its protocol by hand.

## Skill pass - design-taste-frontend (v2)

- **Design read:** playful collage landing for developers starting with open source, kinetic-type
  language, native CSS art + Fredoka display + Phosphor glyphs.
- **Dials:** DESIGN_VARIANCE 9 / MOTION_INTENSITY 8 / VISUAL_DENSITY 3. Justified overrides:
  dark-locked theme + centered hero (brief = collage artwork), purple accent locked (LILA override),
  lime reserved as the app's "good first issue" semantic tag color.
- **Fixes applied in the audit:**
  - removed every em-dash (9.G) - mechanical check: 0 occurrences
  - removed numbered eyebrows `( 01 / 02 / ready when you are )` (9.F section-numbering ban)
  - removed split-header + floating side-note in "how it works" (4.7)
  - removed scroll cue `( scroll )` + `★`/`♥` glyphs (9.F)
  - dropped the serif entirely (banned default - Instrument Serif); typefaces now Fredoka +
    Space Grotesk + IBM Plex Mono = 2 families + mono labels
  - all raw hexes moved into `:root` tokens (anti-ai-slop P1: max ~12 outside `:root`)
  - icons replaced with Phosphor path data (heart, arrow-up-right), no hand-rolled paths
  - hero CTA added (`start swiping`) - hero now headline + sub + CTA, CTA visible without scroll
  - fake avatars replaced with real GitHub avatars; star counts are public metrics; 92% score and
    card deck labeled sample data in comments (real component preview, not a fake screenshot)
  - hero top padding capped at 6rem; `min-height: 88dvh`; `:active` tactile states; mobile chips
    repositioned; footer meta without middle-dot runs

## Deliverable

`design/landing/index.html` - self-contained single-file landing (Google Fonts + inline CSS/JS):
nav (github pill) / kinetic-type wordmark hero with pink face ball + heart-dot "i" / keyword marquee /
match-card stack preview with glow, real avatars, floating chips + mouse parallax / how-it-works
index rows / about + facts / oversized CTA / mono footer. Responsive (verified 1440, 1920, 390),
reduced-motion + noscript fallbacks, `data-od-id` on all 8 sections.

## QA captures

`.playwright-mcp/landing-{hero,desktop,mobile-hero}.png`, `.playwright-mcp/{i-check,stack-check}.png`
(served via `python -m http.server 8899`; playwright blocks `file://`).

## Fix pass (hero "g" + overflow)

- User spotted the hero "g" reading as cut. Root cause (proved by a solid-color A/B render): no geometric clip;
  the gradient's darkest stop landed exactly on the descender, under the dark offset shadow, so the tail
  visually sank into the background at small sizes.
- Fix: g gradient re-lit from below (`#6d7cff -> --art-blue -> --art-blue-hi`), shadow alpha eased to .45,
  and a defensive `.15em` padding-bottom + negative margin guard on the glyph box (protects `background-clip:text`
  against font-metric variation across machines).
- Also fixed a real horizontal overflow found during the check: `.aura--red` (positioned off-canvas with
  `right:-14vw`) pushed `document.scrollWidth` to 1626px at a 1440 viewport. Auras are now `position:fixed`
  and no longer contribute to document width (verified: scrollWidth 1425 <= 1440).

## Next options

1. Port into the Next.js app as the landing at `/` (currently redirects to /discover), with
   `next/font` instead of the Google Fonts link.
2. Iterate with other OpenDesign skills: `threejs` / `shader-dev` (real 3D centerpiece),
   `screenshots-marketing`, `screenshot` for product shots.
3. Re-run the official OpenDesign pipeline after recharging cloud balance (brief preserved).

