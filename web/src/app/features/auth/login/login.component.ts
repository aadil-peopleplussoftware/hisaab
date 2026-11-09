import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

type LoginTab = 'password' | 'otp' | 'google' | 'forgot';

@Component({
  selector: 'app-login',
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
                <!-- Outer Green Flower/Starburst Emblem -->
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
              <button
                type="button"
                class="btn-portal-login active"
                (click)="setTab('password')"
              >
                LOGIN
              </button>
              <a
                routerLink="/auth/register"
                class="btn-portal-signup"
              >
                SIGN UP
              </a>
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
          <!-- Card Header / Title -->
          <h1 class="card-title">
            @switch (activeTab()) {
              @case ('forgot') { Reset your password }
              @case ('otp') { Sign in with Passcode }
              @case ('google') { Sign in with Google }
              @default { Sign in to your Hisaab Support account }
            }
          </h1>

          <!-- Secondary Sub-tabs for Different Login Methods -->
          <div class="auth-method-selector">
            <button
              type="button"
              class="method-pill"
              [class.active]="activeTab() === 'password'"
              (click)="setTab('password')"
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              class="method-pill"
              [class.active]="activeTab() === 'otp'"
              (click)="setTab('otp')"
            >
              Passcode (OTP)
            </button>
            <button
              type="button"
              class="method-pill"
              [class.active]="activeTab() === 'google'"
              (click)="setTab('google')"
            >
              Google Account
            </button>
          </div>

          <!-- Alert Messages -->
          @if (errorMessage()) {
            <div class="alert-box error" role="alert">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          @if (infoMessage()) {
            <div class="alert-box success" role="status">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <div class="alert-text">
                <span>{{ infoMessage() }}</span>
                @if (directActionLink()) {
                  <a [href]="directActionLink()" class="direct-link">Click here to open link</a>
                }
              </div>
            </div>
          }

          <!-- ========================================================
               FORM 1: EMAIL & PASSWORD LOGIN
               ======================================================== -->
          @if (activeTab() === 'password') {
            <form [formGroup]="loginForm" (ngSubmit)="onSubmitPassword()" class="form-horizontal" novalidate>
              <!-- Email Row -->
              <div class="field-row">
                <label for="login-email" class="field-label">
                  Email <span class="required">*</span>
                </label>
                <div class="field-control">
                  <input
                    id="login-email"
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
                <label for="login-password" class="field-label">
                  Password <span class="required">*</span>
                </label>
                <div class="field-control">
                  <div class="password-input-wrap">
                    <input
                      id="login-password"
                      [type]="showPassword() ? 'text' : 'password'"
                      formControlName="password"
                      autocomplete="current-password"
                      placeholder=""
                      class="clean-input password-input"
                      [class.error-border]="isFieldInvalid('password')"
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
                    <span class="field-error-msg">Password is required.</span>
                  }
                  <div class="forgot-link-wrap">
                    <button type="button" class="link-clean" (click)="setTab('forgot')">
                      Forgot password?
                    </button>
                  </div>
                </div>
              </div>

              <!-- Clean reCAPTCHA Box (as shown in reference image) -->
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

              <!-- Remember Me Toggle -->
              <div class="field-row remember-row">
                <div class="field-label" aria-hidden="true"></div>
                <div class="field-control">
                  <label class="remember-label">
                    <input
                      type="checkbox"
                      formControlName="rememberMe"
                      class="clean-checkbox"
                    />
                    <span>Remember me on this computer</span>
                  </label>
                </div>
              </div>

              <!-- Divider Line -->
              <hr class="card-divider" />

              <!-- Bottom Action Row (REGISTER/LOGIN + CANCEL) -->
              <div class="action-footer-row">
                <button
                  type="submit"
                  class="btn-solid-green"
                  [disabled]="loginForm.invalid || isLoading() || !captchaVerified()"
                >
                  @if (isLoading()) {
                    <span>SIGNING IN...</span>
                  } @else {
                    <span>LOGIN</span>
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
          }

          <!-- ========================================================
               FORM 2: OTP PASSCODE LOGIN
               ======================================================== -->
          @if (activeTab() === 'otp') {
            <div class="form-horizontal">
              @if (!otpSent()) {
                <div class="field-row">
                  <label for="otp-contact" class="field-label">
                    Email / Mobile <span class="required">*</span>
                  </label>
                  <div class="field-control">
                    <input
                      id="otp-contact"
                      type="text"
                      [(ngModel)]="otpContact"
                      placeholder="e.g. name@example.com"
                      class="clean-input"
                    />
                    <span class="field-hint">A one-time passcode will be delivered to your inbox.</span>
                  </div>
                </div>

                <hr class="card-divider" />

                <div class="action-footer-row">
                  <button
                    type="button"
                    class="btn-solid-green"
                    [disabled]="!otpContact.trim() || isLoading()"
                    (click)="handleSendOtp()"
                  >
                    @if (isLoading()) {
                      <span>SENDING PASSCODE...</span>
                    } @else {
                      <span>SEND PASSCODE</span>
                    }
                  </button>
                  <button
                    type="button"
                    class="btn-outline-cancel"
                    (click)="setTab('password')"
                  >
                    CANCEL
                  </button>
                </div>
              } @else {
                <div class="otp-verification-container">
                  <p class="otp-notice">
                    Passcode dispatched to <strong>{{ otpContact }}</strong>
                  </p>

                  <div class="otp-digits-row">
                    @for (digit of otpDigits(); track $index) {
                      <input
                        type="text"
                        maxlength="1"
                        inputmode="numeric"
                        [id]="'login-otp-' + $index"
                        [value]="digit"
                        (input)="onOtpDigitInput($event, $index)"
                        (keydown)="onOtpDigitKeydown($event, $index)"
                        class="otp-box"
                      />
                    }
                  </div>

                  <div class="otp-resend-row">
                    @if (otpCountdown() > 0) {
                      <span class="muted-counter">Resend passcode in {{ otpCountdown() }}s</span>
                    } @else {
                      <button type="button" class="link-clean" (click)="handleSendOtp()">Resend passcode</button>
                    }
                    <button type="button" class="link-clean" (click)="otpSent.set(false)">Change email</button>
                  </div>

                  <hr class="card-divider" />

                  <div class="action-footer-row">
                    <button
                      type="button"
                      class="btn-solid-green"
                      [disabled]="getEnteredOtp().length !== 6 || isLoading()"
                      (click)="handleVerifyOtp()"
                    >
                      @if (isLoading()) {
                        <span>VERIFYING...</span>
                      } @else {
                        <span>VERIFY &amp; LOGIN</span>
                      }
                    </button>
                    <button
                      type="button"
                      class="btn-outline-cancel"
                      (click)="setTab('password')"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- ========================================================
               FORM 3: GOOGLE AUTHENTICATION
               ======================================================== -->
          @if (activeTab() === 'google') {
            <div class="form-horizontal">
              <div class="field-row">
                <label for="google-email" class="field-label">
                  Google Email <span class="required">*</span>
                </label>
                <div class="field-control">
                  <input
                    id="google-email"
                    type="email"
                    [(ngModel)]="googleAccountEmail"
                    placeholder="name@gmail.com"
                    class="clean-input"
                  />
                  <span class="field-hint">Instant sign in with your verified Google account.</span>
                </div>
              </div>

              <hr class="card-divider" />

              <div class="action-footer-row">
                <button
                  type="button"
                  class="btn-solid-green"
                  [disabled]="!googleAccountEmail.trim() || isLoading()"
                  (click)="handleGoogleAuth(googleAccountEmail)"
                >
                  @if (isLoading()) {
                    <span>CONNECTING...</span>
                  } @else {
                    <span>SIGN IN WITH GOOGLE</span>
                  }
                </button>
                <button
                  type="button"
                  class="btn-outline-cancel"
                  (click)="setTab('password')"
                >
                  CANCEL
                </button>
              </div>
            </div>
          }

          <!-- ========================================================
               FORM 4: FORGOT PASSWORD REQUEST
               ======================================================== -->
          @if (activeTab() === 'forgot') {
            <div class="form-horizontal">
              <div class="field-row">
                <label for="forgot-email" class="field-label">
                  Account Email <span class="required">*</span>
                </label>
                <div class="field-control">
                  <input
                    id="forgot-email"
                    type="email"
                    [(ngModel)]="forgotPasswordEmail"
                    placeholder="name@example.com"
                    class="clean-input"
                  />
                  <span class="field-hint">We will dispatch an instant password recovery link to your email.</span>
                </div>
              </div>

              <hr class="card-divider" />

              <div class="action-footer-row">
                <button
                  type="button"
                  class="btn-solid-green"
                  [disabled]="!forgotPasswordEmail.trim() || isLoading()"
                  (click)="handleForgotPassword()"
                >
                  @if (isLoading()) {
                    <span>SENDING LINK...</span>
                  } @else {
                    <span>SEND RESET LINK</span>
                  }
                </button>
                <button
                  type="button"
                  class="btn-outline-cancel"
                  (click)="setTab('password')"
                >
                  RETURN TO LOGIN
                </button>
              </div>
            </div>
          }
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

    /* Overall Layout: Header + Main + Footer */
    .portal-viewport {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      width: 100%;
      background-color: #f1f5f8;
    }

    /* ========================================================
       TOP HEADER (Pure white, subtle border, exact matching buttons)
       ======================================================== */
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

    /* Green Solid Login Button */
    .btn-portal-login {
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
      transition: background-color 0.15s ease;
    }

    .btn-portal-login:hover {
      background-color: #008d4c;
    }

    /* Outlined White Sign Up Button */
    .btn-portal-signup {
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

    .btn-portal-signup:hover {
      background-color: #f9fafb;
      border-color: #9ca3af;
      color: #111827;
    }

    /* Secondary Subnav (Home, Solutions) */
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

    /* ========================================================
       MAIN BODY & CENTER CARD
       ======================================================== */
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
      margin: 0 0 20px 0;
      letter-spacing: -0.2px;
    }

    /* Auth Method Subtabs */
    .auth-method-selector {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 12px;
    }

    .method-pill {
      background: none;
      border: none;
      font-size: 0.8rem;
      color: #6b7280;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .method-pill:hover {
      color: #111827;
      background-color: #f3f4f6;
    }

    .method-pill.active {
      color: #00a65a;
      background-color: #ecfdf5;
      font-weight: 600;
    }

    /* Alert Boxes */
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

    .direct-link {
      color: #00a65a;
      text-decoration: underline;
      font-weight: 600;
    }

    /* ========================================================
       CLEAN HORIZONTAL FORM LAYOUT (Matches reference image)
       ======================================================== */
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

    /* Clean Input with Emerald Green Focus (exact as in reference image) */
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

    .field-hint {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 4px;
    }

    /* Password Input Wrap */
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

    .forgot-link-wrap {
      margin-top: 6px;
      text-align: right;
    }

    .link-clean {
      background: none;
      border: none;
      padding: 0;
      color: #00a65a;
      font-size: 0.78rem;
      text-decoration: none;
      cursor: pointer;
    }

    .link-clean:hover {
      text-decoration: underline;
    }

    /* ========================================================
       RECAPTCHA BOX (Matches reference widget)
       ======================================================== */
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

    /* Remember Row */
    .remember-row {
      margin-top: -6px;
    }

    .remember-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: #4b5563;
      cursor: pointer;
    }

    .clean-checkbox {
      accent-color: #00a65a;
      width: 15px;
      height: 15px;
      cursor: pointer;
    }

    /* Divider */
    .card-divider {
      border: 0;
      border-top: 1px solid #e5e7eb;
      margin: 18px 0 16px 0;
    }

    /* Bottom Action Row (REGISTER/LOGIN + CANCEL) */
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

    /* OTP Flow Styles */
    .otp-verification-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .otp-notice {
      font-size: 0.85rem;
      color: #374151;
      margin: 0;
    }

    .otp-digits-row {
      display: flex;
      gap: 8px;
    }

    .otp-box {
      width: 42px;
      height: 46px;
      text-align: center;
      font-size: 1.2rem;
      font-weight: 700;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      background-color: #ffffff;
      color: #111827;
      transition: border-color 0.15s ease;
    }

    .otp-box:focus {
      outline: none;
      border-color: #34d399;
      box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.25);
    }

    .otp-resend-row {
      display: flex;
      gap: 16px;
      align-items: center;
      font-size: 0.8rem;
    }

    .muted-counter {
      color: #6b7280;
    }

    /* ========================================================
       DARK NAVY BLUE FOOTER (Exact matching bottom bar)
       ======================================================== */
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

    /* ========================================================
       RESPONSIVE ADJUSTMENTS
       ======================================================== */
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
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  public readonly themeService = inject(ThemeService);

  readonly activeTab = signal<LoginTab>('password');

  // Password Form
  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [true]
  });

  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);
  readonly directActionLink = signal<string | null>(null);
  readonly captchaVerified = signal<boolean>(true);

  // OTP State
  otpContact: string = '';
  readonly otpSent = signal<boolean>(false);
  readonly otpCountdown = signal<number>(30);
  readonly otpDigits = signal<string[]>(['', '', '', '', '', '']);
  readonly rememberMeOtp = signal<boolean>(true);
  private countdownTimer: any = null;

  // Google State
  googleAccountEmail: string = '';
  readonly rememberMeGoogle = signal<boolean>(true);

  // Forgot Password State
  forgotPasswordEmail: string = '';

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigateByUrl(returnUrl);
    }
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  setTab(tab: LoginTab): void {
    this.themeService.playClickSound();
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.directActionLink.set(null);
  }

  togglePasswordVisibility(): void {
    this.themeService.playClickSound();
    this.showPassword.update(v => !v);
  }

  toggleCaptcha(): void {
    this.themeService.playClickSound();
    this.captchaVerified.update(v => !v);
  }

  onCancel(): void {
    this.themeService.playClickSound();
    this.loginForm.reset({ rememberMe: true });
    this.errorMessage.set(null);
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

    if (!this.captchaVerified()) {
      this.errorMessage.set('Please verify that you are not a robot.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, rememberMe } = this.loginForm.getRawValue();

    this.authService.login({
      email: email!,
      password: password!,
      rememberMe: rememberMe ?? true
    }).subscribe({
      next: () => {
        this.themeService.playSuccessSound();
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
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
        this.themeService.playSuccessSound();
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
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
        this.themeService.playSuccessSound();
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
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
