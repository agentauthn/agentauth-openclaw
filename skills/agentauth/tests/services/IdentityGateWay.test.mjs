import { jest } from '@jest/globals';
import { WEBCHAT } from '../../src/utils/notifications.mjs';

const mockOpen = jest.fn();
jest.unstable_mockModule('open', () => ({
  default: mockOpen,
}));

const { IdentityGateWay } = await import('../../src/services/IdentityGateWay.mjs');
const open = (await import('open')).default;

describe('IdentityGateWay', () => {
  let mockLoginIdService;
  let mockOpenClawService;
  let mockEnvManager;
  let idgw;

  beforeEach(() => {
    mockLoginIdService = {
      approvalInit: jest.fn(),
      waitForSession: jest.fn(),
      createAuthSession: jest.fn(),
    };
    mockOpenClawService = {
      notify: jest.fn(),
    };
    mockEnvManager = {
      saveCredentials: jest.fn(),
      updateAgentMarkdown: jest.fn(),
    };
    idgw = new IdentityGateWay({
      loginIdService: mockLoginIdService,
      openClawService: mockOpenClawService,
      envManager: mockEnvManager,
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

      expect(result.approvalUrl).toBe("http://example.com/approve");
    });

    it('should bubble up errors from loginIdService', async () => {
      mockLoginIdService.approvalInit.mockRejectedValue(new Error('test error'));
      await expect(idgw.approvalInit('tool', 'display')).rejects.toThrow('test error');
    });
  });

  describe('createAuthSession', () => {
    it('should create an auth session and return authUrl and sessionId', async () => {
      const authUrl = 'http://example.com/auth';
      const sessionId = 'test-session-id';
      mockLoginIdService.createAuthSession.mockResolvedValue({ link: authUrl, sessionId });

      const result = await idgw.createAuthSession();

      expect(result.sessionId).toBe(sessionId);
      expect(result.authUrl).toBe(authUrl);
    });

    it('should throw an error if sessionId is not returned from service', async () => {
      const authUrl = 'http://example.com/auth';
      mockLoginIdService.createAuthSession.mockResolvedValue({ link: authUrl });

      await expect(idgw.createAuthSession()).rejects.toThrow('Authentication session is not found');
    });
  });

  describe('approvalWait', () => {
    const sessionId = 'test-session';
    const approvalUrl = new URL('http://example.com/approve?sessionId=test-session');

    it('should send notification and wait for event if notify is provided', async () => {
      mockOpenClawService.notify.mockReturnValue(true);
      mockLoginIdService.waitForSession.mockResolvedValue({ status: 'approved' });

      const result = await idgw.approvalWait(sessionId, approvalUrl, { notify: 'telegram:@me' });

      expect(mockOpenClawService.notify).toHaveBeenCalledWith(
        `An action requires your approval. Please visit this URL to review: ${approvalUrl.toString()}`,
        'telegram',
        '@me'
      );
      expect(open).not.toHaveBeenCalled();
      expect(mockLoginIdService.waitForSession).toHaveBeenCalledWith(sessionId);
      expect(result).toBe(JSON.stringify({ status: 'approved' }));
    });

    it('should open browser if notification fails', async () => {
      mockOpenClawService.notify.mockReturnValue(false);
      mockLoginIdService.waitForSession.mockResolvedValue({ status: 'approved' });

      await idgw.approvalWait(sessionId, approvalUrl, { notify: 'telegram:@me' });

      expect(mockOpenClawService.notify).toHaveBeenCalled();
      expect(open).toHaveBeenCalledWith(approvalUrl.toString());
    });

    it('should open browser if notify is only a channel', async () => {
      mockLoginIdService.waitForSession.mockResolvedValue({ status: 'approved' });

      await idgw.approvalWait(sessionId, approvalUrl, { notify: 'telegram' });

      expect(mockOpenClawService.notify).not.toHaveBeenCalled();
      expect(open).toHaveBeenCalledWith(approvalUrl.toString());
    });

    it('should open browser if notify channel is webchat', async () => {
      mockLoginIdService.waitForSession.mockResolvedValue({ status: 'approved' });

      await idgw.approvalWait(sessionId, approvalUrl, { notify: WEBCHAT });

      expect(open).toHaveBeenCalledWith(approvalUrl.toString());
      expect(mockOpenClawService.notify).not.toHaveBeenCalled();
    });

    it('should open browser if notify channel is webchat:', async () => {
      mockLoginIdService.waitForSession.mockResolvedValue({ status: 'approved' });

      await idgw.approvalWait(sessionId, approvalUrl, { notify: `${WEBCHAT}:` });

      expect(open).toHaveBeenCalledWith(approvalUrl.toString());
      expect(mockOpenClawService.notify).not.toHaveBeenCalled();
    });

    it('should not notify if approvalUrl is not provided', async () => {
      mockLoginIdService.waitForSession.mockResolvedValue({ status: 'approved' });

      await idgw.approvalWait(sessionId, null, { notify: 'telegram:@me' });

      expect(mockOpenClawService.notify).not.toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
    });

    it('should return deny if event return denied', async () => {
      mockLoginIdService.waitForSession.mockResolvedValue({ status: 'denied' });

      const result = await idgw.approvalWait(sessionId, approvalUrl);

      expect(result).toBe(JSON.stringify({ status: 'deny' }));
    });

    it('should return deny if event return is unknown', async () => {
      mockLoginIdService.waitForSession.mockResolvedValue({ some_other_prop: 'value' });

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
      jest.spyOn(idgw, 'approvalWait').mockResolvedValue(JSON.stringify({ status: 'approved' }));

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

    it('should return deny if approval is denied', async () => {
      const initResult = {
        approvalUrl: new URL('http://example.com/approve'),
        sessionId: '456',
      };
      jest.spyOn(idgw, 'approvalInit').mockResolvedValue(initResult);
      jest.spyOn(idgw, 'approvalWait').mockResolvedValue(JSON.stringify({ status: 'deny' }));

      const result = await idgw.approvalFlow('tool', 'display');

      expect(result).toEqual({ status: 'deny' });
    });
  });

  describe('authFlow', () => {
    it('should successfully complete auth flow and save credentials', async () => {
      const createSessionResult = {
        authUrl: 'http://example.com/auth?s=test-session',
        sessionId: 'test-session',
      };
      jest.spyOn(idgw, 'createAuthSession').mockResolvedValue(createSessionResult);
      const eventData = {
        status: 'api_key_created',
        meta: {
          api_key: 'test_api_key',
          key_id: 'test_key_id',
        },
      };
      mockLoginIdService.waitForSession.mockResolvedValue(eventData);

      const result = await idgw.authFlow({ notify: 'test' });

      expect(idgw.createAuthSession).toHaveBeenCalled();
      expect(mockLoginIdService.waitForSession).toHaveBeenCalledWith('test-session');
      expect(mockEnvManager.saveCredentials).toHaveBeenCalledWith('test_key_id', 'test_api_key');
      expect(mockEnvManager.updateAgentMarkdown).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'Credentials are captured' });
    });

    it('should return failure if auth flow does not result in api_key_created', async () => {
      const createSessionResult = {
        authUrl: 'http://example.com/auth?s=test-session',
        sessionId: 'test-session',
      };
      jest.spyOn(idgw, 'createAuthSession').mockResolvedValue(createSessionResult);
      const eventData = { status: 'some_other_status' };
      mockLoginIdService.waitForSession.mockResolvedValue(eventData);

      const result = await idgw.authFlow({ notify: 'test' });

      expect(idgw.createAuthSession).toHaveBeenCalled();
      expect(mockLoginIdService.waitForSession).toHaveBeenCalledWith('test-session');
      expect(mockEnvManager.saveCredentials).not.toHaveBeenCalled();
      expect(mockEnvManager.updateAgentMarkdown).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: 'Could not create credentials' });
    });
  });
});
