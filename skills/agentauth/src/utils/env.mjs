/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import os from "os";
import path from "path";
import { config as loadDotenv } from "dotenv";
import { AGENTAUTH_ENV_PATH } from "./paths.mjs";

loadDotenv({ quiet: true });
const { parsed } = loadDotenv({ path: AGENTAUTH_ENV_PATH, quiet: true, override: true });

const ALLOWED_IDGW_BASE_URL_PATTERNS = [
  /^https:\/\/([a-zA-Z0-9-]+\.)*agentauth\.id/,
  /^http:\/\/localhost:\d+/,
];

class Config {
  constructor(env = parsed || {}, ambientEnv = process.env) {
    this._env = env;
    this._ambientEnv = ambientEnv;
  }

  get openClawDir() {
    if (this._ambientEnv.OPENCLAW_STATE_DIR) {
      return this._ambientEnv.OPENCLAW_STATE_DIR;
    }
    const home = this._ambientEnv.OPENCLAW_HOME || os.homedir();
    return path.join(home, ".openclaw");
  }

  get idgwBaseUrl() {
    const baseUrl = this._ambientEnv.IDGW_BASE_URL || "https://agentauth.id/api";
    const isAllowed = ALLOWED_IDGW_BASE_URL_PATTERNS.some((pattern) =>
      pattern.test(baseUrl)
    );

    if (!isAllowed) {
      throw new Error(
        `IDGW_BASE_URL "${baseUrl}" is not in the list of allowed origins. ` +
          `Allowed origin patterns are: https://<ENV>.agentauth.id, https://agentauth.id, http://localhost:<PORT>.`
      );
    }
    return baseUrl;
  }

  get notify() {
    return this._env.AGENTAUTH_NOTIFY;
  }

  get notificationChannel() {
    return this._ambientEnv.AGENTAUTH_NOTIFICATION_CHANNEL;
  }

  get hasCredentials() {
    return !!this._env.AGENTAUTH_API_KEY && !!this._env.AGENTAUTH_AGENT_KEY_ID;
  }

  get apiKey() {
    const apiKey = this._env.AGENTAUTH_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing required environment variable: AGENTAUTH_API_KEY. " +
          "Set it in your environment or .env file."
      );
    }
    return apiKey;
  }

  getAgentPrivateKey() {
    const pem = this._env.AGENTAUTH_AGENT_PRIVATE_KEY;
    if (!pem) {
      return;
    }
    return pem.replace(/\\n/g, "\n");
  }

  getAgentKeyId() {
    const keyId = this._env.AGENTAUTH_AGENT_KEY_ID;
    if (!keyId) {
      throw new Error(
        "Missing required environment variable: AGENTAUTH_AGENT_KEY_ID. " +
          "Set it in your environment or .env file to enable request signing."
      );
    }
    return keyId;
  }
}

export const config = new Config();
