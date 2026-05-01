/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import path from 'path';
import fs from 'fs/promises';
import { AGENTAUTH_ENV_PATH } from './paths.mjs';
import {
  AGENTAUTH_MD_ADDITION
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

  async updateAgentMarkdown() {
    const agentMdPath = path.join(this.#openClawDir, 'workspace', 'AGENTS.md');
    try {
      let content;
      try {
        content = await fs.readFile(agentMdPath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.warn(`[WARN] Could not update AGENTS.md: AGENTS.md could not be found`);
          return; // File doesn't exist → skip
        }
        throw error;
      }
      
      const originalContent = content;

      const startMarker = '<!-- AGENTAUTH-START -->';
      const endMarker = '<!-- AGENTAUTH-END -->';
      const versionRegex = /<!-- AGENTAUTH-VERSION: (.*?) -->/;
      
      const newVersionMatch = AGENTAUTH_MD_ADDITION.match(versionRegex);
      const newVersion = newVersionMatch ? newVersionMatch[1] : null;

      const startIndex = content.indexOf(startMarker);
      const endIndex = content.indexOf(endMarker, startIndex);

      let newContent = content;

      if (startIndex !== -1 && endIndex !== -1) {
        const blockEndIndex = endIndex + endMarker.length;
        const existingBlock = content.substring(startIndex, blockEndIndex);
        const existingVersionMatch = existingBlock.match(versionRegex);
        const existingVersion = existingVersionMatch ? existingVersionMatch[1] : null;

        if (existingVersion !== newVersion) {
          newContent = content.substring(0, startIndex) + AGENTAUTH_MD_ADDITION + content.substring(blockEndIndex);
        }
      } else {
        // Section not found, add it to the end.
        newContent = (content.trim() ? content.trimEnd() + '\n\n' : '') + AGENTAUTH_MD_ADDITION;
      }
      
      if (originalContent !== newContent) {
        await fs.writeFile(agentMdPath, newContent.trimEnd() + '\n', 'utf8');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`[WARN] Could not update AGENTS.md: ${error.message}`);
      }
    }
  }
}
