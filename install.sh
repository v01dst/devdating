#!/usr/bin/env bash
set -Eeuo pipefail

PURPLE='\033[1;35m'; CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'
INSTALL_DIR="${DEVDATING_HOME:-$HOME/.devdating}"
REPO_URL="${DEVDATING_REPO:-https://github.com/v01dst/devdating.git}"
BRANCH="${DEVDATING_BRANCH:-main}"
MODE="${DEVDATING_MODE:-}"
LANGUAGES="${DEVDATING_LANGUAGES:-TypeScript,Python,JavaScript,Go,Rust}"
SYNC_TARGET="${DEVDATING_SYNC_TARGET:-500}"

step() { printf "${CYAN}▸${RESET} %s\n" "$*"; }
ok() { printf "${GREEN}✔${RESET} %s\n" "$*"; }
warn() { printf "${YELLOW}▲${RESET} %s\n" "$*"; }
die() { printf "${RED}✖ $*${RESET}\n" >&2; exit 1; }

banner() {
clear
cat <<'BANNER'
  ██████╗ ███████╗██╗   ██╗██████╗  █████╗ ████████╗██╗███╗   ██╗ ██████╗
  ██╔══██╗██╔════╝╚██╗ ██╔╝██╔══██╗██╔══██╗╚══██╔══╝██║████╗  ██║██╔════╝
  ██║  ██║█████╗   ╚████╔╝ ██║  ██║███████║   ██║   ██║██╔██╗ ██║██║  ███╗
  ██║  ██║██╔══╝    ╚██╔╝  ██║  ██║██╔══██║   ██║   ██║██║╚██╗██║██║   ██║
  ██████╔╝███████╗   ██║   ██████╔╝██║  ██║   ██║   ██║██║ ╚████║╚██████╔╝
  ╚═════╝ ╚══════╝   ╚═╝   ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝
BANNER
printf "  ${BOLD}Swipe. Match. Contribute.${RESET}\n\n"
}

spinner() {
  local message="$1" command="$2" chars='|/-\' index=0
  bash -c "$command" & local pid=$!
  printf "${CYAN}▸${RESET} %s " "$message"
  while kill -0 "$pid" 2>/dev/null; do printf "\b%c" "${chars:index++%4:1}"; sleep .12; done
  wait "$pid"; local code=$?
  if ((code == 0)); then printf "\b✔\n"; else printf "\b✖\n"; return "$code"; fi
}

progress() {
  local label="$1" total="$2" current=0 line
  while read -r line; do
    current=$((current + 1)); percent=$((current * 100 / total))
    filled=$((percent / 4)); empty=$((25 - filled))
    printf "\r  ${CYAN}%s${RESET} [" "$label"
    printf '%*s' "$filled" '' | tr ' ' '█'
    printf '%*s' "$empty" ''
    printf "] ${BOLD}%3d%%${RESET} ${DIM}%s${RESET}" "$percent" "$line"
  done
  printf '\n'
}

choose() {
  local title="$1"; shift; local options=("$@") selected=0 key
  tput civis 2>/dev/null || true
  draw() {
    clear; banner
    printf "  ${BOLD}%s${RESET}\n\n" "$title"
    for index in "${!options[@]}"; do
      if ((index == selected)); then printf "  ${PURPLE}❯${RESET} ${BOLD}%s${RESET}\n" "${options[$index]}";
      else printf "    %s\n" "${options[$index]}"; fi
    done
    printf "\n  ${DIM}↑/↓ move · Enter select${RESET}\n"
  }
  draw
  while true; do
    IFS= read -rsn1 key || true
    case "$key" in
      $'\x1b') read -rsn2 -t .05 key || true
        if [[ "$key" == "[A" ]]; then selected=$(((selected - 1 + ${#options[@]}) % ${#options[@]}));
        elif [[ "$key" == "[B" ]]; then selected=$(((selected + 1) % ${#options[@]})); fi;;
      '') tput cnorm 2>/dev/null || true; return "$selected";;
    esac
    draw
  done
}

input_value() {
  local prompt="$1" default="$2" value
  printf "  ${BOLD}%s${RESET} [${CYAN}%s${RESET}]: " "$prompt" "$default"
  read -r value
  printf '%s' "${value:-$default}"
}

trap 'tput cnorm 2>/dev/null || true' EXIT INT TERM

# curl | bash consumes stdin for this script. Re-launch from a real file so
# the interactive installer can safely read keyboard input.
if [[ ! -t 0 ]]; then
  self_path=/tmp/devdating-install-$$.sh
  if [[ -f /proc/self/fd/255 ]]; then cp /proc/self/fd/255 "$self_path" 2>/dev/null || true; fi
  if [[ ! -s "$self_path" ]]; then
    curl -fsSL "https://raw.githubusercontent.com/v01dst/devdating/$BRANCH/install.sh" -o "$self_path"
  fi
  chmod +x "$self_path"
  if command -v script >/dev/null 2>&1 && [[ -t 1 ]]; then
    exec script -qec "DEVDATING_HOME='$INSTALL_DIR' DEVDATING_REPO='$REPO_URL' DEVDATING_BRANCH='$BRANCH' bash '$self_path'" /dev/null
  fi
  warn "Noninteractive shell detected; using recommended defaults."
  MODE="${MODE:-native}"
  NONINTERACTIVE=1
fi

banner
printf "  ${DIM}Interactive installer${RESET}\n"
sleep .4

for tool in git python3 node npm; do command -v "$tool" >/dev/null 2>&1 || die "$tool is required."; done

detect_docker() { command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; }
if detect_docker; then
  mode_options=("Docker (recommended)" "Native SQLite (portable)")
else
  mode_options=("Native SQLite (recommended)" "Docker (unavailable)")
fi

if [[ "${NONINTERACTIVE:-0}" == 1 ]]; then
  MODE="${MODE:-native}"
  language_input="$LANGUAGES"
  target_input="$SYNC_TARGET"
else
  choice=$(choose "Choose runtime mode" "${mode_options[@]}")
  if [[ "${mode_options[$choice]}" == Docker* ]]; then MODE=docker; else MODE=native; fi
  language_input=$(input_value "Languages for GitHub discovery" "$LANGUAGES")
  target_input=$(input_value "How many issues should the first sync index?" "$SYNC_TARGET")
  [[ "$target_input" =~ ^[0-9]+$ ]] || target_input=500
fi

mkdir -p "$INSTALL_DIR"
banner
printf "  ${BOLD}Installation summary${RESET}\n\n"
printf "    Destination: ${CYAN}%s${RESET}\n" "$INSTALL_DIR"
printf "    Mode:        ${CYAN}%s${RESET}\n" "$MODE"
printf "    Languages:   ${CYAN}%s${RESET}\n" "$language_input"
printf "    First sync:  ${CYAN}%s issues${RESET}\n\n" "$target_input"

if [[ -d "$INSTALL_DIR/.git" ]]; then
  step "Updating existing installation"
  git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH" >/dev/null 2>&1 || true
  git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH" >/dev/null
else
  spinner "Downloading DevDating from GitHub" "git clone --depth 1 --branch '$BRANCH' '$REPO_URL' '$INSTALL_DIR'"
fi

secret=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
cat > "$INSTALL_DIR/devdating.env" <<ENV
DATABASE_URL=sqlite+aiosqlite:///$INSTALL_DIR/devdating.db
REDIS_URL=memory://
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SESSION_SECRET=$secret
ENVIRONMENT=local
DEVDATING_MODE=$MODE
DEVDATING_HOME=$INSTALL_DIR
DEVDATING_SYNC_LANGUAGES=$language_input
DEVDATING_SYNC_TARGET=$target_input
ENV

launcher_dir=/usr/local/bin
if ! cat > "$launcher_dir/devdating" 2>/dev/null <<LAUNCHER
#!/usr/bin/env bash
exec "$INSTALL_DIR/bin/devdating" "\$@"
LAUNCHER
then
  launcher_dir="$HOME/.local/bin"; mkdir -p "$launcher_dir"
  cat > "$launcher_dir/devdating" <<LAUNCHER
#!/usr/bin/env bash
exec "$INSTALL_DIR/bin/devdating" "\$@"
LAUNCHER
fi
chmod +x "$launcher_dir/devdating"
export PATH="$launcher_dir:$PATH"

banner
spinner "Installing dependencies" "'$INSTALL_DIR/bin/devdating' install --mode '$MODE'"

banner
step "Preparing personalized GitHub sync"
"$INSTALL_DIR/bin/devdating" sync-me >/dev/null 2>&1 || warn "Profile sync skipped; run devdating sync-me later."

progress "Indexing beginner-friendly issues" 10 \
  < <(for number in $(seq 1 10); do
        "$INSTALL_DIR/bin/devdating" sync-bulk "$((target_input / 10 > 0 ? target_input / 10 : 1))" >/dev/null 2>&1
        echo "batch $number"
      done)

"$INSTALL_DIR/bin/devdating" enrich-languages >/dev/null 2>&1 || true

banner
ok "DevDating is ready at ${BOLD}$INSTALL_DIR${RESET}"
ok "Mode: ${BOLD}$MODE${RESET}"
printf '\n'
printf "  ${BOLD}Launch:${RESET}    devdating up\n"
printf "  ${BOLD}Projects:${RESET}  http://localhost:3000/projects\n"
printf "  ${BOLD}Issues:${RESET}    http://localhost:3000/issues\n"
printf "  ${BOLD}API docs:${RESET}  http://localhost:8000/docs\n\n"
