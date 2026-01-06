---
id: cleanup-tsconfig
title: Clean Up tsconfig.json - Remove Next.js Configuration
severity: LOW
priority: P3
category: Best Practices
status: pending
locations:
  - tsconfig.json:18-20,28-32
related_issues:
  - 6.1
cvss_score: 2.0
---

## Description

Project uses Bun, React Router, and custom build setup - not Next.js. These
configs are obsolete:

```json
{
	"plugins": [
		{
			"name": "next"  // Next.js plugin
		}
	],
	"include": [
		"next-env.d.ts",  // Next.js files
		".next/types/**/*.ts",
		".next/dev/types/**/*.ts",
		...
	]
}
```

**Impact**:

- Confusing for developers
- May cause TypeScript issues
- Unused configuration increases maintenance burden

## Remediation

Remove Next.js-specific configuration:

```json
{
	"compilerOptions": {
		"plugins": [] // Remove next plugin or remove plugins entirely if empty
	},
	"include": [
		"**/*.ts",
		"**/*.tsx",
		"**/*.mts"
	]
}
```

Remove any `next-env.d.ts` file if it exists.

## Code References

See `tsconfig.json` lines 18-20 and 28-32 for the Next.js-specific
configuration.
