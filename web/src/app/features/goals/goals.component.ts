import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { GoalsService } from './services/goals.service';
import {
  AddGoalContributionRequest,
  CreateGoalRequest,
  GetGoalsResponse,
  Goal,
  GoalCategory,
  GoalPriority,
  GoalStatus,
  GoalsSummary,
  UpdateGoalRequest
} from './models/goal.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ThemeService } from '../../core/services/theme.service';
import { DeletionPermissionsService } from '../../core/services/deletion-permissions.service';

interface GoalCategoryOption {
  value: GoalCategory;
  label: string;
  icon: string;
  defaultEmoji: string;
  defaultColor: string;
}

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, InrCurrencyPipe, StatCardComponent],
  template: `
    <div class="goals-page">
      <!-- Header & Top Actions -->
      <div class="page-header no-print">
        <div class="header-titles">
          <div class="title-with-badge">
            <h1 class="page-title">Dreams & Financial Goals</h1>
            <span class="header-badge">Sapne & Lakshya</span>
          </div>
          <p class="subtitle">Set targets, track progress milestones, and turn your financial dreams into reality</p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn-primary" (click)="openCreateModal()">
            <span class="btn-icon">＋</span> New Goal / Dream
          </button>
        </div>
      </div>

      <!-- KPI Summary Stat Cards -->
      <div class="summary-grid">
        <app-stat-card
          title="Total Target Capital"
          [amount]="summary()?.totalTargetAmount || 0"
          subtitle="Required across all goals"
          variant="neutral"
        />
        <app-stat-card
          title="Total Saved So Far"
          [amount]="summary()?.totalSavedAmount || 0"
          subtitle="Accumulated deposits"
          variant="income"
        />
        <app-stat-card
          title="Remaining to Save"
          [amount]="summary()?.totalRemainingAmount || 0"
          subtitle="Pending balance needed"
          variant="expense"
        />
        <div class="stat-card completion-card">
          <div class="completion-top">
            <span class="completion-title">Overall Progress</span>
            <span class="completion-percent">{{ summary()?.overallPercentageAchieved || 0 }}%</span>
          </div>
          <div class="completion-bar-bg">
            <div
              class="completion-bar-fill"
              [style.width.%]="summary()?.overallPercentageAchieved || 0"
            ></div>
          </div>
          <div class="completion-meta">
            <span>{{ summary()?.achievedGoalsCount || 0 }} achieved</span>
            <span>{{ summary()?.activeGoalsCount || 0 }} in progress</span>
          </div>
        </div>
      </div>

      <!-- Smart Motivational Dream Advisor Banner -->
      @if (!loading() && topAdvisorGoal(); as topGoal) {
        <div class="advisor-banner card no-print">
          <div class="advisor-icon-wrap" [style.background-color]="(topGoal.color || '#0b57d0') + '22'">
            <span class="advisor-emoji">{{ topGoal.icon || '🎯' }}</span>
          </div>
          <div class="advisor-body">
            <div class="advisor-header">
              <span class="advisor-tag">⚡ Next Goal Milestone Focus</span>
              @if (topGoal.priority === 4) {
                <span class="priority-pill priority-urgent">URGENT</span>
              } @else if (topGoal.priority === 3) {
                <span class="priority-pill priority-high">HIGH PRIORITY</span>
              }
            </div>
            <h3 class="advisor-title">
              {{ topGoal.title }} &bull; Target: {{ topGoal.targetAmount | inrCurrency }}
              <span class="advisor-achieved">({{ topGoal.percentageAchieved }}% completed)</span>
            </h3>
            <p class="advisor-text">
              @if (topGoal.suggestedMonthlySavings && topGoal.suggestedMonthlySavings > 0) {
                <span>
                  Save <strong>{{ topGoal.suggestedMonthlySavings | inrCurrency }}/month</strong> to achieve this dream by
                  <strong>{{ topGoal.formattedTargetDate }}</strong> ({{ topGoal.monthsRemaining }} months left).
                </span>
              } @else if (topGoal.daysRemaining && topGoal.daysRemaining > 0) {
                <span>
                  Target date is in <strong>{{ topGoal.daysRemaining }} days</strong> ({{ topGoal.formattedTargetDate }}).
                  Remaining: <strong>{{ topGoal.remainingAmount | inrCurrency }}</strong>.
                </span>
              } @else {
                <span>
                  Remaining balance to save is <strong>{{ topGoal.remainingAmount | inrCurrency }}</strong>.
                  Keep funding your dream regularly!
                </span>
              }
            </p>
          </div>
          <div class="advisor-action">
            <button type="button" class="btn-sm btn-primary" (click)="openDepositModal(topGoal)">
              + Quick Deposit
            </button>
            <button type="button" class="btn-sm btn-secondary" (click)="viewGoalDetail(topGoal.id)">
              Milestones &rarr;
            </button>
          </div>
        </div>
      }

      <!-- Filters & Toolbar -->
      <div class="toolbar card no-print">
        <!-- Status Tabs -->
        <div class="status-tabs">
          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedStatus() === null"
            (click)="setStatusFilter(null)">
            All ({{ summary()?.totalGoalsCount || 0 }})
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedStatus() === 1"
            (click)="setStatusFilter(1)">
            In Progress ({{ summary()?.activeGoalsCount || 0 }})
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedStatus() === 2"
            (click)="setStatusFilter(2)">
            Achieved 🎉 ({{ summary()?.achievedGoalsCount || 0 }})
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedStatus() === 3"
            (click)="setStatusFilter(3)">
            Paused ({{ summary()?.pausedGoalsCount || 0 }})
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="filter-controls">
          <div class="search-wrap">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search goals..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              class="search-input"
            />
            @if (searchQuery) {
              <button type="button" class="clear-search" (click)="searchQuery = ''; onSearchChange()">✕</button>
            }
          </div>

          <select class="select-control" [(ngModel)]="selectedCategory" (ngModelChange)="loadGoals()">
            <option [ngValue]="null">All Categories</option>
            @for (cat of categoryOptions; track cat.value) {
              <option [ngValue]="cat.value">{{ cat.icon }} {{ cat.label }}</option>
            }
          </select>

          <select class="select-control" [(ngModel)]="selectedPriority" (ngModelChange)="loadGoals()">
            <option [ngValue]="null">All Priorities</option>
            <option [ngValue]="4">Urgent Priority</option>
            <option [ngValue]="3">High Priority</option>
            <option [ngValue]="2">Medium Priority</option>
            <option [ngValue]="1">Low Priority</option>
          </select>

          <select class="select-control" [(ngModel)]="sortBy" (ngModelChange)="sortGoals()">
            <option value="deadline">Sort: Deadline Soonest</option>
            <option value="progress">Sort: Progress % (High to Low)</option>
            <option value="amount">Sort: Target Amount (High to Low)</option>
            <option value="priority">Sort: Priority (Urgent First)</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-grid">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="card skeleton-card">
              <div class="skeleton-header"></div>
              <div class="skeleton-bar"></div>
              <div class="skeleton-meta"></div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && filteredGoals().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon">🎯</div>
          <h3>No Financial Goals Found</h3>
          <p>
            @if (searchQuery || selectedStatus() !== null || selectedCategory !== null || selectedPriority !== null) {
              No dreams or goals match your active filters. Try clearing some filters.
            } @else {
              Start creating your dreams! Track a dream car, vacation, home, emergency fund, or gadget milestone.
            }
          </p>
          <div class="empty-actions">
            @if (searchQuery || selectedStatus() !== null || selectedCategory !== null || selectedPriority !== null) {
              <button type="button" class="btn-outline" (click)="resetFilters()">Reset Filters</button>
            }
            <button type="button" class="btn-primary" (click)="openCreateModal()">
              + Create Your First Goal
            </button>
          </div>
        </div>
      }

      <!-- Goals Grid -->
      @if (!loading() && filteredGoals().length > 0) {
        <div class="goals-grid">
          @for (goal of filteredGoals(); track goal.id) {
            <div class="goal-card card" [style.border-top-color]="goal.color || '#0b57d0'">
              <!-- Card Top -->
              <div class="card-header">
                <div class="header-left">
                  <div
                    class="goal-icon-badge"
                    [style.background-color]="(goal.color || '#0b57d0') + '1a'"
                    [style.color]="goal.color || '#0b57d0'"
                  >
                    <span>{{ goal.icon || '🎯' }}</span>
                  </div>
                  <div class="goal-titles">
                    <h3 class="goal-title" [title]="goal.title" (click)="viewGoalDetail(goal.id)">
                      {{ goal.title }}
                    </h3>
                    <div class="badges-row">
                      <span class="category-pill">{{ goal.categoryName }}</span>
                      <span
                        class="priority-pill"
                        [class.priority-urgent]="goal.priority === 4"
                        [class.priority-high]="goal.priority === 3"
                        [class.priority-medium]="goal.priority === 2"
                        [class.priority-low]="goal.priority === 1"
                      >
                        {{ goal.priorityName }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="header-right">
                  <span
                    class="status-pill"
                    [class.status-achieved]="goal.status === 2"
                    [class.status-paused]="goal.status === 3"
                    [class.status-progress]="goal.status === 1"
                  >
                    @if (goal.status === 2) {
                      🎉 Achieved
                    } @else if (goal.status === 3) {
                      ⏸ Paused
                    } @else {
                      ⏳ In Progress
                    }
                  </span>
                </div>
              </div>

              @if (goal.description) {
                <p class="goal-desc">{{ goal.description }}</p>
              }

              <!-- Progress Bar & Milestones -->
              <div class="progress-section">
                <div class="progress-labels">
                  <span class="progress-text">Progress</span>
                  <span class="progress-value" [style.color]="goal.color || '#0b57d0'">
                    {{ goal.percentageAchieved }}%
                  </span>
                </div>
                <div class="progress-bar-wrap">
                  <div
                    class="progress-bar-fill"
                    [style.width.%]="goal.percentageAchieved > 100 ? 100 : goal.percentageAchieved"
                    [style.background]="getGradient(goal.color || '#0b57d0')"
                  ></div>
                  <!-- Milestone Dots -->
                  <div class="milestone-marker" style="left: 25%" title="25% Milestone"></div>
                  <div class="milestone-marker" style="left: 50%" title="Halfway 50%"></div>
                  <div class="milestone-marker" style="left: 75%" title="75% Milestone"></div>
                </div>
              </div>

              <!-- Financial Amounts Row -->
              <div class="amounts-grid">
                <div class="amount-box">
                  <span class="amount-lbl">Saved</span>
                  <span class="amount-val text-green">{{ goal.currentAmount | inrCurrency }}</span>
                </div>
                <div class="amount-box">
                  <span class="amount-lbl">Target</span>
                  <span class="amount-val">{{ goal.targetAmount | inrCurrency }}</span>
                </div>
                <div class="amount-box">
                  <span class="amount-lbl">Remaining</span>
                  <span class="amount-val" [class.text-amber]="goal.remainingAmount > 0">
                    {{ goal.remainingAmount | inrCurrency }}
                  </span>
                </div>
              </div>

              <!-- Timeline & Monthly Pace Indicator -->
              <div class="timeline-box">
                @if (goal.formattedTargetDate) {
                  <div class="timeline-row">
                    <span class="time-lbl">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      Deadline: <strong>{{ goal.formattedTargetDate }}</strong>
                    </span>
                    <span class="time-badge" [class.badge-warning]="(goal.daysRemaining || 0) < 30 && goal.remainingAmount > 0">
                      @if (goal.status === 2) {
                        Target Reached!
                      } @else if ((goal.daysRemaining || 0) < 0) {
                        Past deadline
                      } @else if (goal.monthsRemaining && goal.monthsRemaining > 0) {
                        {{ goal.monthsRemaining }} mo left
                      } @else {
                        {{ goal.daysRemaining }} days left
                      }
                    </span>
                  </div>
                }

                @if (goal.status === 1 && goal.remainingAmount > 0 && goal.suggestedMonthlySavings) {
                  <div class="monthly-pace-tip">
                    <span>💡 Recommended:</span>
                    <strong>{{ goal.suggestedMonthlySavings | inrCurrency }}/month</strong> to meet target
                  </div>
                }
              </div>

              <!-- Card Action Buttons -->
              <div class="card-footer">
                <div class="footer-left">
                  @if (goal.status !== 2) {
                    <button type="button" class="btn-deposit" (click)="openDepositModal(goal)">
                      ＋ Add Savings
                    </button>
                  }
                  <button type="button" class="btn-detail" (click)="viewGoalDetail(goal.id)">
                    Details &rarr;
                  </button>
                </div>

                <div class="footer-right">
                  <!-- Quick Status Toggle -->
                  @if (goal.status === 1) {
                    <button
                      type="button"
                      class="icon-action-btn"
                      title="Pause Goal"
                      (click)="toggleGoalStatus(goal, 3)">
                      ⏸
                    </button>
                  } @else if (goal.status === 3) {
                    <button
                      type="button"
                      class="icon-action-btn"
                      title="Resume Goal"
                      (click)="toggleGoalStatus(goal, 1)">
                      ▶
                    </button>
                  }

                  <!-- Edit -->
                  <button
                    type="button"
                    class="icon-action-btn"
                    title="Edit Goal"
                    (click)="openEditModal(goal)">
                    ✏️
                  </button>

                  <!-- Delete -->
                  <button
                    type="button"
                    class="icon-action-btn btn-del"
                    title="Delete Goal"
                    (click)="confirmDeleteGoal(goal)">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- MODAL: CREATE / EDIT GOAL -->
      @if (showGoalModal()) {
        <div class="modal-backdrop" (click)="closeGoalModal()">
          <div class="modal-dialog card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-emoji">{{ isEditing() ? editGoalForm.value.icon || '🎯' : newGoalForm.value.icon || '🎯' }}</span>
                <div>
                  <h3 class="modal-title">{{ isEditing() ? 'Edit Financial Goal' : 'Create New Financial Goal' }}</h3>
                  <p class="modal-subtitle">Define target amount, category, deadline and milestones</p>
                </div>
              </div>
              <button type="button" class="modal-close" (click)="closeGoalModal()">✕</button>
            </div>

            <form [formGroup]="isEditing() ? editGoalForm : newGoalForm" (ngSubmit)="saveGoal()" class="modal-form">
              <!-- Title -->
              <div class="form-group">
                <label class="form-label">Goal Title <span class="req">*</span></label>
                <input
                  type="text"
                  formControlName="title"
                  placeholder="e.g. Dream Car, Europe Vacation, Emergency Fund, Home Downpayment"
                  class="form-control"
                />
              </div>

              <!-- Category & Priority Row -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Category <span class="req">*</span></label>
                  <select
                    formControlName="category"
                    class="form-control"
                    (ngModelChange)="onCategorySelected($event)"
                  >
                    @for (cat of categoryOptions; track cat.value) {
                      <option [value]="cat.value">{{ cat.icon }} {{ cat.label }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Priority <span class="req">*</span></label>
                  <select formControlName="priority" class="form-control">
                    <option [value]="4">Urgent (Highest)</option>
                    <option [value]="3">High</option>
                    <option [value]="2">Medium</option>
                    <option [value]="1">Low</option>
                  </select>
                </div>
              </div>

              <!-- Target Amount & Initial Amount -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Target Amount (₹) <span class="req">*</span></label>
                  <input
                    type="number"
                    formControlName="targetAmount"
                    placeholder="e.g. 1500000"
                    min="1"
                    class="form-control"
                  />
                </div>

                @if (!isEditing()) {
                  <div class="form-group">
                    <label class="form-label">Initial Saved Amount (₹)</label>
                    <input
                      type="number"
                      formControlName="initialAmount"
                      placeholder="e.g. 50000"
                      min="0"
                      class="form-control"
                    />
                  </div>
                } @else {
                  <div class="form-group">
                    <label class="form-label">Status <span class="req">*</span></label>
                    <select formControlName="status" class="form-control">
                      <option [value]="1">⏳ In Progress</option>
                      <option [value]="2">🎉 Achieved</option>
                      <option [value]="3">⏸ Paused</option>
                      <option [value]="4">🚫 Abandoned</option>
                    </select>
                  </div>
                }
              </div>

              <!-- Target Date (Deadline) -->
              <div class="form-group">
                <label class="form-label">Target Completion Date (Optional)</label>
                <input
                  type="date"
                  formControlName="targetDate"
                  class="form-control"
                />
                <span class="field-hint">Used to calculate suggested monthly savings pace</span>
              </div>

              <!-- Emoji & Accent Color -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Goal Emoji Icon</label>
                  <div class="emoji-picker-row">
                    @for (emo of emojiPresets; track emo) {
                      <button
                        type="button"
                        class="emoji-chip"
                        [class.selected]="(isEditing() ? editGoalForm.value.icon : newGoalForm.value.icon) === emo"
                        (click)="setEmoji(emo)">
                        {{ emo }}
                      </button>
                    }
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Color Theme</label>
                  <div class="color-picker-row">
                    @for (c of colorPresets; track c) {
                      <button
                        type="button"
                        class="color-chip"
                        [style.background-color]="c"
                        [class.selected]="(isEditing() ? editGoalForm.value.color : newGoalForm.value.color) === c"
                        (click)="setColor(c)">
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Description / Notes -->
              <div class="form-group">
                <label class="form-label">Description / Motivation</label>
                <textarea
                  formControlName="description"
                  rows="2"
                  placeholder="Why is this dream important to you? What is your strategy?"
                  class="form-control"
                ></textarea>
              </div>

              <!-- Modal Actions -->
              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeGoalModal()">Cancel</button>
                <button
                  type="submit"
                  class="btn-primary"
                  [disabled]="isSaving() || (isEditing() ? editGoalForm.invalid : newGoalForm.invalid)"
                >
                  {{ isSaving() ? 'Saving...' : (isEditing() ? 'Update Goal' : 'Create Goal') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL: QUICK DEPOSIT / CONTRIBUTE -->
      @if (depositTargetGoal(); as targetGoal) {
        <div class="modal-backdrop" (click)="closeDepositModal()">
          <div class="modal-dialog modal-sm card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-emoji">{{ targetGoal.icon || '💰' }}</span>
                <div>
                  <h3 class="modal-title">Deposit to {{ targetGoal.title }}</h3>
                  <p class="modal-subtitle">Add savings towards this dream milestone</p>
                </div>
              </div>
              <button type="button" class="modal-close" (click)="closeDepositModal()">✕</button>
            </div>

            <!-- Mini Goal Progress Summary -->
            <div class="deposit-meta-box">
              <div class="meta-row">
                <span>Current Saved:</span>
                <strong>{{ targetGoal.currentAmount | inrCurrency }}</strong>
              </div>
              <div class="meta-row">
                <span>Remaining Gap:</span>
                <strong class="text-amber">{{ targetGoal.remainingAmount | inrCurrency }}</strong>
              </div>
              <div class="meta-progress-bar">
                <div
                  class="meta-progress-fill"
                  [style.width.%]="targetGoal.percentageAchieved > 100 ? 100 : targetGoal.percentageAchieved"
                  [style.background]="getGradient(targetGoal.color || '#0b57d0')"
                ></div>
              </div>
            </div>

            <form [formGroup]="depositForm" (ngSubmit)="submitDeposit()" class="modal-form">
              <!-- Deposit Amount -->
              <div class="form-group">
                <label class="form-label">Deposit Amount (₹) <span class="req">*</span></label>
                <input
                  type="number"
                  formControlName="amount"
                  placeholder="e.g. 10000"
                  min="1"
                  class="form-control text-lg"
                  autofocus
                />
              </div>

              <!-- Quick Presets -->
              <div class="deposit-presets">
                <button type="button" class="preset-btn" (click)="addPresetDeposit(5000)">+ ₹5,000</button>
                <button type="button" class="preset-btn" (click)="addPresetDeposit(10000)">+ ₹10,000</button>
                <button type="button" class="preset-btn" (click)="addPresetDeposit(25000)">+ ₹25,000</button>
                <button type="button" class="preset-btn" (click)="addPresetDeposit(targetGoal.remainingAmount)">Fill Gap</button>
              </div>

              <!-- Date & Source -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Date</label>
                  <input type="date" formControlName="contributionDate" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Source / Fund</label>
                  <select formControlName="source" class="form-control">
                    <option value="Monthly Savings">Monthly Savings</option>
                    <option value="Salary Bonus">Salary Bonus</option>
                    <option value="Side Hustle / Freelance">Side Hustle / Freelance</option>
                    <option value="Gift / Reward">Gift / Reward</option>
                    <option value="Bank Interest / Dividends">Bank Interest / Dividends</option>
                    <option value="Other">Other Account</option>
                  </select>
                </div>
              </div>

              <!-- Notes -->
              <div class="form-group">
                <label class="form-label">Notes (Optional)</label>
                <input
                  type="text"
                  formControlName="notes"
                  placeholder="e.g. Diwali bonus contribution"
                  class="form-control"
                />
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeDepositModal()">Cancel</button>
                <button
                  type="submit"
                  class="btn-primary"
                  [disabled]="isDepositing() || depositForm.invalid"
                >
                  {{ isDepositing() ? 'Depositing...' : 'Confirm Deposit' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .goals-page {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-fg-default);
      margin: 0;
      letter-spacing: -0.02em;
    }

    .header-badge {
      background: rgba(245, 158, 11, 0.15);
      color: #d97706;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .subtitle {
      color: var(--color-fg-muted);
      font-size: 0.9rem;
      margin: 0.25rem 0 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-icon {
      font-weight: bold;
      margin-right: 0.35rem;
    }

    /* KPI Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .completion-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .completion-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.75rem;
    }

    .completion-title {
      font-size: 0.825rem;
      color: var(--color-fg-muted);
      font-weight: 500;
    }

    .completion-percent {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--color-accent-fg);
    }

    .completion-bar-bg {
      height: 8px;
      background: var(--color-border-subtle);
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 0.75rem;
    }

    .completion-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #0b57d0 0%, #10b981 100%);
      border-radius: 9999px;
      transition: width 0.4s ease;
    }

    .completion-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--color-fg-subtle);
    }

    /* Smart Advisor Banner */
    .advisor-banner {
      background: linear-gradient(135deg, rgba(11, 87, 208, 0.04) 0%, rgba(16, 185, 129, 0.06) 100%);
      border: 1px solid rgba(11, 87, 208, 0.2);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
      position: relative;
    }

    .advisor-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      flex-shrink: 0;
    }

    .advisor-body {
      flex: 1;
      min-width: 0;
    }

    .advisor-header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.25rem;
    }

    .advisor-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-accent-fg);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .advisor-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--color-fg-default);
      margin: 0 0 0.25rem;
    }

    .advisor-achieved {
      font-size: 0.85rem;
      font-weight: normal;
      color: var(--color-fg-muted);
      margin-left: 0.35rem;
    }

    .advisor-text {
      font-size: 0.875rem;
      color: var(--color-fg-muted);
      margin: 0;
      line-height: 1.4;
    }

    .advisor-action {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    /* Toolbar & Filters */
    .toolbar {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 8px;
      padding: 0.875rem 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .status-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
      overflow-x: auto;
    }

    .tab-btn {
      background: transparent;
      border: none;
      padding: 0.4rem 0.85rem;
      font-size: 0.825rem;
      font-weight: 500;
      color: var(--color-fg-muted);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .tab-btn:hover {
      background: var(--color-canvas-surface);
      color: var(--color-fg-default);
    }

    .tab-btn.active {
      background: var(--color-accent-subtle);
      color: var(--color-accent-emphasis);
      font-weight: 600;
    }

    .filter-controls {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
      display: flex;
      align-items: center;
    }

    .search-wrap svg {
      position: absolute;
      left: 0.75rem;
      color: var(--color-fg-subtle);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.45rem 2rem 0.45rem 2.25rem;
      font-size: 0.85rem;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      color: var(--color-fg-default);
      outline: none;
    }

    .search-input:focus {
      border-color: var(--color-accent-fg);
      background: var(--color-canvas-default);
    }

    .clear-search {
      position: absolute;
      right: 0.65rem;
      background: none;
      border: none;
      color: var(--color-fg-muted);
      cursor: pointer;
      font-size: 0.85rem;
    }

    .select-control {
      padding: 0.45rem 0.75rem;
      font-size: 0.85rem;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      color: var(--color-fg-default);
      outline: none;
      cursor: pointer;
    }

    .select-control:focus {
      border-color: var(--color-accent-fg);
    }

    /* Goals Cards Grid */
    .goals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .goal-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-top: 4px solid var(--color-accent-fg);
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .goal-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }

    .goal-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .goal-titles {
      flex: 1;
      min-width: 0;
    }

    .goal-title {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--color-fg-default);
      margin: 0 0 0.35rem;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .goal-title:hover {
      color: var(--color-accent-fg);
      text-decoration: underline;
    }

    .badges-row {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .category-pill {
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      background: var(--color-canvas-surface);
      color: var(--color-fg-muted);
      border: 1px solid var(--color-border-subtle);
    }

    .priority-pill {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .priority-urgent {
      background: rgba(220, 38, 38, 0.12);
      color: #dc2626;
      border: 1px solid rgba(220, 38, 38, 0.25);
    }

    .priority-high {
      background: rgba(234, 88, 12, 0.12);
      color: #ea580c;
      border: 1px solid rgba(234, 88, 12, 0.25);
    }

    .priority-medium {
      background: rgba(14, 116, 144, 0.12);
      color: #0e7490;
      border: 1px solid rgba(14, 116, 144, 0.25);
    }

    .priority-low {
      background: var(--color-canvas-surface);
      color: var(--color-fg-subtle);
      border: 1px solid var(--color-border-subtle);
    }

    .status-pill {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      white-space: nowrap;
    }

    .status-progress {
      background: var(--color-accent-subtle);
      color: var(--color-accent-emphasis);
    }

    .status-achieved {
      background: rgba(16, 185, 129, 0.15);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .status-paused {
      background: rgba(245, 158, 11, 0.15);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .goal-desc {
      font-size: 0.8rem;
      color: var(--color-fg-muted);
      margin: 0 0 0.85rem;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Progress Section */
    .progress-section {
      margin-bottom: 1rem;
    }

    .progress-labels {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 0.775rem;
      margin-bottom: 0.35rem;
    }

    .progress-text {
      color: var(--color-fg-muted);
    }

    .progress-value {
      font-weight: 700;
      font-size: 0.9rem;
    }

    .progress-bar-wrap {
      position: relative;
      height: 9px;
      background: var(--color-border-subtle);
      border-radius: 9999px;
      overflow: visible;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.4s ease;
    }

    .milestone-marker {
      position: absolute;
      top: -2px;
      width: 4px;
      height: 13px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 2px;
      transform: translateX(-50%);
    }

    /* Financial Amounts Row */
    .amounts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-subtle);
      border-radius: 8px;
      padding: 0.65rem 0.5rem;
      margin-bottom: 0.85rem;
      text-align: center;
    }

    .amount-box {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .amount-box:not(:last-child) {
      border-right: 1px solid var(--color-border-subtle);
    }

    .amount-lbl {
      font-size: 0.68rem;
      color: var(--color-fg-subtle);
      text-transform: uppercase;
      font-weight: 500;
    }

    .amount-val {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-fg-default);
    }

    .text-green {
      color: #10b981;
    }

    .text-amber {
      color: #f59e0b;
    }

    /* Timeline & Monthly Pace */
    .timeline-box {
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .timeline-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.775rem;
      color: var(--color-fg-muted);
    }

    .time-lbl {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .time-badge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.1rem 0.45rem;
      border-radius: 4px;
      background: var(--color-canvas-surface);
      color: var(--color-fg-muted);
    }

    .time-badge.badge-warning {
      background: rgba(220, 38, 38, 0.12);
      color: #dc2626;
    }

    .monthly-pace-tip {
      font-size: 0.75rem;
      background: rgba(11, 87, 208, 0.05);
      border: 1px dashed rgba(11, 87, 208, 0.25);
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      color: var(--color-accent-fg);
    }

    /* Card Footer Actions */
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 0.85rem;
      border-top: 1px solid var(--color-border-subtle);
      gap: 0.5rem;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .btn-deposit {
      background: var(--color-accent-subtle);
      color: var(--color-accent-emphasis);
      border: 1px solid rgba(11, 87, 208, 0.2);
      border-radius: 6px;
      font-size: 0.775rem;
      font-weight: 600;
      padding: 0.35rem 0.7rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-deposit:hover {
      background: var(--color-accent-fg);
      color: #ffffff;
    }

    .btn-detail {
      background: transparent;
      border: 1px solid var(--color-border-default);
      color: var(--color-fg-muted);
      border-radius: 6px;
      font-size: 0.775rem;
      padding: 0.35rem 0.65rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-detail:hover {
      background: var(--color-canvas-surface);
      color: var(--color-fg-default);
    }

    .footer-right {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .icon-action-btn {
      background: transparent;
      border: none;
      padding: 0.3rem 0.4rem;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
      color: var(--color-fg-muted);
      transition: background 0.15s ease;
    }

    .icon-action-btn:hover {
      background: var(--color-canvas-surface);
    }

    .icon-action-btn.btn-del:hover {
      background: rgba(220, 38, 38, 0.1);
    }

    /* Buttons */
    .btn-primary {
      background: var(--color-btn-primary-bg);
      color: var(--color-btn-primary-text);
      border: 1px solid var(--color-btn-primary-border);
      border-radius: 6px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
      display: inline-flex;
      align-items: center;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-btn-primary-hover-bg);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--color-canvas-surface);
      color: var(--color-fg-default);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      padding: 0.45rem 0.85rem;
      font-size: 0.825rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-outline {
      background: transparent;
      color: var(--color-fg-default);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-dialog {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 12px;
      width: 100%;
      max-width: 580px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
    }

    .modal-sm {
      max-width: 440px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border-default);
    }

    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-emoji {
      font-size: 1.75rem;
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--color-fg-default);
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: var(--color-fg-muted);
      margin: 0.15rem 0 0;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.15rem;
      color: var(--color-fg-muted);
      cursor: pointer;
      padding: 0.25rem;
    }

    .modal-form {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }

    .form-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--color-fg-default);
    }

    .req {
      color: #dc2626;
    }

    .field-hint {
      font-size: 0.725rem;
      color: var(--color-fg-subtle);
    }

    .form-control {
      width: 100%;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      color: var(--color-fg-default);
      outline: none;
    }

    .form-control:focus {
      border-color: var(--color-accent-fg);
      background: var(--color-canvas-default);
    }

    .form-control.text-lg {
      font-size: 1.25rem;
      font-weight: 600;
      padding: 0.65rem 0.85rem;
    }

    .emoji-picker-row {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .emoji-chip {
      background: var(--color-canvas-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: 6px;
      font-size: 1.1rem;
      padding: 0.3rem 0.5rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .emoji-chip.selected {
      background: var(--color-accent-subtle);
      border-color: var(--color-accent-fg);
      transform: scale(1.1);
    }

    .color-picker-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-top: 0.25rem;
    }

    .color-chip {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .color-chip.selected {
      border-color: #ffffff;
      box-shadow: 0 0 0 2px var(--color-fg-default);
      transform: scale(1.15);
    }

    .deposit-meta-box {
      margin: 1.25rem 1.5rem 0;
      padding: 0.85rem;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-subtle);
      border-radius: 8px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.825rem;
      color: var(--color-fg-muted);
      margin-bottom: 0.25rem;
    }

    .meta-progress-bar {
      height: 6px;
      background: var(--color-border-subtle);
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 0.5rem;
    }

    .meta-progress-fill {
      height: 100%;
      border-radius: 9999px;
    }

    .deposit-presets {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .preset-btn {
      background: var(--color-canvas-surface);
      border: 1px solid var(--color-border-default);
      color: var(--color-fg-muted);
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.775rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s ease;
    }

    .preset-btn:hover {
      background: var(--color-accent-subtle);
      color: var(--color-accent-emphasis);
      border-color: var(--color-accent-fg);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    /* Empty & Loading States */
    .empty-state {
      text-align: center;
      padding: 3.5rem 1.5rem;
      border-radius: 12px;
      background: var(--color-canvas-default);
      border: 1px dashed var(--color-border-default);
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      color: var(--color-fg-default);
      margin: 0 0 0.5rem;
    }

    .empty-state p {
      color: var(--color-fg-muted);
      max-width: 460px;
      margin: 0 auto 1.5rem;
      font-size: 0.9rem;
    }

    .empty-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }

    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .skeleton-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 10px;
      padding: 1.5rem;
      height: 220px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .skeleton-header {
      height: 36px;
      background: var(--color-canvas-surface);
      border-radius: 6px;
    }

    .skeleton-bar {
      height: 12px;
      background: var(--color-canvas-surface);
      border-radius: 6px;
    }

    .skeleton-meta {
      height: 48px;
      background: var(--color-canvas-surface);
      border-radius: 6px;
    }

    @media (max-width: 768px) {
      .goals-page {
        padding: 1rem;
      }

      .goals-grid {
        grid-template-columns: 1fr;
      }

      .form-row {
        flex-direction: column;
        gap: 0.75rem;
      }

      .advisor-banner {
        flex-direction: column;
        align-items: flex-start;
      }

      .advisor-action {
        width: 100%;
      }

      .advisor-action button {
        flex: 1;
      }
    }
  `]
})
export class GoalsComponent implements OnInit {
  private readonly goalsService = inject(GoalsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  public readonly themeService = inject(ThemeService);
  public readonly deletionPermissionsService = inject(DeletionPermissionsService);

  public readonly loading = signal<boolean>(true);
  public readonly goals = signal<Goal[]>([]);
  public readonly summary = signal<GoalsSummary | null>(null);

  // Filters & State
  public readonly selectedStatus = signal<GoalStatus | null>(null);
  public selectedCategory: GoalCategory | null = null;
  public selectedPriority: GoalPriority | null = null;
  public searchQuery = '';
  public sortBy: 'deadline' | 'progress' | 'amount' | 'priority' = 'deadline';

  // Modals State
  public readonly showGoalModal = signal<boolean>(false);
  public readonly isEditing = signal<boolean>(false);
  public readonly editingGoalId = signal<string | null>(null);
  public readonly isSaving = signal<boolean>(false);

  public readonly depositTargetGoal = signal<Goal | null>(null);
  public readonly isDepositing = signal<boolean>(false);

  // Category Presets
  public readonly categoryOptions: GoalCategoryOption[] = [
    { value: GoalCategory.EmergencyFund, label: 'Emergency Fund', icon: '🛡️', defaultEmoji: '🛡️', defaultColor: '#10b981' },
    { value: GoalCategory.DreamHome, label: 'Dream Home / Flat', icon: '🏡', defaultEmoji: '🏡', defaultColor: '#0b57d0' },
    { value: GoalCategory.Vehicle, label: 'Vehicle (Car / Bike)', icon: '🚗', defaultEmoji: '🚗', defaultColor: '#f59e0b' },
    { value: GoalCategory.Vacation, label: 'Vacation / Travel', icon: '✈️', defaultEmoji: '✈️', defaultColor: '#06b6d4' },
    { value: GoalCategory.Gadget, label: 'Tech Gadget / Phone', icon: '💻', defaultEmoji: '💻', defaultColor: '#8b5cf6' },
    { value: GoalCategory.Wedding, label: 'Wedding / Family Event', icon: '💍', defaultEmoji: '💍', defaultColor: '#ec4899' },
    { value: GoalCategory.Education, label: 'Education / Upskilling', icon: '🎓', defaultEmoji: '🎓', defaultColor: '#3b82f6' },
    { value: GoalCategory.Retirement, label: 'Retirement Wealth', icon: '📈', defaultEmoji: '📈', defaultColor: '#14b8a6' },
    { value: GoalCategory.Business, label: 'Business Venture', icon: '🚀', defaultEmoji: '🚀', defaultColor: '#6366f1' },
    { value: GoalCategory.Other, label: 'Other Goal Milestone', icon: '🎯', defaultEmoji: '🎯', defaultColor: '#64748b' }
  ];

  public readonly emojiPresets: string[] = ['🚗', '🏡', '✈️', '💻', '💍', '🎓', '🛡️', '📈', '🚀', '🏖️', '📱', '⌚', '🚴', '🏠', '💰', '🪙'];
  public readonly colorPresets: string[] = ['#0b57d0', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#dc2626', '#64748b'];

  // Form definitions
  public newGoalForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    category: [GoalCategory.Vehicle, Validators.required],
    targetAmount: [null as number | null, [Validators.required, Validators.min(1)]],
    initialAmount: [null as number | null, [Validators.min(0)]],
    targetDate: [''],
    priority: [GoalPriority.Medium, Validators.required],
    color: ['#0b57d0'],
    icon: ['🚗']
  });

  public editGoalForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    category: [GoalCategory.Vehicle, Validators.required],
    targetAmount: [null as number | null, [Validators.required, Validators.min(1)]],
    targetDate: [''],
    priority: [GoalPriority.Medium, Validators.required],
    status: [GoalStatus.InProgress, Validators.required],
    color: ['#0b57d0'],
    icon: ['🚗']
  });

  public depositForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    contributionDate: [new Date().toISOString().substring(0, 10), Validators.required],
    source: ['Monthly Savings'],
    notes: ['']
  });

  // Computed Top Advisor Goal (the one closest to deadline or highest priority that is still in progress)
  public readonly topAdvisorGoal = computed(() => {
    const active = this.goals().filter(g => g.status === GoalStatus.InProgress && g.remainingAmount > 0);
    if (!active.length) return null;

    // Sort by urgent priority first, or closest deadline
    const sorted = [...active].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.daysRemaining != null && b.daysRemaining != null) return a.daysRemaining - b.daysRemaining;
      if (a.daysRemaining != null) return -1;
      if (b.daysRemaining != null) return 1;
      return b.percentageAchieved - a.percentageAchieved;
    });

    return sorted[0];
  });

  // Filtered & Sorted Goals
  public readonly filteredGoals = computed(() => {
    let list = [...this.goals()];

    // Status filter
    if (this.selectedStatus() !== null) {
      list = list.filter(g => g.status === this.selectedStatus());
    }

    // Category filter
    if (this.selectedCategory !== null) {
      list = list.filter(g => g.category === this.selectedCategory);
    }

    // Priority filter
    if (this.selectedPriority !== null) {
      list = list.filter(g => g.priority === this.selectedPriority);
    }

    // Search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(g =>
        g.title.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        g.categoryName.toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (this.sortBy) {
      case 'deadline':
        list.sort((a, b) => {
          if (a.targetDate && b.targetDate) return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
          if (a.targetDate) return -1;
          if (b.targetDate) return 1;
          return 0;
        });
        break;
      case 'progress':
        list.sort((a, b) => b.percentageAchieved - a.percentageAchieved);
        break;
      case 'amount':
        list.sort((a, b) => b.targetAmount - a.targetAmount);
        break;
      case 'priority':
        list.sort((a, b) => b.priority - a.priority);
        break;
    }

    return list;
  });

  ngOnInit(): void {
    this.loadGoals();
  }

  public loadGoals(): void {
    this.loading.set(true);
    this.goalsService.getGoals({
      status: this.selectedStatus(),
      category: this.selectedCategory,
      priority: this.selectedPriority,
      search: this.searchQuery.trim() || null
    }).subscribe({
      next: (res: GetGoalsResponse) => {
        this.goals.set(res.goals);
        this.summary.set(res.summary);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load goals:', err);
        this.loading.set(false);
      }
    });
  }

  public setStatusFilter(status: GoalStatus | null): void {
    this.themeService.playClickSound();
    this.selectedStatus.set(status);
    this.loadGoals();
  }

  public onSearchChange(): void {
    this.loadGoals();
  }

  public sortGoals(): void {
    this.themeService.playClickSound();
  }

  public resetFilters(): void {
    this.themeService.playClickSound();
    this.selectedStatus.set(null);
    this.selectedCategory = null;
    this.selectedPriority = null;
    this.searchQuery = '';
    this.loadGoals();
  }

  public viewGoalDetail(id: string): void {
    this.themeService.playClickSound();
    this.router.navigate(['/goals', id]);
  }

  public getGradient(color: string): string {
    return `linear-gradient(90deg, ${color} 0%, #10b981 100%)`;
  }

  // CREATE / EDIT MODAL METHODS
  public openCreateModal(): void {
    this.themeService.playClickSound();
    this.isEditing.set(false);
    this.editingGoalId.set(null);
    this.newGoalForm.reset({
      title: '',
      description: '',
      category: GoalCategory.Vehicle,
      targetAmount: null,
      initialAmount: null,
      targetDate: '',
      priority: GoalPriority.Medium,
      color: '#0b57d0',
      icon: '🚗'
    });
    this.showGoalModal.set(true);
  }

  public openEditModal(goal: Goal): void {
    this.themeService.playClickSound();
    this.isEditing.set(true);
    this.editingGoalId.set(goal.id);

    const formattedDate = goal.targetDate ? goal.targetDate.substring(0, 10) : '';

    this.editGoalForm.reset({
      title: goal.title,
      description: goal.description || '',
      category: goal.category,
      targetAmount: goal.targetAmount,
      targetDate: formattedDate,
      priority: goal.priority,
      status: goal.status,
      color: goal.color || '#0b57d0',
      icon: goal.icon || '🎯'
    });

    this.showGoalModal.set(true);
  }

  public closeGoalModal(): void {
    this.showGoalModal.set(false);
    this.isEditing.set(false);
    this.editingGoalId.set(null);
  }

  public onCategorySelected(catVal: number | string): void {
    const num = Number(catVal);
    const cat = this.categoryOptions.find(c => c.value === num);
    if (cat) {
      if (this.isEditing()) {
        this.editGoalForm.patchValue({
          icon: cat.defaultEmoji,
          color: cat.defaultColor
        });
      } else {
        this.newGoalForm.patchValue({
          icon: cat.defaultEmoji,
          color: cat.defaultColor
        });
      }
    }
  }

  public setEmoji(emo: string): void {
    this.themeService.playClickSound();
    if (this.isEditing()) {
      this.editGoalForm.patchValue({ icon: emo });
    } else {
      this.newGoalForm.patchValue({ icon: emo });
    }
  }

  public setColor(color: string): void {
    this.themeService.playClickSound();
    if (this.isEditing()) {
      this.editGoalForm.patchValue({ color });
    } else {
      this.newGoalForm.patchValue({ color });
    }
  }

  public saveGoal(): void {
    if (this.isEditing()) {
      if (this.editGoalForm.invalid) return;
      const id = this.editingGoalId();
      if (!id) return;

      this.isSaving.set(true);
      const val = this.editGoalForm.value;
      const payload: UpdateGoalRequest = {
        title: val.title!,
        description: val.description || null,
        category: Number(val.category) as GoalCategory,
        targetAmount: Number(val.targetAmount),
        targetDate: val.targetDate ? new Date(val.targetDate).toISOString() : null,
        priority: Number(val.priority) as GoalPriority,
        status: Number(val.status) as GoalStatus,
        color: val.color || null,
        icon: val.icon || null
      };

      this.goalsService.updateGoal(id, payload).subscribe({
        next: () => {
          this.themeService.playSuccessSound();
          this.isSaving.set(false);
          this.closeGoalModal();
          this.loadGoals();
        },
        error: (err) => {
          console.error('Failed to update goal:', err);
          this.isSaving.set(false);
        }
      });
    } else {
      if (this.newGoalForm.invalid) return;
      this.isSaving.set(true);
      const val = this.newGoalForm.value;
      const payload: CreateGoalRequest = {
        title: val.title!,
        description: val.description || null,
        category: Number(val.category) as GoalCategory,
        targetAmount: Number(val.targetAmount),
        initialAmount: val.initialAmount ? Number(val.initialAmount) : null,
        targetDate: val.targetDate ? new Date(val.targetDate).toISOString() : null,
        priority: Number(val.priority) as GoalPriority,
        color: val.color || null,
        icon: val.icon || null
      };

      this.goalsService.createGoal(payload).subscribe({
        next: () => {
          this.themeService.playSuccessSound();
          this.isSaving.set(false);
          this.closeGoalModal();
          this.loadGoals();
        },
        error: (err) => {
          console.error('Failed to create goal:', err);
          this.isSaving.set(false);
        }
      });
    }
  }

  // STATUS TOGGLE & DELETE
  public toggleGoalStatus(goal: Goal, newStatus: GoalStatus): void {
    this.themeService.playClickSound();
    this.goalsService.changeGoalStatus(goal.id, newStatus).subscribe({
      next: () => {
        this.themeService.playSuccessSound();
        this.loadGoals();
      },
      error: (err) => console.error('Failed to change status:', err)
    });
  }

  public confirmDeleteGoal(goal: Goal): void {
    if (!this.deletionPermissionsService.canDelete('goals')) {
      alert('Goal deletion is currently disabled in your Settings. Please enable it in Settings > Deletion Control Center.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${goal.title}"? This will also remove all contribution history for this goal.`)) {
      this.themeService.playDeleteSound();
      this.goalsService.deleteGoal(goal.id).subscribe({
        next: () => {
          this.loadGoals();
        },
        error: (err) => console.error('Failed to delete goal:', err)
      });
    }
  }

  // QUICK DEPOSIT MODAL METHODS
  public openDepositModal(goal: Goal): void {
    this.themeService.playClickSound();
    this.depositTargetGoal.set(goal);
    this.depositForm.reset({
      amount: null,
      contributionDate: new Date().toISOString().substring(0, 10),
      source: 'Monthly Savings',
      notes: ''
    });
  }

  public closeDepositModal(): void {
    this.depositTargetGoal.set(null);
  }

  public addPresetDeposit(amt: number): void {
    this.themeService.playClickSound();
    this.depositForm.patchValue({ amount: amt });
  }

  public submitDeposit(): void {
    if (this.depositForm.invalid) return;
    const target = this.depositTargetGoal();
    if (!target) return;

    this.isDepositing.set(true);
    const val = this.depositForm.value;
    const payload: AddGoalContributionRequest = {
      amount: Number(val.amount),
      contributionDate: val.contributionDate ? new Date(val.contributionDate).toISOString() : new Date().toISOString(),
      source: val.source || null,
      notes: val.notes || null
    };

    this.goalsService.addContribution(target.id, payload).subscribe({
      next: () => {
        this.themeService.playSuccessSound();
        this.isDepositing.set(false);
        this.closeDepositModal();
        this.loadGoals();
      },
      error: (err) => {
        console.error('Failed to deposit:', err);
        this.isDepositing.set(false);
      }
    });
  }
}

