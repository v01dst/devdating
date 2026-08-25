#!/usr/bin/env node
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");

const HOME = process.env.DEVDATING_HOME || path.join(os.homedir(), ".devdating");
const REPO = process.env.DEVDATING_REPO || "https://github.com/v01dst/devdating.git";
const BRANCH = process.env.DEVDATING_BRANCH || "main";

const colors = process.stdout.isTTY ? {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m", purple: "\x1b[1;35m", cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m"
} : { reset: "", bold: "", dim: "", purple: "", cyan: "", green: "", yellow: "", red: "" };

function banner() {
  console.log(`
${colors.purple}  ██████╗ ███████╗██╗   ██╗██████╗  █████╗ ████████╗██╗███╗   ██╗ ██████╗
  ██╔══██╗██╔════╝╚██╗ ██╔╝██╔══██╗██╔══██╗╚══██╔══╝██║████╗  ██║██╔════╝
  ██║  ██║█████╗   ╚████╔╝ ██║  ██║███████║   ██║   ██║██╔██╗ ██║██║  ███╗
  ██║  ██║██╔══╝    ╚██╔╝  ██║  ██║██╔══██║   ██║   ██║██║╚██╗██║██║   ██║
  ██████╔╝███████╗   ██║   ██████╔╝██║  ██║   ██║   ██║██║ ╚████║╚██████╔╝
  ╚═════╝ ╚══════╝   ╚═╝   ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝${colors.reset}
  ${colors.bold}Swipe. Match. Contribute.${colors.reset}
`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) process.exit(result.status || 1);
}

async function download(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode >= 300 && response.headers.location) return resolve(download(response.headers.location, destination));
      if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode}`));
      const file = fs.createWriteStream(destination);
      response.pipe(file); file.on("finish", () => file.close(resolve)); file.on("error", reject);
    }).on("error", reject);
  });
}

async function install() {
  banner();
  for (const tool of ["git", "python3", "npm"]) {
    if (!spawnSync(tool, ["--version"]).status === 0) {
      console.error(`${colors.red}✖ ${tool} is required${colors.reset}`); process.exit(1);
    }
  }

  console.log(`${colors.cyan}▸${colors.reset} Downloading DevDating...`);
  fs.mkdirSync(HOME, { recursive: true });
  if (!fs.existsSync(path.join(HOME, ".git"))) run("git", ["clone", "--depth", "1", "-b", BRANCH, REPO, HOME]);
  else run("git", ["-C", HOME, "pull", "--ff-only"]);

  console.log(`${colors.cyan}▸${colors.reset} Installing dependencies...`);
  run("bash", ["-lc", [
    `python3 -m venv '${HOME}/.venv'`,
    `'${HOME}/.venv/bin/pip' install --upgrade pip --quiet`,
    `'${HOME}/.venv/bin/pip' install 'fastapi>=0.111,<0.116' 'uvicorn[standard]>=0.30,<0.31' 'sqlalchemy[asyncio]>=2,<3' 'aiosqlite>=0.19' 'pydantic>=2,<3' 'pydantic-settings>=2' 'httpx>=0.27,<1' --quiet`,
    `cd '${HOME}/web' && npm install --no-audit --no-fund --legacy-peer-deps`
  ].join(" && ")]);

  fs.writeFileSync(path.join(HOME, "devdating.env"), [
    `DATABASE_URL=sqlite+aiosqlite://${HOME}/devdating.db`, "REDIS_URL=memory://", "",
    `SESSION_SECRET=${require("crypto").randomBytes(32).toString("hex")}`, "ENVIRONMENT=local",
    `DEVDATING_MODE=native`, `DEVDATING_HOME=${HOME}`
  ].join("\n"));

  console.log(`${colors.green}✔ DevDating installed${colors.reset}`);
  console.log(`
  ${colors.bold}Start now:${colors.reset}
    cd ${HOME}
    ./bin/devdating up

  ${colors.bold}Open:${colors.reset}
    Projects  http://localhost:3000/projects
    Issues    http://localhost:3000/issues
`);
}

const command = process.argv[2];
if (!command || command === "install") {
  if (fs.existsSync(path.join(HOME, ".git"))) {
    console.log(`${colors.green}✔ DevDating is already installed at ${HOME}${colors.reset}`);
    console.log(`Run ${colors.bold}devdating up${colors.reset}`);
    process.exit(0);
  }
  install();
}
else {
  const target = path.join(HOME, "bin/devdating");
  if (!fs.existsSync(target)) { console.error("DevDating is not installed. Run: npx devdating"); process.exit(1); }
  run(target, process.argv.slice(2));
}
