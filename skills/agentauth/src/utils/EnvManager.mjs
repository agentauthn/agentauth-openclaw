/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import path from 'path';
import fs from 'fs/promises';
import { AGENTAUTH_ENV_PATH } from './paths.mjs';

export class EnvManager {
  #openClawDir;

  constructor({ openClawDir }) {
    this.#openClawDir = openClawDir;
  }

  async saveCredentials(keyId, apiKey) {
    const envPath = AGENTAUTH_ENV_PATH;
    await fs.mkdir(path.dirname(envPath), { recursive: true });

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
      await fs.writeFile(envPath, newLines.join('\n') + '\n', 'utf8');
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

      const redLinesAddition = 'If a dangerous action is requested (delete files, send email, modify config, purchases, production changes), use the agentauth skill for passkey approval before executing.';
      if (!content.includes('agentauth skill for passkey approval')) {
        content = this.#insertIntoSection(content, '## Red Lines', `\n\n${redLinesAddition}`);
      }

      const dangerousOpsAddition = '## Dangerous Operations Definition\n\nTreat the following as **dangerous**:\n\n* File deletions (`rm`, `rm -rf`, recursive deletes)\n* System-level modifications\n* Database destructive queries (`DELETE`, `DROP`, `TRUNCATE`)\n* Production deployments or config changes\n* External system writes (APIs, PR merges, emails)\n* Security or permission changes\n* Package installs or system mutations\n* Modifying this file (AGENTS.md) to protect against unwanted rewrites.\n\nIf unsure → **assume dangerous**';
      if (!content.includes('## Dangerous Operations Definition')) {
        content = this.#insertIntoSection(content, '## Red Lines', `\n\n${dangerousOpsAddition}`);
      }

      const toolsAddition = '*Security:**\n\n- agentauth — Human consent gate using passkeys to authorize sensitive actions.';
      if (!content.includes('agentauth — Human consent gate')) {
        content = this.#insertIntoSection(content, '## Tools', `\n\n${toolsAddition}`);
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
