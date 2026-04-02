import { jest } from '@jest/globals';

const mockExecute = jest.fn();
const mockGetCommand = jest.fn(() => ({
  execute: mockExecute,
}));

jest.unstable_mockModule('../../src/cli/router.mjs', () => ({
  getCommand: mockGetCommand,
}));

const runCli = async (args) => {
  process.argv = ['node', 'lig', ...args];
  await import('../../src/cli/main.mjs');
};

describe('CLI main', () => {
  let originalArgv;
  let consoleLogSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    jest.resetModules()
    originalArgv = [...process.argv];
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    mockGetCommand.mockClear();
    mockExecute.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should execute create-session command with correct arguments', async () => {
    mockExecute.mockResolvedValue({ sessionId: '123' });

    await runCli(['create-session', 'test-tool-call', 'test-display-string']);

    expect(mockGetCommand).toHaveBeenCalledWith('create-session');
    expect(mockExecute).toHaveBeenCalledWith({
      toolCall: 'test-tool-call',
      displayString: 'test-display-string',
    });
    expect(console.log).toHaveBeenCalledWith({ sessionId: '123' });
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('should execute approval-flow and log the result as JSON string', async () => {
    mockExecute.mockResolvedValue({ status: 'approved' });

    await runCli(['approval-flow', 'tool', 'display', '--notify', 'test']);

    expect(mockGetCommand).toHaveBeenCalledWith('approval-flow');
    expect(mockExecute).toHaveBeenCalledWith({
      toolCall: 'tool',
      displayString: 'display',
      notify: 'test',
    });
    expect(console.log).toHaveBeenCalledWith(JSON.stringify({ status: 'approved' }));
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('should handle errors and exit with status 1', async () => {
    const error = new Error('Command failed');
    mockExecute.mockRejectedValue(error);

    await runCli(['create-session', 'tool', 'display']);

    expect(mockGetCommand).toHaveBeenCalledWith('create-session');
    expect(console.error).toHaveBeenCalledWith(error.message);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
