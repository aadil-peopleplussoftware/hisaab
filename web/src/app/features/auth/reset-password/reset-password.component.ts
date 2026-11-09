import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="portal-viewport">
      <!-- Top Header -->
      <header class="portal-header">
        <div class="portal-header-top">
          <div class="portal-logo" routerLink="/">
            <div class="logo-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
                <circle cx="16" cy="16" r="14" fill="#00a65a" />
                <path d="M16 6L18 12L24 10L20 15L25 18L19 20L20 26L16 22L12 26L13 20L7 18L12 15L8 10L14 12Z" fill="#ffffff" />
                <circle cx="16" cy="16" r="3.5" fill="#00a65a" />
              </svg>
            </div>
            <span class="portal-brand-text">Hisaab Support</span>
          </div>

          <div class="portal-header-actions">
            <span class="welcome-label">Welcome</span>
            <div class="action-btn-group">
              <a routerLink="/auth/login" class="btn-portal-login-nav">LOGIN</a>
              <a routerLink="/auth/register" class="btn-portal-signup-nav">SIGN UP</a>
            </div>
          </div>
        </div>

        <nav class="portal-subnav" aria-label="Portal Navigation">
          <a routerLink="/" class="subnav-link">Home</a>
          <a href="#" (click)="$event.preventDefault()" class="subnav-link">Solutions</a>
          <a href="#" (click)="$event.preventDefault()" class="subnav-link">Documentation</a>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="portal-main">
        <div class="portal-card">
          <h1 class="card-title">Change your password</h1>

          @if (successMessage()) {
            <div class="alert-box success">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <div class="alert-text">
                <strong>Password Changed Successfully!</strong>
                <span>{{ successMessage() }}</span>
              </div>
            </div>

            <hr class="card-divider" />

            <div class="action-footer-row" style="margin-left: 0;">
              <a routerLink="/auth/login" class="btn-solid-green">SIGN IN WITH NEW PASSWORD</a>
            </div>
          } @else {
            @if (errorMessage()) {
              <div class="alert-box error" role="alert">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="form-horizontal" novalidate>
              <!-- New Password Row -->
              <div class="field-row">
                <label for="new-password" class="field-label">
                  New password <span class="required">*</span>
                </label>
                <div class="field-control">
                  <div class="password-input-wrap">
                    <input
                      id="new-password"
                      [type]="showPassword() ? 'text' : 'password'"
                      formControlName="password"
                      autocomplete="new-password"
                      placeholder="Min. 8 characters"
                      class="clean-input password-input"
                      [class.error-border]="isFieldInvalid('password')"
                      (input)="updatePasswordChecks()"
                    />
                    <button
                      type="button"
                      class="toggle-eye-btn"
                      (click)="togglePasswordVisibility()"
                      [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                    >
                      @if (showPassword()) {
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6b7280" stroke-width="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6b7280" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      }
                    </button>
                  </div>
                  @if (isFieldInvalid('password')) {
                    <span class="field-error-msg">Password must be at least 8 characters.</span>
                  }
                </div>
              </div>

              <!-- Confirm Password Row -->
              <div class="field-row">
                <label for="confirm-password" class="field-label">
                  Confirm password <span class="required">*</span>
                </label>
                <div class="field-control">
                  <div class="password-input-wrap">
                    <input
                      id="confirm-password"
                      [type]="showPassword() ? 'text' : 'password'"
                      formControlName="confirmPassword"
                      autocomplete="new-password"
                      placeholder="Re-type password"
                      class="clean-input password-input"
                      [class.error-border]="isFieldInvalid('confirmPassword') || isMismatch()"
                    />
                  </div>
                  @if (isMismatch()) {
                    <span class="field-error-msg">Passwords do not match.</span>
                  }
                </div>
              </div>

              <hr class="card-divider" />

              <div class="action-footer-row">
                <button
                  type="submit"
                  class="btn-solid-green"
                  [disabled]="resetForm.invalid || isMismatch() || isLoading()"
                >
                  @if (isLoading()) {
                    <span>UPDATING...</span>
                  } @else {
                    <span>CHANGE PASSWORD</span>
                  }
                </button>
                <a routerLink="/auth/login" class="btn-outline-cancel">
                  CANCEL
                </a>
              </div>
            </form>
          }
        </div>
      </main>

      <!-- Footer -->
      <footer class="portal-footer">
        <div class="portal-footer-inner">
          <div class="footer-links">
            <a routerLink="/" class="footer-link">Home</a>
            <span class="footer-sep">-</span>
            <a href="#" (click)="$event.preventDefault()" class="footer-link">Solutions</a>
            <span class="footer-sep">-</span>
            <a href="#" (click)="$event.preventDefault()" class="footer-link">Privacy Policy</a>
            <span class="footer-sep">-</span>
            <a href="#" (click)="$event.preventDefault()" class="footer-link">Terms of Service</a>
          </div>
          <div class="footer-copyright">
            <span>&copy; 2026 Hisaab Support. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f1f5f8;
      color: #333333;
    }

    .portal-viewport {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      width: 100%;
      background-color: #f1f5f8;
    }

    .portal-header {
      background-color: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      padding: 14px 40px 10px;
    }

    .portal-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
    }

    .portal-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      cursor: pointer;
    }

    .logo-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .portal-brand-text {
      font-size: 1.25rem;
      font-weight: 500;
      color: #4b5563;
      letter-spacing: -0.2px;
    }

    .portal-header-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .welcome-label {
      font-size: 0.72rem;
      color: #6b7280;
      margin-bottom: 4px;
      padding-right: 2px;
    }

    .action-btn-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-portal-login-nav {
      background-color: #ffffff;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 6px 16px;
      border-radius: 3px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-decoration: none;
      cursor: pointer;
    }

    .btn-portal-signup-nav {
      background-color: #ffffff;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 6px 16px;
      border-radius: 3px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-decoration: none;
      cursor: pointer;
    }

    .portal-subnav {
      max-width: 1200px;
      margin: 12px auto 0;
      display: flex;
      gap: 28px;
    }

    .subnav-link {
      font-size: 0.82rem;
      color: #6b7280;
      text-decoration: none;
    }

    .subnav-link:hover {
      color: #00a65a;
    }

    .portal-main {
      flex: 1 0 auto;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 40px 16px 60px;
    }

    .portal-card {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
      width: 100%;
      max-width: 620px;
      padding: 36px 44px;
      box-sizing: border-box;
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 28px 0;
      letter-spacing: -0.2px;
    }

    .alert-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 4px;
      font-size: 0.82rem;
      margin-bottom: 20px;
    }

    .alert-box.error {
      background-color: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .alert-box.success {
      background-color: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    .alert-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-horizontal {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .field-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .field-label {
      width: 130px;
      flex-shrink: 0;
      font-size: 0.85rem;
      color: #374151;
      padding-top: 8px;
      text-align: left;
    }

    .required {
      color: #dc2626;
      font-weight: 700;
      margin-left: 2px;
    }

    .field-control {
      flex: 1;
      max-width: 380px;
      display: flex;
      flex-direction: column;
    }

    .clean-input {
      width: 100%;
      height: 38px;
      padding: 0 12px;
      font-size: 0.88rem;
      color: #1f2937;
      background-color: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .clean-input:focus {
      border-color: #34d399;
      outline: none;
      box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.25);
    }

    .clean-input.error-border {
      border-color: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
    }

    .field-error-msg {
      font-size: 0.75rem;
      color: #dc2626;
      margin-top: 4px;
    }

    .password-input-wrap {
      position: relative;
      width: 100%;
    }

    .password-input {
      padding-right: 38px;
    }

    .toggle-eye-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-divider {
      border: 0;
      border-top: 1px solid #e5e7eb;
      margin: 22px 0 18px 0;
    }

    .action-footer-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 146px;
    }

    .btn-solid-green {
      background-color: #00a65a;
      color: #ffffff;
      border: none;
      padding: 9px 24px;
      border-radius: 3px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 0.15s ease, opacity 0.15s ease;
      display: inline-block;
    }

    .btn-solid-green:hover:not(:disabled) {
      background-color: #008d4c;
    }

    .btn-solid-green:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-outline-cancel {
      background-color: #ffffff;
      color: #4b5563;
      border: 1px solid #d1d5db;
      padding: 8px 18px;
      border-radius: 3px;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-decoration: none;
      cursor: pointer;
    }

    .btn-outline-cancel:hover {
      background-color: #f9fafb;
      border-color: #9ca3af;
      color: #111827;
    }

    .portal-footer {
      background-color: #102a43;
      color: #cbd5e1;
      padding: 16px 40px;
      flex-shrink: 0;
    }

    .portal-footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .footer-links {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.8rem;
    }

    .footer-link {
      color: #cbd5e1;
      text-decoration: none;
    }

    .footer-link:hover {
      color: #ffffff;
      text-decoration: underline;
    }

    .footer-sep {
      color: #64748b;
    }

    .footer-copyright {
      font-size: 0.78rem;
      color: #94a3b8;
    }

    @media (max-width: 768px) {
      .portal-header {
        padding: 12px 16px 8px;
      }

      .portal-card {
        padding: 24px 20px;
      }

      .field-row {
        flex-direction: column;
        gap: 6px;
      }

      .field-label {
        width: 100%;
        padding-top: 0;
      }

      .field-control {
        max-width: 100%;
      }

      .action-footer-row {
        margin-left: 0;
      }

      .portal-footer {
        padding: 16px;
      }

      .portal-footer-inner {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly targetEmail = signal<string>('your account');

  private resetToken: string = '';

  ngOnInit(): void {
    this.resetToken = this.route.snapshot.queryParams['token'] || '';
    const emailParam = this.route.snapshot.queryParams['email'];
    if (emailParam) this.targetEmail.set(emailParam);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  updatePasswordChecks(): void {}

  isFieldInvalid(fieldName: 'password' | 'confirmPassword'): boolean {
    const field = this.resetForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isMismatch(): boolean {
    const pw = this.resetForm.get('password')?.value;
    const cpw = this.resetForm.get('confirmPassword')?.value;
    return !!(pw && cpw && pw !== cpw);
  }

  onSubmit(): void {
    if (this.resetForm.invalid || this.isMismatch()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const newPassword = this.resetForm.get('password')?.value!;

    this.authService.resetPassword({
      email: this.targetEmail(),
      token: this.resetToken,
      newPassword: newPassword
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Your password has been reset successfully. You can now log in.');
      },
      error: (err) => {
        this.isLoading.set(false);
        const detail = err.error?.errors?.[0] || err.error?.detail || err.error?.message || 'Invalid or expired password reset link.';
        this.errorMessage.set(detail);
      }
    });
  }
}
