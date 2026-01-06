---
id: improve-error-handling
title: Improve Error Handling Consistency
severity: MEDIUM
priority: P3
category: Best Practices
status: pending
locations:
  - server/routes/*.ts
related_issues:
  - 2.4
cvss_score: 4.5
---

## Description

Different routes handle Prisma operations inconsistently:

```typescript
// server/routes/auth.ts - Uses Prisma, no error wrapper
const session = await prisma.authSession.findUnique({...});

// server/routes/users.ts - Uses business logic functions that return Error
const result = await createUser(...);
if (result instanceof Error) {
	return CBORErrorResponse(result.message, { status: ... });
}
```

The codebase mixes two error handling patterns:

1. Prisma operations throw exceptions
2. Business logic returns `Error` objects

**Impact**:

- Inconsistent error handling makes code harder to reason about
- Easy to accidentally not handle errors
- Harder to refactor

## Remediation

Standardize on one pattern. Recommend pattern #2 (returning errors) as it's more
explicit and handles errors in the request handler (closer to the API boundary).

### Document the Pattern

Create a style guide document or add to AGENTS.md:

````markdown
## Error Handling Pattern

All business logic functions should return `Result | Error` where `Result` is
the success type. Route handlers should check for Error instances and return
appropriate HTTP responses.

Example:

```typescript
// domain/fns/biz-logic/users.ts
export async function createUser(...): Promise<User | Error> {
  // ... validation
  if (invalid) return new Error400("Invalid input");
  // ... operation
  return user;
}

// server/routes/users.ts
const result = await createUser(...);
if (result instanceof Error) {
  return CBORErrorResponse(result.message, { status: getStatusCode(result) });
}
return CBORResponse(result);
```
````

### Refactor Existing Code

1. Wrap Prisma operations in try-catch and return Error objects
2. Update all route handlers to check for Error instances
3. Create helper function `getStatusCode(error: Error): number` to map error
   types to HTTP status codes

## Code References

See `server/routes/auth.ts` and `server/routes/users.ts` for examples of
inconsistent patterns.
