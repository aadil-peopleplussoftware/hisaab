# Module 2 — Auth & Profile: QA Sign-Off & Verification Report

## 1. Overview
- **Module**: Module 2 — Auth & Profile
- **Stack**: ASP.NET Core 8 Web API · Angular 18 (Standalone) · PostgreSQL 16
- **Status**: **PASSED (Definition of Done Satisfied)**
- **Sign-off Date**: 2026-10-09

---

## 2. Test Execution Summary

| Test Suite | Framework | Tests Executed | Passed | Failed | Status |
|---|---|---|---|---|---|
| Domain Unit Tests (`MoneyTests`) | xUnit + FluentAssertions | 6 | 6 | 0 | PASS |
| Application Unit Tests (`ValidationBehavior`, `Auth`) | xUnit + NSubstitute | 12 | 12 | 0 | PASS |
| API Integration Tests (`HealthCheck`, `AuthEndpoints`) | WebApplicationFactory + SQLite memory | 5 | 5 | 0 | PASS |
| Frontend Pipe Tests (`InrCurrencyPipe`) | Vitest | 6 | 6 | 0 | PASS |
| Frontend Service Tests (`AuthService`) | Vitest + HttpClientTesting | 3 | 3 | 0 | PASS |
| Frontend Component Tests (`App`) | Vitest | 1 | 1 | 0 | PASS |
| **Total** | | **33** | **33** | **0** | **PASS (100%)** |

---

## 3. Verified Security & Compliance Criteria

1. **Authentication Tokens**:
   - Access tokens: Short-lived (15 minutes), kept in client memory (no localStorage/sessionStorage persistence to protect against XSS).
   - Refresh tokens: Long-lived (7 days), stored SHA-256 hashed in database, transmitted via `httpOnly`, `Secure`, `SameSite=Strict` cookies.
   - Token Rotation: Every refresh request generates a new refresh token and revokes the predecessor.

2. **Credential Hardening**:
   - Minimum 8 characters, lowercase, uppercase, digit, and special symbol enforced on backend and visualized with a dynamic checklist on frontend.
   - Lockout policy: 5 consecutive failed access attempts triggers a 15-minute lockout.
   - Password change automatically invalidates all active sessions across all devices.

3. **Multi-Tenancy & Authorization**:
   - Global query filters and `ICurrentUserService` ensure strict ownership checks.
   - All profile queries verify the authenticated subject.
