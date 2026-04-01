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

import { BaseCommand } from "./BaseCommand.mjs";
import { parseNotify } from "../../utils/notifications.mjs";

export class TestNotifyCommand extends BaseCommand {
  constructor(openClawService) {
    super();
    this.openClawService = openClawService;
  }

  async execute(args) {
    const { message, notify } = args;
    const { channel, target } = parseNotify(notify);

    const success = this.openClawService.notify(message, channel, target);
    if (success) {
      console.log("Notification sent successfully.");
    }
  }
}
