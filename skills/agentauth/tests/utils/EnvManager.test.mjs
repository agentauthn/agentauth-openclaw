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
const { AGENTAUTH_ENV_PATH } = await import('../../src/utils/paths.mjs');
const {
  AGENTAUTH_MD_ADDITION,
} = await import('../../src/utils/agentMarkdown.mjs');

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
    const envPath = AGENTAUTH_ENV_PATH;

    it('should throw an error if agentauth directory cannot be created', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockRejectedValue({ code: 'ENOENT' });

      await expect(envManager.saveCredentials(keyId, apiKey)).rejects.toThrow('the api key could not be saved because agentauth directory cannot be created.');
      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('should save credentials to a new .env file if directory exists', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue();

      await envManager.saveCredentials(keyId, apiKey);

      expect(fs.mkdir).toHaveBeenCalled();
      const [filePath, content, options] = fs.writeFile.mock.calls[0];
      expect(filePath).toBe(envPath);
      expect(content).toContain(`AGENTAUTH_AGENT_KEY_ID="${keyId}"`);
      expect(content).toContain(`AGENTAUTH_API_KEY="${apiKey}"`);
      expect(options).toEqual({ encoding: 'utf8', mode: 0o400 });
    });

    it('should append credentials to an existing .env file with other content', async () => {
      const existingContent = 'OTHER_VAR="some_value"';
      fs.readFile.mockResolvedValue(existingContent);
      fs.writeFile.mockResolvedValue();

      await envManager.saveCredentials(keyId, apiKey);

      expect(fs.mkdir).toHaveBeenCalled();
      const [filePath, content, options] = fs.writeFile.mock.calls[0];
      expect(filePath).toBe(envPath);
      expect(content).toContain('OTHER_VAR="some_value"');
      expect(content).toContain(`AGENTAUTH_AGENT_KEY_ID="${keyId}"`);
      expect(content).toContain(`AGENTAUTH_API_KEY="${apiKey}"`);
      expect(options).toEqual({ encoding: 'utf8', mode: 0o400 });
    });

    it('should update existing credentials in the .env file', async () => {
      const newKeyId = 'new-key-id';
      const newApiKey = 'new-api-key';
      const existingContent = 'AGENTAUTH_AGENT_KEY_ID="old-key-id"\nAGENTAUTH_API_KEY="old-api-key"\nOTHER_VAR="some_value"';
      fs.readFile.mockResolvedValue(existingContent);
      fs.writeFile.mockResolvedValue();
      
      await envManager.saveCredentials(newKeyId, newApiKey);

      expect(fs.mkdir).toHaveBeenCalled();
      const [filePath, content, options] = fs.writeFile.mock.calls[0];
      expect(filePath).toBe(envPath);
      expect(content).toContain(`OTHER_VAR="some_value"`);
      expect(content).not.toContain('old-key-id');
      expect(content).not.toContain('old-api-key');
      expect(content).toContain(`AGENTAUTH_AGENT_KEY_ID="${newKeyId}"`);
      expect(content).toContain(`AGENTAUTH_API_KEY="${newApiKey}"`);
      expect(options).toEqual({ encoding: 'utf8', mode: 0o400 });
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
    let consoleWarnSpy;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should warn and do nothing if AGENTS.md does not exist', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });

      await envManager.updateAgentMarkdown();
      
      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Could not update AGENTS.md: AGENTS.md could not be found');
    });

    it('should add agentauth block if AGENTS.md is empty', async () => {
      fs.readFile.mockResolvedValue('');
      await envManager.updateAgentMarkdown();
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        AGENTAUTH_MD_ADDITION + '\n',
        'utf8'
      );
    });

    it('should add agentauth block if it does not exist in AGENTS.md', async () => {
      const initialContent = '## Some other content';
      fs.readFile.mockResolvedValue(initialContent);

      await envManager.updateAgentMarkdown();

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        `${initialContent}\n\n${AGENTAUTH_MD_ADDITION}\n`,
        'utf8'
      );
    });
    
    it('should update agentauth block if a newer version is available', async () => {
      const oldBlock = `<!-- AGENTAUTH-START -->
<!-- AGENTAUTH-VERSION: 0.9.0 -->
Old content
<!-- AGENTAUTH-END -->`;
      const initialContent = `Some content before\n\n${oldBlock}\n\nSome content after`;
      fs.readFile.mockResolvedValue(initialContent);
      
      await envManager.updateAgentMarkdown();

      const expectedContent = `Some content before\n\n${AGENTAUTH_MD_ADDITION}\n\nSome content after\n`;
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expectedContent,
        'utf8'
      );
    });

    it('should not write file if no changes are needed', async () => {
      const initialContent = `Some content\n\n${AGENTAUTH_MD_ADDITION}`;
      fs.readFile.mockResolvedValue(initialContent);

      await envManager.updateAgentMarkdown();

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should warn on other file read errors', async () => {
      const error = new Error('read error');
      fs.readFile.mockRejectedValue(error);

      await envManager.updateAgentMarkdown();

      expect(consoleWarnSpy).toHaveBeenCalledWith(`[WARN] Could not update AGENTS.md: ${error.message}`);
    });
  });
});
