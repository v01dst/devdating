#!/usr/bin/env bash
set -Eeuo pipefail

BLUE='\033[0;34m'; PURPLE='\033[1;35m'; CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'
INSTALL_DIR="${DEVDATING_HOME:-$HOME/.devdating}"
REPO_URL="${DEVDATING_REPO:-https://github.com/v01dst/devdating.git}"
BRANCH="${DEVDATING_BRANCH:-main}"
MODE="${DEVDATING_MODE:-auto}"

say() { printf "${PURPLE}❤${RESET} ${BOLD}%s${RESET}\n" "$*"; }
step() { printf "${CYAN}▸${RESET} %s\n" "$*"; }
ok() { printf "${GREEN}✔${RESET} %s\n" "$*"; }
warn() { printf "${YELLOW}▲${RESET} %s\n" "$*"; }
die() { printf "${RED}✖ $*${RESET}\n" >&2; exit 1; }
trap 'printf "\n${RED}Installation interrupted.${RESET}\n"' INT

printf '\n'
cat <<'BANNER'
  ██████╗ ███████╗██╗   ██╗██████╗  █████╗ ████████╗██╗███╗   ██╗ ██████╗
  ██╔══██╗██╔════╝╚██╗ ██╔╝██╔══██╗██╔══██╗╚══██╔══╝██║████╗  ██║██╔════╝
  ██║  ██║█████╗   ╚████╔╝ ██║  ██║███████║   ██║   ██║██╔██╗ ██║██║  ███╗
  ██║  ██║██╔══╝    ╚██╔╝  ██║  ██║██╔══██║   ██║   ██║██║╚██╗██║██║   ██║
  ██████╔╝███████╗   ██║   ██████╔╝██║  ██║   ██║   ██║██║ ╚████║╚██████╔╝
  ╚═════╝ ╚══════╝   ╚═╝   ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝
BANNER
printf "  ${BOLD}Swipe. Match. Contribute.${RESET}\n\n"

[[ $- == *i* ]] || [[ -t 0 ]] || warn "Noninteractive shell detected; using defaults."
command -v git >/dev/null 2>&1 || die "Git is required."
command -v python3 >/dev/null 2>&1 || die "Python 3.11+ is required."
command -v node >/dev/null 2>&1 || die "Node.js 20+ is required."
command -v npm >/dev/null 2>&1 || die "npm is required."

PYTHON_MAJOR=$(python3 -c 'import sys; print(sys.version_info[0])')
PYTHON_MINOR=$(python3 -c 'import sys; print(sys.version_info[1])')
(( PYTHON_MAJOR > 3 || (PYTHON_MAJOR == 3 && PYTHON_MINOR >= 11) )) || die "Python 3.11 or newer required."
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
(( NODE_MAJOR >= 20 )) || die "Node.js 20 or newer required."

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if [[ "$MODE" == auto || "$MODE" == docker ]]; then MODE=docker; fi
else
  if [[ "$MODE" == docker ]]; then die "Docker requested but unavailable."; fi
  MODE=native
fi

mkdir -p "$INSTALL_DIR"
[[ -d "$INSTALL_DIR/.git" ]] || {
  step "Downloading DevDating from GitHub"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR" >/dev/null 2>&1 ||
    die "Could not clone repository: $REPO_URL"
} || {
  step "Updating existing installation"
  git -C "$INSTALL_DIR fetch --depth 1 origin "$BRANCH"" >/dev/null 2>&1 || true
  git -C "$INSTALL_DIR reset --hard "origin/$BRANCH"" >/dev/null
}

cat > "$INSTALL_DIR/devdating.env" <<ENV
DATABASE_URL=sqlite+aiosqlite:///$INSTALL_DIR/devdating.db
REDIS_URL=memory://
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SESSION_SECRET=$(python3 - <<'PY' 2>/dev/null || openssl rand -hex 32
import secrets; print(secrets.token_hex(32))
PY
)
ENVIRONMENT=local
DEVDATING_MODE=$MODE
DEVDATING_HOME=$INSTALL_DIR
ENV

if cat > /usr/local/bin/devdating 2>/dev/null <<LAUNCHER
#!/usr/bin/env bash
exec "$INSTALL_DIR/bin/devdating" "\$@"
LAUNCHER
then
  chmod +x /usr/local/bin/devdating
else
  mkdir -p "$HOME/.local/bin"
  cat > "$HOME/.local/bin/devdating" <<LAUNCHER
#!/usr/bin/env bash
exec "$INSTALL_DIR/bin/devdating" "\$@"
LAUNCHER
  chmod +x "$HOME/.local/bin/devdating"
fi
export PATH="$HOME/.local/bin:$PATH"

step "Installing DevDating CLI"
"$INSTALL_DIR/bin/devdating" install --mode "$MODE"

printf '\n'
ok "DevDating installed at ${BOLD}$INSTALL_DIR${RESET}"
ok "Mode: ${BOLD}$MODE${RESET}"
printf '\n'
cat <<NEXT
  ${BOLD}Launch now:${RESET}
    devdating up

  ${BOLD}Open:${RESET}
    Web       http://localhost:3000/setup
    API docs  http://localhost:8000/docs

  ${BOLD}Commands:${RESET}
    devdating status | logs | stop | restart | update | uninstall
NEXT
printf '\n'
