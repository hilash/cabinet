#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const REPO = "https://github.com/hilash/cabinet.git"; // UPDATE THIS
const DIR = "cabinet";

const args = process.argv.slice(2);
const COMMANDS = ["init", "help", "--help"];
const firstArg = args[0] || "init";
const command = COMMANDS.includes(firstArg) ? firstArg : "init";
// If first arg isn't a command, treat it as the directory name
const dirArg = COMMANDS.includes(firstArg) ? args[1] : firstArg;
const yes = args.includes("--yes") || args.includes("-y");

const log = (msg) => console.log(`\x1b[36m>\x1b[0m ${msg}`);
const success = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const error = (msg) => { console.error(`\x1b[31m✗\x1b[0m ${msg}`); process.exit(1); };

function run(bin, args, opts = {}) {
  const result = spawnSync(bin, args, {
    stdio: "inherit",
    ...opts,
  });
  if (result.status !== 0) {
    error(`Command failed: ${bin} ${args.join(" ")}`);
  }
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function validateTargetDir(targetDir) {
  if (!targetDir || !targetDir.trim()) {
    error("Please provide a valid directory name.");
  }
  if (targetDir.startsWith("-")) {
    error("Directory names cannot start with '-'.");
  }
}

if (command === "init") {
  const targetDir = dirArg || DIR;
  validateTargetDir(targetDir);

  console.log(`
  ┌─────────────────────────────┐
  │                             │
  │   📦  Cabinet               │
  │   AI-first startup OS       │
  │                             │
  └─────────────────────────────┘
  `);

  if (fs.existsSync(targetDir)) {
    error(`Directory "${targetDir}" already exists.`);
  }

  log(`Cloning Cabinet into ./${targetDir}...`);
  run("git", ["clone", "--depth", "1", REPO, targetDir]);

  log("Installing dependencies...");
  run(npmCommand(), ["install"], { cwd: targetDir });

  // Create .env.local from example
  const envExample = path.join(targetDir, ".env.example");
  const envLocal = path.join(targetDir, ".env.local");
  if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envLocal);
  }

  // Remove .git so user starts fresh
  fs.rmSync(path.join(targetDir, ".git"), { recursive: true, force: true });
  run("git", ["init"], { cwd: targetDir });

  console.log("");
  success("Cabinet is ready!");
  console.log(`
  Next steps:

    cd ${targetDir}
    npm run dev:all

  Open http://localhost:3000

  The onboarding wizard will guide you through
  setting up your AI team.
  `);

} else if (command === "help" || command === "--help") {
  console.log(`
  create-cabinet - Create a new Cabinet project

  Usage:
    npx create-cabinet [directory]          Create a new project
    npx create-cabinet --yes               Skip prompts
    npx create-cabinet help                Show this help

  Options:
    --yes, -y    Accept all defaults
  `);

} else {
  error(`Unknown command: ${command}. Run "create-cabinet help" for usage.`);
}
