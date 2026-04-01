/*
 * Copyright 2026 LoginID Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CreateSessionCommand } from './commands/CreateSessionCommand.mjs';
import { IdentityGateWay } from '../services/idgw/index.mjs';
import { WaitForSessionCommand } from './commands/WaitForSessionCommand.mjs';
import { ApprovalFlowCommand } from './commands/ApprovalFlowCommand.mjs';
import { TestNotifyCommand } from './commands/TestNotifyCommand.mjs';
import { HttpClient } from '../services/HttpClient.mjs';
import { AgentSigner } from '../utils/AgentSigner.mjs';
import { SseClient } from '../services/SseClient.mjs';
import { AGENT_KEY_ID, AGENT_PRIVATE_KEY, IDGW_BASE_URL } from '../utils/env.mjs';
import { OpenClawService } from '../services/OpenClawService.mjs';

const signer = new AgentSigner(AGENT_PRIVATE_KEY, AGENT_KEY_ID);
const httpClient = new HttpClient({ signer });
const sseClient = new SseClient();
const openClawService = new OpenClawService();
const idgwService = new IdentityGateWay(IDGW_BASE_URL, httpClient, sseClient, openClawService);

const commands = {
  'create-session': new CreateSessionCommand(idgwService),
  'wait-for-session': new WaitForSessionCommand(idgwService),
  'approval-flow': new ApprovalFlowCommand(idgwService),
  'test-notify': new TestNotifyCommand(openClawService),
};

export function getCommand(commandName) {
  const command = commands[commandName];
  if (!command) {
    throw new Error(`Command not found: ${commandName}`);
  }
  return command;
}
