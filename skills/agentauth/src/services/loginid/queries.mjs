/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

export const APPROVAL_INIT_QUERY = `
  mutation approvalInit(
    $permissions: [PermissionInput!]!
  ) {
    approvalInit(
      permissions: $permissions
    ) {
      approvalUrl
      topic
    }
  }
`;

export const CREATE_SESSION_QUERY = `
  mutation {
    createSession {
      topic
      link
      agentId
    }
  }
`;
