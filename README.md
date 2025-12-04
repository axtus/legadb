<p align="center">
  <h1 align="center">LegaDB</h1>
  <p align="center">
    <strong>A modern, type-safe double-entry ledger system built with Bun</strong>
  </p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#api-reference">API</a> •
    <a href="#deployment">Deployment</a>
  </p>
</p>

---

## Overview

**LegaDB** is a high-performance, double-entry accounting ledger designed for
modern financial applications. Built with [Bun](https://bun.sh) for blazing-fast
performance, LegaDB provides a robust foundation for tracking financial
transactions across multiple accounts and currencies.

Whether you're building a fintech platform, an e-commerce system, or any
application requiring precise financial record-keeping, LegaDB offers the
reliability and flexibility you need.

## Features

### 🏦 **Core Ledger Capabilities**

- **Double-Entry Accounting** — Every transfer debits one account and credits
  another, ensuring books always balance
- **Multi-Currency Support** — Native support for multiple currencies with
  proper isolation
- **Multi-Ledger Architecture** — Organize accounts across separate ledgers for
  different business units or entities
- **Balance Snapshots** — Efficient balance tracking with point-in-time
  snapshots

### 🔄 **Transfer Management**

- **Stateful Transfers** — Support for PENDING, POSTED, and VOIDED states
- **Transfer Requests** — Asynchronous transfer processing with request tracking
- **External ID Mapping** — Link transfers to external system references
- **Balance Constraints** — Configurable minimum and maximum balance limits per
  account

### 🔐 **Security & Authentication**

- **Session-Based Auth** — Secure user sessions with proper token management
- **API Key Authentication** — Generate and manage API keys for programmatic
  access
- **Encrypted Key Storage** — API keys encrypted with rotating child keys
- **Role-Based Access** — ADMIN and USER roles for access control
- **Password History** — Track password changes for compliance

### 💻 **Developer Experience**

- **Type-Safe API** — Full TypeScript with [Arktype](https://arktype.io)
  validation
- **React Client** — Modern React 19 UI with TanStack Router & Query
- **CBOR Support** — Efficient binary serialization for high-throughput
  scenarios
- **Hot Reload** — Fast development with Bun's native hot reloading

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.0+
- PostgreSQL 14+

### Installation

```bash
# Clone the repository
git clone https://github.com/axtus/legadb.git
cd legadb

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL
```

### Database Setup

```bash
# Push schema to database
bun run db:push

# (Optional) Reset and push fresh schema
bun run db:reset
```

### Running the Server

```bash
# Development mode with hot reload
bun run dev

# Server starts on http://localhost:7373
```

## Tech Stack

| Layer             | Technology                                |
| ----------------- | ----------------------------------------- |
| **Runtime**       | [Bun](https://bun.sh)                     |
| **Database**      | PostgreSQL + [Prisma](https://prisma.io)  |
| **Validation**    | [Arktype](https://arktype.io)             |
| **Frontend**      | React 19, TanStack Router, TanStack Query |
| **Styling**       | Tailwind CSS 4                            |
| **Orchestration** | [DBOS](https://dbos.dev)                  |

## Scripts

```bash
bun run dev      # Start development server
bun run lint     # Run oxlint
bun run fmt      # Format code with deno fmt
bun run db:push  # Push Prisma schema to database
bun run db:reset # Reset database and push schema
```

## License

Apache 2.0

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/axtus">Axtus</a>
</p>
