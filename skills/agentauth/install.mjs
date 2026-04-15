#!/usr/bin/env node

import os from "os";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const log = (msg) => console.log(`[INFO] ${msg}`);
const error = (msg) => {
  console.error(`[ERROR] ${msg}`);
  process.exit(1);
};

const argDir = process.argv[2];
const cwd = process.cwd();

const scriptsDir = path.join(cwd, "scripts");
const skillFile = path.join(cwd, "SKILL.md");

const gatewayDirName = "agentauth";
const tempDir = path.join(cwd, `.${gatewayDirName}.tmp`);

let openclawDir;

if (argDir) {
  const resolved = path.resolve(argDir);
  if (!fs.existsSync(resolved)) {
    error(`Provided directory does not exist: ${resolved}`);
  }
  openclawDir = resolved;
  log(`Using provided OpenClaw directory`);
} else {
  const defaultDir = path.join(os.homedir(), ".openclaw");
  if (!fs.existsSync(defaultDir)) {
    error(`OpenClaw directory not found at: ${defaultDir}`);
  }
  openclawDir = defaultDir;
  log(`Using default OpenClaw directory`);
}

const skillsDir = path.join(openclawDir, "skills");
const finalDestination = path.join(skillsDir, gatewayDirName);

if (!fs.existsSync(skillFile)) {
  error("SKILL.md not found in current directory");
}

try {
  log("Running npm install...");
  execSync("npm install", { stdio: "inherit" });

  log("Running npm run build...");
  execSync("npm run build", { stdio: "inherit" });
} catch {
  error("Failed during npm install/build");
}

try {
  // Clean old temp if exists
  fs.rmSync(tempDir, { recursive: true, force: true });

  fs.mkdirSync(tempDir);

  fs.cpSync(skillFile, path.join(tempDir, "SKILL.md"));
  fs.renameSync(scriptsDir, path.join(tempDir, "scripts"));

  log("Prepared files");

  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
    log("Created skills directory in OpenClaw");
  }

  if (fs.existsSync(finalDestination)) {
    fs.rmSync(finalDestination, { recursive: true, force: true });
    log("Removed existing installation");
  }

  fs.renameSync(tempDir, finalDestination);

  log("Deployment complete");
  log(`Installed at: ${finalDestination}`);
} catch (err) {
  // Cleanup temp on failure
  fs.rmSync(tempDir, { recursive: true, force: true });
  error("Setup failed");
}
