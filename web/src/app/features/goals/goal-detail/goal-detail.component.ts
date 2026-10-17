import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GoalsService } from '../services/goals.service';
import {
  AddGoalContributionRequest,
  Goal,
  GoalCategory,
  GoalContribution,
  GoalDetail,
  GoalPriority,
  GoalStatus,
  UpdateGoalRequest
} from '../models/goal.model';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { ThemeService } from '../../../core/services/theme.service';
import { DeletionPermissionsService } from '../../../core/services/deletion-permissions.service';

@Component({
  selector: 'app-goal-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, InrCurrencyPipe, StatCardComponent],
  template: `
    <div class="goal-detail-page">
      <!-- Top Action Navigation -->
      <div class="page-nav no-print">
        <button type="button" class="btn-back" (click)="goBack()">
          &larr; Back to Goals
        </button>

        @if (!loading() && detail(); as d) {
          <div class="nav-actions">
            @if (d.goal.status !== 2) {
              <button type="button" class="btn-primary" (click)="openDepositModal()">
                ＋ Record Deposit
              </button>
            }
            <button type="button" class="btn-outline" (click)="openEditModal()">
              ✏️ Edit Goal
            </button>
            @if (d.goal.status === 1) {
              <button type="button" class="btn-outline" (click)="changeStatus(3)">
                ⏸ Pause
              </button>
            } @else if (d.goal.status === 3) {
              <button type="button" class="btn-outline" (click)="changeStatus(1)">
                ▶ Resume
              </button>
            }
            <button
              type="button"
              class="btn-danger-outline"
              [disabled]="!deletionPermissionsService.canDelete('goals')"
              (click)="confirmDeleteGoal()"
            >
              🗑️ Delete
            </button>
          </div>
        }
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state card">
          <div class="skeleton-header"></div>
          <div class="skeleton-grid"></div>
        </div>
      }

      <!-- Main Detail Content -->
      @if (!loading() && detail(); as d) {
        <!-- Goal Banner / Header Card -->
        <div class="goal-hero-card card" [style.border-top-color]="d.goal.color || '#0b57d0'">
          <div class="hero-main">
            <div
              class="hero-icon-badge"
              [style.background-color]="(d.goal.color || '#0b57d0') + '1a'"
              [style.color]="d.goal.color || '#0b57d0'"
            >
              <span>{{ d.goal.icon || '🎯' }}</span>
            </div>

            <div class="hero-info">
              <div class="hero-badges">
                <span class="category-pill">{{ d.goal.categoryName }}</span>
                <span
                  class="priority-pill"
                  [class.priority-urgent]="d.goal.priority === 4"
                  [class.priority-high]="d.goal.priority === 3"
                  [class.priority-medium]="d.goal.priority === 2"
                  [class.priority-low]="d.goal.priority === 1"
                >
                  {{ d.goal.priorityName }}
                </span>
                <span
                  class="status-pill"
                  [class.status-achieved]="d.goal.status === 2"
                  [class.status-paused]="d.goal.status === 3"
                  [class.status-progress]="d.goal.status === 1"
                >
                  @if (d.goal.status === 2) {
                    🎉 Achieved
                  } @else if (d.goal.status === 3) {
                    ⏸ Paused
                  } @else {
                    ⏳ In Progress
                  }
                </span>
              </div>

              <h1 class="hero-title">{{ d.goal.title }}</h1>
              @if (d.goal.description) {
                <p class="hero-desc">{{ d.goal.description }}</p>
              }
            </div>
          </div>

          <!-- Hero Progress Meter -->
          <div class="hero-meter-wrap">
            <div class="meter-labels">
              <div>
                <span class="meter-title">Achievement Progress</span>
                <span class="meter-ratio">{{ d.goal.currentAmount | inrCurrency }} of {{ d.goal.targetAmount | inrCurrency }}</span>
              </div>
              <span class="meter-percent" [style.color]="d.goal.color || '#0b57d0'">
                {{ d.goal.percentageAchieved }}%
              </span>
            </div>

            <div class="meter-bar-bg">
              <div
                class="meter-bar-fill"
                [style.width.%]="d.goal.percentageAchieved > 100 ? 100 : d.goal.percentageAchieved"
                [style.background]="getGradient(d.goal.color || '#0b57d0')"
              ></div>
            </div>

            <!-- 4 Milestone Markers -->
            <div class="milestones-steps">
              <div class="milestone-step" [class.achieved]="d.goal.percentageAchieved >= 25">
                <div class="step-dot">✓</div>
                <span class="step-label">25% Started</span>
              </div>
              <div class="milestone-step" [class.achieved]="d.goal.percentageAchieved >= 50">
                <div class="step-dot">✓</div>
                <span class="step-label">50% Halfway</span>
              </div>
              <div class="milestone-step" [class.achieved]="d.goal.percentageAchieved >= 75">
                <div class="step-dot">✓</div>
                <span class="step-label">75% Close</span>
              </div>
              <div class="milestone-step" [class.achieved]="d.goal.percentageAchieved >= 100">
                <div class="step-dot">🎉</div>
                <span class="step-label">100% Goal Reached</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Celebration Alert if Achieved -->
        @if (d.goal.status === 2 || d.goal.percentageAchieved >= 100) {
          <div class="celebration-banner card">
            <div class="celebration-icon">🏆</div>
            <div class="celebration-body">
              <h3>Dream Milestone Conquered!</h3>
              <p>Congratulations! You have successfully reached your <strong>{{ d.goal.targetAmount | inrCurrency }}</strong> target for <strong>{{ d.goal.title }}</strong>.</p>
            </div>
          </div>
        }

        <!-- Financial KPI Metric Cards -->
        <div class="kpi-grid">
          <app-stat-card
            title="Total Target Amount"
            [amount]="d.goal.targetAmount"
            subtitle="Target goal milestone"
            variant="neutral"
          />
          <app-stat-card
            title="Accumulated Savings"
            [amount]="d.goal.currentAmount"
            subtitle="{{ d.contributions.length }} deposits recorded"
            variant="income"
          />
          <app-stat-card
            title="Remaining Amount Gap"
            [amount]="d.goal.remainingAmount"
            subtitle="{{ d.goal.remainingAmount <= 0 ? 'Fully funded' : 'Pending balance needed' }}"
            variant="expense"
          />
          <div class="stat-card pacing-stat-card">
            <span class="pacing-title">Savings Pace Advisor</span>
            @if (d.goal.suggestedMonthlySavings && d.goal.suggestedMonthlySavings > 0) {
              <div class="pacing-amount text-accent">
                {{ d.goal.suggestedMonthlySavings | inrCurrency }} / mo
              </div>
              <span class="pacing-sub">
                Target date: <strong>{{ d.goal.formattedTargetDate }}</strong> ({{ d.goal.monthsRemaining }} months left)
              </span>
            } @else if (d.goal.targetDate) {
              <div class="pacing-amount text-amber">
                {{ d.goal.daysRemaining }} Days Left
              </div>
              <span class="pacing-sub">Target deadline: {{ d.goal.formattedTargetDate }}</span>
            } @else {
              <div class="pacing-amount text-muted">
                No Deadline Set
              </div>
              <span class="pacing-sub">Set a target completion date to calculate monthly pacing</span>
            }
          </div>
        </div>

        <!-- Contributions History Section -->
        <div class="contributions-card card">
          <div class="contributions-header">
            <div>
              <h2 class="section-title">Savings & Contribution History</h2>
              <p class="section-subtitle">Track every deposit made towards this dream</p>
            </div>
            @if (d.goal.status !== 2) {
              <button type="button" class="btn-sm btn-primary" (click)="openDepositModal()">
                ＋ Add Deposit
              </button>
            }
          </div>

          @if (d.contributions.length === 0) {
            <div class="empty-contributions">
              <span class="empty-emoji">🪙</span>
              <p>No savings deposits recorded yet for this goal.</p>
              <button type="button" class="btn-sm btn-outline" (click)="openDepositModal()">
                Record First Deposit
              </button>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="contributions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Funding Source</th>
                    <th>Notes</th>
                    <th class="th-action">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of d.contributions; track c.id) {
                    <tr>
                      <td class="td-date">
                        {{ c.contributionDate | date:'mediumDate' }}
                      </td>
                      <td class="td-amount">
                        <span class="amount-badge text-green">+ {{ c.amount | inrCurrency }}</span>
                      </td>
                      <td class="td-source">
                        <span class="source-tag">{{ c.source || 'Direct Savings' }}</span>
                      </td>
                      <td class="td-notes">
                        {{ c.notes || '—' }}
                      </td>
                      <td class="td-action">
                        <button
                          type="button"
                          class="btn-delete-row"
                          title="Delete Contribution"
                          (click)="confirmDeleteContribution(c.id, c.amount)"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- MODAL: ADD CONTRIBUTION / DEPOSIT -->
      @if (showDepositModal()) {
        <div class="modal-backdrop" (click)="closeDepositModal()">
          <div class="modal-dialog modal-sm card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-emoji">💰</span>
                <div>
                  <h3 class="modal-title">Record Savings Deposit</h3>
                  <p class="modal-subtitle">Fund your milestone toward {{ detail()?.goal?.title }}</p>
                </div>
              </div>
              <button type="button" class="modal-close" (click)="closeDepositModal()">✕</button>
            </div>

            <form [formGroup]="depositForm" (ngSubmit)="submitDeposit()" class="modal-form">
              <div class="form-group">
                <label class="form-label">Deposit Amount (₹) <span class="req">*</span></label>
                <input
                  type="number"
                  formControlName="amount"
                  placeholder="e.g. 15000"
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
                @if (detail()?.goal?.remainingAmount; as rem) {
                  @if (rem > 0) {
                    <button type="button" class="preset-btn" (click)="addPresetDeposit(rem)">Fill Gap</button>
                  }
                }
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Date <span class="req">*</span></label>
                  <input type="date" formControlName="contributionDate" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Funding Source</label>
                  <select formControlName="source" class="form-control">
                    <option value="Monthly Savings">Monthly Savings</option>
                    <option value="Salary Bonus">Salary Bonus</option>
                    <option value="Side Hustle / Freelance">Side Hustle / Freelance</option>
                    <option value="Gift / Reward">Gift / Reward</option>
                    <option value="Bank Interest / Dividends">Bank Interest / Dividends</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Notes (Optional)</label>
                <input
                  type="text"
                  formControlName="notes"
                  placeholder="e.g. End of month allocation"
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

      <!-- MODAL: EDIT GOAL -->
      @if (showEditModal()) {
        <div class="modal-backdrop" (click)="closeEditModal()">
          <div class="modal-dialog card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-emoji">{{ editGoalForm.value.icon || '🎯' }}</span>
                <div>
                  <h3 class="modal-title">Edit Financial Goal</h3>
                  <p class="modal-subtitle">Update targets, status, dates or category</p>
                </div>
              </div>
              <button type="button" class="modal-close" (click)="closeEditModal()">✕</button>
            </div>

            <form [formGroup]="editGoalForm" (ngSubmit)="submitEditGoal()" class="modal-form">
              <div class="form-group">
                <label class="form-label">Goal Title <span class="req">*</span></label>
                <input type="text" formControlName="title" class="form-control" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Category <span class="req">*</span></label>
                  <select formControlName="category" class="form-control">
                    <option [value]="1">🛡️ Emergency Fund</option>
                    <option [value]="2">🏡 Dream Home / Flat</option>
                    <option [value]="3">🚗 Vehicle (Car / Bike)</option>
                    <option [value]="4">✈️ Vacation / Travel</option>
                    <option [value]="5">💻 Tech Gadget / Phone</option>
                    <option [value]="6">💍 Wedding / Event</option>
                    <option [value]="7">🎓 Education / Upskilling</option>
                    <option [value]="8">📈 Retirement Wealth</option>
                    <option [value]="9">🚀 Business Venture</option>
                    <option [value]="10">🎯 Other Goal</option>
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

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Target Amount (₹) <span class="req">*</span></label>
                  <input type="number" formControlName="targetAmount" min="1" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">Status <span class="req">*</span></label>
                  <select formControlName="status" class="form-control">
                    <option [value]="1">⏳ In Progress</option>
                    <option [value]="2">🎉 Achieved</option>
                    <option [value]="3">⏸ Paused</option>
                    <option [value]="4">🚫 Abandoned</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Target Completion Date (Optional)</label>
                <input type="date" formControlName="targetDate" class="form-control" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Goal Emoji Icon</label>
                  <div class="emoji-picker-row">
                    @for (emo of emojiPresets; track emo) {
                      <button
                        type="button"
                        class="emoji-chip"
                        [class.selected]="editGoalForm.value.icon === emo"
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
                        [class.selected]="editGoalForm.value.color === c"
                        (click)="setColor(c)">
                      </button>
                    }
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Description / Motivation</label>
                <textarea formControlName="description" rows="2" class="form-control"></textarea>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeEditModal()">Cancel</button>
                <button
                  type="submit"
                  class="btn-primary"
                  [disabled]="isEditingSaving() || editGoalForm.invalid"
                >
                  {{ isEditingSaving() ? 'Saving...' : 'Update Goal' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .goal-detail-page {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn-back {
      background: transparent;
      border: 1px solid var(--color-border-default);
      color: var(--color-fg-muted);
      border-radius: 6px;
      padding: 0.45rem 0.85rem;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-back:hover {
      background: var(--color-canvas-surface);
      color: var(--color-fg-default);
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* Goal Hero Card */
    .goal-hero-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-top: 5px solid var(--color-accent-fg);
      border-radius: 12px;
      padding: 1.75rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .hero-main {
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }

    .hero-icon-badge {
      width: 64px;
      height: 64px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.25rem;
      flex-shrink: 0;
    }

    .hero-info {
      flex: 1;
      min-width: 0;
    }

    .hero-badges {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 0.4rem;
    }

    .category-pill {
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: var(--color-canvas-surface);
      color: var(--color-fg-muted);
      border: 1px solid var(--color-border-subtle);
    }

    .priority-pill {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
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
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
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

    .hero-title {
      font-size: 1.65rem;
      font-weight: 700;
      color: var(--color-fg-default);
      margin: 0 0 0.4rem;
      letter-spacing: -0.02em;
    }

    .hero-desc {
      font-size: 0.925rem;
      color: var(--color-fg-muted);
      margin: 0;
      line-height: 1.5;
    }

    /* Hero Progress Meter */
    .hero-meter-wrap {
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-subtle);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
    }

    .meter-labels {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.75rem;
    }

    .meter-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-fg-default);
      display: block;
    }

    .meter-ratio {
      font-size: 0.8rem;
      color: var(--color-fg-subtle);
    }

    .meter-percent {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .meter-bar-bg {
      height: 12px;
      background: var(--color-border-default);
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 1.25rem;
    }

    .meter-bar-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.5s ease;
    }

    .milestones-steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
    }

    .milestone-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      text-align: center;
      opacity: 0.45;
      transition: opacity 0.2s ease;
    }

    .milestone-step.achieved {
      opacity: 1;
    }

    .step-dot {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--color-canvas-default);
      border: 2px solid var(--color-border-default);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: bold;
      color: var(--color-fg-muted);
    }

    .milestone-step.achieved .step-dot {
      background: #10b981;
      border-color: #10b981;
      color: #ffffff;
    }

    .step-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-fg-muted);
    }

    .milestone-step.achieved .step-label {
      color: var(--color-fg-default);
      font-weight: 600;
    }

    /* Celebration Banner */
    .celebration-banner {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(245, 158, 11, 0.1) 100%);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .celebration-icon {
      font-size: 2.5rem;
      flex-shrink: 0;
    }

    .celebration-body h3 {
      font-size: 1.2rem;
      color: #065f46;
      margin: 0 0 0.25rem;
    }

    .celebration-body p {
      font-size: 0.875rem;
      color: var(--color-fg-muted);
      margin: 0;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .pacing-stat-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .pacing-title {
      font-size: 0.825rem;
      color: var(--color-fg-muted);
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .pacing-amount {
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 0.35rem;
    }

    .pacing-sub {
      font-size: 0.75rem;
      color: var(--color-fg-subtle);
    }

    .text-accent {
      color: var(--color-accent-fg);
    }

    .text-amber {
      color: #f59e0b;
    }

    .text-green {
      color: #10b981;
    }

    .text-muted {
      color: var(--color-fg-muted);
    }

    /* Contributions History Card */
    .contributions-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .contributions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .section-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--color-fg-default);
      margin: 0;
    }

    .section-subtitle {
      font-size: 0.8rem;
      color: var(--color-fg-muted);
      margin: 0.15rem 0 0;
    }

    .empty-contributions {
      text-align: center;
      padding: 2.5rem 1rem;
      border: 1px dashed var(--color-border-default);
      border-radius: 8px;
    }

    .empty-emoji {
      font-size: 2.25rem;
      display: block;
      margin-bottom: 0.5rem;
    }

    .empty-contributions p {
      font-size: 0.875rem;
      color: var(--color-fg-muted);
      margin-bottom: 1rem;
    }

    /* Table */
    .table-responsive {
      overflow-x: auto;
    }

    .contributions-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      text-align: left;
    }

    .contributions-table th {
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-fg-subtle);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 1px solid var(--color-border-default);
      background: var(--color-canvas-subtle);
    }

    .contributions-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--color-border-subtle);
      color: var(--color-fg-default);
    }

    .contributions-table tr:hover {
      background: var(--color-canvas-surface);
    }

    .td-date {
      white-space: nowrap;
      font-weight: 500;
    }

    .amount-badge {
      font-weight: 700;
      font-size: 0.925rem;
    }

    .source-tag {
      font-size: 0.75rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-fg-muted);
    }

    .td-notes {
      color: var(--color-fg-muted);
      font-size: 0.825rem;
    }

    .th-action, .td-action {
      text-align: right;
    }

    .btn-delete-row {
      background: transparent;
      border: none;
      color: var(--color-fg-subtle);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: all 0.15s ease;
    }

    .btn-delete-row:hover {
      background: rgba(220, 38, 38, 0.12);
      color: #dc2626;
    }

    /* Buttons */
    .btn-primary {
      background: var(--color-btn-primary-bg);
      color: var(--color-btn-primary-text);
      border: 1px solid var(--color-btn-primary-border);
      border-radius: 6px;
      padding: 0.45rem 0.95rem;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-btn-primary-hover-bg);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-outline {
      background: transparent;
      color: var(--color-fg-default);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      padding: 0.45rem 0.95rem;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-outline:hover {
      background: var(--color-canvas-surface);
    }

    .btn-danger-outline {
      background: transparent;
      color: #dc2626;
      border: 1px solid rgba(220, 38, 38, 0.3);
      border-radius: 6px;
      padding: 0.45rem 0.95rem;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-danger-outline:hover:not(:disabled) {
      background: rgba(220, 38, 38, 0.08);
    }

    .btn-danger-outline:disabled {
      opacity: 0.4;
      cursor: not-allowed;
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

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .loading-state {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .skeleton-header {
      height: 80px;
      background: var(--color-canvas-surface);
      border-radius: 8px;
    }

    .skeleton-grid {
      height: 240px;
      background: var(--color-canvas-surface);
      border-radius: 8px;
    }

    @media (max-width: 768px) {
      .goal-detail-page {
        padding: 1rem;
      }

      .hero-main {
        flex-direction: column;
      }

      .form-row {
        flex-direction: column;
        gap: 0.75rem;
      }

      .milestones-steps {
        grid-template-columns: repeat(2, 1fr);
        row-gap: 1rem;
      }
    }
  `]
})
export class GoalDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly goalsService = inject(GoalsService);
  public readonly themeService = inject(ThemeService);
  public readonly deletionPermissionsService = inject(DeletionPermissionsService);

  public readonly goalId = signal<string | null>(null);
  public readonly loading = signal<boolean>(true);
  public readonly detail = signal<GoalDetail | null>(null);

  // Modals state
  public readonly showDepositModal = signal<boolean>(false);
  public readonly isDepositing = signal<boolean>(false);

  public readonly showEditModal = signal<boolean>(false);
  public readonly isEditingSaving = signal<boolean>(false);

  public readonly emojiPresets: string[] = ['🚗', '🏡', '✈️', '💻', '💍', '🎓', '🛡️', '📈', '🚀', '🏖️', '📱', '⌚', '🚴', '🏠', '💰', '🪙'];
  public readonly colorPresets: string[] = ['#0b57d0', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#dc2626', '#64748b'];

  public depositForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    contributionDate: [new Date().toISOString().substring(0, 10), Validators.required],
    source: ['Monthly Savings'],
    notes: ['']
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.goalId.set(id);
      this.loadGoalDetail(id);
    } else {
      this.goBack();
    }
  }

  public loadGoalDetail(id: string): void {
    this.loading.set(true);
    this.goalsService.getGoalById(id).subscribe({
      next: (res: GoalDetail) => {
        this.detail.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load goal detail:', err);
        this.loading.set(false);
      }
    });
  }

  public goBack(): void {
    this.themeService.playClickSound();
    this.router.navigate(['/goals']);
  }

  public getGradient(color: string): string {
    return `linear-gradient(90deg, ${color} 0%, #10b981 100%)`;
  }

  // STATUS CHANGE
  public changeStatus(newStatus: GoalStatus): void {
    const id = this.goalId();
    if (!id) return;
    this.themeService.playClickSound();
    this.goalsService.changeGoalStatus(id, newStatus).subscribe({
      next: () => {
        this.themeService.playSuccessSound();
        this.loadGoalDetail(id);
      },
      error: (err) => console.error('Failed to change status:', err)
    });
  }

  // DELETE GOAL
  public confirmDeleteGoal(): void {
    if (!this.deletionPermissionsService.canDelete('goals')) {
      alert('Goal deletion is currently disabled in your Settings.');
      return;
    }

    const d = this.detail();
    if (!d) return;

    if (confirm(`Are you sure you want to delete "${d.goal.title}"? This cannot be undone.`)) {
      this.themeService.playDeleteSound();
      this.goalsService.deleteGoal(d.goal.id).subscribe({
        next: () => {
          this.router.navigate(['/goals']);
        },
        error: (err) => console.error('Failed to delete goal:', err)
      });
    }
  }

  // DEPOSIT MODAL
  public openDepositModal(): void {
    this.themeService.playClickSound();
    this.depositForm.reset({
      amount: null,
      contributionDate: new Date().toISOString().substring(0, 10),
      source: 'Monthly Savings',
      notes: ''
    });
    this.showDepositModal.set(true);
  }

  public closeDepositModal(): void {
    this.showDepositModal.set(false);
  }

  public addPresetDeposit(amt: number): void {
    this.themeService.playClickSound();
    this.depositForm.patchValue({ amount: amt });
  }

  public submitDeposit(): void {
    if (this.depositForm.invalid) return;
    const id = this.goalId();
    if (!id) return;

    this.isDepositing.set(true);
    const val = this.depositForm.value;
    const payload: AddGoalContributionRequest = {
      amount: Number(val.amount),
      contributionDate: val.contributionDate ? new Date(val.contributionDate).toISOString() : new Date().toISOString(),
      source: val.source || null,
      notes: val.notes || null
    };

    this.goalsService.addContribution(id, payload).subscribe({
      next: (updatedDetail: GoalDetail) => {
        this.themeService.playSuccessSound();
        this.isDepositing.set(false);
        this.closeDepositModal();
        this.detail.set(updatedDetail);
      },
      error: (err) => {
        console.error('Failed to add contribution:', err);
        this.isDepositing.set(false);
      }
    });
  }

  // DELETE CONTRIBUTION
  public confirmDeleteContribution(contribId: string, amount: number): void {
    const id = this.goalId();
    if (!id) return;

    if (confirm(`Delete this savings deposit of ₹${amount.toLocaleString('en-IN')}?`)) {
      this.themeService.playDeleteSound();
      this.goalsService.deleteContribution(id, contribId).subscribe({
        next: () => {
          this.loadGoalDetail(id);
        },
        error: (err) => console.error('Failed to delete contribution:', err)
      });
    }
  }

  // EDIT GOAL MODAL
  public openEditModal(): void {
    const d = this.detail();
    if (!d) return;

    this.themeService.playClickSound();
    const formattedDate = d.goal.targetDate ? d.goal.targetDate.substring(0, 10) : '';

    this.editGoalForm.reset({
      title: d.goal.title,
      description: d.goal.description || '',
      category: d.goal.category,
      targetAmount: d.goal.targetAmount,
      targetDate: formattedDate,
      priority: d.goal.priority,
      status: d.goal.status,
      color: d.goal.color || '#0b57d0',
      icon: d.goal.icon || '🎯'
    });

    this.showEditModal.set(true);
  }

  public closeEditModal(): void {
    this.showEditModal.set(false);
  }

  public setEmoji(emo: string): void {
    this.themeService.playClickSound();
    this.editGoalForm.patchValue({ icon: emo });
  }

  public setColor(color: string): void {
    this.themeService.playClickSound();
    this.editGoalForm.patchValue({ color });
  }

  public submitEditGoal(): void {
    if (this.editGoalForm.invalid) return;
    const id = this.goalId();
    if (!id) return;

    this.isEditingSaving.set(true);
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
      next: (updatedDetail: GoalDetail) => {
        this.themeService.playSuccessSound();
        this.isEditingSaving.set(false);
        this.closeEditModal();
        this.detail.set(updatedDetail);
      },
      error: (err) => {
        console.error('Failed to update goal:', err);
        this.isEditingSaving.set(false);
      }
    });
  }
}

