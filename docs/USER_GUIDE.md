# Hisaab — User & Operations Guide

Welcome to **Hisaab**, an enterprise-grade, mobile-first personal finance application designed to track and manage your wealth, cashflow, loans, retirement funds, and investments with complete privacy and bank-grade precision.

---

## 1. Getting Started

### 1.1 Account Creation & Sign In
- Navigate to `/auth/register` to create your private financial account.
- Passwords must be at least 8 characters long with uppercase, lowercase, digit, and special characters.
- Log in at `/auth/login`. Sessions use short-lived in-memory JWT tokens combined with rotated `httpOnly` secure cookies.
- After 5 failed password attempts, accounts are locked for 15 minutes to thwart brute-force attempts.

### 1.2 Layout & Navigation
- **Mobile Devices (≤ 768px)**: Bottom navigation bar provides instant thumb-friendly access to:
  - 🏠 **Dashboard**: Financial overview & Net Worth
  - 💳 **Txns**: Monthly income & expense ledger
  - 🤝 **Loans**: Loan accounts given and taken
  - 🏛️ **EPFO**: Provident fund member passbook
  - 📈 **Invest**: Portfolio holdings and valuations
  - Floating `+` action button allows rapid entry recording on mobile screens.
- **Desktop Devices (> 768px)**: Persistent left sidebar navigation with theme toggling (Dark / Light mode).

---

## 2. Feature Guide

### 2.1 Dashboard & Net Worth Command Center
- **Net Worth Calculation**: Computed live across all your assets and liabilities:
  $$\text{Net Worth} = \text{Liquid Cash} + \text{Investments} + \text{EPF Balance} + \text{Loans Receivable} - \text{Loans Payable}$$
- **Month Picker**: Step through past or future months using the `‹` and `›` buttons or tap the month label to pick any year/month.
- **6-Month Cashflow Trend**: Interactive bar chart comparing monthly income versus expenditure.
- **Category Breakdown**: Identifies top spending categories with proportional percentage bars.
- **Active Loan Dues**: Immediate visibility into loans due soon or overdue.

### 2.2 Income & Expense Tracking (`/transactions`)
- Record earnings (Salary, Freelance, Dividends) and expenses (Rent, Groceries, Utilities, Travel).
- Search transactions by note or category name.
- Filter by transaction type or category with instant monthly balance re-calculation.

### 2.3 Loans & Counterparty Ledger (`/loans`)
- Track loans given to friends/family (Receivables) or loans taken from institutions/contacts (Payables).
- Supports 0% interest loans or annual interest calculation (Simple & Monthly Compounding).
- Detailed account view (`/loans/{id}`) tracks running balances across disbursements, repayments, interest, and penalties.
- Toggle loan accounts between **Active** and **Closed**.

### 2.4 EPFO (Employees' Provident Fund) (`/epfo`)
- Track statutory monthly retirement fund deductions:
  - Employee Share (12% of basic wage)
  - Employer Share (3.67%)
  - EPS Pension Fund (8.33%)
  - Annual/monthly interest credits
  - Advance or final withdrawals
- Chronological member passbook displays closing balance breakdown for any calendar year.

### 2.5 Investments Portfolio (`/investments`)
- Multi-asset tracking: Mutual Funds, Stocks, Fixed Deposits, Recurring Deposits, PPF, NPS, Gold, and Others.
- Asset Allocation progress bar displays percentage of net portfolio across each asset class.
- Record transactions: Buy (accumulates units & invested capital), Sell (reduces units & cost), Dividend (records passive income).
- Update market valuation at any time to recompute unrealized gains, losses, and return percentages.

### 2.6 Reports & Data Exports (`/reports` & `/settings`)
- **Server-Generated A4 PDFs (QuestPDF)**:
  - Monthly Income & Expense Statement
  - Loan Accounts & Ledger Statement
  - EPFO Annual Member Passbook
  - Investment Portfolio Valuation Report
  - Comprehensive Executive Balance Sheet
- **Excel Spreadsheets (ClosedXML)**:
  - Export styled `.xlsx` workbooks for any module.
- **Full Database Portability (`/settings`)**:
  - Download complete JSON backup archive containing your entire account history.
  - Download all-in-one Master Excel workbook with dedicated sheets.

### 2.7 Privacy, Preferences & Danger Zone (`/settings`)
- Customize regional timezone (e.g. `Asia/Kolkata`) and number format (e.g. Indian numbering `₹1,25,000.00`).
- Create and manage custom transaction categories with custom colors.
- **Account Deletion**: Request permanent account deletion. Revokes all active sessions and marks account for compliant purge.
- **Admin Console**: Administrators can inspect user metadata, audit security logs, and review live server runtime health.

