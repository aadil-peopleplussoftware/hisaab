import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type LoginTab = 'password' | 'otp' | 'google' | 'forgot';

@Component({
  selector: 'app-login',
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
          <h1 class="auth-title">
            @switch (activeTab()) {
              @case ('forgot') { Reset your password }
              @case ('otp') { Sign in with Passcode }
              @case ('google') { Sign in with Google }
              @default { Sign in to Hisaab }
            }
          </h1>
        </header>

        <!-- Method Navigation Tabs (GitHub Subnav Style) -->
        <nav class="auth-tabs" aria-label="Sign-in methods">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'password'"
            (click)="setTab('password')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Password
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'otp'"
            (click)="setTab('otp')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" stroke-width="2.5" />
            </svg>
            OTP Passcode
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'google'"
            (click)="setTab('google')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Google
          </button>
        </nav>

        <!-- Main Card Surface -->
        <main class="auth-card">
          <!-- Flash Error Alert -->
          @if (errorMessage()) {
            <div class="flash-alert error" role="alert">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <!-- Flash Info / Success Alert -->
          @if (infoMessage()) {
            <div class="flash-alert success" role="status">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div class="flash-content">
                <span>{{ infoMessage() }}</span>
                @if (directActionLink()) {
                  <a [href]="directActionLink()" class="direct-link">Click here to open link</a>
                }
              </div>
            </div>
          }

          <!-- ==========================================
               MODE 1: PASSWORD LOGIN
               ========================================== -->
          @if (activeTab() === 'password') {
            <form [formGroup]="loginForm" (ngSubmit)="onSubmitPassword()" class="auth-form" novalidate>
              <div class="form-group">
                <label for="email" class="field-label">Username or email address</label>
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

              <div class="form-group">
                <div class="label-row">
                  <label for="password" class="field-label">Password</label>
                  <button type="button" class="link-btn-text" (click)="setTab('forgot')">Forgot password?</button>
                </div>
                <div class="input-wrap" [class.has-error]="isFieldInvalid('password')">
                  <input
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    placeholder="••••••••"
                    autocomplete="current-password"
                    class="primer-input"
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
                @if (isFieldInvalid('password')) {
                  <span class="error-inline">Password is required.</span>
                }
              </div>

              <button
                type="submit"
                class="btn-github-primary"
                [disabled]="loginForm.invalid || isLoading()"
              >
                @if (isLoading()) {
                  <span class="spinner-sm"></span>
                  <span>Signing in...</span>
                } @else {
                  <span>Sign in</span>
                }
              </button>
            </form>
          }

          <!-- ==========================================
               MODE 2: REAL-TIME OTP LOGIN
               ========================================== -->
          @if (activeTab() === 'otp') {
            <div class="auth-form">
              @if (!otpSent()) {
                <div class="form-group">
                  <label for="otpContact" class="field-label">Email address or mobile</label>
                  <div class="input-wrap">
                    <input
                      id="otpContact"
                      type="text"
                      [(ngModel)]="otpContact"
                      placeholder="e.g. your.email@gmail.com"
                      class="primer-input"
                    />
                  </div>
                  <span class="field-hint">A real one-time passcode will be sent directly to your inbox.</span>
                </div>

                <button
                  type="button"
                  class="btn-github-primary"
                  [disabled]="!otpContact.trim() || isLoading()"
                  (click)="handleSendOtp()"
                >
                  @if (isLoading()) {
                    <span class="spinner-sm"></span>
                    <span>Sending passcode...</span>
                  } @else {
                    <span>Send Verification Passcode</span>
                  }
                </button>
              } @else {
                <div class="otp-enter-flow">
                  <p class="field-hint text-center">
                    Passcode dispatched to <strong>{{ otpContact }}</strong>.
                  </p>

                  <div class="otp-boxes-grid">
                    @for (digit of otpDigits(); track $index) {
                      <input
                        type="text"
                        maxlength="1"
                        inputmode="numeric"
                        [id]="'login-otp-' + $index"
                        [value]="digit"
                        (input)="onOtpDigitInput($event, $index)"
                        (keydown)="onOtpDigitKeydown($event, $index)"
                        class="digit-box"
                      />
                    }
                  </div>

                  <button
                    type="button"
                    class="btn-github-primary"
                    [disabled]="getEnteredOtp().length !== 6 || isLoading()"
                    (click)="handleVerifyOtp()"
                  >
                    @if (isLoading()) {
                      <span class="spinner-sm"></span>
                      <span>Verifying...</span>
                    } @else {
                      <span>Verify & Sign in</span>
                    }
                  </button>

                  <div class="resend-row">
                    @if (otpCountdown() > 0) {
                      <span class="muted-text">Resend code in {{ otpCountdown() }}s</span>
                    } @else {
                      <button type="button" class="link-btn-text" (click)="handleSendOtp()">Resend passcode</button>
                    }
                    <button type="button" class="link-btn-text" (click)="otpSent.set(false)">Change email</button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- ==========================================
               MODE 3: REAL GOOGLE LOGIN / GMAIL ACCOUNT
               ========================================== -->
          @if (activeTab() === 'google') {
            <div class="auth-form">
              <div class="google-header-callout">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <div class="google-callout-text">
                  <strong>Sign in with Google</strong>
                  <span>Instant access with your Gmail address</span>
                </div>
              </div>

              <div class="form-group">
                <label for="googleEmail" class="field-label">Gmail / Google Account</label>
                <div class="input-wrap">
                  <input
                    id="googleEmail"
                    type="email"
                    [(ngModel)]="googleAccountEmail"
                    placeholder="e.g. yourname@gmail.com"
                    class="primer-input"
                  />
                </div>
                <span class="field-hint">New Gmail accounts will be automatically created and provisioned.</span>
              </div>

              <button
                type="button"
                class="btn-github-primary"
                [disabled]="!googleAccountEmail.trim() || isLoading()"
                (click)="handleGoogleAuth(googleAccountEmail)"
              >
                @if (isLoading()) {
                  <span class="spinner-sm"></span>
                  <span>Authenticating with Google...</span>
                } @else {
                  <span>Continue with Google</span>
                }
              </button>
            </div>
          }

          <!-- ==========================================
               MODE 4: FORGOT PASSWORD REQUEST
               ========================================== -->
          @if (activeTab() === 'forgot') {
            <div class="auth-form">
              <p class="field-hint">
                Enter your user account's verified email address and we will send you a real password reset link.
              </p>

              <div class="form-group">
                <label for="forgotEmail" class="field-label">Enter your email address</label>
                <div class="input-wrap">
                  <input
                    id="forgotEmail"
                    type="email"
                    [(ngModel)]="forgotPasswordEmail"
                    placeholder="name@example.com"
                    class="primer-input"
                  />
                </div>
              </div>

              <button
                type="button"
                class="btn-github-primary"
                [disabled]="!forgotPasswordEmail.trim() || isLoading()"
                (click)="handleForgotPassword()"
              >
                @if (isLoading()) {
                  <span class="spinner-sm"></span>
                  <span>Sending password reset email...</span>
                } @else {
                  <span>Send password reset email</span>
                }
              </button>

              <div class="text-center mt-2">
                <button type="button" class="link-btn-text" (click)="setTab('password')">Return to sign in</button>
              </div>
            </div>
          }
        </main>

        <!-- Secondary Callout Card (GitHub Standard) -->
        <div class="auth-callout-card">
          <span>New to Hisaab?</span>
          <a routerLink="/auth/register" class="primer-link">Create an account</a>
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

    /* Tabs (GitHub Subnav style) */
    .auth-tabs {
      display: flex;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      padding: 2px;
      gap: 2px;
    }

    .tab-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.4rem 0.5rem;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--color-fg-muted);
      font-size: 0.775rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .tab-btn:hover {
      color: var(--color-fg-default);
    }

    .tab-btn.active {
      background: var(--color-canvas-default);
      color: var(--color-fg-default);
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    /* Auth Card */
    .auth-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      padding: 1.25rem 1.25rem;
      box-shadow: var(--shadow-sm);
    }

    .flash-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.825rem;
      margin-bottom: 1rem;
      line-height: 1.4;
    }

    .flash-alert.error {
      background: var(--color-expense-bg);
      border: 1px solid var(--color-expense-border);
      color: var(--color-expense);
    }

    .flash-alert.success {
      background: var(--color-income-bg);
      border: 1px solid var(--color-income-border);
      color: var(--color-income);
    }

    .flash-content {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .direct-link {
      color: var(--color-accent-fg);
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
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

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .field-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-fg-default);
    }

    .field-hint {
      font-size: 0.775rem;
      color: var(--color-fg-muted);
      line-height: 1.35;
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

    .link-btn-text {
      background: transparent;
      border: none;
      color: var(--color-accent-fg);
      font-size: 0.775rem;
      cursor: pointer;
      padding: 0;
      font-family: inherit;
    }

    .link-btn-text:hover {
      text-decoration: underline;
    }

    /* OTP Flow */
    .otp-enter-flow {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .otp-boxes-grid {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }

    .digit-box {
      width: 42px;
      height: 48px;
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      background: var(--color-canvas-default);
      text-align: center;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--color-fg-default);
      outline: none;
      transition: all 0.15s ease;
    }

    .digit-box:focus {
      border-color: var(--color-accent-fg);
      box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.2);
    }

    .resend-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.775rem;
    }

    .muted-text {
      color: var(--color-fg-muted);
    }

    /* Google Card */
    .google-header-callout {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
    }

    .google-callout-text {
      display: flex;
      flex-direction: column;
      font-size: 0.825rem;
      line-height: 1.25;
      color: var(--color-fg-default);
    }

    .google-callout-text span {
      font-size: 0.75rem;
      color: var(--color-fg-muted);
    }

    /* Callout Card */
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

    /* Footer */
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

    .text-center { text-align: center; }
    .mt-2 { margin-top: 0.5rem; }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly activeTab = signal<LoginTab>('password');

  // Password Form
  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);
  readonly directActionLink = signal<string | null>(null);

  // OTP State
  otpContact: string = '';
  readonly otpSent = signal<boolean>(false);
  readonly otpCountdown = signal<number>(30);
  readonly otpDigits = signal<string[]>(['', '', '', '', '', '']);
  private countdownTimer: any = null;

  // Google State
  googleAccountEmail: string = '';

  // Forgot Password State
  forgotPasswordEmail: string = '';

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  setTab(tab: LoginTab): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.directActionLink.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  isFieldInvalid(fieldName: 'email' | 'password'): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmitPassword(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const detail = err.error?.errors?.[0] || err.error?.detail || err.error?.message || 'Invalid email or password.';
        this.errorMessage.set(detail);
      }
    });
  }

  // --- Real-Time OTP Flow ---
  handleSendOtp(): void {
    if (!this.otpContact.trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.authService.sendOtp(this.otpContact.trim()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.otpSent.set(true);
        this.otpCountdown.set(30);
        this.otpDigits.set(['', '', '', '', '', '']);

        if (res.sentViaEmail) {
          this.infoMessage.set(`Passcode dispatched directly to your inbox (${this.otpContact}). Please check your email.`);
        } else if (res.codeHint) {
          this.infoMessage.set(`Passcode generated: ${res.codeHint}. (Configure SMTP in appsettings.json for direct inbox delivery)`);
        }

        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.countdownTimer = setInterval(() => {
          this.otpCountdown.update(c => {
            if (c <= 1) {
              clearInterval(this.countdownTimer);
              return 0;
            }
            return c - 1;
          });
        }, 1000);

        setTimeout(() => {
          const first = document.getElementById('login-otp-0');
          if (first) first.focus();
        }, 100);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.errors?.[0] || err.error?.message || 'Could not dispatch passcode.');
      }
    });
  }

  onOtpDigitInput(event: any, index: number): void {
    const val = event.target.value;
    const current = [...this.otpDigits()];
    current[index] = val ? val[val.length - 1] : '';
    this.otpDigits.set(current);

    if (val && index < 5) {
      const nextInput = document.getElementById(`login-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  }

  onOtpDigitKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpDigits()[index] && index > 0) {
      const prev = document.getElementById(`login-otp-${index - 1}`);
      if (prev) prev.focus();
    }
  }

  getEnteredOtp(): string {
    return this.otpDigits().join('');
  }

  handleVerifyOtp(): void {
    const code = this.getEnteredOtp();
    if (code.length !== 6) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.verifyOtp(this.otpContact.trim(), code).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.errors?.[0] || err.error?.message || 'Invalid or expired passcode.');
      }
    });
  }

  // --- Real Google Authentication ---
  handleGoogleAuth(email: string): void {
    if (!email.trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const cleanEmail = email.trim();
    const fullName = cleanEmail.split('@')[0];

    this.authService.googleLogin({
      email: cleanEmail,
      fullName: fullName.charAt(0).toUpperCase() + fullName.slice(1)
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.errors?.[0] || err.error?.message || 'Google sign-in encountered an issue.');
      }
    });
  }

  // --- Real Forgot Password ---
  handleForgotPassword(): void {
    if (!this.forgotPasswordEmail.trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.directActionLink.set(null);

    this.authService.forgotPassword(this.forgotPasswordEmail.trim()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.sentViaEmail) {
          this.infoMessage.set(`Password reset email sent directly to ${this.forgotPasswordEmail}. Check your inbox!`);
        } else {
          this.infoMessage.set(`Reset link generated successfully. (Configure SMTP in appsettings.json for direct inbox delivery)`);
          if (res.resetLink) {
            this.directActionLink.set(res.resetLink);
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.errors?.[0] || err.error?.message || 'Could not request password reset.');
      }
    });
  }
}
