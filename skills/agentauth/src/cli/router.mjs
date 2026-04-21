/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { CreateSessionCommand } from './commands/CreateSessionCommand.mjs';
import { IdentityGateWay } from '../services/IdentityGateWay.mjs';
import { WaitForSessionCommand } from './commands/WaitForSessionCommand.mjs';
import { ApprovalFlowCommand } from './commands/ApprovalFlowCommand.mjs';
import { AuthFlowCommand } from './commands/AuthFlowCommand.mjs';
import { TestNotifyCommand } from './commands/TestNotifyCommand.mjs';
import { HttpClient } from '../services/HttpClient.mjs';
import { AgentSigner } from '../utils/AgentSigner.mjs';
import { SseClient } from '../services/SseClient.mjs';
import { config } from '../utils/env.mjs';
import { OpenClawService } from '../services/OpenClawService.mjs';
import { LoginIDService } from '../services/loginid/index.mjs';

const openClawService = new OpenClawService();

let idgwService;
const getIdgwService = () => {
  if (idgwService) {
    return idgwService;
  }

  const apiKey = config.apiKey;
  const keyId = config.getAgentKeyId();

  const privateKey = config.getAgentPrivateKey();
  let signer;
  if (privateKey) {
    signer = new AgentSigner(privateKey, keyId);
  }

  const httpClient = new HttpClient({ signer });
  const sseClient = new SseClient();
  const loginIdService = new LoginIDService({
    baseUrl: config.idgwBaseUrl,
    httpClient,
    sseClient,
    credentials: { apiKey, keyId },
  });

  idgwService = new IdentityGateWay({
    loginIdService,
    openClawService,
  });
  return idgwService;
};

const commandFactories = {
  'create-session': () => new CreateSessionCommand(getIdgwService()),
  'auth-flow': () => new AuthFlowCommand(getIdgwService()),
  'wait-for-session': () => new WaitForSessionCommand(getIdgwService()),
  'approval-flow': () => new ApprovalFlowCommand(getIdgwService()),
  'test-notify': () => new TestNotifyCommand(openClawService),
};

export function getCommand(commandName) {
  const factory = commandFactories[commandName];
  if (!factory) {
    throw new Error(`Command not found: ${commandName}`);
  }
  return factory();
}
