import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoleRightsService } from '../../core/services/role-rights.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="access-denied-container">
      <div class="access-denied-card">
        <!-- Shield Lock Icon -->
        <div class="icon-bubble">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <circle cx="12" cy="11" r="2"/>
            <path d="M12 13v3"/>
          </svg>
        </div>

        <span class="badge-denied">403 • ACCESS RESTRICTED</span>

        <h1 class="denied-title">Screen Permission Required</h1>

        <p class="denied-message">
          Aapke assigned role (<strong>{{ roleRightsService.currentUserRole() }}</strong>) ke paas
          @if (moduleName()) {
            <strong>"{{ moduleName() }}"</strong> screen
          } @else {
            is screen
          }
          ko <strong>View (Dekhne)</strong> ka right nahi hai.
        </p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Assigned Role:</span>
            <span class="info-val role-pill">{{ roleRightsService.currentUserRole() }}</span>
          </div>
          @if (moduleName()) {
            <div class="info-row">
              <span class="info-label">Required Module:</span>
              <span class="info-val">{{ moduleName() }}</span>
            </div>
          }
          <div class="info-row">
            <span class="info-label">Account:</span>
            <span class="info-val">{{ authService.currentUser()?.email || 'Active User' }}</span>
          </div>
        </div>

        <p class="support-hint">
          Agar aapko is module ki zaroorat hai, toh please apne <strong>System Administrator</strong> se contact karein taaki wo <em>Settings > Role & Rights Matrix</em> me jakar aapke role ko View permission assign kar sakein.
        </p>

        <div class="actions-row">
          <a [routerLink]="fallbackRoute" class="btn-primary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>{{ roleRightsService.canView('Dashboard') ? 'Return to Dashboard' : 'Go to Available Screen' }}</span>
          </a>

          <a routerLink="/profile" class="btn-secondary">
            <span>My Profile</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .access-denied-container {
      min-height: calc(100vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      background: var(--bg-primary, #f8fafc);
    }

    .access-denied-card {
      max-width: 540px;
      width: 100%;
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
      animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.96) translateY(10px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }

    .icon-bubble {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.08);
      color: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.04);
    }

    .badge-denied {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      padding: 4px 12px;
      border-radius: 20px;
      background: #fee2e2;
      color: #b91c1c;
      margin-bottom: 12px;
    }

    .denied-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin: 0 0 12px 0;
      letter-spacing: -0.3px;
    }

    .denied-message {
      font-size: 14.5px;
      line-height: 1.6;
      color: var(--text-secondary, #475569);
      margin: 0 0 24px 0;
    }

    .info-box {
      background: var(--bg-secondary, #f8fafc);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 20px;
      text-align: left;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 13.5px;
    }

    .info-row:not(:last-child) {
      border-bottom: 1px dashed var(--border-color, #e2e8f0);
    }

    .info-label {
      color: var(--text-muted, #64748b);
      font-weight: 500;
    }

    .info-val {
      font-weight: 600;
      color: var(--text-primary, #1e293b);
    }

    .role-pill {
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
    }

    .support-hint {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-muted, #64748b);
      margin-bottom: 28px;
    }

    .actions-row {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #0b57d0;
      color: #ffffff;
      padding: 10px 22px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 2px 6px rgba(11, 87, 208, 0.2);
    }

    .btn-primary:hover {
      background: #0842a0;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(11, 87, 208, 0.3);
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      background: var(--bg-secondary, #f1f5f9);
      color: var(--text-primary, #334155);
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      background: var(--border-color, #e2e8f0);
    }

    @media (max-width: 600px) {
      .access-denied-card {
        padding: 30px 20px;
      }
      .actions-row {
        flex-direction: column;
      }
      .btn-primary, .btn-secondary {
        justify-content: center;
        width: 100%;
      }
    }
  `]
})
export class AccessDeniedComponent implements OnInit {
  private route = inject(ActivatedRoute);
  public roleRightsService = inject(RoleRightsService);
  public authService = inject(AuthService);

  public moduleName = signal<string>('');

  get fallbackRoute(): string {
    if (this.roleRightsService.canView('Dashboard')) return '/dashboard';
    if (this.roleRightsService.canView('Transactions')) return '/transactions';
    if (this.roleRightsService.canView('Investments')) return '/investments';
    if (this.roleRightsService.canView('Loans')) return '/loans';
    if (this.roleRightsService.canView('Goals')) return '/goals';
    if (this.roleRightsService.canView('Epfo')) return '/epfo';
    if (this.roleRightsService.canView('Business')) return '/business';
    if (this.roleRightsService.canView('Reports')) return '/reports';
    if (this.roleRightsService.canView('Settings')) return '/settings';
    return '/profile';
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['module']) {
        this.moduleName.set(params['module']);
      }
    });
  }
}

