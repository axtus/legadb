---
id: extract-systemrole-auth
title: Extract systemRole in Auth Extraction Function
severity: HIGH
priority: P1
category: Security
status: pending
locations:
  - utilities/auth-middleware.ts
  - domain/fns/biz-logic/auth.ts
related_issues:
  - 1.1
dependencies:
  - rbac-middleware
cvss_score: 9.1
---

## Description

The `extractAuthContext()` function needs to include `systemRole` so that
`requireAdminAuth()` middleware can verify admin privileges. Currently, the auth
context extraction may not include role information needed for RBAC checks.

This is a supporting task for implementing proper RBAC middleware (task 01).

## Remediation

1. Modify `extractAuthContext()` to fetch and include `systemRole` from the
   user's identity
2. Ensure `systemRole` is available in the auth context object
3. Update type definitions to include `systemRole` in auth context

## Code References

### Current Auth Context Extraction

The auth context should include:

```typescript
interface AuthContext {
	identityId: string;
	systemRole: SystemRole; // Need to add this
	// ... other fields
}
```

### Implementation Pattern

```typescript
// utilities/auth-middleware.ts
async function extractAuthContext(
	sessionToken: string,
): Promise<AuthContext | null> {
	const session = await validateSession(sessionToken);
	if (!session) return null;

	// Fetch user identity with systemRole
	const identity = await getIdentityWithRole(session.identityId);
	if (!identity) return null;

	return {
		identityId: session.identityId,
		systemRole: identity.systemRole,
		// ... other fields
	};
}
```
