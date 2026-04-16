# agentauth (Approval Flow for OpenClaw)

This skill adds **human approval + identity verification** before OpenClaw performs dangerous actions.

OpenClaw will automatically use this when it detects a **high-risk action**, such as:

- Deleting files or data
- Sending emails or external writes
- Database changes
- Deployments or production changes
- Security or permission updates

---

## Installation

You can install this skill into OpenClaw using the provided script or manually.

### Option 1 — Using the install script (recommended)

```bash
npm run install:local
```

Optionally, you can pass a custom OpenClaw directory:

```bash
npm run install:local -- /path/to/openclaw
```

If no path is provided, the script will use:

```bash
~/.openclaw
```

The script will:

- Build the project
- Package the skill
- Install it into your OpenClaw `skills` directory

### Option 2 — Manual installation

If you prefer to install manually:

```bash
npm install
npm run build
```

If you prefer to install manually:

1. **Build the project**

```bash
npm install
npm run build
```

2. **Package and install the skill**

```bash
mkdir loginid-identity-gateway
cp SKILL.md loginid-identity-gateway/
cp -r scripts loginid-identity-gateway/
mv loginid-identity-gateway ~/.openclaw/skills/
```

If using a custom OpenClaw directory:

```bash
mv loginid-identity-gateway <openclaw-directory>/skills/
```

Restart OpenClaws gateway and it will automatically detect and use the skill when needed.

---

## Command Used by OpenClaw

```bash
node ./scripts/cli.cjs approval-flow "<toolCall>" "<displayString>" [--notify <channel:target>]
```

---

## What Happens

1. **When OpenClaw detects a dangerous action that it needs to use**

2. It runs:

   ```bash
   node ./scripts/cli.cjs approval-flow ...
   ```

3. The script:

   - Creates an approval session with LoginID Identity Gateway
   - Generates an approval URL

4. The user is notified:

   - If `--notify` is set → message is sent (Telegram, Slack, etc.)
   - If notification fails → browser opens automatically

5. The user:

   - Opens the approval link
   - Sees the required action
   - Approves or denies using a **passkey**

6. OpenClaw **waits** until one of these happens:

   - Approved
   - Denied
   - Timeout

7. OpenClaw continues based on the result:

   - **Approved** → action is executed
   - **Denied** → action is ignored 
   - **Timeout** → action is ignored

---

## Get Your Credentials

Before configuring this skill, register your passkey at:

https://consent.loginid.io/auth

After registration, your **API Key** and **Agent Key ID** will be generated and shown in the dashboard.

Save both values — they are required for setup.

---

## Environment Variables

This skill requires the following values to be provided via `OpenClaw config` (`~/.openclaw/openclaw.json`).

| Variable                 | Required | Description                                                     |
| ------------------------ | -------- | --------------------------------------------------------------- |
| `AGENTAUTH_API_KEY`      | Yes      | API key used to authenticate requests to agentauth.               |
| `AGENTAUTH_AGENT_KEY_ID` | Yes      | Identifier of the registered agent key used for approval flows. |

### Example

```json
{
  "skills": {
    "entries": {
      "agentauth": {
        "enabled": true,
        "env": {
          "AGENTAUTH_API_KEY": "<API_KEY>",
          "AGENTAUTH_AGENT_KEY_ID": "<AGENT_KEY_ID>"
        }
      }
    }
  }
}
```

---

## License

MIT-0 © LoginID Inc.
