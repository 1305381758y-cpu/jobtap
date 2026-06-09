# Module C NestJS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build JobTap Module C as a NestJS backend with PostgreSQL schema, admin APIs, mobile APIs, employer intake, and analytics aggregation.

**Architecture:** A modular NestJS app exposes JSON APIs and uses TypeORM entities as the PostgreSQL schema. Tests run against SQLite in memory through the same module wiring.

**Tech Stack:** NestJS, TypeScript, TypeORM, PostgreSQL, JWT, bcryptjs, Jest, Supertest.

---

### Task 1: Scaffold And Failing E2E Tests

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest-e2e.json`
- Create: `test/module-c.e2e-spec.ts`

- [x] Add project configuration and end-to-end tests for employer intake, admin approval, mobile visibility, and analytics statistics.
- [x] Run `npm test` and confirm it fails because `src/app.module.ts` does not exist yet.

### Task 2: Core NestJS Modules

**Files:**
- Create: `src/main.ts`
- Create: `src/app.module.ts`
- Create: `src/database/entities/*.ts`
- Create: `src/jobs/*`
- Create: `src/auth/*`
- Create: `src/analytics/*`

- [x] Implement entities, DTOs, services, controllers, auth guard, and app bootstrap.
- [x] Run `npm test` and confirm the e2e suite passes.

### Task 3: Verification

**Files:**
- Modify only if verification exposes defects.

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Report final behavior and any remaining production setup requirements.
