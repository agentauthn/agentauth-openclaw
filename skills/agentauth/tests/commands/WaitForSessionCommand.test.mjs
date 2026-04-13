import { jest } from '@jest/globals';
import { WaitForSessionCommand } from '../../src/cli/commands/WaitForSessionCommand.mjs';

describe('WaitForSessionCommand', () => {
  it('should call idgwService.approvalWait with the correct arguments', async () => {
    const mockIdgwService = {
      approvalWait: jest.fn().mockResolvedValue({ status: 'complete' }),
    };

    const command = new WaitForSessionCommand(mockIdgwService);
    const args = {
      sessionId: 'testSessionId',
      approvalUrl: 'testApprovalUrl',
      notify: 'testNotify',
    };

    const result = await command.execute(args);

    expect(mockIdgwService.approvalWait).toHaveBeenCalledWith(
      args.sessionId,
      args.approvalUrl,
      { notify: args.notify }
    );
    expect(result).toEqual({ status: 'complete' });
  });
});
