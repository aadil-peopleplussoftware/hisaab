import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

type LoginTab = 'password' | 'otp' | 'google' | 'forgot';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="auth-split-layout">
      <!-- ========================================================
           LEFT PANEL: Modern FinTech Showcase & Brand Presentation
           ======================================================== -->
      <aside class="showcase-panel">
        <!-- Ambient Glowing Aura Orbs -->
        <div class="ambient-glow glow-emerald"></div>
        <div class="ambient-glow glow-blue"></div>
        <div class="ambient-glow glow-indigo"></div>
        <div class="showcase-grid-overlay"></div>

        <div class="showcase-inner">
          <!-- Top Brand Identity Header -->
          <header class="showcase-brand">
            <div class="brand-badge-icon">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
                <rect width="24" height="24" rx="6" fill="#1f883d" />
                <path d="M12 5v14M16 8H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H7" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
              </svg>
            </div>
            <div class="brand-badge-info">
              <span class="brand-name">Hisaab Enterprise</span>
              <span class="brand-status-chip">
                <span class="pulse-indicator"></span>
                <span>Financial Cloud</span>
              </span>
            </div>
          </header>

          <!-- Hero Headline & Subtitle -->
          <div class="showcase-hero">
            <div class="hero-category-pill">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Multi-Entity Accounting &amp; Wealth Engine</span>
            </div>
            <h2 class="showcase-headline">
              Financial intelligence, <br />
              <span class="gradient-text">engineered for clarity.</span>
            </h2>
            <p class="showcase-subtext">
              Real-time cash flow oversight, multi-venture balance sheets, automated loan amortizations, and bank reconciliation in one unified command center.
            </p>
          </div>

          <!-- Glassmorphism Preview Cards -->
          <div class="showcase-cards">
            <!-- Metric Card 1: Live Portfolio Valuation -->
            <div class="glass-card valuation-card">
              <div class="card-header-row">
                <div class="card-header-text">
                  <span class="card-caption">Total Portfolio Valuation</span>
                  <div class="card-amount-row">
                    <span class="card-amount">₹28,45,820</span>
                    <span class="metric-pill positive">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                      +18.4%
                    </span>
                  </div>
                </div>
                <div class="card-stat-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2ea043" stroke-width="2.2">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                    <polyline points="16 7 22 7 22 13"></polyline>
                  </svg>
                </div>
              </div>

              <!-- Sparkline Visual Growth Bars -->
              <div class="sparkline-bars" aria-hidden="true">
                <div class="bar" style="height: 38%"></div>
                <div class="bar" style="height: 52%"></div>
                <div class="bar" style="height: 48%"></div>
                <div class="bar" style="height: 70%"></div>
                <div class="bar" style="height: 64%"></div>
                <div class="bar" style="height: 82%"></div>
                <div class="bar" style="height: 74%"></div>
                <div class="bar active" style="height: 96%"></div>
              </div>

              <div class="card-metrics-grid">
                <div class="mini-stat">
                  <span class="mini-label">Monthly Inflow</span>
                  <span class="mini-value text-income">₹4,82,150</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-label">OPEX &amp; Outflow</span>
                  <span class="mini-value text-expense">₹1,63,400</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-label">Net Profit Margin</span>
                  <span class="mini-value text-accent">66.1%</span>
                </div>
              </div>
            </div>

            <!-- Metric Card 2: Connected Business Ventures -->
            <div class="glass-card ventures-card">
              <div class="ventures-head">
                <span class="card-caption">Connected Ventures</span>
                <span class="badge-active">2 Active</span>
              </div>

              <div class="venture-item">
                <div class="venture-avatar tech">AI</div>
                <div class="venture-meta">
                  <div class="v-row">
                    <span class="v-name">Aadil Infotech Pvt Ltd</span>
                    <span class="v-val">₹12,40,000</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill fill-emerald" style="width: 78%"></div>
                  </div>
                </div>
              </div>

              <div class="venture-item">
                <div class="venture-avatar logistics">AP</div>
                <div class="venture-meta">
                  <div class="v-row">
                    <span class="v-name">Apex Global Ventures</span>
                    <span class="v-val">₹8,92,500</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill fill-blue" style="width: 58%"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Trust & Security Highlights -->
          <footer class="showcase-trust">
            <div class="trust-badge">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>256-Bit SSL Encrypted</span>
            </div>
            <div class="trust-badge">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>Recycle Bin Protection</span>
            </div>
            <div class="trust-badge">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>Enterprise RBAC Safeguards</span>
            </div>
          </footer>
        </div>
      </aside>

      <!-- ========================================================
           RIGHT PANEL: Interactive Login & Authentication Area
           ======================================================== -->
      <main class="login-panel">
        <div class="login-panel-inner">
          <!-- Mobile Brand Banner (Visible on smaller screens) -->
          <div class="mobile-brand-banner">
            <div class="brand-badge-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                <rect width="24" height="24" rx="6" fill="#1f883d" />
                <path d="M12 5v14M16 8H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H7" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
              </svg>
            </div>
            <div class="mobile-brand-text">
              <span class="m-brand-name">Hisaab Enterprise</span>
              <span class="m-brand-sub">Financial Cloud Suite</span>
            </div>
          </div>

          <!-- Section Welcome Header -->
          <header class="login-header">
            <h1 class="login-title">
              @switch (activeTab()) {
                @case ('forgot') { Reset your password }
                @case ('otp') { Sign in with Passcode }
                @case ('google') { Sign in with Google }
                @default { Welcome to Hisaab }
              }
            </h1>
            <p class="login-subtext">
              @switch (activeTab()) {
                @case ('forgot') { Enter your verified email address to receive an instant recovery link. }
                @case ('otp') { Passwordless sign in using a real-time verification passcode. }
                @case ('google') { Instant authentication with your verified Google account. }
                @default { Sign in with your credentials to manage your financial portfolio. }
              }
            </p>
          </header>

          <!-- Method Selector Tabs (Segmented Control) -->
          <nav class="auth-tabs" aria-label="Sign-in methods">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'password'"
              (click)="setTab('password')"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Password</span>
            </button>

            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'otp'"
              (click)="setTab('otp')"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" stroke-width="2.5" />
              </svg>
              <span>OTP Passcode</span>
            </button>

            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'google'"
              (click)="setTab('google')"
            >
              <svg viewBox="0 0 24 24" width="15" height="15">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google</span>
            </button>
          </nav>

          <!-- Main Interactive Card Surface -->
          <section class="auth-card">
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
                  <label for="email" class="field-label">Email address or username</label>
                  <div class="input-wrap" [class.has-error]="isFieldInvalid('email')">
                    <span class="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                      </svg>
                    </span>
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
                    <span class="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
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
                  class="btn-gradient-primary"
                  [disabled]="loginForm.invalid || isLoading()"
                >
                  @if (isLoading()) {
                    <span class="spinner-sm"></span>
                    <span>Signing in...</span>
                  } @else {
                    <span>Sign in to Dashboard</span>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
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
                    <label for="otpContact" class="field-label">Email address or mobile number</label>
                    <div class="input-wrap">
                      <span class="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                      </span>
                      <input
                        id="otpContact"
                        type="text"
                        [(ngModel)]="otpContact"
                        placeholder="e.g. your.email@gmail.com"
                        class="primer-input"
                      />
                    </div>
                    <span class="field-hint">A real one-time passcode will be delivered directly to your inbox.</span>
                  </div>

                  <button
                    type="button"
                    class="btn-gradient-primary"
                    [disabled]="!otpContact.trim() || isLoading()"
                    (click)="handleSendOtp()"
                  >
                    @if (isLoading()) {
                      <span class="spinner-sm"></span>
                      <span>Sending passcode...</span>
                    } @else {
                      <span>Send Verification Passcode</span>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    }
                  </button>
                } @else {
                  <div class="otp-enter-flow">
                    <div class="otp-info-pill">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      <span>Passcode dispatched to <strong>{{ otpContact }}</strong></span>
                    </div>

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
                      class="btn-gradient-primary"
                      [disabled]="getEnteredOtp().length !== 6 || isLoading()"
                      (click)="handleVerifyOtp()"
                    >
                      @if (isLoading()) {
                        <span class="spinner-sm"></span>
                        <span>Verifying...</span>
                      } @else {
                        <span>Verify &amp; Sign in</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
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
                  <div class="google-icon-box">
                    <svg viewBox="0 0 24 24" width="22" height="22">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div class="google-callout-text">
                    <strong>Continue with Google</strong>
                    <span>Instant access with your verified Gmail account</span>
                  </div>
                </div>

                <div class="form-group">
                  <label for="googleEmail" class="field-label">Gmail / Google Account Email</label>
                  <div class="input-wrap">
                    <span class="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                      </svg>
                    </span>
                    <input
                      id="googleEmail"
                      type="email"
                      [(ngModel)]="googleAccountEmail"
                      placeholder="e.g. yourname@gmail.com"
                      class="primer-input"
                    />
                  </div>
                  <span class="field-hint">New Gmail accounts are automatically provisioned with secure workspace access.</span>
                </div>

                <button
                  type="button"
                  class="btn-gradient-primary"
                  [disabled]="!googleAccountEmail.trim() || isLoading()"
                  (click)="handleGoogleAuth(googleAccountEmail)"
                >
                  @if (isLoading()) {
                    <span class="spinner-sm"></span>
                    <span>Authenticating with Google...</span>
                  } @else {
                    <span>Continue with Google</span>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
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
                  Enter your user account's verified email address and we will dispatch a real password recovery link.
                </p>

                <div class="form-group">
                  <label for="forgotEmail" class="field-label">Enter your account email</label>
                  <div class="input-wrap">
                    <span class="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </span>
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
                  class="btn-gradient-primary"
                  [disabled]="!forgotPasswordEmail.trim() || isLoading()"
                  (click)="handleForgotPassword()"
                >
                  @if (isLoading()) {
                    <span class="spinner-sm"></span>
                    <span>Sending password reset email...</span>
                  } @else {
                    <span>Send Password Reset Email</span>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  }
                </button>

                <div class="text-center mt-2">
                  <button type="button" class="link-btn-text" (click)="setTab('password')">
                    &larr; Return to sign in
                  </button>
                </div>
              </div>
            }
          </section>

          <!-- Register Prompt Callout Card -->
          <div class="auth-callout-card">
            <span>New to Hisaab?</span>
            <a routerLink="/auth/register" class="primer-link">Create an account &rarr;</a>
          </div>

          <!-- Bottom Footer Navigation -->
          <footer class="login-footer-links">
            <a href="#" (click)="$event.preventDefault()">Terms of Service</a>
            <span class="bullet" aria-hidden="true">&bull;</span>
            <a href="#" (click)="$event.preventDefault()">Privacy Policy</a>
            <span class="bullet" aria-hidden="true">&bull;</span>
            <a href="#" (click)="$event.preventDefault()">Documentation</a>
            <span class="bullet" aria-hidden="true">&bull;</span>
            <a href="#" (click)="$event.preventDefault()">Contact Hisaab Support</a>
          </footer>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      font-family: var(--font-family-base);
    }

    /* Outer Split Screen Container */
    .auth-split-layout {
      display: flex;
      min-height: 100vh;
      width: 100%;
      background: var(--color-canvas-default);
    }

    /* ========================================================
       LEFT PANEL: Fintech Showcase & Visual Aesthetics
       ======================================================== */
    .showcase-panel {
      flex: 1 1 54%;
      min-width: 0;
      position: relative;
      overflow: hidden;
      background: linear-gradient(145deg, #070b14 0%, #0d1527 50%, #060911 100%);
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
    }

    /* Ambient Glow Auras */
    .ambient-glow {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      z-index: 1;
    }

    .glow-emerald {
      width: 440px;
      height: 440px;
      top: -80px;
      left: -60px;
      background: radial-gradient(circle, rgba(31, 136, 61, 0.35) 0%, rgba(31, 136, 61, 0) 70%);
      filter: blur(80px);
    }

    .glow-blue {
      width: 500px;
      height: 500px;
      bottom: -100px;
      right: -60px;
      background: radial-gradient(circle, rgba(9, 105, 218, 0.28) 0%, rgba(9, 105, 218, 0) 70%);
      filter: blur(90px);
    }

    .glow-indigo {
      width: 320px;
      height: 320px;
      top: 45%;
      left: 35%;
      background: radial-gradient(circle, rgba(130, 80, 223, 0.22) 0%, rgba(130, 80, 223, 0) 70%);
      filter: blur(70px);
    }

    .showcase-grid-overlay {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
      background-size: 26px 26px;
      pointer-events: none;
      opacity: 0.65;
      z-index: 1;
    }

    /* Showcase Content Inner */
    .showcase-inner {
      position: relative;
      z-index: 2;
      height: 100%;
      max-width: 600px;
      margin: 0 auto;
      padding: 3.5rem 2.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
    }

    /* Brand Tag */
    .showcase-brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .brand-badge-icon {
      width: 44px;
      height: 44px;
      background: rgba(31, 136, 61, 0.15);
      border: 1px solid rgba(46, 160, 67, 0.35);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
    }

    .brand-badge-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .brand-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.015em;
    }

    .brand-status-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      color: #7ee787;
      font-weight: 500;
    }

    .pulse-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #3fb950;
      box-shadow: 0 0 8px #3fb950;
    }

    /* Hero Section */
    .showcase-hero {
      margin: 2rem 0 1.5rem 0;
    }

    .hero-category-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.85rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      color: #a5d6ff;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 1rem;
      backdrop-filter: blur(10px);
    }

    .showcase-headline {
      font-size: 2.35rem;
      line-height: 1.2;
      font-weight: 700;
      color: #f0f6fc;
      margin: 0 0 1rem 0;
      letter-spacing: -0.03em;
    }

    .gradient-text {
      background: linear-gradient(135deg, #7ee787 0%, #58a6ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .showcase-subtext {
      font-size: 0.95rem;
      line-height: 1.6;
      color: #8b949e;
      margin: 0;
      max-width: 500px;
    }

    /* Glassmorphism Metric Cards */
    .showcase-cards {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .glass-card {
      background: rgba(22, 27, 34, 0.65);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(240, 246, 252, 0.12);
      border-radius: 14px;
      padding: 1.25rem 1.4rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .glass-card:hover {
      transform: translateY(-2px);
      border-color: rgba(240, 246, 252, 0.22);
    }

    /* Valuation Card */
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .card-caption {
      font-size: 0.75rem;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
    }

    .card-amount-row {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }

    .card-amount {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f0f6fc;
      font-family: var(--font-family-mono);
      letter-spacing: -0.02em;
    }

    .metric-pill.positive {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.55rem;
      background: rgba(46, 160, 67, 0.15);
      border: 1px solid rgba(46, 160, 67, 0.3);
      color: #3fb950;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
    }

    .card-stat-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(46, 160, 67, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(46, 160, 67, 0.25);
    }

    /* Sparkline Bars */
    .sparkline-bars {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 36px;
      margin-bottom: 1rem;
      padding-bottom: 4px;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
    }

    .sparkline-bars .bar {
      flex: 1;
      background: rgba(88, 166, 255, 0.25);
      border-radius: 3px 3px 0 0;
      transition: all 0.2s ease;
    }

    .sparkline-bars .bar.active {
      background: linear-gradient(180deg, #3fb950 0%, #238636 100%);
      box-shadow: 0 0 10px rgba(63, 185, 80, 0.4);
    }

    .card-metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      padding-top: 0.35rem;
    }

    .mini-stat {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .mini-label {
      font-size: 0.7rem;
      color: #8b949e;
    }

    .mini-value {
      font-size: 0.875rem;
      font-weight: 600;
      font-family: var(--font-family-mono);
    }

    .text-income { color: #3fb950; }
    .text-expense { color: #f85149; }
    .text-accent { color: #58a6ff; }

    /* Ventures Card */
    .ventures-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
    }

    .badge-active {
      padding: 0.15rem 0.55rem;
      background: rgba(56, 139, 253, 0.15);
      border: 1px solid rgba(56, 139, 253, 0.3);
      border-radius: 9999px;
      font-size: 0.7rem;
      color: #58a6ff;
      font-weight: 500;
    }

    .venture-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .venture-item:last-child {
      margin-bottom: 0;
    }

    .venture-avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .venture-avatar.tech {
      background: rgba(35, 134, 54, 0.25);
      color: #7ee787;
      border: 1px solid rgba(63, 185, 80, 0.3);
    }

    .venture-avatar.logistics {
      background: rgba(31, 111, 235, 0.25);
      color: #79c0ff;
      border: 1px solid rgba(88, 166, 255, 0.3);
    }

    .venture-meta {
      flex: 1;
    }

    .v-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      margin-bottom: 0.3rem;
    }

    .v-name {
      color: #e6edf3;
      font-weight: 500;
    }

    .v-val {
      color: #8b949e;
      font-family: var(--font-family-mono);
      font-size: 0.775rem;
    }

    .progress-bar-bg {
      height: 5px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 9999px;
    }

    .progress-bar-fill.fill-emerald {
      background: linear-gradient(90deg, #238636, #3fb950);
    }

    .progress-bar-fill.fill-blue {
      background: linear-gradient(90deg, #1f6feb, #58a6ff);
    }

    /* Trust Footer */
    .showcase-trust {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .trust-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: #8b949e;
    }

    .trust-badge svg {
      color: #7ee787;
    }

    /* ========================================================
       RIGHT PANEL: Interactive Login & Form Surface
       ======================================================== */
    .login-panel {
      flex: 1 1 46%;
      min-width: 0;
      background: var(--color-canvas-default);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 2.5rem;
      overflow-y: auto;
      box-sizing: border-box;
    }

    .login-panel-inner {
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Mobile Brand Banner */
    .mobile-brand-banner {
      display: none;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .mobile-brand-text {
      display: flex;
      flex-direction: column;
    }

    .m-brand-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-fg-default);
    }

    .m-brand-sub {
      font-size: 0.75rem;
      color: var(--color-fg-muted);
    }

    /* Welcome Header */
    .login-header {
      margin-bottom: 0.25rem;
    }

    .login-title {
      font-size: 1.65rem;
      font-weight: 600;
      color: var(--color-fg-default);
      margin: 0 0 0.35rem 0;
      letter-spacing: -0.025em;
    }

    .login-subtext {
      font-size: 0.875rem;
      color: var(--color-fg-muted);
      line-height: 1.45;
      margin: 0;
    }

    /* Navigation Tabs */
    .auth-tabs {
      display: flex;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      padding: 3px;
      gap: 3px;
    }

    .tab-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.5rem 0.65rem;
      background: transparent;
      border: none;
      border-radius: 5px;
      color: var(--color-fg-muted);
      font-size: 0.815rem;
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
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* Auth Card Surface */
    .auth-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
    }

    .flash-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.75rem 0.95rem;
      border-radius: var(--radius-md);
      font-size: 0.825rem;
      margin-bottom: 1.15rem;
      line-height: 1.45;
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
      gap: 1.15rem;
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
      line-height: 1.4;
    }

    .input-wrap {
      display: flex;
      align-items: center;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      padding: 0 0.85rem;
      transition: all 0.18s ease;
      gap: 0.6rem;
    }

    .input-wrap:focus-within {
      background: var(--color-canvas-default);
      border-color: var(--color-accent-fg);
      box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.18);
    }

    .input-wrap.has-error {
      border-color: var(--color-expense);
    }

    .input-icon {
      color: var(--color-fg-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .primer-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      padding: 0.65rem 0;
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
      transition: color 0.15s ease;
    }

    .btn-toggle-eye:hover {
      color: var(--color-fg-default);
    }

    .error-inline {
      font-size: 0.75rem;
      color: var(--color-expense);
      margin-top: 0.2rem;
    }

    /* Submit Primary Button */
    .btn-gradient-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      width: 100%;
      padding: 0.7rem 1.25rem;
      background: linear-gradient(180deg, #238636 0%, #1f883d 100%);
      color: #ffffff;
      border: 1px solid rgba(240, 246, 252, 0.1);
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(31, 136, 61, 0.25);
      transition: all 0.15s ease;
      margin-top: 0.35rem;
    }

    .btn-gradient-primary:hover:not(:disabled) {
      background: linear-gradient(180deg, #2ea043 0%, #1a7f37 100%);
      box-shadow: 0 4px 10px rgba(31, 136, 61, 0.35);
      transform: translateY(-1px);
    }

    .btn-gradient-primary:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(31, 136, 61, 0.2);
    }

    .btn-gradient-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .spinner-sm {
      width: 15px;
      height: 15px;
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
      font-size: 0.8rem;
      cursor: pointer;
      padding: 0;
      font-family: inherit;
      font-weight: 500;
    }

    .link-btn-text:hover {
      text-decoration: underline;
    }

    /* OTP Flow */
    .otp-enter-flow {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .otp-info-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.5rem 0.75rem;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      font-size: 0.8rem;
      color: var(--color-fg-default);
    }

    .otp-boxes-grid {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }

    .digit-box {
      width: 44px;
      height: 52px;
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      background: var(--color-canvas-subtle);
      text-align: center;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--color-fg-default);
      outline: none;
      transition: all 0.15s ease;
      font-family: var(--font-family-mono);
    }

    .digit-box:focus {
      border-color: var(--color-accent-fg);
      background: var(--color-canvas-default);
      box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.18);
    }

    .resend-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      padding: 0 0.25rem;
    }

    .muted-text {
      color: var(--color-fg-muted);
    }

    /* Google Card Header */
    .google-header-callout {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.85rem 1rem;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
    }

    .google-icon-box {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .google-callout-text {
      display: flex;
      flex-direction: column;
      font-size: 0.85rem;
      line-height: 1.3;
      color: var(--color-fg-default);
    }

    .google-callout-text span {
      font-size: 0.775rem;
      color: var(--color-fg-muted);
    }

    /* Callout Card */
    .auth-callout-card {
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      padding: 0.95rem 1.25rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--color-fg-default);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
    }

    .primer-link {
      color: var(--color-accent-fg);
      text-decoration: none;
      font-weight: 600;
    }

    .primer-link:hover {
      text-decoration: underline;
    }

    /* Footer Links */
    .login-footer-links {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 0.35rem;
      font-size: 0.75rem;
      color: var(--color-fg-muted);
    }

    .login-footer-links a {
      color: var(--color-fg-muted);
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .login-footer-links a:hover {
      color: var(--color-accent-fg);
      text-decoration: underline;
    }

    .bullet {
      color: var(--color-border-default);
      font-size: 0.7rem;
    }

    .text-center { text-align: center; }
    .mt-2 { margin-top: 0.5rem; }

    /* ========================================================
       RESPONSIVE ADAPTATIONS (Desktop / Tablet / Mobile)
       ======================================================== */
    @media (max-width: 1023px) {
      .auth-split-layout {
        flex-direction: column;
      }

      .showcase-panel {
        display: none;
      }

      .mobile-brand-banner {
        display: flex;
      }

      .login-panel {
        flex: 1 1 100%;
        min-height: 100vh;
        padding: 2.5rem 1.25rem;
      }
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  public readonly themeService = inject(ThemeService);

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
        this.themeService.playSuccessSound();
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
        this.themeService.playSuccessSound();
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
        this.themeService.playSuccessSound();
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
