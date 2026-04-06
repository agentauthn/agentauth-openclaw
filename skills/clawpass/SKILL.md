---
name: request-approval
homepage: https://loginid.io
description: Require identity verification and human approval through loginid-identity-gateway before executing dangerous or destructive operations
compatibility: Requires Preloop MCP loginid-identity-gateway (`./scripts/cli.cjs`)
metadata: { "openclaw": { "requires": { "env": ["LIG_AGENT_PRIVATE_KEY", "LIG_AGENT_KEY_ID"] } } }
---

# Request Approval + Identity Verification Skill

This skill enables safe execution of sensitive or dangerous actions using LoginID's Identity Gateway approval system.

The flow:
- Creates an approval session
- Notifies the user (if configured)
- Waits for approval to complete
- Returns the approval result (does not execute the command)

---

## 🚨 Dangerous Operations Definition

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

## 🔐 Required Flow for Dangerous Actions

Use the **one command**:

```bash
./scripts/cli.cjs approval-flow <toolCall> <displayString> [--notify <channel>:<target>]
````

---

### Arguments

* **`toolCall`**
  The exact command or tool call that would be executed

* **`displayString`**
  A concise, human-readable description of the action for the approval UI

* **`--notify` (optional)**
  Notification destination in the format:

  ```
  <channel>:<target>
  ```

  Examples:

  * `telegram:@user`
  * `slack:channel:C123`
  * `whatsapp:+123456789`

If a user channel and target are known, include the `--notify` option.

---

### Blocking Execution

The `approval-flow` command is **blocking**.

* Wait for the command to fully complete
* Do not proceed until completion
* Do not assume success early

---

### Completion Rules

The process is only complete when:

* A JSON response indicates completion:

  ```json
  { "status": "complete" }
  ```

* OR a final result is returned:

  ```json
  { "status": "approved" }
  ```

* OR:

  ```json
  { "status": "deny" }
  ```

* OR an error occurs

---

### Execution Responsibility

`./scripts/cli.cjs approval-flow` does **not** execute the `toolCall`.

It only:

* Requests approval
* Waits for the result

After it completes:

* If:

  ```json
  { "status": "approved" }
  ```

Execute the original `toolCall`.

* If denied or an error occurs:

  * Do not execute and stop immediately

---

### Important: Intermediate Signals

The following **do NOT mean completion**:

* A notification being sent
* A browser window opening
* Any message indicating user interaction has started

These indicate that an action has been triggered, not that the approval flow has finished.

Continue waiting until:

* "status": "complete"
* OR "status": "approved"
* OR an error is returned

---

### Notifications

If `--notify` is provided:

* A notification may be sent
* Format: `<channel>:<target>`

If notification is not provided or fails:

* The system may fall back to opening a browser

The command may output:

* That a notification was sent
* OR that a browser was opened

These are **side effects only**, not completion indicators.

---

## ⚠️ Hard Rules

* NEVER execute dangerous commands without approval
* NEVER skip identity verification
* NEVER ask the user for approval in chat
* ALWAYS use `./scripts/cli.cjs approval-flow`
* ALWAYS wait for the `approval-flow` command to finish
* NEVER treat notification sent or browser opened as completion
* NEVER retry silently after failure
* ALWAYS stop on denial, timeout, or failure
* The executed command MUST match the approved command

---

## 🧠 Decision Framework

Ask:

1. Could this delete or overwrite data?
2. Could this impact production systems?
3. Could this be hard to undo?
4. Would a human want to explicitly review this before execution?

If YES → follow full approval flow

---

## ❌ If Approval Is Denied

* Stop immediately
* Inform the user the operation was cancelled
* Do not execute

---

## ❌ If LIG Fails

* Stop immediately
* Report failure or timeout
* Do NOT proceed

---

## 🛡️ Principle

**Dual control system handled by `./scripts/cli.cjs`:**

* Identity verification
* Human approval

Both are required before execution.

---

**Remember:**
When in doubt → STOP and use `./scripts/cli.cjs approval-flow`
