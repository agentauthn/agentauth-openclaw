## Open Source Models (Ollama) Setup

To use agentauth with open source models via Ollama, additional OpenClaw configuration is required.

---

### Tested Models

| Model       | Status     | Notes                                                              |
| ----------- | ---------- | ------------------------------------------------------------------ |
| gemma4:26b  | ✅ Works   | Standard prompt sufficient                                         |
| qwen3.6     | ✅ Works   | Standard prompt sufficient                                         |
| gpt-oss:20b | ⚠️ Partial | Requires explicit skill reference in prompt for reliable execution |
| llama4      | ❌ Fails   | Hardware limitation — model size exceeds available RAM             |

> **Recommended prompt:** `<action> using the agentauth skill`
> **Note for gpt-oss:20b:** Explicitly referencing the skill improves reliability, however behavior remains inconsistent across sessions.

---

### Required openclaw.json Config

Replace the channel and ID based on your setup. Example using WhatsApp:

```json
{
  "tools": {
    "profile": "full",
    "allow": ["*"],
    "exec": { "host": "auto", "security": "full", "ask": "off" },
    "elevated": {
      "enabled": true,
      "allowFrom": {
        "whatsapp": ["+1234567890"],
        "subagent": ["*"]
      }
    }
  },
  "agents": {
    "defaults": {
      "sandbox": { "mode": "off" },
      "subagents": { "maxSpawnDepth": 2 }
    },
    "list": [
      {
        "id": "main",
        "tools": {
          "elevated": {
            "enabled": true,
            "allowFrom": {
              "whatsapp": ["+1234567890"],
              "subagent": ["*"]
            }
          }
        }
      }
    ]
  }
}
```

> Replace `"whatsapp"` with your channel (`telegram`, `slack`, etc.) and `"+1234567890"` with your user ID or phone number. `"subagent": ["*"]` must remain unchanged.

---

### Configuration Reference

The following settings are required to enable agentauth with open source models. Each addresses a specific execution constraint encountered during testing.

#### `tools.exec`

| Key        | Value    | Reason                                                                                                                    |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `host`     | `"auto"` | Allows sub-agents to run exec commands on any available host. Without this, sub-agents fail with `exec host not allowed`. |
| `security` | `"full"` | Removes sandbox policy restrictions so `cli.cjs` can execute without being blocked.                                       |
| `ask`      | `"off"`  | Disables approval prompts for exec commands inside the sub-agent.                                                         |

#### `tools.elevated`

| Key                  | Value   | Reason                                                                                                                                                                 |
| -------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`            | `true`  | Enables elevated permissions globally.                                                                                                                                 |
| `allowFrom.subagent` | `["*"]` | **Critical.** Propagates elevated permissions to spawned sub-agents. Without this, sub-agents always fail with `elevated is not available right now (runtime=direct)`. |

#### `agents.defaults`

| Key                       | Value   | Reason                                                                                   |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `sandbox.mode`            | `"off"` | Disables the sandbox environment for sub-agents, which otherwise blocks exec tool usage. |
| `subagents.maxSpawnDepth` | `2`     | Enables the main agent to spawn sub-agents required for the approval flow.               |

---

### Exec Approvals Allowlist

OpenClaw maintains a secondary exec security layer (`exec-approvals.json`) that restricts which binaries can be executed, independently of the `tools.exec.security` setting. The following binaries must be explicitly allowlisted to enable the approval flow.

| Binary                   | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `/opt/homebrew/bin/node` | Executes `cli.cjs`, which is a Node.js script.              |
| `/bin/bash`              | Runs the approval flow shell commands inside the sub-agent. |

> **Note:** The Node.js path may differ depending on your OS and installation method. Run `which node` to find the correct path on your system.

Run the following commands once after setup:

```bash
openclaw approvals allowlist add --agent main "$(which node)"  # e.g. /opt/homebrew/bin/node on macOS
openclaw approvals allowlist add --agent main "/bin/bash"
```
