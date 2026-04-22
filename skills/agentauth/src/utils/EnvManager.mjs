/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import path from 'path';
import fs from 'fs/promises';

export class EnvManager {
  #openClawDir;

  constructor({ openClawDir }) {
    this.#openClawDir = openClawDir;
  }

  #getEnvFilePath() {
    return path.join(this.#openClawDir, '.env');
  }

  async saveCredentials(keyId, apiKey) {
    const envPath = this.#getEnvFilePath();

    await fs.mkdir(this.#openClawDir, { recursive: true });

    let lines = [];
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      lines = envContent.split('\n');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const otherLines = lines.filter(line => 
      !line.startsWith('AGENTAUTH_AGENT_KEY_ID=') &&
      !line.startsWith('AGENTAUTH_API_KEY=') &&
      line.trim() !== ''
    );

    const newLines = [
      ...otherLines,
      `AGENTAUTH_AGENT_KEY_ID="${keyId}"`,
      `AGENTAUTH_API_KEY="${apiKey}"`
    ];

    await fs.writeFile(envPath, newLines.join('\n') + '\n', 'utf8');
  }
}
