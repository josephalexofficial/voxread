# Software Development Standards

> A universal engineering rulebook for AI-assisted software development across mobile applications, web platforms, backend systems, and full-stack products.

## Purpose

This document defines the operating standards for building, modifying, documenting, reviewing, and maintaining software. It is designed to be reused across multiple project categories while keeping a consistent baseline for quality, safety, architecture, documentation, security, performance, and version control.

The rules are written for AI agents and human engineers working together. The goal is not faster code at any cost. The goal is precise, maintainable, secure, and production-aware engineering.

## Applicability

These standards apply to:

- Mobile app development
- Website and web application development
- Backend API development
- Full-stack product development
- Internal tools and system software
- AI-assisted code generation and refactoring

## Rule Status Legend

- **Core:** Mandatory across all projects unless explicitly overridden by a project-specific rule.
- **Conditional:** Mandatory only when the project contains the matching capability, such as backend APIs, authentication, sensitive data, or external integrations.

## Table of Contents

1. [AI Agent Interaction Protocol](#module-01-ai-agent-interaction-protocol)
2. [Documentation and README Standards](#module-02-documentation-and-readme-standards)
3. [Code Quality, Readability, and Commenting](#module-03-code-quality-readability-and-commenting)
4. [Repository Architecture and Project Scaffolding](#module-04-repository-architecture-and-project-scaffolding)
5. [Type Safety and Data Modeling](#module-05-type-safety-and-data-modeling)
6. [Error Handling, Validation, and Logging](#module-06-error-handling-validation-and-logging)
7. [API Design and Client-Server Contracts](#module-07-api-design-and-client-server-contracts)
8. [Runtime Robustness and Zero-Artifact Verification](#module-08-runtime-robustness-and-zero-artifact-verification)
9. [Security, Secrets Management, and Defensive Coding](#module-09-security-secrets-management-and-defensive-coding)
10. [Performance Optimization and Resource Lifecycle](#module-10-performance-optimization-and-resource-lifecycle)
11. [Git Workflow and Commit Hygiene](#module-11-git-workflow-and-commit-hygiene)

---

# Module 01: AI Agent Interaction Protocol

**Status:** Core - Mandatory across all projects and IDEs

## 1. Context and Operational Philosophy

AI agents must operate as disciplined senior software engineers collaborating within an established codebase, not as autonomous code generators. The primary directives are precision, non-destructive editing, contextual awareness, and architectural continuity.

Speed must never supersede correctness, maintainability, or repository stability.

## 2. Phase 1: Pre-Execution Analysis and Intent Formulation

Before generating, modifying, or deleting any file or code block, the AI must perform a brief analysis phase. For non-trivial tasks, the AI is forbidden from jumping directly into code generation.

### 2.1 Three-Step Planning Cadence

For every request involving code modification, the AI must explicitly state:

1. **Diagnosis and context:** Identify the root requirement, the exact files involved, and how the change integrates with existing features.
2. **Implementation strategy:** Outline the logical steps, edge cases considered, and possible side effects.
3. **Target scope:** List which files will be modified and which files will remain untouched.

### 2.2 Inquiry Over Assumption

- If a requirement introduces architectural ambiguity, performance tradeoffs, or breaking changes, present clear options and ask for confirmation before proceeding.
- If critical context is absent, state the conservative assumption before acting.

## 3. Phase 2: Atomic Edits and Non-Destructive Rewrites

Destructive file replacements and unnecessary full-file rewrites are prohibited.

### 3.1 Line-Level Precision

- **Preserve context:** Edit only the specific functions, methods, or blocks that require change.
- **No blanket overwrites:** Never replace a large file to change a small logic block.
- **No placeholder anti-patterns:** Never emit truncated code blocks containing placeholders such as `// ... rest of the code remains the same`, `/* existing imports */`, or `// implement logic here`.

### 3.2 Respect for Existing Code

- Do not remove existing comments, docstrings, type annotations, or utility functions unless directly invalidated by the task.
- Do not alter variable names, casing conventions, or stylistic patterns outside the immediate scope.

## 4. Phase 3: Architectural Consistency and Dependency Restraint

The AI must adapt to the existing codebase instead of imposing external defaults.

### 4.1 Pattern Conformance Check

Before writing any new component, service, or module, scan and align with existing project idioms:

- **Directory scaffolding:** Match where similar logic already lives.
- **Naming semantics:** Follow established file and symbol naming conventions.
- **Paradigm consistency:** If the project uses functional patterns, do not introduce class-based implementations. If it uses OOP with dependency injection, follow that structure.

### 4.2 Zero Unnecessary Dependencies Policy

- Use native runtime APIs before adding external libraries.
- Do not install redundant packages when the workspace already contains a native equivalent, internal utility, or existing dependency.
- If a new dependency is strictly necessary, state the package name, bundle-size impact, and why native APIs are insufficient.

## 5. Violation Checklist

This protocol is violated if the AI:

- Emits code without first stating diagnosis and plan.
- Rewrites an entire file when a targeted edit was requested.
- Uses lazy placeholders such as `// TODO: Add remaining logic`.
- Introduces external dependencies without scanning and explicit justification.
- Changes working, unrelated code.

---

# Module 02: Documentation and README Standards

**Status:** Core - Mandatory across all projects and IDEs

## 1. Documentation Philosophy

Documentation is an active engineering deliverable. A repository is incomplete if a developer unfamiliar with the project cannot clone, configure, build, and run it within ten minutes using only the repository documentation.

Documentation must remain synchronized with code changes.

## 2. Production-Grade README Standard

Every repository must contain a clean, structured `README.md` at the project root. Avoid vague marketing copy. Prioritize technical clarity, system mechanics, setup instructions, and operational commands.

### 2.1 Universal README Structure

Use this section hierarchy for project README files:

````markdown
# [Project Name]

> [One-sentence summary of what the application does, the problem it solves, and its core value.]

## 1. System Overview and Key Capabilities

- **Core Feature A:** Concise technical description.
- **Core Feature B:** Concise technical description.
- **Core Feature C:** Concise technical description.

## 2. Architecture and Data Flow

Describe how components, data models, services, and external systems interact.

```text
[Client / UI] -> [API Gateway / Middleware] -> [Service Layer] -> [Database / Cache]
```

## 3. Technology Stack

- **Runtime and language:** Node.js 20.x, TypeScript 5.x, PHP 8.3, Python 3.12, etc.
- **Framework:** Next.js, Express, Laravel, React Native, etc.
- **Persistence and storage:** PostgreSQL, MySQL, Supabase, Redis, etc.
- **Styling and UI:** Tailwind CSS, ShadCN, native UI framework, etc.
- **Infrastructure and deployment:** Docker, Vercel, AWS, etc.

## 4. Prerequisites

List exact runtime versions and system tooling required.

- Language runtime version
- Package manager version
- Container engine version, if applicable

## 5. Local Development Setup

```bash
git clone <repository-url>
cd <project-directory>
```

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run db:migrate
npm run db:seed
```

```bash
npm run dev
```

## 6. Environment Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | Port used by the HTTP server. |
| `DATABASE_URL` | Yes | None | Primary database connection string. |
| `API_SECRET_KEY` | Yes | None | Symmetric signing key for token verification. |

## 7. Operational and Build Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Starts local development with hot reloading. |
| `npm run build` | Compiles production artifacts. |
| `npm run start` | Starts the production build. |
| `npm run lint` | Runs static analysis and type checks. |

## 8. License

Distributed under the [MIT / Proprietary] License.
````

## 3. Environment Variable Synchronization Policy

Desynchronized environment variables are critical build risks.

### 3.1 Mandatory `.env.example` Mirroring

- When a new configuration key or secret is referenced in source code, immediately add it to `.env.example`.
- Never place real secrets, production credentials, sensitive tokens, or private keys inside `.env.example`.
- Use placeholders that indicate the expected format or type.

```bash
# Correct
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
JWT_SECRET="replace_with_32_character_hex_string"
STRIPE_PUBLIC_KEY="pk_test_placeholder"

# Incorrect
DATABASE_URL="postgresql://admin:supersecret123@prod-db.com/prod"
JWT_SECRET="real_production_secret"
```

## 4. API Interface and Data Contract Specifications

Systems exposing or consuming endpoints must document exact request and response shapes.

### 4.1 In-Code Endpoint Specifications

When creating or modifying route handlers or controllers, document the contract directly above the handler.

```typescript
/**
 * @route   POST /api/v1/orders
 * @desc    Creates a new customer order and reserves stock.
 * @access  Protected; requires bearer JWT.
 *
 * @param   {string} req.body.customerId - UUID of the purchasing customer.
 * @param   {Array<{itemId: string, quantity: number}>} req.body.items - Target order items.
 *
 * @returns {201} Order successfully created.
 * @returns {400} Validation failure.
 * @returns {404} One or more item IDs do not exist.
 * @returns {500} Internal processing or transaction rollback error.
 */
```

## 5. Changelog and Feature Versioning Protocol

Repositories that maintain release history must track updates in `CHANGELOG.md` using [Keep a Changelog](https://keepachangelog.com/) conventions.

### 5.1 Entry Structure

Every substantive update must be recorded under the current unreleased version using these categories:

- **Added:** New user-facing capabilities or endpoints.
- **Changed:** Alterations to existing logic or contracts.
- **Deprecated:** Features scheduled for removal.
- **Removed:** Deprecated features removed from the repository.
- **Fixed:** Bug corrections and error mitigations.
- **Security:** Vulnerability and credential-handling updates.

```markdown
## [Unreleased]

### Added

- Implemented rate-limiting middleware on public `/api/v1/*` routes.
- Added early validation guards for zero and negative distance parameters.

### Fixed

- Resolved unhandled promise rejection when the payment gateway times out.
```

## 6. Violation Checklist

This protocol is violated if the AI:

- References a new environment variable without updating `.env.example`.
- Leaves real secrets or live tokens in `.env.example` or documentation.
- Creates endpoints without documenting payload contracts and response codes.
- Alters setup or build commands without updating the README.

---

# Module 03: Code Quality, Readability, and Commenting

**Status:** Core - Mandatory across all projects and IDEs

## 1. Quality Philosophy

Readable code minimizes cognitive load. A competent engineer should understand what a block of code does from its structure, variables, and type signatures.

Comments exist to explain domain nuance, non-obvious business logic, technical workarounds, and operational intent. Comments must never narrate standard syntax.

## 2. Self-Documenting Naming Conventions

Code must read like structured English. Do not use comments to compensate for cryptic names.

### 2.1 Variables, Constants, and Booleans

- **Descriptive over terse:** Single-letter variables are forbidden outside trivial index loops.
- **Booleans as predicates:** Boolean names must start with `is`, `has`, `should`, `can`, or `will`.
- **Numeric units:** Duration, physical metric, and financial variables must include units.
- **Global constants:** True application constants must use `UPPER_SNAKE_CASE`.

```typescript
const timeoutInMs = 5000;
const maxDistanceKm = 25;
const priceInCents = 1499;
const DEFAULT_PAGE_LIMIT = 20;
```

### 2.2 Functions and Methods

- Function names must clearly state the action and target entity.
- A function must perform one conceptual task.
- If a function name contains `And`, split it into smaller functions.

```typescript
// Correct
fetchUserPreferences();
calculateTaxLiability();
invalidateSessionToken();

// Incorrect
preferences();
tax();
tokenHandler();
```

## 3. Explain Why, Never What

The AI must not generate redundant comments that translate obvious syntax into plain text.

### 3.1 Forbidden Comment Patterns

```typescript
// BAD: Increment counter by 1
counter++;

// BAD: Check if user exists
if (!user) {
  return null;
}

// BAD: Filter active accounts
const activeAccounts = accounts.filter((account) => account.isActive);
```

### 3.2 Required Comment Patterns

Comments are required when code handles non-obvious domain rules, legacy workarounds, compatibility constraints, or operational tradeoffs.

```typescript
// Safari versions below 16.4 do not support regex lookbehinds, so this
// two-pass token split avoids runtime SyntaxError on iOS WebKit.
const sanitizedInput = rawInput.replace(/[^a-zA-Z0-9]/g, '');

// Financial transactions use banker's rounding to prevent compounding
// ledger discrepancies across high-volume settlement batches.
const totalCents = bankersRound(subtotal + tax);
```

## 4. Standardized Docstring Specifications

All exported functions, service methods, and core business calculations must include structured docstrings. Internal trivial one-line helpers do not require docstrings when their signatures are self-evident.

### 4.1 Required Docstring Elements

- **Summary:** One concise line describing the core purpose.
- **Parameters:** Type, identifier, and semantic constraints.
- **Return value:** Exact return shape and meaning.
- **Failure paths:** Every custom error class, exception, or failure mode the caller must handle.

### 4.2 TypeScript Docstring Example

```typescript
/**
 * Calculates the tier-adjusted shipping quote for international dispatches.
 *
 * @param originCountryCode - Two-letter ISO 3166-1 alpha-2 origin code.
 * @param destinationCountryCode - Two-letter ISO 3166-1 alpha-2 destination code.
 * @param packageWeightInGrams - Total weight; must be an integer greater than zero.
 *
 * @returns The final shipping quote including currency and breakdown.
 *
 * @throws {ValidationError} If packageWeightInGrams is less than or equal to zero.
 * @throws {UnsupportedRegionError} If either country is outside the delivery matrix.
 */
export function calculateShippingQuote(
  originCountryCode: string,
  destinationCountryCode: string,
  packageWeightInGrams: number,
): ShippingQuote {
  // Implementation...
}
```

### 4.3 Python Docstring Example

```python
def calculate_shipping_quote(
    origin_country_code: str,
    destination_country_code: str,
    package_weight_in_grams: int,
) -> ShippingQuote:
    """
    Calculates the tier-adjusted shipping quote for international dispatches.

    Args:
        origin_country_code: Two-letter ISO 3166-1 alpha-2 origin code.
        destination_country_code: Two-letter ISO 3166-1 alpha-2 destination code.
        package_weight_in_grams: Total weight; must be greater than zero.

    Returns:
        ShippingQuote instance containing currency and rate breakdown.

    Raises:
        ValidationError: If package_weight_in_grams is less than or equal to zero.
        UnsupportedRegionError: If either country is outside the delivery matrix.
    """
    # Implementation...
```

## 5. Violation Checklist

This protocol is violated if the AI:

- Emits obvious comments that rephrase syntax.
- Uses cryptic or ambiguous variable names outside basic loop indices.
- Exports service methods, domain calculations, or API utilities without documenting parameter constraints, return shapes, and thrown exceptions.
- Uses magic numbers directly in business logic instead of named constants.

---

# Module 04: Repository Architecture and Project Scaffolding

**Status:** Core - Mandatory across all projects and IDEs

## 1. Architectural Philosophy

A codebase must be structured for predictable discoverability, high cohesion, and loose coupling. Adding or removing a feature should touch isolated modules instead of scattering changes across unrelated global directories.

As systems scale, code should move toward domain-driven, feature-based boundaries.

## 2. Feature-Driven Organization

Unless constrained by rigid framework defaults, organize projects by business domains or features instead of technical role layers.

### 2.1 Forbidden Layer-Based Dumping Ground

```text
src/
├── components/     # 60+ unrelated UI components
├── services/       # 30+ mixed business logic services
├── controllers/    # API endpoints mixed across domains
└── types/          # Giant monolithic types file
```

### 2.2 Prescribed Feature-Based Architecture

```text
src/
├── common/
│   ├── components/
│   ├── hooks/
│   └── utils/
│
└── features/
    ├── auth/
    │   ├── components/
    │   ├── services/
    │   ├── types/
    │   └── hooks/
    │
    └── billing/
        ├── components/
        ├── services/
        ├── types/
        └── utils/
```

## 3. Strict Separation of Concerns

Code must enforce boundaries between presentation, domain orchestration, and data persistence.

### 3.1 Presentation and Views

Presentation code renders UI, captures user events, and handles visual states. It must not execute raw SQL, direct database calls, or complex domain calculations.

### 3.2 Business Logic and Orchestration

Services perform domain validation, core algorithms, data transformation, and authorization checks. They must remain decoupled from HTTP frameworks and UI elements.

A service method should be callable from an API route, CLI command, or background worker without modification.

### 3.3 Persistence and Data Access

Repository or data-access code interfaces with databases, caches, or third-party SDKs. It must encapsulate raw ORM operations, queries, and transport logic.

## 4. File Naming Conventions

File names must clearly state their role and follow consistent casing.

### 4.1 Casing Directives

- TypeScript and JavaScript utilities: `kebab-case.ts`
- React and UI components: `PascalCase.tsx`
- Python modules: `snake_case.py`
- PHP and Laravel classes: `PascalCase.php`

### 4.2 Role Suffixes

- `*.service.ts` for business orchestration
- `*.controller.ts` for route handling
- `*.repository.ts` for data access
- `*.types.ts` for interfaces, types, and schemas
- `*.dto.ts` for data transfer objects and payload contracts

## 5. Import and Export Policies

Clean dependency graphs prevent bundling issues, memory leaks, and runtime resolution failures.

### 5.1 No Circular Dependencies

Modules must never depend on each other cyclically. Extract shared interfaces or helper logic into an independent `common/` or `shared/` module.

### 5.2 Restricted Barrel Exports

Do not create nested `index.ts` files that re-export entire directory trees. Use barrel files only at the root of a self-contained feature boundary to expose its public API.

```typescript
// Allowed: features/auth/index.ts
export { LoginForm } from './components/LoginForm';
export { useSession } from './hooks/useSession';
export type { UserSession } from './types/session.types';

// Forbidden: wildcard exports of private internals
export * from './internal-helpers';
export * from './components/sub-elements';
```

### 5.3 Deterministic Import Ordering

Group imports in this order, separated by one blank line:

```typescript
// 1. External runtime packages and framework modules.
import React, { useState } from 'react';
import { z } from 'zod';

// 2. Internal shared utilities and components.
import { Button } from '@/common/components/Button';
import { formatCurrency } from '@/common/utils/currency';

// 3. Feature-local modules, services, and types.
import { processPayment } from './services/payment.service';
import type { PaymentRequest } from './types/payment.types';
```

## 6. Violation Checklist

This protocol is violated if the AI:

- Writes raw database queries or direct network fetches inside UI components.
- Dumps unrelated domains into global folders without feature boundaries.
- Creates circular imports.
- Uses wildcard barrel exports that expose private internals.
- Mixes file naming styles within the same directory.

---

# Module 05: Type Safety and Data Modeling

**Status:** Core - Mandatory across all projects and IDEs

## 1. Type Safety Philosophy

Types are architectural contracts. A strong type system eliminates runtime errors, acts as living documentation, and guarantees that data crossing system boundaries conforms to domain rules.

Compilers and linters must run in strict mode with zero tolerance for untyped or ambiguous data structures.

## 2. Elimination of Loose Typing

The AI must not introduce loose or escape-hatch types.

### 2.1 Ban on `any` and Untyped Dynamic Data

- The `any` keyword is forbidden.
- External input with unknown structure must be typed as `unknown`.
- Unknown data must pass through runtime validation before property access.

```typescript
// Bad
function handleWebhookPayload(payload: any) {
  console.log(payload.event.id);
}

// Good
function handleWebhookPayload(payload: unknown) {
  if (isWebhookEvent(payload)) {
    console.log(payload.event.id);
  }
}
```

### 2.2 Strict Compiler Directives

TypeScript projects must enable:

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`

Null and undefined must be handled explicitly. Do not use non-null assertions unless an immediate invariant check guarantees the value exists.

## 3. Centralized Schemas, DTOs, and Contracts

Data entering or leaving the application must be declared as strongly typed DTOs backed by centralized validators such as Zod, Valibot, Pydantic, or native language types.

### 3.1 Single Source of Truth

Define domain models and contracts in dedicated files such as `*.dto.ts`, `*.schema.ts`, or `*.types.ts`.

```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  age: z.number().int().positive('Age must be a positive integer').optional(),
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
```

### 3.2 Boundary Validation

Never trust request bodies, URL parameters, local storage, environment variables, or external API payloads. Validate data at the perimeter before passing it to domain services.

```typescript
export async function handleCreateUser(rawRequest: unknown): Promise<UserResponseDTO> {
  const validatedPayload = CreateUserSchema.parse(rawRequest);
  return await userService.createUser(validatedPayload);
}
```

## 4. State Immutability and Pure Utility Functions

State mutation introduces hidden side effects and debugging overhead. Prefer immutable transformations and pure functions.

### 4.1 Immutability by Default

Do not mutate incoming parameters, shared configurations, or active application state.

```typescript
// Bad
function applyDiscount(cart: Cart, discountRate: number): Cart {
  cart.total = cart.total - cart.total * discountRate;
  return cart;
}

// Good
function applyDiscount(cart: Readonly<Cart>, discountRate: number): Cart {
  return {
    ...cart,
    total: Math.max(0, cart.total - cart.total * discountRate),
  };
}
```

### 4.2 Pure Utility Functions

Utility functions must return the same output for the same input without mutating external state. Non-deterministic values such as current timestamps, random numbers, or generated IDs should be passed as explicit arguments.

## 5. Violation Checklist

This protocol is violated if the AI:

- Uses `any`, unconstrained generics, or untyped parameters.
- Bypasses null checks using `!` without a runtime guard.
- Duplicates schemas instead of inferring types from a single contract.
- Mutates function arguments or incoming state.
- Processes external input without validation.

---

# Module 06: Error Handling, Validation, and Logging

**Status:** Core - Mandatory across all projects and IDEs

## 1. Error Handling Philosophy

Errors are normal runtime conditions. Robust applications must not crash abruptly, leak stack traces to users, swallow errors silently, or leave promise rejections unhandled.

Errors must be typed, categorized at domain boundaries, and logged with actionable operational context.

## 2. Centralized Custom Domain Error Hierarchy

The AI must not throw raw strings, generic unclassified errors, or arbitrary HTTP status codes from business logic.

### 2.1 Base Domain Error Architecture

```typescript
// common/errors/app-error.ts
export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, unknown>;

  constructor(message: string, metadata?: Record<string, unknown>, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.metadata = metadata;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### 2.2 Standard Domain Error Types

- `ValidationError`: `400`, `VALIDATION_FAILED`
- `AuthenticationError`: `401`, `UNAUTHENTICATED`
- `ForbiddenError`: `403`, `INSUFFICIENT_PERMISSIONS`
- `NotFoundError`: `404`, `RESOURCE_NOT_FOUND`
- `ConflictError`: `409`, `RESOURCE_CONFLICT`
- `ExternalServiceError`: `502`, `THIRD_PARTY_FAILURE`

### 2.3 No Swallowed Exceptions

Empty catch blocks and useless logs are forbidden.

```typescript
// Bad
try {
  await syncData();
} catch (error) {
  console.log('Error happened');
}

// Good
try {
  await syncData();
} catch (error) {
  logger.error('Data synchronization cycle failed', { error });
  throw new ExternalServiceError('Failed to synchronize with remote registry', {
    cause: error instanceof Error ? error.message : 'Unknown error',
  });
}
```

## 3. Boundary Validation

Validate data immediately at these perimeters:

- HTTP request bodies, query strings, and route parameters
- Environment variables loaded at startup
- Third-party webhook payloads
- Filesystem reads and message queue payloads

### 3.1 Structured Validation Responses

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation failed across 2 fields",
    "details": [
      { "field": "email", "issue": "Must be a valid email format" },
      { "field": "amountInCents", "issue": "Must be an integer greater than 0" }
    ]
  }
}
```

## 4. Logging Levels and Data Masking

Logging must be deterministic, structured, and categorized into severity tiers.

### 4.1 Severity Tiers

- **DEBUG:** Local diagnostics only. Must be silenced in production.
- **INFO:** Normal lifecycle events.
- **WARN:** Recoverable issues, retries, unexpected input states, or deprecated API use.
- **ERROR:** Actionable failures requiring operational attention. Must include stack traces and relevant entity IDs.

### 4.2 PII and Credential Sanitization

Never log passwords, password hashes, API keys, bearer tokens, payment card details, national identifiers, or complete biometric markers.

```typescript
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'secret',
  'apikey',
  'creditcard',
  'cvv',
]);

export function sanitizeForLog<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key of Object.keys(sanitized)) {
    const value = (sanitized as Record<string, unknown>)[key];

    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      (sanitized as Record<string, unknown>)[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      (sanitized as Record<string, unknown>)[key] = sanitizeForLog(value);
    }
  }

  return sanitized;
}
```

## 5. Violation Checklist

This protocol is violated if the AI:

- Uses empty catch blocks or logs without handling operational errors.
- Throws raw strings or untyped generic errors.
- Logs authorization headers, passwords, tokens, or payment card details.
- Exposes internal database errors or stack traces in client-facing responses.
- Processes API requests without boundary validation.

---

# Module 07: API Design and Client-Server Contracts

**Status:** Conditional - Active when `HAS_BACKEND_API` is true

## 1. API Design Philosophy

APIs are formal contracts between systems. A good API must be predictable, stateless, resource-oriented, resilient to network instability, and clear about the difference between reads and mutations.

## 2. Resource-Oriented REST Conventions

URI endpoints represent resources, not operations.

### 2.1 Route Naming Standards

- Use plural nouns: `GET /api/v1/users`, `POST /api/v1/orders`.
- Use relationship nesting only when it clarifies ownership, with a maximum depth of two levels.
- Use lowercase kebab-case for multi-word URI segments.

```text
Correct:   /api/v1/payment-methods
Incorrect: /api/v1/paymentMethods
Incorrect: /api/v1/payment_methods
```

### 2.2 Standard HTTP Verb Semantics

- `GET`: Retrieve resources. Must be read-only and idempotent.
- `POST`: Create a resource or initiate processing. Non-idempotent by default.
- `PUT`: Fully replace an existing resource. Idempotent.
- `PATCH`: Partially update an existing resource.
- `DELETE`: Remove a resource. Idempotent.

### 2.3 Semantic HTTP Status Codes

- `200 OK`: Successful `GET`, `PATCH`, or `PUT` with payload.
- `201 Created`: Successful `POST` resulting in a new resource.
- `204 No Content`: Successful request with no response body.
- `400 Bad Request`: Malformed payload or schema validation failure.
- `401 Unauthorized`: Missing, expired, or invalid authentication.
- `403 Forbidden`: Authenticated caller lacks permission.
- `404 Not Found`: Resource does not exist.
- `409 Conflict`: Mutation conflicts with current state.
- `422 Unprocessable Entity`: Payload is syntactically valid but violates business rules.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Unhandled server failure.
- `502 Bad Gateway` or `504 Gateway Timeout`: Upstream service failure or timeout.

## 3. Standard JSON Response Envelopes

All API responses must use consistent envelopes.

### 3.1 Success Envelope

```json
{
  "success": true,
  "data": {
    "id": "usr_98234",
    "email": "user@example.com",
    "fullName": "Jane Doe",
    "createdAt": "2026-03-15T08:30:00.000Z"
  },
  "meta": {
    "timestamp": "2026-03-15T08:30:01.120Z",
    "requestId": "req_87f1c29e"
  }
}
```

### 3.2 Paginated Collection Envelope

```json
{
  "success": true,
  "data": [
    { "id": "ord_001", "totalInCents": 4500 },
    { "id": "ord_002", "totalInCents": 8900 }
  ],
  "pagination": {
    "totalRecords": 142,
    "currentPage": 1,
    "pageSize": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "meta": {
    "timestamp": "2026-03-15T08:30:01.120Z",
    "requestId": "req_87f1c29e"
  }
}
```

### 3.3 Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The payload failed structural validation.",
    "details": [
      {
        "field": "email",
        "issue": "A valid email address is required."
      }
    ]
  },
  "meta": {
    "timestamp": "2026-03-15T08:30:01.120Z",
    "requestId": "req_87f1c29e"
  }
}
```

## 4. Separation of Queries and Mutations

Maintain strict separation between read operations and write operations.

### 4.1 Query Invariants

Queries must never modify database records, charge payment methods, send outbound emails, or trigger side effects.

Queries should support standard URL parameters:

```text
?status=active&country=KE
?sortBy=createdAt&sortOrder=desc
?page=2&limit=25
```

### 4.2 Mutation Invariants

Mutations must receive parameters through the request body, not query strings. Critical mutations must support an `Idempotency-Key` header to prevent duplicate execution during retries.

## 5. Client-Side Network Resilience

Client-side API integrations must implement defensive resilience patterns.

### 5.1 Request Timeout Invariant

Never issue raw network calls without an explicit timeout.

```typescript
export async function resilientFetch<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 5.2 Exponential Backoff and Jitter

Automatic retries are permitted only for safe queries or idempotent requests returning transient status codes: `408`, `429`, `502`, `503`, or `504`.

Never retry non-idempotent `POST` requests without an idempotency key.

```text
Delay = min(maxDelay, baseDelay * 2^attempt) * random(0.5, 1.5)
```

## 6. Violation Checklist

This protocol is violated if the AI:

- Uses verbs in route paths, such as `/api/v1/updateUser`.
- Uses `GET` to modify data or trigger jobs.
- Returns non-standard API envelopes.
- Uses `200 OK` for error scenarios.
- Fires network requests without timeout safeguards.
- Retries non-idempotent requests in a way that can create duplicate state.

---

# Module 08: Runtime Robustness and Zero-Artifact Verification

**Status:** Core - Mandatory across all projects and IDEs

## 1. Robustness Philosophy

Software reliability must be built directly into production logic. The codebase has zero tolerance for unhandled edge cases, unvalidated boundary data, or crashes caused by missing keys and unexpected nulls.

Every function must be defensively engineered, self-validating, and structurally resistant to runtime exceptions without relying on committed test artifacts.

## 2. Strict Zero-Test-File Policy

To maintain a minimal repository tree, the AI is prohibited from generating, scaffolding, or maintaining external test artifacts.

### 2.1 Explicit File and Folder Exclusions

The AI must not create, modify, or suggest:

- Files matching `*.test.*` or `*.spec.*`
- Test folders such as `tests/`, `__tests__/`, `test/`, `specs/`, or `cypress/`
- Mock fixture directories such as `__mocks__/`, `fixtures/`, or `stubs/`
- Test framework configuration files such as `jest.config.js`, `vitest.config.ts`, or `phpunit.xml`

### 2.2 Verification Through Runtime Safety and Compilation

- Verify correctness through strict type checking, schema parsing, and self-guarding implementation logic.
- If interactive validation is necessary, use ephemeral terminal evaluation and do not commit test files.

## 3. Defensive Boundary Checks and Early Exits

Functions must validate prerequisites at the top of their execution scope.

### 3.1 Guard Clause Invariant

Use guard clauses to keep control flow flat.

```typescript
// Bad
function processBatchOrders(orders: Order[], user: User | null): Receipt[] {
  if (user) {
    if (orders) {
      if (orders.length > 0) {
        // Business logic deeply nested.
      }
    }
  }

  return [];
}

// Good
function processBatchOrders(
  orders: Order[] | null | undefined,
  user: User | null | undefined,
): Receipt[] {
  if (!user?.id) {
    return [];
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    return [];
  }

  return orders.map((order) => executeOrder(order, user));
}
```

### 3.2 Universal Boundary Checks

- **Collections:** Check `Array.isArray(collection)` and length before indexing or iterating.
- **Strings:** Confirm type and trim before accepting input.
- **Numbers:** Check `Number.isFinite(value)` and reject `NaN` or `Infinity`.
- **Objects:** Use optional chaining and nullish coalescing instead of unsafe chained access.

## 4. In-Code Fail-Safes and Graceful Degradation

Production systems should degrade gracefully for non-critical failures while preserving strict behavior for critical paths.

### 4.1 Safe Parsing

```typescript
export function safeJsonParse<T>(payload: string | null | undefined, fallback: T): T {
  if (!payload || typeof payload !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return fallback;
  }
}
```

### 4.2 Fallbacks for Non-Critical Paths

```typescript
export function getUserDisplayName(
  user: { firstName?: string | null; lastName?: string | null; username?: string | null } | null | undefined,
): string {
  if (!user) return 'Anonymous Guest';

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (fullName.length > 0) return fullName;

  return user.username?.trim() || 'Anonymous Guest';
}
```

Critical paths, such as payment capture or balance mutation, must fail explicitly with typed domain exceptions.

## 5. Violation Checklist

This protocol is violated if the AI:

- Creates test, spec, mock, fixture, or test configuration files.
- Accesses nested properties without optional chaining.
- Assumes arrays always exist before checking them.
- Calls raw `JSON.parse()` without fallback handling.
- Leaves deep nested `if` pyramids instead of using guard clauses.

---

# Module 09: Security, Secrets Management, and Defensive Coding

**Status:** Conditional - Active when `HAS_AUTHENTICATION` is true or the system handles sensitive data

## 1. Security Philosophy

Security is a baseline requirement. Every layer must follow the Principle of Least Privilege and assume Zero Trust.

Applications must prevent unauthorized data exposure, eliminate injection vectors, and enforce authorization checks on every sensitive or user-scoped operation.

## 2. Secrets Management and Credential Isolation

Hardcoded credentials, API keys, and sensitive tokens are forbidden.

### 2.1 Zero-Hardcoding Invariant

- Secrets must be accessed through environment variables or secure secret managers.
- Private server-side keys must never be exposed to frontend bundles.
- Only public identifiers may use public frontend prefixes such as `NEXT_PUBLIC_` or `VITE_`.
- `.env`, `.env.local`, and live credential files must be ignored by Git. `.env.example` is the only environment file intended for version control.

```typescript
// Bad
const stripeClient = new Stripe('sk_live_51MzExampleSecretKey992');

// Good
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('CRITICAL: STRIPE_SECRET_KEY environment variable is not defined.');
}

const stripeClient = new Stripe(stripeSecretKey);
```

## 3. Injection Prevention and Input Sanitization

Untrusted data from users, webhooks, or third-party APIs must be validated and sanitized before processing, persistence, or rendering.

### 3.1 SQL and NoSQL Injection Prevention

Use parameterized queries, prepared statements, ORM abstractions, or query builders. Do not interpolate user input into database query strings.

```typescript
// Bad
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;
await db.query(query);

// Good
const query = 'SELECT * FROM users WHERE email = $1';
await db.query(query, [sanitizedEmail]);
```

For NoSQL databases, sanitize object keys and cast inputs explicitly to prevent selector injection.

### 3.2 Cross-Site Scripting Prevention

- Do not use `dangerouslySetInnerHTML`, `v-html`, or raw `innerHTML` without a vetted sanitizer.
- Rely on framework-level contextual escaping.
- Set security headers such as `Content-Security-Policy` and `X-Content-Type-Options: nosniff`.

### 3.3 CSRF Mitigation

For state-changing mutations using cookie-based authentication, enforce anti-CSRF token verification or secure cookie settings such as `SameSite=Lax`, `SameSite=Strict`, and `Secure=true`.

## 4. Authorization and Access Control

Authentication proves identity. Authorization proves permission. Every data access and mutation must verify that the authenticated actor can access the target record.

### 4.1 BOLA and IDOR Defense

Never retrieve, update, or delete records using only a client-supplied entity ID. Scope database operations to the authenticated user or tenant.

```typescript
// Bad
export async function deleteInvoice(req: AuthenticatedRequest) {
  const { invoiceId } = req.params;
  return await db.invoices.delete({ where: { id: invoiceId } });
}

// Good
export async function deleteInvoice(req: AuthenticatedRequest) {
  const { invoiceId } = req.params;
  const currentUserId = req.user.id;

  const result = await db.invoices.deleteMany({
    where: {
      id: invoiceId,
      userId: currentUserId,
    },
  });

  if (result.count === 0) {
    throw new NotFoundError('Invoice not found or unauthorized to delete');
  }

  return { success: true };
}
```

### 4.2 RBAC and Permission Guards

Permission checks must run as middleware or high-level guards before business logic executes. Access is denied by default.

```typescript
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.permissions.includes(permission)) {
      throw new ForbiddenError('You do not possess the required permission to execute this action');
    }

    next();
  };
};
```

## 5. Violation Checklist

This protocol is violated if the AI:

- Commits or suggests hardcoded API keys, tokens, or passwords.
- Exposes private server credentials to frontend bundles.
- Interpolates user variables into SQL, NoSQL, or shell command strings.
- Updates or deletes records without tenant or user ownership checks.
- Renders unescaped HTML through dangerous injection APIs.
- Leaves private or sensitive routes unprotected.

---

# Module 10: Performance Optimization and Resource Lifecycle

**Status:** Core - Mandatory across all projects and IDEs

## 1. Performance Philosophy

Performance is an architectural discipline. High-performance software manages resources deliberately, minimizes allocation overhead, prevents memory leaks, and avoids unnecessary computational work.

Systems must maintain predictable latency and memory footprints across sustained execution lifecycles.

## 2. Memory Hygiene and Resource Leak Prevention

Applications must manage object lifecycles cleanly.

### 2.1 Observers, Listeners, and Subscriptions

Any component, service, or worker that registers an event listener, timer, WebSocket connection, or reactive subscription must provide and execute teardown logic.

```typescript
// Bad
useEffect(() => {
  window.addEventListener('resize', handleWindowResize);
}, []);

// Good
useEffect(() => {
  window.addEventListener('resize', handleWindowResize);

  return () => {
    window.removeEventListener('resize', handleWindowResize);
  };
}, [handleWindowResize]);
```

### 2.2 Timers and Intervals

Every `setInterval` or `setTimeout` must store its handle and call `clearInterval` or `clearTimeout` during disposal or scope cleanup.

Long-running background processes must avoid retaining references to large arrays, caches, or DOM nodes in global closures.

### 2.3 Connection Pools and Persistent Sockets

Use managed connection pooling instead of opening new database connections per request. In serverless environments, reuse database client singletons across warm invocations while avoiding unclosed transactions.

## 3. Database and Query Cost Minimization

Data retrieval must be bounded and indexed.

### 3.1 N+1 Query Prevention

Do not resolve relational data inside loops using individual queries.

```typescript
// Bad
const orders = await db.orders.findMany();
for (const order of orders) {
  order.user = await db.users.findUnique({ where: { id: order.userId } });
}

// Good
const orders = await db.orders.findMany({
  include: {
    user: {
      select: { id: true, email: true, fullName: true },
    },
  },
});
```

### 3.2 Projected Fields

Avoid blanket wildcard selects across high-volume queries. Fetch only the fields required by the caller.

```typescript
// Bad
const user = await db.user.findUnique({ where: { id: userId } });

// Good
const user = await db.user.findUnique({
  where: { id: userId },
  select: { id: true, email: true, status: true },
});
```

### 3.3 Indexing and Pagination

- Columns used in `WHERE`, `ORDER BY`, or `JOIN` clauses must be indexed.
- Unbounded collection queries are forbidden.
- Endpoints must enforce default and maximum page limits.

## 4. Lazy Evaluation and Asset Optimization

Defer expensive computations and payload transfers until required.

### 4.1 Route and Component Code Splitting

Heavy UI components must be dynamically loaded to keep initial bundles lightweight.

```typescript
const AnalyticsDashboardChart = dynamic(
  () => import('@/features/analytics/components/DashboardChart'),
  {
    ssr: false,
    loading: () => <ChartSkeletonPlaceholder />,
  },
);
```

### 4.2 Asset and Media Optimization

Images, videos, and static media must use modern formats where possible, explicit dimensions, and lazy loading to prevent layout shifts and redundant network fetches.

Font files should use modern subsets such as WOFF2 and declare `font-display: swap`.

### 4.3 Computational Memoization

Cache expensive calculations using framework memoization tools such as `useMemo`, `useCallback`, or memoized selectors. Do not memoize trivial operations where tracking overhead exceeds computation cost.

## 5. Violation Checklist

This protocol is violated if the AI:

- Registers listeners, timers, or sockets without cleanup.
- Executes iterative database queries inside loops.
- Queries tables using blanket wildcards without projections.
- Returns unbounded result sets without limits.
- Imports heavy libraries directly into the initial bundle.
- Opens unpooled database connections per request.

---

# Module 11: Git Workflow and Commit Hygiene

**Status:** Core - Mandatory across all projects and IDEs

## 1. Version Control Philosophy

Git history is a readable ledger of architectural decisions. Clear commits make reviews faster, regressions easier to find, and releases easier to generate.

Every commit must represent a self-contained working state.

## 2. Conventional Commits

All commit messages generated or suggested by the AI must follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/).

### 2.1 Commit Message Structure

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 2.2 Standard Commit Types

- `feat`: Introduces a user-facing capability.
- `fix`: Patches a production or development defect.
- `refactor`: Changes code structure without changing behavior.
- `perf`: Improves runtime performance or memory usage.
- `docs`: Updates documentation only.
- `chore`: Performs routine maintenance with no production logic change.
- `style`: Changes formatting without affecting logic.

### 2.3 Syntax and Formatting Rules

- Use imperative mood: `add`, `fix`, `update`, `prevent`.
- Do not end the summary with a period.
- Keep the header line within 72 characters.
- Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.

```text
# Correct
feat(auth): add google oauth2 login provider
fix(billing): prevent negative balance deduction
refactor(order): extract shipping calculations
docs(readme): add environment setup table
chore(deps): bump tailwindcss from 3.4.1 to 3.4.2

# Incorrect
Fixed stuff in checkout.
feat: added more things and fixed bugs.
wip
Updated README.md
```

## 3. Atomic Commits

Commits must represent exactly one logical change and leave the repository in a working state.

### 3.1 Atomicity Invariant

Do not bundle unrelated features, fixes, and formatting changes into one commit.

If a task requires refactoring and adding a feature, commit the refactor first and the feature second.

```text
refactor(core): decouple session storage from auth service
feat(core): implement redis session adapter
```

### 3.2 Clean Working Tree Hygiene

- Exclude temporary files, build directories, IDE caches, OS metadata, and local environment files through `.gitignore`.
- Do not commit broken syntax, failing builds, or unfinished work under `wip` labels.

## 4. Branching and Pull Request Standards

Branch names and pull request summaries must be structured, descriptive, and reviewable.

### 4.1 Branch Naming

Use the commit type and a short hyphenated descriptor.

```text
feature/<short-description>
fix/<issue-description>
refactor/<target-module>
chore/<task-name>
```

Examples:

```text
feature/stripe-checkout
fix/auth-session-timeout
refactor/user-profile-hooks
chore/upgrade-node-runtime
```

### 4.2 Pull Request Description Template

```markdown
### What Changed

- Extracted tax rate computation into an isolated pure utility function.
- Added early boundary guards for negative values.

### Context and Why

- Prevents float rounding discrepancies during multi-item checkouts.

### Manual Verification

- Verified zero-fare calculation passes defensively without throwing exceptions.
```

## 5. Violation Checklist

This protocol is violated if the AI:

- Emits vague commit messages such as `update`, `fix`, `changes`, or `wip`.
- Combines unrelated features, fixes, and formatting changes into one commit.
- Uses past-tense verbs in commit headers.
- Stages temporary artifacts, local environment files, or build outputs.
- Exceeds 72 characters in commit header lines.
