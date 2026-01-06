---
id: remove-client-side-role-auth
title: Remove Client-Side Role Authorization Enforcement
severity: HIGH
priority: P2
category: Security
status: pending
locations:
  - client/hooks/tnhooks/useAuth.ts:53-58
  - client/components/layout.tsx:48-72
related_issues:
  - 1.3
cvss_score: 7.5
---

## Description

System role is stored in localStorage and used for UI visibility:

```typescript
export function getSystemRole(): SystemRole | null {
	if (typeof window === "undefined") return null;
	const role = localStorage.getItem(SYSTEM_ROLE_KEY);
	if (role === "ADMIN" || role === "USER") return role;
	return null;
}
```

Problems:

- localStorage is readable/writable by JavaScript
- Admin UI elements shown/hidden based on localStorage value
- User can modify `localStorage.setItem('gledger_system_role', 'ADMIN')` in
  browser console
- No server-side validation of role before performing operations

**Impact**: Users can bypass UI restrictions and attempt admin API calls
(mitigated partially by missing server-side RBAC check above).

## Remediation

1. **Never** use localStorage for security-sensitive data like roles
2. Fetch user role from server on every session/page load:

```typescript
const sessionQuery = useQuery({
	queryKey: ["auth", "session"],
	queryFn: () => fetch("/auth/session").then((r) => r.json()),
});

const systemRole = sessionQuery.data?.systemRole;
```

3. Store session token only (already done via cookies)
4. Server must validate role on every privileged operation

## Code References

### Current Implementation

```typescript
// client/hooks/tnhooks/useAuth.ts
export function getSystemRole(): SystemRole | null {
	if (typeof window === "undefined") return null;
	const role = localStorage.getItem(SYSTEM_ROLE_KEY);
	if (role === "ADMIN" || role === "USER") return role;
	return null;
}
```

### Secure Implementation

Remove `getSystemRole()` and fetch from server:

```typescript
// client/hooks/tnhooks/useAuth.ts
export function useSystemRole() {
	const { data: session } = useQuery({
		queryKey: ["auth", "session"],
		queryFn: () => fetch("/auth/session").then((r) => r.json()),
	});
	return session?.systemRole ?? null;
}
```
