# Hisaab (हिसाब) — Enterprise Personal Finance Web Application

> **Stack**: ASP.NET Core 8 Web API · Clean Architecture · Angular 18 (Standalone Components, Signals) · PostgreSQL 16 (Npgsql) · QuestPDF · ClosedXML · Docker Compose

Hisaab is a multi-user, mobile-friendly enterprise personal finance web application that tracks, month by month: **Income**, **Expenses**, **Loans** (given/taken) with per-account running ledgers, **EPFO** (Employees' Provident Fund), and **Investments** (Mutual Funds, Stocks, FDs, PPF, NPS, Gold). Every user has strict tenant isolation and sees **only** their own data.

---

## Architecture Overview

```text
 [Mobile / Desktop Browser (Angular 18 PWA)]
          |  HTTPS / REST + JWT
          v
 [Reverse Proxy (Nginx) & OWASP Security Headers]
          |  Strict CORS, Rate Limiting, CSP, Anti-Forgery
          v
 [ASP.NET Core 8 Web API (Clean Architecture)]
    ├─ Hisaab.Domain         -> Entities, Enums, Value Objects (Money NUMERIC(18,2)), Domain Rules
    ├─ Hisaab.Application    -> CQRS with MediatR, FluentValidation, DTOs, Interfaces
    ├─ Hisaab.Infrastructure -> EF Core (PostgreSQL / SQLite), Identity, QuestPDF, ClosedXML, Auditing
    └─ Hisaab.Api            -> Controllers, Global Exception Handling (RFC 7807), Swagger, Health Checks
          |
          +---> [PostgreSQL 16] (Multi-tenant isolated with Global Query Filters)
          +---> [MinIO / S3 Storage] (Private attachments & generated reports)
          +---> [Seq] (Structured OpenTelemetry logging)
```

---

## Key Enterprise Features

1. **Zero Client Trust & Multi-Tenant Isolation**: Every API endpoint verifies record ownership against the authenticated JWT user claim. Accessing another user's records strictly returns `404 Not Found` (never 403) to prevent resource enumeration.
2. **Indian Financial Standards**: Money is stored as `NUMERIC(18,2)` (never float) and displayed formatted in the Indian numbering system (`₹1,25,000.00`). Dates are stored in UTC and rendered in `Asia/Kolkata` (`IST`).
3. **Comprehensive Balance Sheet & Net Worth Engine**:
   $$\text{Net Worth} = \text{Liquid Cash} + \text{Investments} + \text{EPF Balance} + \text{Loans Receivable} - \text{Loans Payable}$$
4. **Loan Account Ledgers**: Tracks principal, disbursements, repayments, interest, and penalties with simple & monthly compounding calculators.
5. **EPFO Member Passbook**: Full breakdown of Employee 12%, Employer 3.67%, and Pension 8.33% with running balances and interest credits.
6. **Multi-Asset Portfolio**: Tracks Mutual Funds, Stocks, FDs, PPF, NPS, Gold, and Others with buy/sell cost adjustments and asset allocation percentages.
7. **Audit-Grade Document Generation**:
   - Server-side A4 PDF statements with **QuestPDF** (headers, page X of Y footers, timestamps).
   - Multi-tab `.xlsx` master workbooks with **ClosedXML**.
8. **Mobile-First Responsive UI**: Designed for 360px viewports with bottom navigation, floating action buttons, and minimum 44px touch targets. Includes Dark & Light mode theme support.
9. **Data Privacy & GDPR/DPDP Compliance**: Full JSON/Excel data portability and permanent account self-deletion.

---

## Getting Started

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+ & npm](https://nodejs.org/)
- [Docker & Docker Compose](https://www.docker.com/) (optional for containerized deployment)

### Local Development Setup

#### 1. Backend (.NET 8 Web API)
```bash
# Clone the repository
cd hisaab

# Run database migrations and start API (uses SQLite fallback if PostgreSQL is not active)
cd src/Hisaab.Api
dotnet run
```
API runs on `https://localhost:5001` or `http://localhost:5000`.  
Swagger UI is accessible at: `http://localhost:5000/swagger`.

#### 2. Frontend (Angular 18)
```bash
cd web
npm install
npm start
```
Angular dev server launches on `http://localhost:4200` with reverse-proxy routing to the API backend.

---

## Running the Automated Test Suites

### Backend Tests (xUnit + FluentAssertions + WebApplicationFactory)
```bash
dotnet test
```
- **67 Unit Tests** covering validators, Money value objects, loan interest calculators, and CQRS handlers.
- **12 Integration Tests** executing end-to-end multi-tenant isolation scenarios, authorization boundaries, PDF/Excel generation, and health checks.

### Frontend Tests (Vitest + Angular Test Bed)
```bash
cd web
npm test -- --watch=false
```
- **35 Unit Tests** across 10 test suites covering services, pipes, and auth guards.

---

## Docker Compose Deployment

Run the complete multi-container production stack (PostgreSQL, MinIO, Seq, .NET API, and Nginx Angular SPA):
```bash
docker-compose up -d --build
```
- Web Application: `http://localhost:80`
- API Health Checks: `http://localhost:5000/health/ready`
- Seq Logging Dashboard: `http://localhost:5341`
- MinIO Storage Console: `http://localhost:9001`

---

## Documentation Links
- [REST API Specification](docs/API.md)
- [User & Operations Guide](docs/USER_GUIDE.md)
- [Architecture Decision Records (ADRs)](docs/adr/)
- [Quality Assurance & Audit Reports](docs/qa/)
