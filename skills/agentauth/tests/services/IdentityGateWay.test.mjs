import { jest } from '@jest/globals';
import { base64UrlEncode } from '../../src/utils/crypto.mjs';

const mockOpen = jest.fn();
jest.unstable_mockModule('open', () => ({
  default: mockOpen,
}));

const { IdentityGateWay } = await import('../../src/services/IdentityGateWay.mjs');
const open = (await import('open')).default;

describe('IdentityGateWay', () => {
  let mockLoginIdService;
  let mockOpenClawService;
  let idgw;

  beforeEach(() => {
    mockLoginIdService = {
      approvalInit: jest.fn(),
      approvalWait: jest.fn(),
    };
    mockOpenClawService = {
      notify: jest.fn(),
    };
    idgw = new IdentityGateWay({
      loginIdService: mockLoginIdService,
      openClawService: mockOpenClawService,
    });
    open.mockClear();
  });

  describe('approvalInit', () => {
    it('should call loginIdService.approvalInit and return approvalUrl and sessionId', async () => {
      const response = {
        approvalUrl: 'http://example.com/approve',
        sessionId: '123',
        username: 'testuser',
      };
      mockLoginIdService.approvalInit.mockResolvedValue(response);

      const result = await idgw.approvalInit('tool-call', 'display-string');

      expect(mockLoginIdService.approvalInit).toHaveBeenCalledWith('tool-call', 'display-string');
      expect(result.sessionId).toBe('123');

      const expectedParams = { sessionId: '123', username: 'testuser' };
      const encodedParams = base64UrlEncode(JSON.stringify(expectedParams));
      expect(result.approvalUrl).toBe(`http://example.com/approve?d=${encodedParams}`);
    });

    it('should bubble up errors from loginIdService', async () => {
      mockLoginIdService.approvalInit.mockRejectedValue(new Error('test error'));
      await expect(idgw.approvalInit('tool', 'display')).rejects.toThrow('test error');
    });
  });

  describe('approvalWait', () => {
    const sessionId = 'test-session';
    const approvalUrl = new URL('http://example.com/approve?sessionId=test-session');

    it('should send notification and wait for event if notify is provided', async () => {
      mockOpenClawService.notify.mockReturnValue(true);
      mockLoginIdService.approvalWait.mockResolvedValue({ status: 'approved' });

      const result = await idgw.approvalWait(sessionId, approvalUrl, { notify: 'telegram:@me' });

      expect(mockOpenClawService.notify).toHaveBeenCalledWith(
        `An action requires your approval. Please visit this URL to review: ${approvalUrl.toString()}`,
        'telegram',
        '@me'
      );
      expect(open).not.toHaveBeenCalled();
      expect(mockLoginIdService.approvalWait).toHaveBeenCalledWith(sessionId);
      expect(result).toBe(JSON.stringify({ status: 'approved' }));
    });

    it('should open browser if notification fails', async () => {
      mockOpenClawService.notify.mockReturnValue(false);
      mockLoginIdService.approvalWait.mockResolvedValue({ status: 'approved' });

      await idgw.approvalWait(sessionId, approvalUrl, { notify: 'telegram:@me' });

      expect(mockOpenClawService.notify).toHaveBeenCalled();
      expect(open).toHaveBeenCalledWith(approvalUrl.toString());
    });

    it('should not notify if approvalUrl is not provided', async () => {
      mockLoginIdService.approvalWait.mockResolvedValue({ status: 'approved' });

      await idgw.approvalWait(sessionId, null, { notify: 'telegram:@me' });

      expect(mockOpenClawService.notify).not.toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
    });

    it('should return deny if event return denied', async () => {
      mockLoginIdService.approvalWait.mockResolvedValue({ status: 'denied' });

      const result = await idgw.approvalWait(sessionId, approvalUrl);

      expect(result).toBe(JSON.stringify({ status: 'deny' }));
    });

    it('should return deny if event return is unknown', async () => {
      mockLoginIdService.approvalWait.mockResolvedValue({ some_other_prop: 'value' });

      const result = await idgw.approvalWait(sessionId, approvalUrl);

      expect(result).toBe(JSON.stringify({ status: 'deny' }));
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
