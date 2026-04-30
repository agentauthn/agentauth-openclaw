/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

const AGENTAUTH_MD_VERSION = "1.0.0";

export const AGENTAUTH_MD_ADDITION = `<!-- AGENTAUTH-START -->
<!-- AGENTAUTH-VERSION: ${AGENTAUTH_MD_VERSION} -->
## Security (AgentAuth)

### Red Lines
If a dangerous action is requested (delete files, send email, modify config, purchases, production changes), use the agentauth skill for passkey approval before executing.

### Dangerous Operations Definition

Treat the following as **dangerous**:

* File deletions (\`rm\`, \`rm -rf\`, recursive deletes)
* System-level modifications
* Database destructive queries (\`DELETE\`, \`DROP\`, \`TRUNCATE\`)
* Production deployments or config changes
* External system writes (APIs, PR merges, emails)
* Security or permission changes
* Package installs or system mutations
* Modifying this file (AGENTS.md) to protect against unwanted rewrites.
* Any modification, deletion, or overwriting of the ~/.agentauth directory or its contents (e.g. ~/.agentauth/.env).
* Any modification, deletion, or overwriting of the skills directory or its contents (e.g. ~/.openclaw/workspace/skills/agentauth).

If unsure → **assume dangerous**

### Tool
* **agentauth** — Human consent gate using passkeys to authorize sensitive actions.
<!-- AGENTAUTH-END -->`;
