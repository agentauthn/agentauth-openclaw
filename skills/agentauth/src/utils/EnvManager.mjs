/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import path from 'path';
import fs from 'fs/promises';
import { AGENTAUTH_ENV_PATH } from './paths.mjs';
import {
  DANGEROUS_OPS_ADDITION,
  RED_LINES_ADDITION,
  TOOLS_ADDITION,
} from './agentMarkdown.mjs';

export class EnvManager {
  #openClawDir;

  constructor({ openClawDir }) {
    this.#openClawDir = openClawDir;
  }

  async saveCredentials(keyId, apiKey) {
    const envPath = AGENTAUTH_ENV_PATH;
    await fs.mkdir(path.dirname(envPath), { recursive: true, mode: 0o700 });

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

    try {
      // Read only
      await fs.writeFile(envPath, newLines.join('\n') + '\n', { encoding: 'utf8', mode: 0o400 });
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('the api key could not be saved because agentauth directory cannot be created.');
      }
      throw error;
    }
  }

  #insertIntoSection(content, header, textToInsert) {
    const headerIndex = content.indexOf(header);
    if (headerIndex === -1) {
      return content;
    }

    const nextHeaderIndex = content.indexOf('\n## ', headerIndex + header.length);

    if (nextHeaderIndex === -1) {
      return content.trimEnd() + textToInsert;
    } else {
      const sectionEnd = nextHeaderIndex;
      const before = content.slice(0, sectionEnd).trimEnd();
      const after = content.slice(sectionEnd);
      return before + textToInsert + after;
    }
  }

  async updateAgentMarkdown() {
    const agentMdPath = path.join(this.#openClawDir, 'workspace', 'AGENTS.md');
    try {
      let content = await fs.readFile(agentMdPath, 'utf8');
      const originalContent = content;

      if (!content.includes('agentauth skill for passkey approval')) {
        content = this.#insertIntoSection(content, '## Red Lines', `\n\n${RED_LINES_ADDITION}`);
      }

      if (!content.includes('## Dangerous Operations Definition')) {
        content = this.#insertIntoSection(content, '## Red Lines', `\n\n${DANGEROUS_OPS_ADDITION}`);
      }

      if (!content.includes('agentauth — Human consent gate')) {
        content = this.#insertIntoSection(content, '## Tools', `\n\n${TOOLS_ADDITION}`);
      }
      
      if (originalContent !== content) {
        await fs.writeFile(agentMdPath, content, 'utf8');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`[WARN] Could not update AGENT.md: ${error.message}`);
      }
    }
  }
}
