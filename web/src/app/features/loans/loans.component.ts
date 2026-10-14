import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoansService } from './services/loans.service';
import {
  CreateLoanRequest,
  LoanAccount,
  LoanDirection,
  LoanInterestType,
  LoanPriority,
  LoanStatus,
  LoanSummary
} from './models/loan.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ThemeService } from '../../core/services/theme.service';
import { DeletionPermissionsService } from '../../core/services/deletion-permissions.service';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InrCurrencyPipe, StatCardComponent],
  template: `
    <div class="loans-page">
      <!-- Header & Action -->
      <div class="page-header no-print">
        <div>
          <h1 class="page-title">Loans (Given & Taken)</h1>
          <p class="subtitle">Track money lent to friends/family and borrowed debts with interest</p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn-primary" (click)="openCreateModal()">
            + New Loan
          </button>
        </div>
      </div>

      <!-- Financial Summary Cards -->
      <div class="summary-grid">
        <app-stat-card
          title="Given (Lent)"
          [amount]="summary()?.totalGivenOutstanding || 0"
          subtitle="Receivable from others"
          variant="income"
        />
        <app-stat-card
          title="Taken (Borrowed)"
          [amount]="summary()?.totalTakenOutstanding || 0"
          subtitle="Payable to lenders"
          variant="expense"
        />
        <app-stat-card
          title="Net Loan Position"
          [amount]="summary()?.netPosition || 0"
          [subtitle]="(summary()?.netPosition || 0) >= 0 ? 'Net Receivable' : 'Net Debt'"
          variant="neutral"
        />
      </div>

      <!-- Smart Payoff & Recovery Advice Banner -->
      @if (!loading() && topRecommendation(); as rec) {
        <div
          class="priority-banner card no-print"
          [class.banner-payoff]="rec.type === 'payoff'"
          [class.banner-collect]="rec.type === 'collect'">
          <div class="banner-badge-icon">
            @if (rec.type === 'payoff') {
              <span class="banner-icon-sym">⚡</span>
            } @else {
              <span class="banner-icon-sym">🎯</span>
            }
          </div>
          <div class="banner-content">
            <div class="banner-header">
              <span class="banner-action-tag" [class.tag-urgent]="rec.priority === 4" [class.tag-high]="rec.priority === 3">
                {{ rec.type === 'payoff' ? 'Top Repayment Priority (Pehle Bharna Hai)' : 'Top Collection Priority (Pehle Lena Hai)' }}
              </span>
              <span
                class="priority-badge"
                [class.priority-urgent]="rec.priority === 4"
                [class.priority-high]="rec.priority === 3"
                [class.priority-medium]="rec.priority === 2"
                [class.priority-low]="rec.priority === 1">
                {{ rec.priorityName }}
              </span>
            </div>
            <h4 class="banner-title">
              {{ rec.loan.name }} &bull; {{ rec.loan.counterparty }}
              <span class="banner-amount" [class.text-amber]="rec.type === 'payoff'" [class.text-green]="rec.type === 'collect'">
                {{ rec.loan.outstandingBalance | inrCurrency }}
              </span>
            </h4>
            <p class="banner-desc">{{ rec.reason }}</p>
          </div>
          <div class="banner-action">
            <button type="button" class="btn-sm btn-primary" (click)="viewLoan(rec.loan.id)">
              {{ rec.type === 'payoff' ? 'Pay Off / View &rarr;' : 'Collect / View &rarr;' }}
            </button>
          </div>
        </div>
      }

      <!-- Filter Tabs & Search Toolbar -->
      <div class="toolbar card no-print">
        <div class="toolbar-top-row">
          <div class="toolbar-filters">
            <div class="type-pills">
              <button
                type="button"
                class="pill-btn"
                [class.active]="selectedDirection() === 'all'"
                (click)="setDirection('all')">
                All Flows
              </button>
              <button
                type="button"
                class="pill-btn pill-given"
                [class.active]="selectedDirection() === 'given'"
                (click)="setDirection('given')">
                Given (Lent)
              </button>
              <button
                type="button"
                class="pill-btn pill-taken"
                [class.active]="selectedDirection() === 'taken'"
                (click)="setDirection('taken')">
                Taken (Borrowed)
              </button>
            </div>

            <div class="status-filter-wrap">
              <span class="status-filter-label">Status:</span>
              <div class="status-pills">
                <button
                  type="button"
                  class="status-btn status-btn-active"
                  [class.active]="selectedStatus() === 'active'"
                  (click)="setStatus('active')"
                  title="Active Ongoing Loans (Default)">
                  <span class="dot dot-active"></span>
                  <span>Active</span>
                </button>
                <button
                  type="button"
                  class="status-btn status-btn-closed"
                  [class.active]="selectedStatus() === 'closed'"
                  (click)="setStatus('closed')"
                  title="Closed & Settled Loans">
                  <span class="dot dot-closed"></span>
                  <span>Closed</span>
                </button>
                <button
                  type="button"
                  class="status-btn status-btn-all"
                  [class.active]="selectedStatus() === 'all'"
                  (click)="setStatus('all')"
                  title="All Loans (Active and Closed)">
                  <span>All</span>
                </button>
              </div>
            </div>
          </div>

          <div class="filter-controls">
            <input
              type="text"
              class="input-search"
              placeholder="Search person, loan name, or note..."
              [value]="searchTerm()"
              (input)="onSearchInput($event)"
            />
          </div>
        </div>

        <div class="toolbar-bottom-row">
          <!-- Priority Filter Pills -->
          <div class="priority-filter-wrap">
            <span class="filter-label-inline">Priority:</span>
            <div class="priority-pills">
              <button
                type="button"
                class="p-pill-btn"
                [class.active]="selectedPriority() === 'all'"
                (click)="setPriorityFilter('all')">
                All
              </button>
              <button
                type="button"
                class="p-pill-btn p-pill-urgent"
                [class.active]="selectedPriority() === '4'"
                (click)="setPriorityFilter('4')"
                title="Urgent Priority">
                <span class="p-dot dot-urgent"></span> Urgent
              </button>
              <button
                type="button"
                class="p-pill-btn p-pill-high"
                [class.active]="selectedPriority() === '3'"
                (click)="setPriorityFilter('3')"
                title="High Priority">
                <span class="p-dot dot-high"></span> High
              </button>
              <button
                type="button"
                class="p-pill-btn p-pill-medium"
                [class.active]="selectedPriority() === '2'"
                (click)="setPriorityFilter('2')"
                title="Medium Priority">
                <span class="p-dot dot-medium"></span> Medium
              </button>
              <button
                type="button"
                class="p-pill-btn p-pill-low"
                [class.active]="selectedPriority() === '1'"
                (click)="setPriorityFilter('1')"
                title="Low Priority">
                <span class="p-dot dot-low"></span> Low
              </button>
            </div>
          </div>

          <!-- Strategy Sort Dropdown -->
          <div class="sort-strategy-wrap">
            <label class="filter-label-inline" for="sortStrategy">Order Strategy:</label>
            <select
              id="sortStrategy"
              class="sort-strategy-select"
              [value]="selectedSort()"
              (change)="onSortChange($event)">
              <option value="priority">🔥 Urgent Priority First</option>
              <option value="avalanche">📈 Debt Avalanche (Highest Rate)</option>
              <option value="snowball">❄️ Debt Snowball (Smallest Debt)</option>
              <option value="duedate">📅 Earliest Due Date</option>
              <option value="balance_desc">💰 Largest Outstanding Balance</option>
              <option value="name">🔤 Loan Name (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading Skeleton -->
      @if (loading()) {
        <div class="loading-container">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && accounts().length === 0) {
        <div class="empty-card card">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          @if (selectedStatus() === 'active') {
            <h3>No active loans found</h3>
            <p>You have no ongoing active loans in this view. Record a new loan or check closed loans.</p>
          } @else if (selectedStatus() === 'closed') {
            <h3>No closed loans found</h3>
            <p>No settled or closed loans matching this filter.</p>
          } @else {
            <h3>No loans recorded yet</h3>
            <p>Record loans you have given to friends or borrowed amounts with interest tracking.</p>
          }
          <div class="empty-actions mt-4">
            <button type="button" class="btn-primary" (click)="openCreateModal()">
              + New Loan
            </button>
            @if (selectedStatus() === 'active') {
              <button type="button" class="btn-outline ml-2" (click)="setStatus('all')">
                View All Loans
              </button>
            }
          </div>
        </div>
      }

      <!-- Mobile Card List View (< 768px) -->
      @if (!loading() && accounts().length > 0) {
        <div class="mobile-card-list">
          @for (acc of accounts(); track acc.id) {
            <div class="loan-card card" (click)="viewLoan(acc.id)">
              <div class="loan-card-header">
                <div>
                  <h4 class="loan-title">{{ acc.name }}</h4>
                  <div class="loan-counterparty">{{ acc.counterparty }}</div>
                </div>
                <div class="badges-row">
                  <span
                    class="priority-badge"
                    [class.priority-urgent]="acc.priority === 4"
                    [class.priority-high]="acc.priority === 3"
                    [class.priority-medium]="acc.priority === 2"
                    [class.priority-low]="acc.priority === 1">
                    <span class="p-dot"></span>
                    {{ getPriorityLabel(acc.priority) }}
                  </span>
                  <span
                    class="badge"
                    [class.badge-given]="acc.direction === 1"
                    [class.badge-taken]="acc.direction === 2">
                    {{ acc.direction === 1 ? 'Given' : 'Taken' }}
                  </span>
                  @if (acc.status === 2) {
                    <span class="badge badge-closed">Closed</span>
                  }
                </div>
              </div>

              <div class="loan-card-body">
                <div class="metric-row">
                  <span class="metric-label">Outstanding Balance:</span>
                  <span
                    class="metric-val"
                    [class.val-given]="acc.direction === 1"
                    [class.val-taken]="acc.direction === 2">
                    {{ acc.outstandingBalance | inrCurrency }}
                  </span>
                </div>
                <div class="metric-row sub-row">
                  <span class="metric-label">Original Principal:</span>
                  <span class="sub-val">{{ acc.principal | inrCurrency }}</span>
                </div>
                <div class="metric-row sub-row">
                  <span class="metric-label">Interest:</span>
                  <span class="sub-val">
                    {{ acc.interestRate }}% {{ acc.interestTypeName }}
                  </span>
                </div>
                @if (acc.dueDate) {
                  <div class="metric-row sub-row">
                    <span class="metric-label">Due Date:</span>
                    <span class="sub-val">{{ acc.dueDate | date:'mediumDate' }}</span>
                  </div>
                }
                <!-- Quick Priority Switcher for Mobile -->
                <div class="metric-row sub-row quick-priority-mobile-row" (click)="$event.stopPropagation()">
                  <span class="metric-label">Quick Priority:</span>
                  <select
                    class="quick-priority-select"
                    [ngModel]="acc.priority"
                    (ngModelChange)="changeLoanPriority(acc, $event)"
                    [class.p-sel-urgent]="acc.priority == 4"
                    [class.p-sel-high]="acc.priority == 3"
                    [class.p-sel-medium]="acc.priority == 2"
                    [class.p-sel-low]="acc.priority == 1"
                    title="1-Click Priority Changer">
                    <option [ngValue]="4" [selected]="acc.priority == 4">🔴 Urgent</option>
                    <option [ngValue]="3" [selected]="acc.priority == 3">🟠 High</option>
                    <option [ngValue]="2" [selected]="acc.priority == 2">🟡 Medium</option>
                    <option [ngValue]="1" [selected]="acc.priority == 1">🟢 Low</option>
                  </select>
                </div>
              </div>

              <div class="loan-card-footer">
                <span class="txn-count">{{ acc.transactionCount }} transactions</span>
                <div class="card-footer-actions">
                  <button
                    type="button"
                    class="btn-card-del"
                    title="Delete Loan"
                    (click)="confirmDeleteLoan(acc, $event)">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                  <span class="link-arrow">View Ledger &rarr;</span>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Desktop Ledger Table (>= 768px) -->
        <div class="desktop-table-container card">
          <table class="loans-table">
            <thead>
              <tr>
                <th>Loan / Counterparty</th>
                <th>Direction</th>
                <th>Priority</th>
                <th>Principal</th>
                <th>Outstanding Balance</th>
                <th>Interest Rate</th>
                <th>Due Date</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (acc of accounts(); track acc.id) {
                <tr class="table-row" (click)="viewLoan(acc.id)">
                  <td>
                    <div class="loan-name-cell">{{ acc.name }}</div>
                    <div class="counterparty-cell">{{ acc.counterparty }}</div>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-given]="acc.direction === 1"
                      [class.badge-taken]="acc.direction === 2">
                      {{ acc.direction === 1 ? 'Given' : 'Taken' }}
                    </span>
                  </td>
                  <td (click)="$event.stopPropagation()">
                    <select
                      class="quick-priority-select"
                      [ngModel]="acc.priority"
                      (ngModelChange)="changeLoanPriority(acc, $event)"
                      [class.p-sel-urgent]="acc.priority == 4"
                      [class.p-sel-high]="acc.priority == 3"
                      [class.p-sel-medium]="acc.priority == 2"
                      [class.p-sel-low]="acc.priority == 1"
                      title="1-Click Priority Changer">
                      <option [ngValue]="4" [selected]="acc.priority == 4">🔴 Urgent</option>
                      <option [ngValue]="3" [selected]="acc.priority == 3">🟠 High</option>
                      <option [ngValue]="2" [selected]="acc.priority == 2">🟡 Medium</option>
                      <option [ngValue]="1" [selected]="acc.priority == 1">🟢 Low</option>
                    </select>
                  </td>
                  <td class="tabular-nums font-medium">
                    {{ acc.principal | inrCurrency }}
                  </td>
                  <td class="tabular-nums font-bold"
                    [class.text-green]="acc.direction === 1"
                    [class.text-amber]="acc.direction === 2">
                    {{ acc.outstandingBalance | inrCurrency }}
                  </td>
                  <td>
                    {{ acc.interestRate }}% <span class="text-muted text-xs">({{ acc.interestTypeName }})</span>
                  </td>
                  <td>
                    {{ acc.dueDate ? (acc.dueDate | date:'mediumDate') : '—' }}
                  </td>
                  <td>
                    <span
                      class="status-indicator"
                      [class.status-active]="acc.status === 1"
                      [class.status-closed]="acc.status === 2">
                      {{ acc.status === 1 ? 'Active' : 'Closed' }}
                    </span>
                  </td>
                  <td class="text-right actions-cell" (click)="$event.stopPropagation()">
                    <button
                      type="button"
                      class="btn-sm btn-outline"
                      (click)="viewLoan(acc.id)">
                      View Ledger
                    </button>
                    <button
                      type="button"
                      class="btn-sm btn-icon-delete"
                      title="Delete Loan"
                      (click)="confirmDeleteLoan(acc, $event)">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Create Loan Modal / Bottom Sheet -->
      @if (showCreateModal()) {
        <div class="modal-backdrop" (click)="closeCreateModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Create New Loan</h3>
              <button type="button" class="btn-close" (click)="closeCreateModal()">&times;</button>
            </div>

            <form [formGroup]="loanForm" (ngSubmit)="submitCreateLoan()">
              <div class="modal-body">
                <!-- Direction Toggle -->
                <div class="form-group">
                  <label class="form-label">Loan Direction</label>
                  <div class="direction-toggle">
                    <button
                      type="button"
                      class="toggle-btn"
                      [class.active-given]="loanForm.get('direction')?.value === 1"
                      (click)="loanForm.patchValue({ direction: 1 })">
                      Given (I Lent Money)
                    </button>
                    <button
                      type="button"
                      class="toggle-btn"
                      [class.active-taken]="loanForm.get('direction')?.value === 2"
                      (click)="loanForm.patchValue({ direction: 2 })">
                      Taken (I Borrowed)
                    </button>
                  </div>
                </div>

                <!-- Priority Selector in Create Modal -->
                <div class="form-group">
                  <label class="form-label">
                    {{ loanForm.get('direction')?.value === 2 ? 'Payoff Priority (Konsa pehle bharna he) *' : 'Collection Priority (Konsa pehle lena he) *' }}
                  </label>
                  <div class="priority-choice-grid">
                    <button
                      type="button"
                      class="p-choice-card p-choice-urgent"
                      [class.selected]="loanForm.get('priority')?.value === 4"
                      (click)="setFormPriority(4)">
                      <div class="p-choice-top">
                        <span class="p-choice-badge">🔴 Urgent</span>
                      </div>
                      <div class="p-choice-desc">Act immediately</div>
                    </button>
                    <button
                      type="button"
                      class="p-choice-card p-choice-high"
                      [class.selected]="loanForm.get('priority')?.value === 3"
                      (click)="setFormPriority(3)">
                      <div class="p-choice-top">
                        <span class="p-choice-badge">🟠 High</span>
                      </div>
                      <div class="p-choice-desc">Next in line</div>
                    </button>
                    <button
                      type="button"
                      class="p-choice-card p-choice-medium"
                      [class.selected]="loanForm.get('priority')?.value === 2"
                      (click)="setFormPriority(2)">
                      <div class="p-choice-top">
                        <span class="p-choice-badge">🟡 Medium</span>
                      </div>
                      <div class="p-choice-desc">Standard terms</div>
                    </button>
                    <button
                      type="button"
                      class="p-choice-card p-choice-low"
                      [class.selected]="loanForm.get('priority')?.value === 1"
                      (click)="setFormPriority(1)">
                      <div class="p-choice-top">
                        <span class="p-choice-badge">🟢 Low</span>
                      </div>
                      <div class="p-choice-desc">Flexible / friendly</div>
                    </button>
                  </div>
                </div>

                <!-- Loan Name -->
                <div class="form-group">
                  <label class="form-label" for="loanName">Loan Name / Purpose *</label>
                  <input
                    id="loanName"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Personal loan to Ramesh or Home Loan"
                    formControlName="name"
                  />
                  @if (loanForm.get('name')?.invalid && loanForm.get('name')?.touched) {
                    <span class="form-error">Loan name is required.</span>
                  }
                </div>

                <!-- Counterparty -->
                <div class="form-group">
                  <label class="form-label" for="counterparty">
                    {{ loanForm.get('direction')?.value === 1 ? 'Borrower Name (Who took the loan) *' : 'Lender / Bank Name (Who gave the loan) *' }}
                  </label>
                  <input
                    id="counterparty"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Ramesh Kumar or HDFC Bank"
                    formControlName="counterparty"
                  />
                  @if (loanForm.get('counterparty')?.invalid && loanForm.get('counterparty')?.touched) {
                    <span class="form-error">Counterparty is required.</span>
                  }
                </div>

                <!-- Principal Amount -->
                <div class="form-group">
                  <label class="form-label" for="principal">Principal Amount (₹) *</label>
                  <input
                    id="principal"
                    type="number"
                    step="0.01"
                    class="form-control"
                    placeholder="e.g. 50000"
                    formControlName="principal"
                  />
                  @if (loanForm.get('principal')?.invalid && loanForm.get('principal')?.touched) {
                    <span class="form-error">Principal must be greater than zero.</span>
                  }
                </div>

                <!-- Interest Rate & Type Row -->
                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label" for="interestRate">Interest Rate (% p.a.)</label>
                    <input
                      id="interestRate"
                      type="number"
                      step="0.1"
                      class="form-control"
                      placeholder="0"
                      formControlName="interestRate"
                    />
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label" for="interestType">Interest Type</label>
                    <select id="interestType" class="form-control" formControlName="interestType">
                      <option [value]="0">None (0%)</option>
                      <option [value]="1">Simple Interest</option>
                      <option [value]="2">Compound Interest (Monthly)</option>
                    </select>
                  </div>
                </div>

                <!-- Dates Row -->
                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label" for="startDate">Start Date *</label>
                    <input
                      id="startDate"
                      type="date"
                      class="form-control"
                      formControlName="startDate"
                    />
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label" for="dueDate">Due Date (Optional)</label>
                    <input
                      id="dueDate"
                      type="date"
                      class="form-control"
                      formControlName="dueDate"
                    />
                  </div>
                </div>

                <!-- Note -->
                <div class="form-group">
                  <label class="form-label" for="loanNote">Note / Agreement Details</label>
                  <textarea
                    id="loanNote"
                    class="form-control"
                    rows="2"
                    placeholder="Optional details or terms..."
                    formControlName="note"
                  ></textarea>
                </div>
              </div>

              <div class="modal-footer">
                <button
                  type="button"
                  class="btn-outline"
                  (click)="closeCreateModal()"
                  [disabled]="submitting()">
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary"
                  [disabled]="loanForm.invalid || submitting()">
                  {{ submitting() ? 'Saving...' : 'Create Loan' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .loans-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    @media (min-width: 640px) {
      .page-header {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .page-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-main);
    }

    .subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    @media (min-width: 640px) {
      .summary-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    /* Priority Advice Banner */
    .priority-banner {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem 1.5rem;
      border-radius: var(--radius-lg, 12px);
      position: relative;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .banner-payoff {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(239, 68, 68, 0.05) 100%);
      border: 1px solid rgba(245, 158, 11, 0.3);
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);
    }

    .banner-collect {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%);
      border: 1px solid rgba(16, 185, 129, 0.3);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);
    }

    .banner-badge-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1.5rem;
      background: var(--color-bg-card, #ffffff);
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }

    .banner-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .banner-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .banner-action-tag {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-muted);
    }

    .banner-action-tag.tag-urgent {
      color: #dc2626;
    }

    .banner-action-tag.tag-high {
      color: #ea580c;
    }

    .banner-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--color-text-main);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .banner-amount {
      font-size: 1.1rem;
      font-weight: 800;
    }

    .banner-desc {
      margin: 0;
      font-size: 0.84rem;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    .banner-action {
      flex-shrink: 0;
    }

    @media (max-width: 640px) {
      .priority-banner {
        flex-direction: column;
        align-items: flex-start;
      }
      .banner-action {
        width: 100%;
        margin-top: 0.5rem;
      }
      .banner-action button {
        width: 100%;
      }
    }

    .toolbar {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      padding: 1rem 1.25rem;
    }

    .toolbar-top-row {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    @media (min-width: 768px) {
      .toolbar-top-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .toolbar-bottom-row {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-border);
    }

    @media (min-width: 768px) {
      .toolbar-bottom-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .toolbar-filters {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .type-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .status-filter-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-bg-subtle, rgba(148, 163, 184, 0.08));
      padding: 0.25rem 0.35rem 0.25rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid var(--color-border);
    }

    .status-filter-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
    }

    .status-pills {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .status-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
      min-height: 32px;
      transition: all 0.15s ease-in-out;

      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        display: inline-block;
      }

      .dot-active {
        background: #10b981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
      }

      .dot-closed {
        background: #94a3b8;
      }

      &:hover:not(.active) {
        color: var(--color-text-main);
        background: rgba(148, 163, 184, 0.15);
      }

      &.active {
        background: var(--color-bg-card, #ffffff);
        color: var(--color-text-main);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      &.status-btn-active.active {
        color: #059669;
        font-weight: 700;
      }

      &.status-btn-closed.active {
        color: #475569;
      }
    }

    .pill-btn {
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      border: 1px solid var(--color-border);
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      cursor: pointer;
      min-height: 44px;
      transition: all 0.15s ease-in-out;
    }

    .pill-btn.active {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .pill-given.active {
      background: #059669;
      border-color: #059669;
    }

    .pill-taken.active {
      background: #d97706;
      border-color: #d97706;
    }

    .pill-closed.active {
      background: #64748b;
      border-color: #64748b;
    }

    .filter-controls {
      display: flex;
      flex: 1;
      max-width: 400px;
    }

    .input-search {
      width: 100%;
      padding: 0.5rem 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      font-size: 0.875rem;
      min-height: 44px;
    }

    /* Cards & Lists */
    .mobile-card-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    @media (min-width: 768px) {
      .mobile-card-list {
        display: none;
      }
    }

    .desktop-table-container {
      display: none;
      overflow-x: auto;
    }

    @media (min-width: 768px) {
      .desktop-table-container {
        display: block;
      }
    }

    .loan-card {
      padding: 1.25rem;
      cursor: pointer;
      transition: border-color 0.15s ease;
    }

    .loan-card:hover {
      border-color: var(--color-primary);
    }

    .loan-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .loan-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-main);
    }

    .loan-counterparty {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-top: 0.15rem;
    }

    .badges-row {
      display: flex;
      gap: 0.35rem;
    }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-given {
      background: #ecfdf5;
      color: #065f46;
    }

    .badge-taken {
      background: #fffbeb;
      color: #92400e;
    }

    .badge-closed {
      background: #f1f5f9;
      color: #475569;
    }

    /* Priority Filter & Sorting Styles */
    .filter-label-inline {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .priority-filter-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .priority-pills {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      flex-wrap: wrap;
    }

    .p-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 600;
      border: 1px solid var(--color-border);
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      cursor: pointer;
      min-height: 30px;
      transition: all 0.15s ease-in-out;
    }

    .p-pill-btn:hover:not(.active) {
      color: var(--color-text-main);
      background: rgba(148, 163, 184, 0.15);
    }

    .p-pill-btn.active {
      background: var(--color-bg-card, #ffffff);
      color: var(--color-text-main);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-color: var(--color-primary);
    }

    .p-pill-urgent.active {
      border-color: #ef4444;
      color: #b91c1c;
      background: #fef2f2;
    }

    .p-pill-high.active {
      border-color: #f97316;
      color: #c2410c;
      background: #fff7ed;
    }

    .p-pill-medium.active {
      border-color: #eab308;
      color: #a16207;
      background: #fefce8;
    }

    .p-pill-low.active {
      border-color: #22c55e;
      color: #15803d;
      background: #f0fdf4;
    }

    .sort-strategy-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sort-strategy-select {
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--color-border);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      min-height: 34px;
    }

    .p-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }

    .dot-urgent {
      background: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
    }

    .dot-high {
      background: #f97316;
    }

    .dot-medium {
      background: #eab308;
    }

    .dot-low {
      background: #22c55e;
    }

    /* Priority Badges & Quick Select */
    .priority-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .priority-urgent {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fca5a5;
    }

    .priority-high {
      background: #fff7ed;
      color: #c2410c;
      border: 1px solid #fdba74;
    }

    .priority-medium {
      background: #fefce8;
      color: #a16207;
      border: 1px solid #fde047;
    }

    .priority-low {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #86efac;
    }

    .quick-priority-select {
      padding: 0.3rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 700;
      border: 1px solid var(--color-border);
      background: var(--color-bg-card);
      cursor: pointer;
      min-height: 32px;
      min-width: 115px;
      text-align: center;
      transition: all 0.15s ease;
      outline: none;
    }

    .quick-priority-select option {
      background: #ffffff;
      color: #1e293b;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.4rem;
    }

    .p-sel-urgent {
      background: #fef2f2 !important;
      color: #b91c1c !important;
      border-color: #fca5a5 !important;
    }

    .p-sel-high {
      background: #fff7ed !important;
      color: #c2410c !important;
      border-color: #fdba74 !important;
    }

    .p-sel-medium {
      background: #fefce8 !important;
      color: #a16207 !important;
      border-color: #fde047 !important;
    }

    .p-sel-low {
      background: #f0fdf4 !important;
      color: #15803d !important;
      border-color: #86efac !important;
    }

    .quick-priority-mobile-row {
      align-items: center;
    }

    /* Modal Priority Choice Grid */
    .priority-choice-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    @media (min-width: 480px) {
      .priority-choice-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .p-choice-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 0.6rem 0.75rem;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--color-border);
      background: var(--color-bg-subtle);
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }

    .p-choice-card:hover {
      background: var(--color-bg-card);
    }

    .p-choice-top {
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .p-choice-desc {
      font-size: 0.7rem;
      color: var(--color-text-muted);
      margin-top: 0.15rem;
    }

    .p-choice-card.selected.p-choice-urgent {
      border-color: #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
    }

    .p-choice-card.selected.p-choice-high {
      border-color: #f97316;
      background: #fff7ed;
      color: #c2410c;
      box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.25);
    }

    .p-choice-card.selected.p-choice-medium {
      border-color: #eab308;
      background: #fefce8;
      color: #a16207;
      box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.25);
    }

    .p-choice-card.selected.p-choice-low {
      border-color: #22c55e;
      background: #f0fdf4;
      color: #15803d;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
    }

    .loan-card-body {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--color-border);
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .metric-label {
      color: var(--color-text-muted);
    }

    .metric-val {
      font-weight: 700;
      font-size: 1.1rem;
    }

    .val-given {
      color: #059669;
    }

    .val-taken {
      color: #d97706;
    }

    .sub-row {
      font-size: 0.8125rem;
    }

    .sub-val {
      color: var(--color-text-main);
      font-weight: 500;
    }

    .loan-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .link-arrow {
      color: var(--color-primary);
      font-weight: 600;
    }

    /* Table Styles */
    .loans-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .loans-table th {
      padding: 0.875rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
    }

    .loans-table td {
      padding: 1rem;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text-main);
    }

    .table-row {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .table-row:hover {
      background-color: var(--color-bg-subtle);
    }

    .loan-name-cell {
      font-weight: 600;
      color: var(--color-text-main);
    }

    .counterparty-cell {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .status-active::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }

    .status-closed::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .text-green {
      color: #059669;
    }

    .text-amber {
      color: #d97706;
    }

    .text-right {
      text-align: right;
    }

    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.8125rem;
      border-radius: var(--radius-sm);
      min-height: 36px;
    }

    .actions-cell {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .btn-icon-delete {
      background: transparent;
      border: 1px solid var(--color-border);
      color: #ef4444;
      padding: 0.35rem 0.5rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      transition: all 0.15s ease;
    }

    .btn-icon-delete:hover {
      background: #fee2e2;
      border-color: #fca5a5;
    }

    .card-footer-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-card-del {
      background: transparent;
      border: 1px solid var(--color-border);
      color: #ef4444;
      padding: 0.3rem 0.5rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .btn-card-del:hover {
      background: #fee2e2;
      border-color: #fca5a5;
    }

    /* Modal bottom-sheet styles */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 50;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    @media (min-width: 640px) {
      .modal-backdrop {
        align-items: center;
      }
    }

    .modal-dialog {
      background: var(--color-bg-card);
      width: 100%;
      max-width: 520px;
      border-radius: 1rem 1rem 0 0;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--shadow-lg);
    }

    @media (min-width: 640px) {
      .modal-dialog {
        border-radius: var(--radius-lg);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem;
      border-bottom: 1px solid var(--color-border);
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.25rem;
      color: var(--color-text-main);
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: var(--color-text-muted);
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--color-border);
      background: var(--color-bg-subtle);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-row {
      display: flex;
      gap: 0.75rem;
    }

    .col-half {
      flex: 1;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .form-control {
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      font-size: 0.875rem;
      min-height: 44px;
    }

    .form-error {
      font-size: 0.75rem;
      color: #ef4444;
    }

    .direction-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .toggle-btn {
      padding: 0.625rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      min-height: 44px;
    }

    .toggle-btn.active-given {
      background: #ecfdf5;
      color: #065f46;
      border-color: #059669;
      font-weight: 600;
    }

    .toggle-btn.active-taken {
      background: #fffbeb;
      color: #92400e;
      border-color: #d97706;
      font-weight: 600;
    }

    .empty-card {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .skeleton-card {
      height: 90px;
      background: var(--color-bg-subtle);
      border-radius: var(--radius-md);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 0.3; }
    }
  `]
})
export class LoansComponent implements OnInit {
  private readonly loansService = inject(LoansService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly deletionPermissionsService = inject(DeletionPermissionsService);

  readonly accounts = signal<LoanAccount[]>([]);
  readonly summary = signal<LoanSummary | null>(null);
  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly showCreateModal = signal<boolean>(false);

  readonly selectedDirection = signal<'all' | 'given' | 'taken'>('all');
  readonly selectedStatus = signal<'active' | 'closed' | 'all'>('active');
  readonly selectedPriority = signal<'all' | '4' | '3' | '2' | '1'>('all');
  readonly selectedSort = signal<string>('priority');
  readonly searchTerm = signal<string>('');

  readonly loanForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    counterparty: ['', [Validators.required, Validators.maxLength(150)]],
    direction: [LoanDirection.Given, [Validators.required]],
    principal: [null as number | null, [Validators.required, Validators.min(1)]],
    interestRate: [0, [Validators.min(0), Validators.max(100)]],
    interestType: [LoanInterestType.None, [Validators.required]],
    priority: [LoanPriority.Medium, [Validators.required]],
    startDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    dueDate: [''],
    note: ['']
  });

  readonly topRecommendation = computed(() => {
    const list = this.accounts();
    if (!list || list.length === 0) return null;

    const activeLoans = list.filter(a => a.status === LoanStatus.Active && a.outstandingBalance > 0);
    if (activeLoans.length === 0) return null;

    const dir = this.selectedDirection();

    // 1. Debt Payoff Priority (Taken - Borrowed) -> "Konsa loan pehle bharna he"
    if (dir === 'taken' || dir === 'all') {
      const takenLoans = activeLoans.filter(a => a.direction === LoanDirection.Taken);
      if (takenLoans.length > 0) {
        const sorted = [...takenLoans].sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          if (b.interestRate !== a.interestRate) return b.interestRate - a.interestRate;
          if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          return b.outstandingBalance - a.outstandingBalance;
        });

        const top = sorted[0];
        let reason = '';
        if (top.priority === 4) {
          reason = `🚨 Marked as Urgent! Clear this borrowed debt first to prevent penalty escalation and serious obligation default.`;
        } else if (top.interestRate > 0) {
          reason = `📈 High interest rate of ${top.interestRate}% p.a. Paying this debt off first (Debt Avalanche) minimizes unnecessary interest costs.`;
        } else if (top.dueDate) {
          reason = `📅 Scheduled due date is ${new Date(top.dueDate).toLocaleDateString()}. Prioritize settling this before the cutoff.`;
        } else {
          reason = `⚡ Top priority active debt. Clear this outstanding balance of ₹${top.outstandingBalance.toLocaleString('en-IN')} to reduce financial liabilities.`;
        }

        return {
          type: 'payoff' as const,
          loan: top,
          priority: top.priority,
          priorityName: this.getPriorityLabel(top.priority),
          reason
        };
      }
    }

    // 2. Recovery / Collection Priority (Given - Lent) -> "Konsa loan pehle lena / recover karna he"
    if (dir === 'given' || (dir === 'all' && activeLoans.some(a => a.direction === LoanDirection.Given))) {
      const givenLoans = activeLoans.filter(a => a.direction === LoanDirection.Given);
      if (givenLoans.length > 0) {
        const sorted = [...givenLoans].sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          return b.outstandingBalance - a.outstandingBalance;
        });

        const top = sorted[0];
        let reason = '';
        if (top.priority === 4) {
          reason = `🎯 Urgent recovery! Follow up immediately with ${top.counterparty} to recover the pending balance of ₹${top.outstandingBalance.toLocaleString('en-IN')}.`;
        } else if (top.dueDate) {
          reason = `📅 Lent to ${top.counterparty}, due on ${new Date(top.dueDate).toLocaleDateString()}. Initiate collection follow-up.`;
        } else {
          reason = `💰 Top priority receivable of ₹${top.outstandingBalance.toLocaleString('en-IN')} pending from ${top.counterparty}.`;
        }

        return {
          type: 'collect' as const,
          loan: top,
          priority: top.priority,
          priorityName: this.getPriorityLabel(top.priority),
          reason
        };
      }
    }

    return null;
  });

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans(): void {
    this.loading.set(true);

    let direction: LoanDirection | null = null;
    if (this.selectedDirection() === 'given') {
      direction = LoanDirection.Given;
    } else if (this.selectedDirection() === 'taken') {
      direction = LoanDirection.Taken;
    }

    let status: LoanStatus | null = null;
    if (this.selectedStatus() === 'active') {
      status = LoanStatus.Active;
    } else if (this.selectedStatus() === 'closed') {
      status = LoanStatus.Closed;
    }

    let priority: LoanPriority | null = null;
    if (this.selectedPriority() !== 'all') {
      priority = Number(this.selectedPriority()) as LoanPriority;
    }

    this.loansService.getLoans({
      direction,
      status,
      priority,
      sortBy: this.selectedSort(),
      search: this.searchTerm() || undefined
    }).subscribe({
      next: (res) => {
        this.accounts.set(res.accounts);
        this.summary.set(res.summary);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  setDirection(direction: 'all' | 'given' | 'taken'): void {
    this.selectedDirection.set(direction);
    this.themeService.playClickSound();
    this.loadLoans();
  }

  setStatus(status: 'active' | 'closed' | 'all'): void {
    this.selectedStatus.set(status);
    this.themeService.playClickSound();
    this.loadLoans();
  }

  setPriorityFilter(priority: 'all' | '4' | '3' | '2' | '1'): void {
    this.selectedPriority.set(priority);
    this.themeService.playClickSound();
    this.loadLoans();
  }

  onSortChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedSort.set(val);
    this.themeService.playClickSound();
    this.loadLoans();
  }

  changeLoanPriority(loan: LoanAccount, newPriorityOrEvent: any): void {
    if (newPriorityOrEvent && typeof newPriorityOrEvent.stopPropagation === 'function') {
      newPriorityOrEvent.stopPropagation();
    }

    let newPriority: LoanPriority;
    if (typeof newPriorityOrEvent === 'number') {
      newPriority = newPriorityOrEvent as LoanPriority;
    } else if (newPriorityOrEvent?.target?.value) {
      newPriority = Number(newPriorityOrEvent.target.value) as LoanPriority;
    } else {
      newPriority = Number(newPriorityOrEvent) as LoanPriority;
    }

    if (!newPriority || isNaN(newPriority)) {
      return;
    }

    // Optimistically update local account immediately so UI is instantaneous
    loan.priority = newPriority;
    loan.priorityName = this.getPriorityLabel(newPriority);

    this.themeService.playClickSound();
    this.loansService.changePriority(loan.id, newPriority).subscribe({
      next: (res) => {
        this.themeService.playSuccessSound();
        if (res?.account) {
          loan.priority = res.account.priority;
          loan.priorityName = res.account.priorityName || this.getPriorityLabel(res.account.priority);
        }
        this.loadLoans();
      },
      error: () => {
        this.loadLoans();
      }
    });
  }

  setFormPriority(priority: number): void {
    this.loanForm.patchValue({ priority });
    this.themeService.playClickSound();
  }

  getPriorityLabel(priority: number | LoanPriority): string {
    switch (Number(priority)) {
      case LoanPriority.Urgent: return 'Urgent 🔴';
      case LoanPriority.High: return 'High 🟠';
      case LoanPriority.Medium: return 'Medium 🟡';
      case LoanPriority.Low: return 'Low 🟢';
      default: return 'Medium 🟡';
    }
  }

  setTab(tab: 'all' | 'given' | 'taken' | 'closed'): void {
    if (tab === 'closed') {
      this.selectedStatus.set('closed');
      this.selectedDirection.set('all');
    } else if (tab === 'given' || tab === 'taken') {
      this.selectedDirection.set(tab);
      this.selectedStatus.set('active');
    } else {
      this.selectedDirection.set('all');
      this.selectedStatus.set('active');
    }
    this.themeService.playClickSound();
    this.loadLoans();
  }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchTerm.set(query);
    this.loadLoans();
  }

  viewLoan(id: string): void {
    this.router.navigate(['/loans', id]);
  }

  openCreateModal(): void {
    this.loanForm.reset({
      name: '',
      counterparty: '',
      direction: LoanDirection.Given,
      principal: null,
      interestRate: 0,
      interestType: LoanInterestType.None,
      priority: LoanPriority.Medium,
      startDate: new Date().toISOString().substring(0, 10),
      dueDate: '',
      note: ''
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  submitCreateLoan(): void {
    if (this.loanForm.invalid) {
      this.loanForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formVal = this.loanForm.value;

    const payload: CreateLoanRequest = {
      name: formVal.name!.trim(),
      counterparty: formVal.counterparty!.trim(),
      direction: formVal.direction!,
      principal: Number(formVal.principal),
      interestRate: Number(formVal.interestRate || 0),
      interestType: Number(formVal.interestType || 0),
      priority: Number(formVal.priority || 2),
      startDate: formVal.startDate!,
      dueDate: formVal.dueDate ? formVal.dueDate : null,
      note: formVal.note?.trim() || null
    };

    this.loansService.createLoan(payload).subscribe({
      next: (created) => {
        this.themeService.playSuccessSound();
        this.submitting.set(false);
        this.closeCreateModal();
        this.router.navigate(['/loans', created.account.id]);
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }

  confirmDeleteLoan(loan: LoanAccount, event: Event): void {
    event.stopPropagation();

    if (!this.deletionPermissionsService.canDelete('loans')) {
      alert('Deletion is disabled for Loans in Settings. Enable it in Settings > Deletion Controls to delete this loan.');
      return;
    }

    if (loan.transactionCount > 0) {
      const confirmCascade = confirm(
        `⚠️ Loan "${loan.name}" me ${loan.transactionCount} transaction(s) recorded hain!\n\n` +
        `Niyam: Loan delete karne se pehle transactions delete honi chahiye.\n\n` +
        `Kya aap pehle sabhi ${loan.transactionCount} transactions ko delete karke is loan ko Recycle Bin me bhejna chahte hain?\n\n` +
        `• 'OK' dabayein: Pehle sabhi transactions delete hongi aur phir loan delete ho jayega.\n` +
        `• 'Cancel' dabayein: 'View Ledger' me jakar transactions check/delete karein.`
      );

      if (!confirmCascade) return;
    } else {
      if (!confirm(`Are you sure you want to delete "${loan.name}"? This will move it to the Recycle Bin.`)) {
        return;
      }
    }

    this.loansService.deleteLoan(loan.id).subscribe({
      next: () => {
        this.themeService.playDeleteSound();
        this.loadLoans();
      },
      error: (err) => {
        alert(err?.error?.detail || err?.error?.message || 'Failed to delete loan. Please check your settings or try again.');
      }
    });
  }
}
