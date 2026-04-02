import { jest } from '@jest/globals';
import { base64UrlEncode } from '../../src/utils/crypto.mjs';

const mockOpen = jest.fn();
jest.unstable_mockModule('open', () => ({
  default: mockOpen,
}));

const { IdentityGateWay } = await import('../../src/services/idgw/index.mjs');
const open = (await import('open')).default;

describe('IdentityGateWay', () => {
  let mockHttpClient;
  let mockSseClient;
  let mockOpenClawService;
  let idgw;

  beforeEach(() => {
    mockHttpClient = {
      post: jest.fn(),
    };
    mockSseClient = {
      waitForEvent: jest.fn(),
    };
    mockOpenClawService = {
      notify: jest.fn(),
    };
    idgw = new IdentityGateWay(
      'http://localhost:8090',
      mockHttpClient,
      mockSseClient,
      mockOpenClawService
    );
    open.mockClear();
  });

  describe('approvalInit', () => {
    it('should call httpClient.post and return approvalUrl and sessionId', async () => {
      const response = {
        data: {
          approvalInit: {
            approvalUrl: 'http://example.com/approve',
            sessionId: '123',
            username: 'testuser',
          },
        },
      };
      mockHttpClient.post.mockResolvedValue(response);

      const result = await idgw.approvalInit('tool-call', 'display-string');

      expect(mockHttpClient.post).toHaveBeenCalledWith('http://localhost:8090/graphql', expect.any(Object));
      expect(result.sessionId).toBe('123');
      expect(result.approvalUrl).toBeInstanceOf(URL);

      const expectedParams = { sessionId: '123', username: 'testuser' };
      const encodedParams = base64UrlEncode(JSON.stringify(expectedParams));
      expect(result.approvalUrl.searchParams.get('d')).toBe(encodedParams);
    });

    it('should throw an error if response data is missing', async () => {
      mockHttpClient.post.mockResolvedValue({ data: {} });
      await expect(idgw.approvalInit('tool', 'display')).rejects.toThrow('Missing response data at `approvalInit');
    });
  });

  describe('approvalWait', () => {
    const sessionId = 'test-session';
    const approvalUrl = new URL('http://example.com/approve?sessionId=test-session');

    it('should send notification and wait for event if notify is provided', async () => {
      mockOpenClawService.notify.mockReturnValue(true);
      mockSseClient.waitForEvent.mockResolvedValue({ status: 'approved' });

      const result = await idgw.approvalWait(sessionId, approvalUrl, { notify: 'telegram:@me' });

      expect(mockOpenClawService.notify).toHaveBeenCalledWith(
        `An action requires your approval. Please visit this URL to review: ${approvalUrl.toString()}`,
        'telegram',
        '@me'
      );
      expect(open).not.toHaveBeenCalled();
      expect(mockSseClient.waitForEvent).toHaveBeenCalledWith(
        `http://localhost:8090/events?sessionId=${sessionId}`,
        { eventName: 'session', timeout: 300000 }
      );
      expect(result).toBe(JSON.stringify({ status: 'complete' }));
    });

    it('should open browser if notification fails', async () => {
      mockOpenClawService.notify.mockReturnValue(false);
      mockSseClient.waitForEvent.mockResolvedValue({ status: 'approved' });

      await idgw.approvalWait(sessionId, approvalUrl, { notify: 'telegram:@me' });

      expect(mockOpenClawService.notify).toHaveBeenCalled();
      expect(open).toHaveBeenCalledWith(approvalUrl.toString());
    });

    it('should not notify if approvalUrl is not provided', async () => {
      mockSseClient.waitForEvent.mockResolvedValue({ status: 'approved' });

      await idgw.approvalWait(sessionId, null, { notify: 'telegram:@me' });

      expect(mockOpenClawService.notify).not.toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
    });

    it('should throw error for non-approved status', async () => {
      mockSseClient.waitForEvent.mockResolvedValue({ status: 'denied' });
      await expect(idgw.approvalWait(sessionId, approvalUrl)).rejects.toThrow('Session ended with status: denied');
    });

    it('should throw error for unknown status', async () => {
      mockSseClient.waitForEvent.mockResolvedValue({ some_other_prop: 'value' });
      await expect(idgw.approvalWait(sessionId, approvalUrl)).rejects.toThrow('Session ended with status: unknown');
    });
  });

  describe('approvalFlow', () => {
    it('should run full flow and return approved', async () => {
      const initResult = {
        approvalUrl: new URL('http://example.com/approve'),
        sessionId: '456',
      };
      
      jest.spyOn(idgw, 'approvalInit').mockResolvedValue(initResult);
      jest.spyOn(idgw, 'approvalWait').mockResolvedValue();

      const result = await idgw.approvalFlow('tool', 'display', { notify: 'test' });

      expect(idgw.approvalInit).toHaveBeenCalledWith('tool', 'display');
      expect(idgw.approvalWait).toHaveBeenCalledWith('456', initResult.approvalUrl, { notify: 'test' });
      expect(result).toEqual({ status: 'approved' });
    });

    it('should return deny if approvalWait fails', async () => {
      const initResult = {
        approvalUrl: new URL('http://example.com/approve'),
        sessionId: '456',
      };
      jest.spyOn(idgw, 'approvalInit').mockResolvedValue(initResult);
      jest.spyOn(idgw, 'approvalWait').mockRejectedValue(new Error('timeout'));

      const result = await idgw.approvalFlow('tool', 'display');

      expect(result).toEqual({ status: 'deny' });
    });
  });
});
