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
    <div class="portal-viewport">
      <!-- ========================================================
           TOP PORTAL HEADER (Matches reference clean bar)
           ======================================================== -->
      <header class="portal-header">
        <div class="portal-header-top">
          <!-- Logo & Brand Name -->
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

          <!-- Top Right User Greeting & Mode Buttons -->
          <div class="portal-header-actions">
            <span class="welcome-label">Welcome</span>
            <div class="action-btn-group">
              <a
                routerLink="/auth/login"
                class="btn-portal-login-nav"
              >
                LOGIN
              </a>
              <button
                type="button"
                class="btn-portal-signup-nav active"
              >
                SIGN UP
              </button>
            </div>
          </div>
        </div>

        <!-- Secondary Subnavigation Line -->
        <nav class="portal-subnav" aria-label="Portal Navigation">
          <a routerLink="/" class="subnav-link">Home</a>
          <a href="#" (click)="$event.preventDefault()" class="subnav-link">Solutions</a>
          <a href="#" (click)="$event.preventDefault()" class="subnav-link">Documentation</a>
        </nav>
      </header>

      <!-- ========================================================
           MAIN CONTENT BODY & CENTER FORM CARD
           ======================================================== -->
      <main class="portal-main">
        <div class="portal-card">
          <!-- Card Header / Title (Matches "Sign up for your iM3 Support account") -->
          <h1 class="card-title">Sign up for your Hisaab Support account</h1>

          <!-- Alert Error Message -->
          @if (errorMessage()) {
            <div class="alert-box error" role="alert">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="form-horizontal" novalidate>
            <!-- Full Name Row -->
            <div class="field-row">
              <label for="reg-fullname" class="field-label">
                Full name <span class="required">*</span>
              </label>
              <div class="field-control">
                <input
                  id="reg-fullname"
                  type="text"
                  formControlName="fullName"
                  autocomplete="name"
                  placeholder=""
                  class="clean-input focused-look"
                  [class.error-border]="isFieldInvalid('fullName')"
                />
                @if (isFieldInvalid('fullName')) {
                  <span class="field-error-msg">Full name is required.</span>
                }
              </div>
            </div>

            <!-- Email Row -->
            <div class="field-row">
              <label for="reg-email" class="field-label">
                Email <span class="required">*</span>
              </label>
              <div class="field-control">
                <input
                  id="reg-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  placeholder=""
                  class="clean-input"
                  [class.error-border]="isFieldInvalid('email')"
                />
                @if (isFieldInvalid('email')) {
                  <span class="field-error-msg">Please enter a valid email address.</span>
                }
              </div>
            </div>

            <!-- Password Row -->
            <div class="field-row">
              <label for="reg-password" class="field-label">
                Password <span class="required">*</span>
              </label>
              <div class="field-control">
                <div class="password-input-wrap">
                  <input
                    id="reg-password"
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

            <!-- Clean reCAPTCHA Box (Matches reference widget) -->
            <div class="field-row">
              <div class="field-label" aria-hidden="true"></div>
              <div class="field-control">
                <div
                  class="recaptcha-widget"
                  (click)="toggleCaptcha()"
                  role="checkbox"
                  [attr.aria-checked]="captchaVerified()"
                  tabindex="0"
                  (keydown.space)="$event.preventDefault(); toggleCaptcha()"
                >
                  <div class="recaptcha-left">
                    <div class="recaptcha-checkbox" [class.checked]="captchaVerified()">
                      @if (captchaVerified()) {
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#00a65a" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      }
                    </div>
                    <span class="recaptcha-text">I'm not a robot</span>
                  </div>
                  <div class="recaptcha-brand">
                    <svg viewBox="0 0 48 48" width="26" height="26" fill="none">
                      <path d="M24 4C14.06 4 6 12.06 6 22H11C11 14.82 16.82 9 24 9C28.45 9 32.36 11.23 34.69 14.61L30 19H42V7L37.26 11.74C34.02 7.02 28.56 4 24 4Z" fill="#3273dc" />
                      <path d="M42 26H37C37 33.18 31.18 39 24 39C19.55 39 15.64 36.77 13.31 33.39L18 29H6V41L10.74 36.26C13.98 40.98 19.44 44 24 44C33.94 44 42 35.94 42 26Z" fill="#7a7a7a" />
                    </svg>
                    <span class="recaptcha-badge-lbl">reCAPTCHA</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Divider Line -->
            <hr class="card-divider" />

            <!-- Bottom Action Row (REGISTER + CANCEL) -->
            <div class="action-footer-row">
              <button
                type="submit"
                class="btn-solid-green"
                [disabled]="registerForm.invalid || isLoading() || !captchaVerified()"
              >
                @if (isLoading()) {
                  <span>REGISTERING...</span>
                } @else {
                  <span>REGISTER</span>
                }
              </button>
              <button
                type="button"
                class="btn-outline-cancel"
                (click)="onCancel()"
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      </main>

      <!-- ========================================================
           DARK NAVY BLUE FOOTER (Matches reference bar)
           ======================================================== -->
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

    /* Top Header */
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
      transition: all 0.15s ease;
    }

    .btn-portal-login-nav:hover {
      background-color: #f9fafb;
      border-color: #9ca3af;
      color: #111827;
    }

    .btn-portal-signup-nav {
      background-color: #00a65a;
      color: #ffffff;
      border: 1px solid #00a65a;
      padding: 6px 18px;
      border-radius: 3px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
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
      transition: color 0.15s ease;
    }

    .subnav-link:hover {
      color: #00a65a;
    }

    /* Main Content */
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

    /* Alert */
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

    /* Form Layout */
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
      width: 120px;
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

    .clean-input:focus,
    .clean-input.focused-look {
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

    .toggle-eye-btn:hover svg {
      stroke: #111827;
    }

    /* reCAPTCHA Box */
    .recaptcha-widget {
      width: 240px;
      height: 64px;
      background-color: #f9fafb;
      border: 1px solid #d1d5db;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      box-sizing: border-box;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }

    .recaptcha-widget:hover {
      background-color: #f3f4f6;
      border-color: #9ca3af;
    }

    .recaptcha-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .recaptcha-checkbox {
      width: 22px;
      height: 22px;
      border: 2px solid #9ca3af;
      border-radius: 3px;
      background-color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .recaptcha-checkbox.checked {
      border-color: #00a65a;
      background-color: #ffffff;
    }

    .recaptcha-text {
      font-size: 0.8rem;
      color: #1f2937;
      font-weight: 500;
    }

    .recaptcha-brand {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .recaptcha-badge-lbl {
      font-size: 0.6rem;
      color: #9ca3af;
      margin-top: 1px;
    }

    .card-divider {
      border: 0;
      border-top: 1px solid #e5e7eb;
      margin: 22px 0 18px 0;
    }

    /* Action Buttons */
    .action-footer-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 136px;
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
      cursor: pointer;
      transition: background-color 0.15s ease, opacity 0.15s ease;
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
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-outline-cancel:hover {
      background-color: #f9fafb;
      border-color: #9ca3af;
      color: #111827;
    }

    /* Footer */
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
      transition: color 0.15s ease;
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
  readonly captchaVerified = signal<boolean>(true);

  // Password Checklist
  readonly hasMinLength = signal<boolean>(false);
  readonly hasUpper = signal<boolean>(false);
  readonly hasLower = signal<boolean>(false);
  readonly hasDigit = signal<boolean>(false);
  readonly hasSpecial = signal<boolean>(false);

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  toggleCaptcha(): void {
    this.captchaVerified.update(v => !v);
  }

  onCancel(): void {
    this.router.navigate(['/auth/login']);
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

    if (!this.captchaVerified()) {
      this.errorMessage.set('Please verify that you are not a robot.');
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
}
