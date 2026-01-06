---
id: remove-hardcoded-credentials
title: Remove Hardcoded Default Admin Credentials
severity: CRITICAL
priority: P0
category: Security
status: pending
locations:
  - scripts/init-admin.ts:10
related_issues:
  - 1.2
cvss_score: 9.0
---

## Description

The admin initialization script contains hardcoded default credentials:

```typescript
const username = "alloys";
const password = "password123";
```

This password is:

- Hardcoded in the source repository (stored in git history)
- Weak (only 11 characters, lowercase + numbers)
- Documented in plain text
- Logs username on console (line 12, 32, 46)

**Impact**: Anyone with repository access or git history can log in as admin
using `alloys/password123`.

## Remediation

1. Generate password from environment variable or random generation:

```typescript
const password = Bun.env.ADMIN_PASSWORD ||
	crypto.randomBytes(16).toString("hex");
```

2. Do not log credentials to console
3. Add to `.gitignore` any credential files
4. Document that admin user must be initialized securely via environment
   variable

## Code References

### Current Implementation

```typescript
// scripts/init-admin.ts
const username = "alloys";
const password = "password123";
console.log(`\n🔐 Initializing admin user: ${username}`); // Logs username
```

### Secure Implementation

```typescript
// scripts/init-admin.ts
const username = Bun.env.ADMIN_USERNAME || "admin";
const password = Bun.env.ADMIN_PASSWORD ||
	crypto.randomBytes(16).toString("hex");
// Do not log credentials
console.log(`\n🔐 Initializing admin user: ${username}`);
// Only log password once if generated, prompt user to save it
```
