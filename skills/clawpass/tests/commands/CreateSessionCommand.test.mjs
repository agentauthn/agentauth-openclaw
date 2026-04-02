import { jest } from '@jest/globals';
import { CreateSessionCommand } from '../../src/cli/commands/CreateSessionCommand.mjs';

describe('CreateSessionCommand', () => {
  it('should call idgwService.approvalInit with the correct arguments', async () => {
    const mockIdgwService = {
      approvalInit: jest.fn().mockResolvedValue({ sessionId: '123' }),
    };

    const command = new CreateSessionCommand(mockIdgwService);
    const args = {
      toolCall: 'testToolCall',
      displayString: 'testDisplayString',
    };

    const result = await command.execute(args);

    expect(mockIdgwService.approvalInit).toHaveBeenCalledWith(
      args.toolCall,
      args.displayString
    );
    expect(result).toEqual({ sessionId: '123' });
  });
});
