/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

import { IdentityGateWay } from '../services/IdentityGateWay.mjs';
import { ApprovalFlowCommand } from './commands/ApprovalFlowCommand.mjs';
import { AuthFlowCommand } from './commands/AuthFlowCommand.mjs';
import { TestNotifyCommand } from './commands/TestNotifyCommand.mjs';
import { HttpClient } from '../services/HttpClient.mjs';
import { AgentSigner } from '../utils/AgentSigner.mjs';
import { SseClient } from '../services/SseClient.mjs';
import { config } from '../utils/env.mjs';
import {
  ConsoleNotificationService,
  OpenClawNotificationService,
} from '../services/NotificationService.mjs';
import { LoginIDService } from '../services/loginid/index.mjs';
import { EnvManager } from '../utils/EnvManager.mjs';
import { CommandExecutor } from '../services/CommandExecutor.mjs';

const notificationService =
  config.notificationChannel === "stdio"
    ? new ConsoleNotificationService()
    : new OpenClawNotificationService();
const envManager = new EnvManager({ openClawDir: config.openClawDir });
const commandExecutor = new CommandExecutor();

const getUnauthenticatedIdgwService = () => {
  const httpClient = new HttpClient();
  const sseClient = new SseClient();
  const loginIdService = new LoginIDService({
    baseUrl: config.idgwBaseUrl,
    httpClient,
    sseClient,
  });
  return new IdentityGateWay({
    loginIdService,
    notificationService,
    envManager,
    commandExecutor,
    config,
  });
};

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
    notificationService,
    envManager,
    commandExecutor,
    config,
  });
  return idgwService;
};

const commandFactories = {
  'auth-flow': () => new AuthFlowCommand(getUnauthenticatedIdgwService()),
  'approval-flow': () => new ApprovalFlowCommand(getIdgwService()),
  'test-notify': () => new TestNotifyCommand(notificationService),
};

export function getCommand(commandName) {
  const factory = commandFactories[commandName];
  if (!factory) {
    throw new Error(`Command not found: ${commandName}`);
  }
  return factory();
}
