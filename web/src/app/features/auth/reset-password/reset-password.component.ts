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
    <div class="auth-viewport">
      <div class="auth-container">
        <!-- Brand Logo Header -->
        <div class="auth-brand-header">
          <div class="brand-glyph">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
              <rect width="24" height="24" rx="6" fill="#1f883d" />
              <path d="M12 5v14M16 8H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H7" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
            </svg>
          </div>
          <h1 class="auth-title">Change your password</h1>
          <p class="auth-subtitle">
            Enter a new password for <strong>{{ targetEmail() }}</strong>
          </p>
        </div>

        @if (successMessage()) {
          <div class="auth-card success-card">
            <div class="success-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#1f883d" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Password Changed!</h2>
            <p>{{ successMessage() }}</p>
            <a routerLink="/auth/login" class="btn-github-primary">Sign in with new password</a>
          </div>
        } @else {
          <!-- Main Reset Card -->
          <div class="auth-card">
            @if (errorMessage()) {
              <div class="flash-alert" role="alert">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
              <!-- New Password -->
              <div class="form-group">
                <label for="password" class="field-label">New password</label>
                <div class="input-wrap" [class.has-error]="isFieldInvalid('password')">
                  <input
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    placeholder="Min. 8 characters"
                    autocomplete="new-password"
                    class="primer-input"
                    (input)="updatePasswordChecks()"
                  />
                  <button
                    type="button"
                    class="btn-toggle-eye"
                    (click)="togglePasswordVisibility()"
                    aria-label="Toggle password visibility"
                  >
                    @if (showPassword()) {
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  </button>
                </div>

                <!-- Password Requirements Checklist -->
                <div class="checklist-pills">
                  <span class="chk-pill" [class.met]="hasMinLength()">8+ chars</span>
                  <span class="chk-pill" [class.met]="hasUpper()">Uppercase</span>
                  <span class="chk-pill" [class.met]="hasLower()">Lowercase</span>
                  <span class="chk-pill" [class.met]="hasDigit()">Number</span>
                  <span class="chk-pill" [class.met]="hasSpecial()">Symbol</span>
                </div>
              </div>

              <!-- Confirm Password -->
              <div class="form-group">
                <label for="confirmPassword" class="field-label">Confirm new password</label>
                <div class="input-wrap" [class.has-error]="isFieldInvalid('confirmPassword') || isMismatch()">
                  <input
                    id="confirmPassword"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="confirmPassword"
                    placeholder="Re-type your new password"
                    autocomplete="new-password"
                    class="primer-input"
                  />
                </div>
                @if (isMismatch()) {
                  <span class="error-inline">Passwords do not match.</span>
                }
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                class="btn-github-primary"
                [disabled]="resetForm.invalid || isMismatch() || isLoading()"
              >
                @if (isLoading()) {
                  <span class="spinner-sm"></span>
                  <span>Updating password...</span>
                } @else {
                  <span>Change password</span>
                }
              </button>
            </form>
          </div>

          <!-- Secondary Callout Card -->
          <div class="auth-callout-card">
            <span>Remember your password?</span>
            <a routerLink="/auth/login" class="primer-link">Sign in</a>
          </div>
        }

        <!-- Footer -->
        <footer class="auth-footer-nav">
          <a href="#" (click)="$event.preventDefault()">Terms</a>
          <a href="#" (click)="$event.preventDefault()">Privacy</a>
          <a href="#" (click)="$event.preventDefault()">Docs</a>
          <a href="#" (click)="$event.preventDefault()">Contact Hisaab Support</a>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      background: var(--color-bg-app);
      font-family: var(--font-family-base);
    }

    .auth-viewport {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
      box-sizing: border-box;
    }

    .auth-container {
      width: 100%;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .auth-brand-header {
      text-align: center;
      margin-bottom: 0.5rem;
    }

    .brand-glyph {
      width: 44px;
      height: 44px;
      margin: 0 auto 0.75rem auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .auth-title {
      font-size: 1.5rem;
      font-weight: 300;
      color: var(--color-fg-default);
      margin: 0;
      letter-spacing: -0.02em;
    }

    .auth-subtitle {
      font-size: 0.85rem;
      color: var(--color-fg-muted);
      margin: 0.35rem 0 0 0;
    }

    .auth-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      padding: 1.25rem 1.25rem;
      box-shadow: var(--shadow-sm);
    }

    .success-card {
      text-align: center;
      padding: 2rem 1.5rem;
    }

    .success-icon {
      width: 52px;
      height: 52px;
      background: var(--color-income-bg);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem auto;
    }

    .success-card h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-fg-default);
      margin: 0 0 0.5rem 0;
    }

    .success-card p {
      font-size: 0.875rem;
      color: var(--color-fg-muted);
      margin: 0 0 1.5rem 0;
      line-height: 1.45;
    }

    .flash-alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-expense-bg);
      border: 1px solid var(--color-expense-border);
      color: var(--color-expense);
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.825rem;
      margin-bottom: 1rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .field-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-fg-default);
    }

    .input-wrap {
      display: flex;
      align-items: center;
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      padding: 0 0.75rem;
      transition: all 0.15s ease;
    }

    .input-wrap:focus-within {
      border-color: var(--color-accent-fg);
      box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.2);
    }

    .input-wrap.has-error {
      border-color: var(--color-expense);
    }

    .primer-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      padding: 0.55rem 0;
      font-size: 0.875rem;
      color: var(--color-fg-default);
      font-family: inherit;
    }

    .btn-toggle-eye {
      background: transparent;
      border: none;
      color: var(--color-fg-muted);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .checklist-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.35rem;
    }

    .chk-pill {
      font-size: 0.7rem;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      background: var(--color-canvas-subtle);
      color: var(--color-fg-subtle);
      border: 1px solid var(--color-border-muted);
      transition: all 0.15s ease;
    }

    .chk-pill.met {
      background: var(--color-income-bg);
      color: var(--color-income);
      border-color: var(--color-income-border);
      font-weight: 600;
    }

    .error-inline {
      font-size: 0.75rem;
      color: var(--color-expense);
      margin-top: 0.2rem;
    }

    .btn-github-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.55rem 1rem;
      background: var(--color-btn-primary-bg);
      color: var(--color-btn-primary-text);
      border: 1px solid var(--color-btn-primary-border);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: background-color 0.15s ease;
      text-decoration: none;
      box-sizing: border-box;
      margin-top: 0.25rem;
    }

    .btn-github-primary:hover:not(:disabled) {
      background: var(--color-btn-primary-hover-bg);
    }

    .btn-github-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .auth-callout-card {
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--color-fg-default);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }

    .primer-link {
      color: var(--color-accent-fg);
      text-decoration: none;
      font-weight: 500;
    }

    .primer-link:hover {
      text-decoration: underline;
    }

    .auth-footer-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 1rem;
      font-size: 0.75rem;
    }

    .auth-footer-nav a {
      color: var(--color-fg-muted);
      text-decoration: none;
    }

    .auth-footer-nav a:hover {
      color: var(--color-accent-fg);
      text-decoration: underline;
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  readonly targetEmail = signal<string>('');
  readonly resetToken = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Password Checklist
  readonly hasMinLength = signal<boolean>(false);
  readonly hasUpper = signal<boolean>(false);
  readonly hasLower = signal<boolean>(false);
  readonly hasDigit = signal<boolean>(false);
  readonly hasSpecial = signal<boolean>(false);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const email = params['email'] || '';
      const token = params['token'] || '';

      this.targetEmail.set(email);
      this.resetToken.set(token);

      if (!token) {
        this.errorMessage.set('Reset link is missing a valid token. Please request a new link from the Sign In page.');
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  updatePasswordChecks(): void {
    const pw = this.resetForm.get('password')?.value || '';
    this.hasMinLength.set(pw.length >= 8);
    this.hasUpper.set(/[A-Z]/.test(pw));
    this.hasLower.set(/[a-z]/.test(pw));
    this.hasDigit.set(/[0-9]/.test(pw));
    this.hasSpecial.set(/[\W_]/.test(pw));
  }

  isFieldInvalid(fieldName: 'password' | 'confirmPassword'): boolean {
    const field = this.resetForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isMismatch(): boolean {
    const pw = this.resetForm.get('password')?.value;
    const confirm = this.resetForm.get('confirmPassword')?.value;
    return !!(confirm && pw !== confirm);
  }

  onSubmit(): void {
    if (this.resetForm.invalid || this.isMismatch() || !this.resetToken()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const newPassword = this.resetForm.get('password')?.value!;

    this.authService.resetPassword({
      email: this.targetEmail(),
      token: this.resetToken(),
      newPassword
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'Your password has been reset successfully.');
      },
      error: (err) => {
        this.isLoading.set(false);
        const detail = err.error?.errors?.[0] || err.error?.message || 'Invalid or expired password reset link. Please request a new one.';
        this.errorMessage.set(detail);
      }
    });
  }
}
