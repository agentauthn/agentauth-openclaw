/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { jest } from '@jest/globals';
import path from 'path';

const fs = {
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
};

jest.unstable_mockModule('fs/promises', () => ({
  default: fs,
}));

const { EnvManager } = await import('../../src/utils/EnvManager.mjs');

describe('EnvManager', () => {
  const openClawDir = '/fake/openclaw/dir';
  let envManager;

  beforeEach(() => {
    jest.clearAllMocks();
    envManager = new EnvManager({ openClawDir });
  });

  describe('saveCredentials', () => {
    const keyId = 'test-key-id';
    const apiKey = 'test-api-key';
    const envPath = path.join(openClawDir, '.env');

    it('should throw an error if openclaw directory does not exist', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockRejectedValue({ code: 'ENOENT' });

      await expect(envManager.saveCredentials(keyId, apiKey)).rejects.toThrow('the api key could not be saved because openclaw directory cannot be found.');
      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it('should save credentials to a new .env file if directory exists', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue();

      await envManager.saveCredentials(keyId, apiKey);

      expect(fs.mkdir).not.toHaveBeenCalled();
      const expectedContent = `AGENTAUTH_AGENT_KEY_ID="${keyId}"\nAGENTAUTH_API_KEY="${apiKey}"\n`;
      expect(fs.writeFile).toHaveBeenCalledWith(envPath, expectedContent, 'utf8');
    });

    it('should append credentials to an existing .env file with other content', async () => {
      const existingContent = 'OTHER_VAR="some_value"';
      fs.readFile.mockResolvedValue(existingContent);
      fs.writeFile.mockResolvedValue();

      await envManager.saveCredentials(keyId, apiKey);

      expect(fs.mkdir).not.toHaveBeenCalled();
      const expectedContent = `OTHER_VAR="some_value"\nAGENTAUTH_AGENT_KEY_ID="${keyId}"\nAGENTAUTH_API_KEY="${apiKey}"\n`;
      expect(fs.writeFile).toHaveBeenCalledWith(envPath, expectedContent, 'utf8');
    });

    it('should update existing credentials in the .env file', async () => {
      const newKeyId = 'new-key-id';
      const newApiKey = 'new-api-key';
      const existingContent = 'AGENTAUTH_AGENT_KEY_ID="old-key-id"\nAGENTAUTH_API_KEY="old-api-key"\nOTHER_VAR="some_value"';
      fs.readFile.mockResolvedValue(existingContent);
      fs.writeFile.mockResolvedValue();
      
      await envManager.saveCredentials(newKeyId, newApiKey);

      expect(fs.mkdir).not.toHaveBeenCalled();
      const expectedContent = `OTHER_VAR="some_value"\nAGENTAUTH_AGENT_KEY_ID="${newKeyId}"\nAGENTAUTH_API_KEY="${newApiKey}"\n`;
      expect(fs.writeFile).toHaveBeenCalledWith(envPath, expectedContent, 'utf8');
    });

    it('should re-throw other readFile errors', async () => {
        const error = new Error('read error');
        fs.readFile.mockRejectedValue(error);
        await expect(envManager.saveCredentials(keyId, apiKey)).rejects.toThrow(error);
    });

    it('should re-throw other writeFile errors', async () => {
      fs.readFile.mockResolvedValue('');
      const error = new Error('write error');
      fs.writeFile.mockRejectedValue(error);
      await expect(envManager.saveCredentials(keyId, apiKey)).rejects.toThrow(error);
    });
  });

  describe('updateAgentMarkdown', () => {
    it('should not throw if AGENT.md does not exist', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });

      await expect(envManager.updateAgentMarkdown()).resolves.not.toThrow();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should not write if AGENT.md is empty', async () => {
      fs.readFile.mockResolvedValue('');
      await envManager.updateAgentMarkdown();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should add red lines and tools sections text when headers are present', async () => {
      const initialContent = '## Red Lines\n\n## Tools';
      fs.readFile.mockResolvedValue(initialContent);
      fs.writeFile.mockResolvedValue();

      await envManager.updateAgentMarkdown();
      
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      
      const redLinesAddition = '\n\nIf a dangerous action is requested (delete files, send email, modify config, purchases, production changes), use the agentauth skill for passkey approval before executing.';
      const toolsAddition = '\n\n**Security:**\n\n- agentauth — Human consent gate using passkeys to authorize sensitive actions.';
      const textToInsertRedLines = `\n\n${redLinesAddition}`;
      const textToInsertTools = `\n\n${toolsAddition}`;

      const contentAfterRedLines = `## Red Lines${textToInsertRedLines}\n## Tools`;
      const expectedFinalContent = contentAfterRedLines + textToInsertTools;

      const writtenContent = fs.writeFile.mock.calls[0][1];
      expect(writtenContent).toBe(expectedFinalContent);
    });
    
    it('should only add tools text if red lines text is present', async () => {
      const initialContent = '## Red Lines\n\nIf a dangerous action is requested (delete files, send email, modify config, purchases, production changes), use the agentauth skill for passkey approval before executing.\n\n## Tools';
      fs.readFile.mockResolvedValue(initialContent);
      fs.writeFile.mockResolvedValue();
      
      await envManager.updateAgentMarkdown();

      expect(fs.writeFile).toHaveBeenCalledTimes(1);

      const toolsAddition = '\n\n**Security:**\n\n- agentauth — Human consent gate using passkeys to authorize sensitive actions.';
      const textToInsertTools = `\n\n${toolsAddition}`;
      const expectedContent = initialContent + textToInsertTools;
      
      const writtenContent = fs.writeFile.mock.calls[0][1];
      expect(writtenContent).toBe(expectedContent);
    });

    it('should not write file if no changes are needed', async () => {
      const initialContent = `
## Red Lines

If a dangerous action is requested (delete files, send email, modify config, purchases, production changes), use the agentauth skill for passkey approval before executing.

## Tools

**Security:**

- agentauth — Human consent gate using passkeys to authorize sensitive actions.
`;
      fs.readFile.mockResolvedValue(initialContent);

      await envManager.updateAgentMarkdown();

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should warn on other readFile errors', async () => {
        const error = new Error('read error');
        fs.readFile.mockRejectedValue(error);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        await envManager.updateAgentMarkdown();

        expect(consoleWarnSpy).toHaveBeenCalledWith(`[WARN] Could not update AGENT.md: ${error.message}`);
        consoleWarnSpy.mockRestore();
    });
  });
});
