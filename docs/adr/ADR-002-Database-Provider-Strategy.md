# ADR-002: Database Provider Strategy & Concurrency Control

## Status
Accepted

## Context
Section 3 and 12 of the blueprint specify PostgreSQL 16 (`Npgsql.EntityFrameworkCore.PostgreSQL`) as the primary database for production, staging, and Docker Compose environments. However, developer workstations may operate in diverse environments without administrative daemon rights or running Docker instances.

## Decision
1. **Primary Production Provider**: PostgreSQL 16 (`Npgsql.EntityFrameworkCore.PostgreSQL`).
2. **Local Workstation / Fallback Provider**: SQLite (`Microsoft.EntityFrameworkCore.Sqlite`) toggleable via configuration (`"DatabaseProvider": "Sqlite"`).
3. **Optimistic Concurrency**: Modeled via `RowVersion` on all entities to prevent lost updates during concurrent edits.
4. **Data Isolation**: Defense-in-depth implemented through EF Core Global Query Filters (`e.UserId == _currentUserService.UserId`) and application handler checks returning 404 (Not Found) rather than 403 (Forbidden) to prevent data enumeration attacks.

## Consequences
- Seamless out-of-the-box local testing and zero-friction CI execution.
- Enterprise-grade production deployment against PostgreSQL 16.

