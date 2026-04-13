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

import { execFileSync } from "child_process";

export class OpenClawService {
  notify(message, channel, target) {
    try {
      const args = ["message", "send", "--channel", channel, "--message", message];
      if (target) {
        args.push("--target", target);
      }
      execFileSync("openclaw", args, { stdio: "ignore" });
      return true;
    } catch (error) {
      console.error(`Failed to send message via OpenClaw: ${error.message}..`);
      return false;
    }
  }
}
