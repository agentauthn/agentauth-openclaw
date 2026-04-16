/*
 * Copyright 2026 LoginID Inc.
 *
 * SPDX-License-Identifier: MIT-0
 */

export const APPROVAL_INIT_QUERY = `
  mutation approvalInit(
    $permissions: [PermissionInput!]!
    $callbackUri: String!
    $username: String
  ) {
    approvalInit(
      permissions: $permissions
      callbackUri: $callbackUri
      username: $username
    ) {
      approvalUrl
      sessionId
      username
      permissions {
        id
        title
        description
      }
      expiresAt
    }
  }
`;
