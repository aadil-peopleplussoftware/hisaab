# ADR-001: Clean Architecture & Foundation Design

## Status
Accepted

## Context
"Hisaab" is an enterprise personal finance tracking system requiring strict data integrity, multi-tenancy with row-level ownership isolation, robust auditability, and clear separation of business rules from database, identity, and transport frameworks.

## Decision
We adopt Clean Architecture with the following layer distribution:
1. **Hisaab.Domain**:
   - Zero external framework dependencies.
   - Core value objects (`Money` with NUMERIC(18,2) precision and Indian numbering format `₹1,25,000.00`).
   - Domain base abstractions: `IUserOwned`, `ISoftDeletable`, `BaseEntity`, `UserOwnedEntity`.
   - Core domain enums: `TransactionType`, `LoanDirection`, `LoanInterestType`, etc.

2. **Hisaab.Application**:
   - Implements CQRS using MediatR.
   - Validation pipeline using FluentValidation with a centralized `ValidationBehavior`.
   - Observability pipeline using `LoggingBehavior` (strictly omitting personal/financial secrets from log sinks).
   - Abstractions: `IApplicationDbContext`, `ICurrentUserService`, `IDateTimeService`.
   - Monads and models: `Result`, `Result<T>`, `PaginatedList<T>`.

3. **Hisaab.Infrastructure**:
   - EF Core with PostgreSQL 16 (Npgsql) as primary data provider, with SQLite local dev option.
   - Global query filters for user tenancy (`UserId == currentUserId`) and soft deletion (`!IsDeleted`).
   - SaveChanges interceptors enforcing UTC timestamps and row version concurrency.
   - ASP.NET Identity with password strength, 5-attempt lockout, and token protection.

4. **Hisaab.Api**:
   - REST endpoints following `/api/v1/[controller]`.
   - RFC 7807 `ProblemDetails` via `ExceptionHandlingMiddleware`.
   - OWASP security headers (`CSP`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`).
   - OpenAPI/Swagger with JWT Bearer authentication scheme.
   - Liveness (`/health`) and readiness (`/health/ready`) health checks.

## Consequences
- Business logic is completely decoupled and testable via fast in-memory unit tests.
- Defense-in-depth security: client data cannot be leaked across tenants due to global query filters and API handlers checking ownership.

