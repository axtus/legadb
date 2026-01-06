---
id: standardize-env-vars
title: Standardize Environment Variable Access Pattern
severity: MEDIUM
priority: P3
category: Logic
status: pending
locations:
  - bun-server.ts:15,26
related_issues:
  - 1.6
cvss_score: 4.7
---

## Description

Inconsistent environment variable access:

```typescript
const production = Bun.env.NODE_ENV === "production";  // Bun.env
...
systemDatabaseUrl: process.env.DATABASE_URL,  // process.env
```

Issues:

- Some code uses `Bun.env`, others use `process.env`
- Inconsistency makes it hard to verify all vars are properly loaded
- Bun.env is more optimized for Bun runtime

**Impact**: Potential runtime errors if DATABASE_URL not loaded into
process.env.

## Remediation

Standardize to `Bun.env` throughout:

```typescript
const production = Bun.env.NODE_ENV === "production";
systemDatabaseUrl: Bun.env.DATABASE_URL,
```

Search codebase for all `process.env` usage and replace with `Bun.env`:

- `bun-server.ts`
- Any other files using `process.env`

## Code References

See `bun-server.ts` lines 15 and 26 for the inconsistent usage.
