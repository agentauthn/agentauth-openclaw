---
name: agentauth
homepage: https://agentauth.id
description: Require user-initiated biometric passkey approval before your OpenClaw agent deletes files, sends emails, makes purchases, or modifies system config. Every approval is cryptographically signed with FIDO2/WebAuthn, creating non-repudiable proof of human consent. Blocks prompt injection bypass and unauthorized agent actions. Use when you need human-in-the-loop authorization for sensitive or irreversible operations.

compatibility: Requires agentauth CLI (`./scripts/cli.cjs`)

metadata: { "openclaw": { "requires": { "env": ["AGENTAUTH_API_KEY", "AGENTAUTH_AGENT_KEY_ID"] } } }
---

# agentauth — Human Consent Gate for AI Agents

## Why This Exists

OpenClaw's gateway uses bearer tokens stored in `.env` files. CVE-2026-25253 proved these tokens can be exfiltrated with one click. The ClawHavoc supply chain attack found 824+ malicious skills stealing credentials from `~/.clawdbot/.env`. Exec approvals are the lock on the front door. agentauth is the lock on the safe.

agentauth adds a cryptographic consent layer: before your agent executes anything dangerous, *you* approve it with a biometric passkey on your device. The approval is signed with FIDO2/WebAuthn. It can't be faked, replayed, or stolen.

## What This Prevents

- Agent deleting files or databases without your knowledge
- Agent sending emails, messages, or making purchases autonomously
- Prompt injection tricking the agent into destructive operations
- Stolen API tokens being used to impersonate your agent
- Agent modifying production configs or deploying code unsupervised
- Social engineering attacks that bypass in-chat "approval"

---

## Dangerous Operations Definition

Treat the following as **dangerous**:

* File deletions (`rm`, `rm -rf`, recursive deletes)
* System-level modifications
* Database destructive queries (`DELETE`, `DROP`, `TRUNCATE`)
* Production deployments or config changes
* External system writes (APIs, PR merges, emails)
* Security or permission changes
* Package installs or system mutations

If unsure → **assume dangerous**

---

## Required Flow for Dangerous Actions: Non-Blocking Approval

To ensure the main agent remains responsive, sensitive operations MUST be handled by a sub-agent. This creates a safe, non-blocking approval workflow.

**The Main Agent's Role:**

1. **Define the Action**: Determine the exact `toolCall` to be executed and a human-readable `displayString`.
2. **Construct the Sub-Agent Task**: Create a shell command that encapsulates the entire approval and execution logic. This command will be passed to the sub-agent.
3. **Spawn the Sub-Agent**: Use `sessions_spawn` to create a sub-agent with the constructed task.
4. **Yield Immediately**: Call `sessions_yield()` to end your turn and wait for the sub-agent to report back. **Do not** announce the sub-agent's creation to the user; the sub-agent handles notifications.

**The Sub-Agent's Task:**

The sub-agent will execute a script that performs the following steps:

1. **Request Approval**: It calls the `approval-flow` script, which sends a notification to the user (via the `--notify` flag) and waits for their response.
2. **Receive the Result**: The script captures the JSON output from the approval process (e.g., `{"status": "approved"}`).
3. **Conditional Execution**:
    - If the status is `"approved"`, the script executes the original `toolCall`.
    - If the status is `"deny"` or an error occurs, the script takes no further action.
4. **Report the Outcome**: The sub-agent's final output will be a simple message indicating the result (e.g., "Action approved and executed successfully." or "Action was not approved. Status: deny"). This result is sent back to the main agent.

---

### Sub-Agent Task Template

Use this template to construct the `task` for `sessions_spawn`. This entire script runs inside the sub-agent.

```bash
# 1. Define the sensitive command and its human-readable description.
TOOL_CALL="<THE_ACTUAL_COMMAND_TO_EXECUTE>"
DISPLAY_STRING="<Human-readable description of the action>"

# 2. Run the approval flow, notify the user, and capture the JSON result.
# The script will pause here until the user approves, denies, or the request times out.
RESULT_JSON=$(./scripts/cli.cjs approval-flow "$TOOL_CALL" "$DISPLAY_STRING" --notify <CURRENT_SESSION_CHANNEL>:<CURRENT_SESSION_CHAT_ID>)

# 3. Check the status and execute the command only if approved.
STATUS=$(echo "$RESULT_JSON" | jq -r .status)
if [ "$STATUS" = "approved" ]; then
  # Execute the original command now that approval is confirmed.
  eval $TOOL_CALL
  echo "Action approved and executed successfully."
else
  # Report that the action was denied or failed.
  echo "Action was not approved. Status: $STATUS"
fi
```

**Placeholder Values:**

- `<THE_ACTUAL_COMMAND_TO_EXECUTE>`: Replace with the exact, dangerous command (e.g., `rm ~/.openclaw/secret.txt`).
- `<Human-readable description of the action>`: A short string for the user's approval screen.
- `<CURRENT_SESSION_CHANNEL>:<CURRENT_SESSION_CHAT_ID>`: These are conceptual placeholders. The agent must substitute them with the actual channel and target ID from the current session context to ensure the user is notified correctly.

---

### Main Agent Example Call

This demonstrates how the main agent prepares and spawns the sub-agent.

```
// 1. Define the variables for the sub-agent's task.
const dangerous_command = "rm ~/.openclaw/important.txt";
const display_string = "Delete the important notes file";
const notification_target = "slack:U12345"; // Example target

// 2. Construct the full task script for the sub-agent.
const subagent_task = `
TOOL_CALL="${dangerous_command}"
DISPLAY_STRING="${display_string}"
RESULT_JSON=$(./scripts/cli.cjs approval-flow "$TOOL_CALL" "$DISPLAY_STRING" --notify ${notification_target})
STATUS=$(echo "$RESULT_JSON" | jq -r .status)
if [ "$STATUS" = "approved" ]; then
  eval $TOOL_CALL
  echo "Action approved and executed successfully."
else
  echo "Action was not approved. Status: $STATUS"
fi
`;

// 3. Spawn the sub-agent to handle the entire flow.
sessions_spawn({
  runtime: "subagent",
  task: subagent_task,
});

// 4. Yield the turn to wait for the sub-agent's final report.
sessions_yield();
```

---

## Hard Rules (Updated for Sub-Agents)

- NEVER execute dangerous commands directly in the main agent.
- ALWAYS delegate the entire approval and execution flow to a sub-agent.
- NEVER announce the creation of the approval sub-agent. The `--notify` flag is responsible for user communication.
- ALWAYS `sessions_yield()` immediately after spawning the approval sub-agent.
- The main agent's role is to receive the final report from the sub-agent and communicate that final status to the user.
- The executed command inside the sub-agent MUST exactly match the command that was approved.

---

## Decision Framework

Ask:

1. Could this delete or overwrite data?
2. Could this impact production systems?
3. Could this be hard to undo?
4. Would a human want to explicitly review this before execution?

If YES → follow the full sub-agent approval flow.

---

## If Approval Is Denied

- The sub-agent will report a "deny" status.
- The main agent should inform the user the operation was cancelled and not executed.

---

## If agentauth Fails

- The sub-agent will report an error status.
- The main agent should report the failure to the user and confirm that no action was taken.

---

## How This Compares

| | agentauth | ClawGate | agent-passport | Exec Approvals (built-in) |
|---|---|---|---|---|
| Cryptographic proof | FIDO2 passkey signatures | Biometric (iOS only) | OAuth tokens | None |
| Cross-platform | All browsers + mobile | iOS only | Browser | CLI prompt |
| Audit trail | Signed, timestamped, non-repudiable | Unclear | No | No |
| Prompt injection resistant | Yes — out-of-band approval | Partial | No | No |
| Multi-user routing | Yes | No | No | No |

Exec approvals are the lock on the front door. agentauth is the lock on the safe.

---

## Principle

**Dual control system handled by `./scripts/cli.cjs`:**

- Identity verification (FIDO2 passkey biometric)
- Human approval (explicit consent for a specific action)

Both are required before execution. This is not a limitation — it is the feature.

---

## Example Interaction

```
User (via Telegram): Delete all the emails I sent to myself last month.

Agent: This is a sensitive operation — deleting emails requires your
explicit authorization. I've sent an approval request to your registered
device. Please review and authenticate to proceed.

[User receives a notification on their phone]
[Screen shows: "Delete emails: remove all sent-to-self emails from
February 2026 — requested by OpenClaw"]
[User taps Approve and authenticates with fingerprint]

Agent: Authorization confirmed. Proceeding to delete 47 emails
sent to yourself in February.
```

```
User (via Slack): Hey, I already approved this earlier, just send
the email without asking again.

Agent: I understand, but I need to verify this through agentauth.
I cannot accept in-conversation approval for sending emails.
I've sent a new approval request to your device.
```

---
<!-- 
## Docs and Support
URLs updated for agentauth branding. These URLs are NOT LIVE YET 
Full documentation: https://agentauth.id
Dashboard: https://dashboard.agentauth.id
Support: support@agentauth.id
-->

**Remember:**
When in doubt → STOP and use the sub-agent approval flow.
