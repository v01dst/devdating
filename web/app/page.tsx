import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LandingMotion } from "@/components/LandingMotion";
import styles from "./landing.module.css";

// Fonts (Fredoka / Space Grotesk / IBM Plex Mono) come from the root layout
// variables: --font-round, --font-grot, --font-label.

// Points at the maintainer's Discord profile (9p.1). Swap for a numeric
// discord.com/users/<id> link if the username URL ever stops resolving.
const DISCORD_URL = "https://discord.com/users/9p.1";
const REPO_URL = "https://github.com/v01dst/devdating";
const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
const NEXT_URL = "https://nextjs.org";
const FASTAPI_URL = "https://fastapi.tiangolo.com";

export const metadata: Metadata = {
  title: "DevDating - the matchmaker for open source",
  description:
    "Swipe. Match. Contribute. DevDating scans real repositories and real issues, scores them against your stack, and serves them one at a time. No endless searching.",
};

/* Brand glyphs from Simple Icons (CC0), Phosphor paths (MIT). No hand-rolled icon paths. */
function IconGithub() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

function IconMit() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11.959.447A11.938 11.938 0 000 12.407c0 5.576 3.874 10.097 7.783 11.114.193.05.392-.05.467-.234l2.771-6.822a.396.396 0 00-.246-.528C9.365 15.47 8.53 14.32 8.48 12.4c-.024-1.828 1.5-3.45 3.561-3.447 1.931.003 3.479 1.632 3.479 3.453 0 .966-.203 1.687-.575 2.238-.371.552-.922.951-1.695 1.239a.396.396 0 00-.23.515l2.685 6.903a.396.396 0 00.465.24C20.163 22.534 24 18.062 24 12.406 24 5.804 18.603.447 11.959.447zm0 .791c6.22 0 11.25 4.997 11.25 11.168 0 5.138-3.423 9.208-6.895 10.272L13.9 16.47c.703-.308 1.302-.79 1.702-1.384.477-.708.709-1.602.709-2.68 0-2.266-1.898-4.24-4.27-4.244-2.48-.004-4.382 1.976-4.352 4.25.023 1.995.934 3.492 2.451 4.13L7.648 22.66C4.251 21.592.791 17.458.791 12.406A11.13 11.13 0 0111.959 1.238zm10.617 20.149a1.03 1.03 0 000 2.058 1.03 1.03 0 000-2.058zm0 .162c.48 0 .865.388.865.867a.856.856 0 01-.271.623l-.172-.342a.847.847 0 00-.111-.178.263.263 0 00-.114-.084.301.301 0 00.17-.117.356.356 0 00.061-.21c0-.13-.038-.227-.113-.292-.076-.064-.192-.095-.346-.095h-.41v1.343h.181v-.568h.2c.072 0 .128.015.17.045a.48.48 0 01.129.18l.171.343.157.001a.878.878 0 01-.567.216.865.865 0 010-1.732zm-.26.322h.229c.088 0 .155.018.2.059.044.04.066.099.066.177 0 .079-.022.14-.067.18-.044.04-.111.06-.2.06h-.228z" />
    </svg>
  );
}

function IconNext() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.665 21.978C16.758 23.255 14.465 24 12 24 5.377 24 0 18.623 0 12S5.377 0 12 0s12 5.377 12 12c0 3.583-1.574 6.801-4.067 9.001L9.219 7.2H7.2v9.596h1.615V9.251l9.85 12.727Zm-3.332-8.533 1.6 2.061V7.2h-1.6v6.245Z" />
    </svg>
  );
}

function IconFastapi() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .0387C5.3729.0384.0003 5.3931 0 11.9988c-.001 6.6066 5.372 11.9628 12 11.9625 6.628.0003 12.001-5.3559 12-11.9625-.0003-6.6057-5.3729-11.9604-12-11.96m-.829 5.4153h7.55l-7.5805 5.3284h5.1828L5.279 18.5436q2.9466-6.5444 5.892-13.0896" />
    </svg>
  );
}

function MatchCard({
  variant,
  owner,
  name,
  meta,
  label,
  issue,
  match,
  note,
}: {
  variant: string;
  owner: string;
  name: string;
  meta: string;
  label: string;
  issue: string;
  match?: string;
  note?: string;
}) {
  return (
    <article className={`${styles.card} ${variant}`} aria-hidden="true">
      <div className={styles.cardHead}>
        <div className={styles.repo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.avatar} src={`https://github.com/${owner}.png?size=96`} alt="" width={34} height={34} loading="lazy" decoding="async" />
          <div>
            <div className={styles.repoName}>{name}</div>
            <div className={styles.repoMeta}>{meta}</div>
          </div>
        </div>
        {match ? <span className={styles.matchPill}>{match}</span> : null}
      </div>
      <div className={styles.issueBox}>
        <div className={styles.issueLabel}>{label}</div>
        <div className={styles.issueTitle}>{issue}</div>
      </div>
      {note ? (
        <div className={styles.cardFoot}>
          <span className={styles.stackNote}>{note}</span>
          <span className={styles.heartBtn} aria-hidden="true">
            <svg viewBox="0 0 256 256">
              <path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.17 129.08a8 8 0 0 0 7.66 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62Zm-70 180.09C95.26 214.42 32 170.68 32 102a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 68.61-63.25 112.42-76 118.09Z" />
            </svg>
          </span>
        </div>
      ) : null}
    </article>
  );
}

const MARQUEE_ITEMS = [
  "TYPESCRIPT", "PYTHON", "GO", "RUST", "GOOD FIRST ISSUE", "HELP WANTED", "NEXT.JS", "FASTAPI",
];

function MarqueeChunk() {
  return (
    <div className={styles.marqueeChunk}>
      {MARQUEE_ITEMS.map((item, i) => (
        <Fragment key={`${item}-${i}`}>
          <span className={styles.mItem}>{item}</span>
          <span className={styles.mPlus}>+</span>
        </Fragment>
      ))}
      <span className={styles.mStar}>✦</span>
      <span className={styles.mItem}>SOCKET.IO</span>
      <span className={styles.mPlus}>+</span>
      <span className={styles.mItem}>MIT</span>
      <span className={styles.mPlus}>+</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className={`${styles.page}`}>
      <LandingMotion />
      <div className={styles.grain} aria-hidden="true" />
      <div className={`${styles.aura} ${styles.auraAccent}`} aria-hidden="true" />
      <div className={`${styles.aura} ${styles.auraRed}`} aria-hidden="true" />

      {/* ================= NAV ================= */}
      <nav className={styles.nav} data-od-id="nav">
        <Link className={styles.brand} href="/" aria-label="DevDating home">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect className={styles.b1} x="3" y="7" width="19" height="21" rx="5" />
            <rect className={styles.b2} x="10" y="3" width="19" height="21" rx="5" />
            <path className={styles.b3} d="M19.5 10.2c1.9 0 3.3 1.4 3.3 3.2 0 2.5-2.9 4.5-3.3 4.7-.4-.2-3.3-2.2-3.3-4.7 0-1.8 1.4-3.2 3.3-3.2z" />
          </svg>
          <span>devdating</span>
        </Link>
        <div className={styles.navLinks}>
          <Link className={styles.navLink} href="/discover">discover</Link>
          <a className={styles.navLink} href="#how">how it works</a>
          <a className={styles.navIcon} href={DISCORD_URL} target="_blank" rel="noopener" aria-label="Join the DevDating Discord">
            <IconDiscord />
          </a>
          <a className={`${styles.navLink} ${styles.pill}`} href={REPO_URL} target="_blank" rel="noopener">
            <IconGithub /> github ↗
          </a>
        </div>
      </nav>

      {/* ================= HERO ================= */}
      <header className={styles.hero} id="top" data-od-id="hero">
        <h1 className={styles.heroTitle} aria-label="DevDating">
          <span className={`${styles.w} ${styles.wD1}`} aria-hidden="true">D</span>
          <span className={`${styles.w} ${styles.wE}`} aria-hidden="true">e</span>
          <span className={`${styles.w} ${styles.wV}`} aria-hidden="true">v</span>
          <span className={`${styles.w} ${styles.wD2}`} aria-hidden="true">D</span>
          <span className={`${styles.ball}`} aria-hidden="true" />
          <span className={`${styles.w} ${styles.wT}`} aria-hidden="true">t</span>
          <span className={`${styles.w} ${styles.wI}`} aria-hidden="true">
            <svg className={styles.heart} viewBox="0 0 256 256" aria-hidden="true">
              <path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.17 129.08a8 8 0 0 0 7.66 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62Zm-70 180.09C95.26 214.42 32 170.68 32 102a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 68.61-63.25 112.42-76 118.09Z" />
            </svg>
            <span className={styles.stick} />
          </span>
          <span className={`${styles.w} ${styles.wN}`} aria-hidden="true">n</span>
          <span className={`${styles.w} ${styles.wG}`} aria-hidden="true">g</span>
          <svg className={`${styles.sparkle} ${styles.sparkle1}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 1l2.7 8.3L23 12l-8.3 2.7L12 23l-2.7-8.3L1 12l8.3-2.7z" />
          </svg>
        </h1>

        <div className={styles.heroSub}>
          <p>the matchmaker for open source</p>
          <svg className={styles.scribble} viewBox="0 0 240 14" fill="none" aria-hidden="true">
            <path d="M3 9 C 62 3, 178 3, 237 9" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <Link className={styles.heroCta} href="/discover">
          start swiping <span className={styles.arr}>→</span>
        </Link>
      </header>

      {/* ================= MARQUEE ================= */}
      <div className={styles.marquee} data-od-id="marquee" aria-hidden="true">
        <div className={styles.marqueeTrack}>
          <MarqueeChunk />
          <MarqueeChunk />
        </div>
      </div>

      {/* ================= STAGE / PRODUCT PREVIEW =================
          Real component preview: a DOM recreation of DevDating's match card
          (real repo avatars from GitHub, public star counts). The 92% score
          is sample data. */}
      <section className={styles.stage} id="discover" data-od-id="stage" data-landing-stage aria-label="DevDating match card preview">
        <div className={styles.glowCore} aria-hidden="true" />
        <div className={styles.glowFloor} aria-hidden="true" />

        <span className={`${styles.chip} ${styles.chipLeft}`} aria-hidden="true">84.2k stars on github</span>
        <span className={`${styles.chip} ${styles.chipRight}`} aria-hidden="true">good first issue ✓</span>

        <div
          className={styles.stack}
          data-landing-stack
          role="img"
          aria-label="A DevDating match card for fastapi/fastapi at 92 percent compatibility with a recommended good first issue, fanned above two more matched projects. Sample data."
        >
          <MatchCard variant={styles.cardBack2} owner="rust-lang" name="rust-lang/rust" meta="Rust · 101k stars" label="HELP WANTED" issue="Improve error codes for trait bounds" />
          <MatchCard variant={styles.cardBack1} owner="vercel" name="vercel/next.js" meta="TypeScript · 132k stars" label="GOOD FIRST ISSUE" issue="Clarify caching docs for route handlers" />
          <MatchCard variant={styles.cardFront} owner="fastapi" name="fastapi/fastapi" meta="Python · 84.2k stars" label="GOOD FIRST ISSUE" issue="Improve WebSocket dependency docs with a minimal example" match="92% match" note="matches your stack: python, fastapi, docs" />
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className={styles.secPad} id="how" data-od-id="how">
        <div className={styles.wrap}>
          <div className={styles.howHead} data-reveal="pending">
            <h2 className={styles.secTitle}>from feed to first pr</h2>
          </div>

          <div className={styles.rows}>
            <Link className={styles.row} href="/discover" data-reveal="pending">
              <span className={styles.rowNum}>01</span>
              <span className={styles.rowName}>swipe</span>
              <span className={styles.rowDesc}>projects scored against your stack: language overlap, experience fit, activity, and real demand.</span>
              <span className={styles.rowArrow}>
                <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M200 64v104a8 8 0 0 1-16 0V82.34l-94.83 94.83a8 8 0 0 1-11.32-11.32L172.69 71H88a8 8 0 0 1 0-16h104a8 8 0 0 1 8 8Z" /></svg>
              </span>
            </Link>
            <Link className={styles.row} href="/matches" data-reveal="pending">
              <span className={styles.rowNum}>02</span>
              <span className={styles.rowName}>match</span>
              <span className={styles.rowDesc}>65%+ compatibility unlocks a starter issue and a two-way match with the maintainer.</span>
              <span className={styles.rowArrow}>
                <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M200 64v104a8 8 0 0 1-16 0V82.34l-94.83 94.83a8 8 0 0 1-11.32-11.32L172.69 71H88a8 8 0 0 1 0-16h104a8 8 0 0 1 8 8Z" /></svg>
              </span>
            </Link>
            <Link className={styles.row} href="/contributions" data-reveal="pending">
              <span className={styles.rowNum}>03</span>
              <span className={styles.rowName}>ship</span>
              <span className={styles.rowDesc}>your issue tracked from claim to merged pr, with realtime notifications for both sides.</span>
              <span className={styles.rowArrow}>
                <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M200 64v104a8 8 0 0 1-16 0V82.34l-94.83 94.83a8 8 0 0 1-11.32-11.32L172.69 71H88a8 8 0 0 1 0-16h104a8 8 0 0 1 8 8Z" /></svg>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= ABOUT ================= */}
      <section className={styles.secPad} id="about" data-od-id="about">
        <div className={styles.wrap}>
          <h2 className={styles.secTitle} data-reveal="pending">why devdating?</h2>

          <div className={styles.aboutGrid}>
            <div className={styles.aboutCopy} data-reveal="pending">
              <p><em>Most developers want to contribute to open source, but they stall before writing any code.</em> Which project? Is this issue actually beginner-friendly? Is the repo even alive?</p>
              <p>DevDating solves discovery first. It scans real repositories and real issues, scores them against your profile, and serves them one swipe at a time. No random awesome lists, no guessing. Just a short path to your first merged pr.</p>
            </div>
            <dl className={styles.facts} data-reveal="pending">
              <div className={styles.fact}><dt>stack</dt><dd>next.js, fastapi, socket.io</dd></div>
              <div className={styles.fact}><dt>match threshold</dt><dd><span className={styles.hl}>65%+</span> unlocks a starter issue</dd></div>
              <div className={styles.fact}><dt>license</dt><dd>MIT, free and open source</dd></div>
              <div className={styles.fact}><dt>repo</dt><dd><a href={REPO_URL} target="_blank" rel="noopener">github.com/v01dst/devdating</a></dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className={styles.cta} data-od-id="cta">
        <Link className={styles.ctaBig} href="/discover" data-reveal="pending">
          start swiping <span className={styles.arr}>→</span>
        </Link>
        <p className={styles.ctaNote} data-reveal="pending">free and open source. bring your github handle.</p>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className={styles.foot} data-od-id="footer">
        <span>© 2026 devdating</span>
        <span className={styles.footMeta}>
          <a className={styles.footItem} href={REPO_URL} target="_blank" rel="noopener"><IconGithub /> github</a>
          <a className={styles.footItem} href={LICENSE_URL} target="_blank" rel="noopener"><IconMit /> MIT</a>
          <a className={styles.footItem} href={NEXT_URL} target="_blank" rel="noopener"><IconNext /> next.js</a>
          <a className={styles.footItem} href={FASTAPI_URL} target="_blank" rel="noopener"><IconFastapi /> fastapi</a>
          <a className={styles.footItem} href={DISCORD_URL} target="_blank" rel="noopener"><IconDiscord /> discord</a>
        </span>
      </footer>
    </div>
  );
}
