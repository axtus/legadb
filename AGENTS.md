# Agent Development Guide

## Project Overview

**Legadb** is a general ledger system built with:

- **Frontend**: React 19 with TypeScript
- **Backend**: Bun runtime with DBOS SDK
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS 4
- **Build System**: Bun with custom plugins
- **Toasts**: Sonner

### Architecture Patterns

This project follows domain-driven design principles with clear separation:

- `client/` - React UI components and entry points
- `domain/` - Business logic, types, and utilities
- `server/` - API routes and server-side logic
- `prisma/` - Database schema and client
- `workflows/` - Orchestrated business processes with DBOS

## React Instructions

1. **Don't use arrow functions for components** - Breaks React DevTools and
   compiler optimizations
2. **Don't destructure props in parameters** - Makes prop access tracking harder
3. **Don't use deprecated APIs** - String refs, Legacy Context, PropTypes,
   ReactDOM.render, forwardRef (in new code)
4. **Don't mutate props or state** - Always treat as immutable
5. **Don't access `element.ref`** - Use `element.props.ref` instead
6. **Don't forget TypeScript strict mode** - Project uses strict type checking
7. **Don't skip error boundaries** - Wrap async operations in error boundaries
8. **Don't create promises in render** - Use Suspense-compatible libraries or
   cache promises

---

## Code Review Checklist

- [ ] Component uses function declaration (not arrow function)
- [ ] Props accepted as single parameter (not destructured in signature)
- [ ] No deprecated React APIs used
- [ ] TypeScript types are explicit and correct
- [ ] Error handling is present where needed
- [ ] Side effects are in useEffect, not render
- [ ] Ref handling uses React 19 pattern (ref as prop)
- [ ] Actions use useActionState or useFormStatus when appropriate
- [ ] Loading states use Suspense boundaries
- [ ] Optimistic updates use useOptimistic
- [ ] Component is properly exported with types
- [ ] TanStack Query used for data fetching
- [ ] TanStack Router used for client-side routing
- [ ] Auth hook used for authentication state
- [ ] The `utilities/` directory is deprecated; No new code should be put there.
- [ ] Database reads use `getPG()` from `@/domain/db/postgres`
- [ ] Database mutations use Prisma client
- [ ] No Prisma read operations (findUnique, findMany, etc.) in codebase

---

## Resources

- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [TanStack Router Documentation](https://tanstack.com/router/latest)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Bun Runtime Documentation](https://bun.sh/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS 4 Documentation](https://tailwindcss.com/docs)

---
