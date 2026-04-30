#!/usr/bin/env node

import path from "path";
import fs from "fs";

const log = (msg) => console.log(`[INFO] ${msg}`);
const error = (msg) => {
  console.error(`[ERROR] ${msg}`);
  process.exit(1);
};

const cwd = process.cwd();

const scriptsDir = path.join(cwd, "scripts");
const skillFile = path.join(cwd, "SKILL.md");
const readmeFile = path.join(cwd, "README.md");

const targetDirName = "agentauth";
const targetDir = path.join(cwd, targetDirName);

const ensureExists = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    error(`${label} not found`);
  }
};

log("Checking required files...");

ensureExists(scriptsDir, "./scripts");
ensureExists(skillFile, "./SKILL.md");
ensureExists(readmeFile, "./README.md");

try {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    log("Removed existing agentauth directory");
  }

  fs.mkdirSync(targetDir, { recursive: true });
  log("Created agentauth directory");

  fs.renameSync(scriptsDir, path.join(targetDir, "scripts"));
  fs.cpSync(skillFile, path.join(targetDir, "SKILL.md"));
  fs.cpSync(readmeFile, path.join(targetDir, "README.md"));

  log("Moved files into agentauth");
  log(`Done: ${targetDir}`);
} catch (err) {
  error("Failed to prepare agentauth directory");
}
