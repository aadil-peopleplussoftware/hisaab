import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="auth-viewport">
      <div class="auth-container">
        <!-- Brand Header -->
        <header class="auth-brand-header">
          <div class="brand-glyph">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
              <rect width="24" height="24" rx="6" fill="#1f883d" />
              <path d="M12 5v14M16 8H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H7" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
            </svg>
          </div>
          <h1 class="auth-title">Create your account</h1>
          <p class="auth-subtitle">Get started with Hisaab Enterprise Finance</p>
        </header>

        <!-- Main Card Surface -->
        <main class="auth-card">
          <!-- Flash Error Alert -->
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

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
            <!-- Full Name -->
            <div class="form-group">
              <label for="fullName" class="field-label">Full Name</label>
              <div class="input-wrap" [class.has-error]="isFieldInvalid('fullName')">
                <input
                  id="fullName"
                  type="text"
                  formControlName="fullName"
                  placeholder="e.g. Rahul Sharma"
                  autocomplete="name"
                  class="primer-input"
                />
              </div>
              @if (isFieldInvalid('fullName')) {
                <span class="error-inline">Full name is required.</span>
              }
            </div>

            <!-- Email Address -->
            <div class="form-group">
              <label for="email" class="field-label">Email Address</label>
              <div class="input-wrap" [class.has-error]="isFieldInvalid('email')">
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  placeholder="name@example.com"
                  autocomplete="email"
                  class="primer-input"
                />
              </div>
              @if (isFieldInvalid('email')) {
                <span class="error-inline">Please enter a valid email address.</span>
              }
            </div>

            <!-- Password -->
            <div class="form-group">
              <label for="password" class="field-label">Password</label>
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

              <!-- Password Checklist -->
              <div class="checklist-pills">
                <span class="chk-pill" [class.met]="hasMinLength()">8+ chars</span>
                <span class="chk-pill" [class.met]="hasUpper()">Uppercase</span>
                <span class="chk-pill" [class.met]="hasLower()">Lowercase</span>
                <span class="chk-pill" [class.met]="hasDigit()">Number</span>
                <span class="chk-pill" [class.met]="hasSpecial()">Symbol</span>
              </div>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              class="btn-github-primary"
              [disabled]="registerForm.invalid || isLoading()"
            >
              @if (isLoading()) {
                <span class="spinner-sm"></span>
                <span>Creating account...</span>
              } @else {
                <span>Create account</span>
              }
            </button>
          </form>

          <!-- Divider -->
          <div class="divider-or">
            <span>or sign up with</span>
          </div>

          <!-- Google Quick Register -->
          <button
            type="button"
            class="btn-github-secondary"
            (click)="handleGoogleQuickRegister()"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </main>

        <!-- Secondary Callout Card (GitHub Standard) -->
        <div class="auth-callout-card">
          <span>Already have an account?</span>
          <a routerLink="/auth/login" class="primer-link">Sign in</a>
        </div>

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
      margin-bottom: 0.25rem;
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
      margin-top: 0.25rem;
    }

    .btn-github-primary:hover:not(:disabled) {
      background: var(--color-btn-primary-hover-bg);
    }

    .btn-github-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .divider-or {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 1rem 0;
      position: relative;
    }

    .divider-or::before {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background: var(--color-border-default);
    }

    .divider-or span {
      position: relative;
      background: var(--color-canvas-default);
      padding: 0 0.5rem;
      font-size: 0.75rem;
      color: var(--color-fg-muted);
    }

    .btn-github-secondary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.55rem 1rem;
      background: var(--color-btn-bg);
      color: var(--color-btn-text);
      border: 1px solid var(--color-btn-border);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: background-color 0.15s ease;
    }

    .btn-github-secondary:hover {
      background: var(--color-btn-hover-bg);
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
      margin-top: 0.5rem;
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
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly registerForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Password Checklist
  readonly hasMinLength = signal<boolean>(false);
  readonly hasUpper = signal<boolean>(false);
  readonly hasLower = signal<boolean>(false);
  readonly hasDigit = signal<boolean>(false);
  readonly hasSpecial = signal<boolean>(false);

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  updatePasswordChecks(): void {
    const pw = this.registerForm.get('password')?.value || '';
    this.hasMinLength.set(pw.length >= 8);
    this.hasUpper.set(/[A-Z]/.test(pw));
    this.hasLower.set(/[a-z]/.test(pw));
    this.hasDigit.set(/[0-9]/.test(pw));
    this.hasSpecial.set(/[\W_]/.test(pw));
  }

  isFieldInvalid(fieldName: 'fullName' | 'email' | 'password'): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, fullName } = this.registerForm.getRawValue();

    this.authService.register({
      email: email!,
      password: password!,
      fullName: fullName!
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const detail = err.error?.errors?.[0] || err.error?.detail || err.error?.message || 'Failed to create account.';
        this.errorMessage.set(detail);
      }
    });
  }

  handleGoogleQuickRegister(): void {
    this.router.navigate(['/auth/login'], { queryParams: { tab: 'google' } });
  }
}
