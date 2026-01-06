---
id: validate-pagination
title: Add Input Validation on Pagination Parameters
severity: MEDIUM
priority: P2
category: Security
status: pending
locations:
  - bun-server.ts:59-66
  - server/routes/api-keys.ts:72-82
related_issues:
  - 1.5
cvss_score: 5.3
---

## Description

Some routes accept `count` and `skip` parameters without proper validation:

```typescript
// bun-server.ts
const count = Number(seachParams.get("count"));
const skip = Number(seachParams.get("skip"));
const transfers = await pg`
	SELECT * FROM transfers
	ORDER BY id
	LIMIT ${count || 100}
	OFFSET ${skip || 0}
`;
```

Issues:

- `Number()` returns `NaN` if input is invalid
- No check for `isNaN()` before using in query
- No upper limit check (attacker could request 1M rows)
- No lower bound validation

**Impact**: DoS via large data transfers, potential OOM crashes.

## Remediation

Validate and clamp values:

```typescript
const countParam = seachParams.get("count");
const skipParam = seachParams.get("skip");

const count = Math.min(Math.max(Number(countParam) || 100, 1), 1000);
const skip = Math.max(Number(skipParam) || 0, 0);

if (isNaN(count) || isNaN(skip)) {
	return CBORErrorResponse("Invalid pagination parameters", { status: 400 });
}
```

Apply to all pagination endpoints:

- `bun-server.ts` transfer route
- `server/routes/api-keys.ts`
- Any other routes with pagination

## Code References

See `bun-server.ts` lines 59-66 and `server/routes/api-keys.ts` lines 72-82 for
current implementations.
