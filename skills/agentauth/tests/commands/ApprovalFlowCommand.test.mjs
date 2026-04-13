import { jest } from '@jest/globals';
import { ApprovalFlowCommand } from '../../src/cli/commands/ApprovalFlowCommand.mjs';

describe('ApprovalFlowCommand', () => {
  it('should call idgwService.approvalFlow with the correct arguments', async () => {
    const mockIdgwService = {
      approvalFlow: jest.fn().mockResolvedValue({ status: 'approved' }),
    };

    const command = new ApprovalFlowCommand(mockIdgwService);
    const args = {
      toolCall: 'testToolCall',
      displayString: 'testDisplayString',
      notify: 'testNotify',
    };

    const result = await command.execute(args);

    expect(mockIdgwService.approvalFlow).toHaveBeenCalledWith(
      args.toolCall,
      args.displayString,
      { notify: args.notify }
    );
    expect(result).toEqual({ status: 'approved' });
  });
});
