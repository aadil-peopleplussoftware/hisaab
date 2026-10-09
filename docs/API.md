# Hisaab — Enterprise REST API Reference

**Base URL**: `/api/v1`  
**Authentication**: HTTP Bearer JWT Access Token (Header: `Authorization: Bearer {token}`)  
**Content-Type**: `application/json` (or `application/pdf`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)  
**Errors**: RFC 7807 ProblemDetails with HTTP status codes and detailed validation messages

---

## 1. Authentication & Profile (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account with email, password, full name | No |
| `POST` | `/api/v1/auth/login` | Email/password login with lockout protection; returns JWT and sets httpOnly refresh cookie | No |
| `POST` | `/api/v1/auth/refresh` | Rotates refresh token; returns new JWT and rotated httpOnly refresh cookie | No |
| `POST` | `/api/v1/auth/logout` | Revokes current session's refresh token and clears cookie | Yes |
| `POST` | `/api/v1/auth/revoke-all` | Revokes all active refresh tokens across all devices | Yes |
| `GET` | `/api/v1/auth/profile` | Fetches current user profile and preferences | Yes |
| `PUT` | `/api/v1/auth/profile` | Updates full name, avatar URL, timezone, and locale | Yes |
| `POST` | `/api/v1/auth/change-password`| Changes user password with old password verification | Yes |

---

## 2. Categories (`/api/v1/categories`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/categories?type={1\|2}` | Lists system and custom categories (1 = Income, 2 = Expense) | Yes |
| `POST` | `/api/v1/categories` | Creates custom category with name, icon, and color hex | Yes |

---

## 3. Income & Expenses (`/api/v1/transactions`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/transactions` | Paginated transactions with monthly summary. Params: `month` (`yyyy-MM`), `type`, `categoryId`, `search`, `page`, `pageSize` | Yes |
| `POST` | `/api/v1/transactions` | Records new income or expense transaction | Yes |
| `PUT` | `/api/v1/transactions/{id}` | Updates existing transaction | Yes |
| `DELETE` | `/api/v1/transactions/{id}` | Soft deletes transaction | Yes |

---

## 4. Loans (`/api/v1/loans`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/loans` | Lists loan accounts with outstanding summary. Params: `direction` (1=Given, 2=Taken), `status` (1=Active, 2=Closed), `search` | Yes |
| `GET` | `/api/v1/loans/{id}` | Fetches loan account details with full transaction ledger | Yes |
| `POST` | `/api/v1/loans` | Creates new loan account (Principal, interest rate, type, start date, due date) | Yes |
| `PUT` | `/api/v1/loans/{id}` | Updates loan account details | Yes |
| `DELETE` | `/api/v1/loans/{id}` | Soft deletes loan account | Yes |
| `POST` | `/api/v1/loans/{id}/status` | Toggles loan status (Active vs Closed) | Yes |
| `POST` | `/api/v1/loans/{id}/transactions` | Records ledger transaction (Disburse, Repayment, Interest, Penalty) | Yes |
| `DELETE` | `/api/v1/loans/{id}/transactions/{txId}` | Deletes loan transaction | Yes |

---

## 5. EPFO Provident Fund (`/api/v1/epf`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/epf?year={yyyy}` | Fetches monthly EPF entries, running balance, and yearly summary | Yes |
| `POST` | `/api/v1/epf` | Records monthly contribution (Employee 12%, Employer 3.67%, Pension 8.33%, Interest, Withdrawal) | Yes |
| `PUT` | `/api/v1/epf/{id}` | Updates existing monthly EPF contribution | Yes |
| `DELETE` | `/api/v1/epf/{id}` | Soft deletes EPF entry | Yes |

---

## 6. Investments (`/api/v1/investments`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/investments` | Lists holdings, portfolio summary, and asset allocation % breakdown. Params: `type`, `search` | Yes |
| `GET` | `/api/v1/investments/{id}` | Fetches holding details with full buy/sell/dividend transaction ledger | Yes |
| `POST` | `/api/v1/investments` | Creates new holding (MF, Stock, FD, RD, PPF, NPS, Gold, Other) | Yes |
| `PUT` | `/api/v1/investments/{id}` | Updates holding name, current valuation, or notes | Yes |
| `DELETE` | `/api/v1/investments/{id}` | Soft deletes holding | Yes |
| `POST` | `/api/v1/investments/{id}/transactions` | Records holding transaction (Buy, Sell, Dividend) | Yes |
| `DELETE` | `/api/v1/investments/{id}/transactions/{txId}` | Deletes investment transaction | Yes |

---

## 7. Dashboard (`/api/v1/dashboard`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/dashboard?month={yyyy-MM}&trendMonths=6` | Returns comprehensive personal balance sheet: Net Worth (`Cash + Investments + EPF + Receivables − Payables`), Monthly Overview, 6-Month Trends, Top Categories, Upcoming Dues, Recent Activity | Yes |

---

## 8. Reports & Documents (`/api/v1/reports`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/reports/{type}/pdf` | Generates A4 PDF using QuestPDF. Types: `transactions`, `loans`, `epf`, `investments`, `dashboard` | Yes |
| `GET` | `/api/v1/reports/{type}/excel` | Generates `.xlsx` workbook using ClosedXML. Types: `transactions`, `loans`, `epf`, `investments` | Yes |

---

## 9. Settings & Administration (`/api/v1/settings` & `/api/v1/admin`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/settings/preferences` | Fetches regional and locale preferences | Yes |
| `PUT` | `/api/v1/settings/preferences` | Updates user timezone, locale, and full name | Yes |
| `GET` | `/api/v1/settings/export/json` | Downloads full JSON backup archive of entire user financial data | Yes |
| `GET` | `/api/v1/settings/export/excel` | Downloads all-in-one multi-tab master Excel workbook | Yes |
| `POST` | `/api/v1/settings/account/delete` | Soft deletes account, revokes all tokens, queues for purge | Yes |
| `GET` | `/api/v1/admin/users` | Lists registered user accounts (metadata only; no financial data) | Role: Admin |
| `GET` | `/api/v1/admin/audit-logs` | Browses security and audit log events | Role: Admin |
| `GET` | `/api/v1/admin/system-health` | Server memory, uptime, OS architecture, and database provider diagnostics | Role: Admin |

