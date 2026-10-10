import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface ShowcaseSlide {
  title: string;
  subtitle: string;
  tag: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="auth-viewport">
      <div class="split-auth-card">
        <!-- LEFT COLUMN: HERO SHOWCASE ILLUSTRATION -->
        <div class="showcase-column">
          <!-- Background concentric radiant circles -->
          <div class="ambient-circle ring-outer"></div>
          <div class="ambient-circle ring-middle"></div>
          <div class="ambient-circle ring-inner"></div>

          <!-- Central Graphic Hub -->
          <div class="hub-container">
            <!-- Connected App Integration Badges -->
            <div class="integration-node node-bank" title="Banking & UPI Inflow">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>

            <div class="integration-node node-google" title="Google Integration">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>

            <div class="integration-node node-growth" title="Investments & P&L">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#16a34a" stroke-width="2.2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>

            <!-- Sleek Connecting SVG Circuit Traces -->
            <svg class="hub-connections-svg" viewBox="0 0 260 260">
              <path d="M 60 70 C 100 70, 110 130, 150 130" stroke="rgba(255,255,255,0.4)" stroke-width="2.5" fill="none" stroke-dasharray="4 4" />
              <path d="M 50 140 C 90 140, 110 130, 150 130" stroke="rgba(255,255,255,0.45)" stroke-width="2.5" fill="none" />
              <path d="M 70 200 C 110 200, 120 140, 150 130" stroke="rgba(255,255,255,0.4)" stroke-width="2.5" fill="none" stroke-dasharray="4 4" />
            </svg>

            <!-- Floating Dashboard Preview Card -->
            <div class="floating-dashboard-card">
              <div class="card-window-head">
                <span class="window-dot red"></span>
                <span class="window-dot yellow"></span>
                <span class="window-dot green"></span>
                <span class="window-search-pill"></span>
              </div>

              <div class="card-list-body">
                <div class="card-list-item">
                  <div class="item-avatar avatar-1">
                    <span>RS</span>
                  </div>
                  <div class="item-lines">
                    <div class="line-title"></div>
                    <div class="line-sub"></div>
                  </div>
                  <span class="badge-status-pos">+₹45k</span>
                </div>

                <div class="card-list-item">
                  <div class="item-avatar avatar-2">
                    <span>AK</span>
                  </div>
                  <div class="item-lines">
                    <div class="line-title"></div>
                    <div class="line-sub short"></div>
                  </div>
                  <span class="badge-status-neu">P&L 68%</span>
                </div>

                <div class="card-list-item">
                  <div class="item-avatar avatar-3">
                    <span>EP</span>
                  </div>
                  <div class="item-lines">
                    <div class="line-title"></div>
                    <div class="line-sub"></div>
                  </div>
                  <span class="badge-status-pos">Audited</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Feature Slide Carousel -->
          <div class="showcase-content-box">
            <h2 class="showcase-title">{{ slides[activeSlide()].title }}</h2>
            <p class="showcase-desc">{{ slides[activeSlide()].subtitle }}</p>

            <!-- Pagination Dots -->
            <div class="carousel-dots-row">
              @for (slide of slides; track $index) {
                <button
                  type="button"
                  class="carousel-dot"
                  [class.active]="activeSlide() === $index"
                  (click)="setSlide($index)"
                  [attr.aria-label]="'Go to slide ' + ($index + 1)"
                ></button>
              }
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: REGISTRATION FORM -->
        <div class="auth-form-column">
          <!-- Brand Logo -->
          <div class="brand-row">
            <div class="brand-logo-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <rect width="24" height="24" rx="6" fill="#1d4ed8" />
                <path d="M12 5v14M16 8H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H7" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
              </svg>
            </div>
            <div class="brand-name-group">
              <span class="brand-title">Hisaab</span>
              <span class="brand-tag">Finance OS</span>
            </div>
          </div>

          <!-- Form Header -->
          <div class="form-header">
            <h1 class="main-heading">Create your Account</h1>
            <p class="sub-heading">Start managing personal & business finances in one hub:</p>
          </div>

          <!-- 1-Click Google Sign Up -->
          <button
            type="button"
            class="btn-google-full"
            (click)="openGoogleModal()"
            title="Sign up with Google"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" class="google-svg">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign up with Google</span>
          </button>

          <!-- Divider -->
          <div class="divider-row">
            <span class="divider-line"></span>
            <span class="divider-text">or register with email</span>
            <span class="divider-line"></span>
          </div>

          <!-- Error Alert Banner -->
          @if (errorMessage()) {
            <div class="alert-banner" role="alert">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <!-- Registration Form -->
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-inputs-form" novalidate>
            <!-- Full Name -->
            <div class="input-field-group">
              <label for="fullName" class="input-label">Full Name</label>
              <div class="input-box" [class.has-error]="isFieldInvalid('fullName')">
                <span class="input-prefix-icon">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="fullName"
                  type="text"
                  formControlName="fullName"
                  placeholder="e.g. Rahul Sharma"
                  autocomplete="name"
                  class="clean-input"
                />
              </div>
              @if (isFieldInvalid('fullName')) {
                <span class="error-text">Full name is required.</span>
              }
            </div>

            <!-- Email Address -->
            <div class="input-field-group">
              <label for="email" class="input-label">Email Address</label>
              <div class="input-box" [class.has-error]="isFieldInvalid('email')">
                <span class="input-prefix-icon">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  placeholder="name@example.com"
                  autocomplete="email"
                  class="clean-input"
                />
              </div>
              @if (isFieldInvalid('email')) {
                <span class="error-text">Please enter a valid email address.</span>
              }
            </div>

            <!-- Password -->
            <div class="input-field-group">
              <label for="password" class="input-label">Password</label>
              <div class="input-box" [class.has-error]="isFieldInvalid('password')">
                <span class="input-prefix-icon">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="Min. 8 characters"
                  autocomplete="new-password"
                  class="clean-input"
                  (input)="updatePasswordChecks()"
                />
                <button
                  type="button"
                  class="btn-eye-toggle"
                  (click)="togglePasswordVisibility()"
                  title="Toggle password view"
                  aria-label="Toggle password visibility"
                >
                  @if (showPassword()) {
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  } @else {
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  }
                </button>
              </div>

              <!-- Password Requirements Checklist -->
              <div class="pw-checklist">
                <span class="chk-pill" [class.met]="hasMinLength()">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  8+ chars
                </span>
                <span class="chk-pill" [class.met]="hasUpper()">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Uppercase
                </span>
                <span class="chk-pill" [class.met]="hasLower()">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Lowercase
                </span>
                <span class="chk-pill" [class.met]="hasDigit()">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Number
                </span>
                <span class="chk-pill" [class.met]="hasSpecial()">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Special symbol
                </span>
              </div>
            </div>

            <!-- Terms agreement -->
            <label class="checkbox-container terms-agreement">
              <input
                type="checkbox"
                [checked]="agreeTerms()"
                (change)="agreeTerms.set(!agreeTerms())"
              />
              <span class="custom-checkbox"></span>
              <span class="checkbox-label">
                I agree to the <span class="term-link">Terms of Service</span> and <span class="term-link">Privacy Policy</span>
              </span>
            </label>

            <!-- Submit Button -->
            <button
              type="submit"
              class="btn-primary-auth"
              [disabled]="registerForm.invalid || !agreeTerms() || isLoading()"
            >
              @if (isLoading()) {
                <span class="loading-spinner"></span>
                <span>Creating Account...</span>
              } @else {
                <span>Create Account</span>
              }
            </button>
          </form>

          <!-- Footer Switcher -->
          <div class="auth-bottom-switch">
            <span>Already have an account?</span>
            <a routerLink="/auth/login" class="link-signup">Log In</a>
          </div>
        </div>
      </div>

      <!-- MODAL: GOOGLE SIGN-IN INTERACTION -->
      @if (showGoogleModal()) {
        <div class="modal-scrim" (click)="closeGoogleModal()">
          <div class="modal-dialog-box google-dialog" (click)="$event.stopPropagation()">
            <div class="google-header">
              <svg viewBox="0 0 24 24" width="26" height="26">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h3>Sign up with Google</h3>
              <p>Choose an account to register instantly on <strong>Hisaab</strong></p>
            </div>

            <div class="google-accounts-list">
              <button
                type="button"
                class="google-account-pill"
                (click)="simulateGoogleAuth('aadil.finance@gmail.com', 'Aadil')"
              >
                <div class="account-avatar">A</div>
                <div class="account-info">
                  <span class="account-name">Aadil</span>
                  <span class="account-email">aadil.finance&#64;gmail.com</span>
                </div>
              </button>

              <button
                type="button"
                class="google-account-pill"
                (click)="simulateGoogleAuth('demo.user@gmail.com', 'Demo User')"
              >
                <div class="account-avatar demo">D</div>
                <div class="account-info">
                  <span class="account-name">Demo User</span>
                  <span class="account-email">demo.user&#64;gmail.com</span>
                </div>
              </button>

              <div class="custom-google-box">
                <input
                  type="email"
                  [(ngModel)]="customGoogleEmail"
                  placeholder="Or enter your Gmail address..."
                  class="clean-input custom-google-input"
                />
                <button
                  type="button"
                  class="btn-social-action btn-custom-google"
                  [disabled]="!customGoogleEmail.trim()"
                  (click)="simulateGoogleAuth(customGoogleEmail, customGoogleEmail.split('@')[0])"
                >
                  Continue
                </button>
              </div>
            </div>

            <div class="google-dialog-foot">
              <button type="button" class="btn-cancel" (click)="closeGoogleModal()">Cancel</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
    }

    /* Outer Viewport */
    .auth-viewport {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.25rem;
      background: #eef2f6;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Main Split Card */
    .split-auth-card {
      width: 100%;
      max-width: 1060px;
      min-height: 640px;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 20px 45px rgba(0, 35, 110, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04);
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      overflow: hidden;
      border: 1px solid rgba(226, 232, 240, 0.8);
    }

    @media (max-width: 920px) {
      .split-auth-card {
        grid-template-columns: 1fr;
        max-width: 520px;
        min-height: auto;
      }
      .showcase-column {
        display: none !important;
      }
    }

    /* ========================================================
       LEFT COLUMN: HERO SHOWCASE ILLUSTRATION
       ======================================================== */
    .showcase-column {
      position: relative;
      background: linear-gradient(135deg, #0052FF 0%, #1d4ed8 50%, #1e40af 100%);
      padding: 3.5rem 2.75rem 2.75rem 2.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #ffffff;
      overflow: hidden;
      box-sizing: border-box;
    }

    /* Ambient Concentric Rings */
    .ambient-circle {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.12);
      pointer-events: none;
    }

    .ring-outer {
      width: 540px;
      height: 540px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -60%);
      background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
    }

    .ring-middle {
      width: 380px;
      height: 380px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -60%);
    }

    .ring-inner {
      width: 240px;
      height: 240px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -60%);
    }

    /* Hub & Floating Card */
    .hub-container {
      position: relative;
      width: 100%;
      height: 310px;
      margin: 1.5rem auto 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hub-connections-svg {
      position: absolute;
      width: 260px;
      height: 260px;
      left: 50px;
      top: 25px;
      pointer-events: none;
      z-index: 1;
    }

    /* Circular Node Badges */
    .integration-node {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3;
      transition: transform 0.3s ease;
    }

    .integration-node:hover {
      transform: scale(1.1);
    }

    .node-bank {
      left: 36px;
      top: 40px;
    }

    .node-google {
      left: 20px;
      top: 130px;
    }

    .node-growth {
      left: 50px;
      top: 220px;
    }

    /* Floating Dashboard Preview Card */
    .floating-dashboard-card {
      position: absolute;
      right: 18px;
      top: 30px;
      width: 250px;
      background: #ffffff;
      border-radius: 16px;
      padding: 1rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.28);
      z-index: 4;
      animation: floatSmooth 4.5s ease-in-out infinite alternate;
    }

    @keyframes floatSmooth {
      0% { transform: translateY(0px); }
      100% { transform: translateY(-8px); }
    }

    .card-window-head {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 0.85rem;
    }

    .window-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .window-dot.red { background: #ef4444; }
    .window-dot.yellow { background: #f59e0b; }
    .window-dot.green { background: #10b981; }

    .window-search-pill {
      margin-left: auto;
      width: 55px;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
    }

    .card-list-body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .card-list-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #f8fafc;
      padding: 0.45rem 0.65rem;
      border-radius: 8px;
    }

    .item-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 700;
      color: #1e293b;
    }

    .avatar-1 { background: #dbeafe; color: #1e40af; }
    .avatar-2 { background: #fef3c7; color: #92400e; }
    .avatar-3 { background: #dcfce7; color: #166534; }

    .item-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .line-title {
      width: 60px;
      height: 6px;
      background: #94a3b8;
      border-radius: 3px;
    }

    .line-sub {
      width: 42px;
      height: 5px;
      background: #cbd5e1;
      border-radius: 3px;
    }

    .line-sub.short {
      width: 30px;
    }

    .badge-status-pos {
      font-size: 0.65rem;
      font-weight: 700;
      color: #16a34a;
      background: rgba(34, 197, 94, 0.12);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }

    .badge-status-neu {
      font-size: 0.65rem;
      font-weight: 700;
      color: #2563eb;
      background: rgba(37, 99, 235, 0.12);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }

    /* Showcase Text & Dots */
    .showcase-content-box {
      position: relative;
      z-index: 3;
      text-align: center;
      margin-top: 1.5rem;
    }

    .showcase-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.015em;
    }

    .showcase-desc {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.8);
      margin: 0.5rem 0 1.25rem 0;
      line-height: 1.45;
      max-width: 380px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Carousel Pagination Dots */
    .carousel-dots-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .carousel-dot {
      height: 6px;
      width: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.35);
      border: none;
      cursor: pointer;
      padding: 0;
      transition: all 0.25s ease;
    }

    .carousel-dot.active {
      width: 22px;
      background: #ffffff;
    }

    /* ========================================================
       RIGHT COLUMN: REGISTRATION FORM
       ======================================================== */
    .auth-form-column {
      padding: 3rem 3.25rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: #ffffff;
      box-sizing: border-box;
    }

    @media (max-width: 520px) {
      .auth-form-column {
        padding: 2.25rem 1.75rem;
      }
    }

    /* Brand Row */
    .brand-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .brand-logo-icon {
      width: 38px;
      height: 38px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-name-group {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .brand-tag {
      font-size: 0.7rem;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* Form Header */
    .form-header {
      margin-bottom: 1.5rem;
    }

    .main-heading {
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.025em;
    }

    .sub-heading {
      font-size: 0.9rem;
      color: #64748b;
      margin: 0.45rem 0 0 0;
    }

    /* Google Button Full */
    .btn-google-full {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      width: 100%;
      padding: 0.75rem 1rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      color: #1e293b;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      margin-bottom: 1.25rem;
    }

    .btn-google-full:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.06);
    }

    /* Divider */
    .divider-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }

    .divider-text {
      font-size: 0.775rem;
      color: #94a3b8;
      font-weight: 500;
      white-space: nowrap;
    }

    /* Form Inputs */
    .auth-inputs-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .input-field-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .input-label {
      font-size: 0.825rem;
      font-weight: 600;
      color: #334155;
    }

    .input-box {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 0 0.85rem;
      transition: all 0.15s ease;
    }

    .input-box:focus-within {
      background: #ffffff;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .input-box.has-error {
      border-color: #ef4444;
      background: #fffafa;
    }

    .input-prefix-icon {
      color: #94a3b8;
      display: flex;
      align-items: center;
      padding-right: 0.65rem;
    }

    .clean-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      padding: 0.7rem 0;
      font-size: 0.925rem;
      color: #0f172a;
    }

    .clean-input::placeholder {
      color: #94a3b8;
    }

    .btn-eye-toggle {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.4rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-eye-toggle:hover {
      color: #475569;
    }

    .error-text {
      font-size: 0.75rem;
      color: #ef4444;
      font-weight: 500;
      margin-top: 0.15rem;
    }

    /* Password Checklist */
    .pw-checklist {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-top: 0.35rem;
    }

    .chk-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.725rem;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      background: #f1f5f9;
      color: #64748b;
      font-weight: 500;
      transition: all 0.15s ease;
    }

    .chk-pill.met {
      background: #ecfdf5;
      color: #059669;
      font-weight: 600;
    }

    .terms-agreement {
      margin-top: 0.25rem;
    }

    .term-link {
      color: #2563eb;
      font-weight: 600;
      cursor: pointer;
    }

    .checkbox-container {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
    }

    .checkbox-container input {
      display: none;
    }

    .custom-checkbox {
      width: 17px;
      height: 17px;
      border: 1.5px solid #cbd5e1;
      border-radius: 4px;
      background: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .checkbox-container input:checked + .custom-checkbox {
      background: #2563eb;
      border-color: #2563eb;
    }

    .checkbox-container input:checked + .custom-checkbox::after {
      content: "";
      width: 4px;
      height: 8px;
      border: solid #ffffff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
      margin-bottom: 2px;
    }

    .checkbox-label {
      font-size: 0.825rem;
      color: #475569;
      font-weight: 500;
    }

    /* Primary Auth Button */
    .btn-primary-auth {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      width: 100%;
      padding: 0.85rem 1rem;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
      margin-top: 0.5rem;
    }

    .btn-primary-auth:hover:not(:disabled) {
      background: #1d4ed8;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
    }

    .btn-primary-auth:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Loading Spinner */
    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Bottom Switcher */
    .auth-bottom-switch {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      margin-top: 1.75rem;
      font-size: 0.85rem;
      color: #64748b;
    }

    .link-signup {
      color: #2563eb;
      font-weight: 600;
      text-decoration: none;
    }

    .link-signup:hover {
      text-decoration: underline;
    }

    /* Alert Banner */
    .alert-banner {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      color: #dc2626;
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 1.25rem;
    }

    /* Google Dialog */
    .modal-scrim {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    }

    .modal-dialog-box {
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes popIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .google-header {
      text-align: center;
      padding: 1.75rem 1.5rem 0.75rem 1.5rem;
    }

    .google-header h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0.65rem 0 0.25rem 0;
    }

    .google-header p {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
    }

    .google-accounts-list {
      padding: 0.75rem 1.5rem 1.5rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .google-account-pill {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      width: 100%;
    }

    .google-account-pill:hover {
      background: #f8fafc;
      border-color: #2563eb;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    }

    .account-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
    }

    .account-avatar.demo {
      background: #8b5cf6;
    }

    .account-info {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .account-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0f172a;
    }

    .account-email {
      font-size: 0.775rem;
      color: #64748b;
    }

    .custom-google-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.4rem;
      border: 1.5px dashed #cbd5e1;
      padding: 0.4rem 0.6rem;
      border-radius: 10px;
    }

    .custom-google-input {
      font-size: 0.825rem;
    }

    .btn-social-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.45rem 0.75rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #1e293b;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .google-dialog-foot {
      padding: 0.75rem 1.5rem;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
    }

    .btn-cancel {
      padding: 0.6rem 1rem;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #475569;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class RegisterComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly registerForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly showPassword = signal<boolean>(false);
  readonly agreeTerms = signal<boolean>(true);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Password Requirement Checks
  readonly hasMinLength = signal<boolean>(false);
  readonly hasUpper = signal<boolean>(false);
  readonly hasLower = signal<boolean>(false);
  readonly hasDigit = signal<boolean>(false);
  readonly hasSpecial = signal<boolean>(false);

  // Google OAuth Modal
  readonly showGoogleModal = signal<boolean>(false);
  customGoogleEmail: string = '';

  // Carousel Slides
  readonly slides: ShowcaseSlide[] = [
    {
      title: 'Connect with every application.',
      subtitle: 'Everything you need in an easily customizable, intelligent financial dashboard.',
      tag: 'Unified Hub'
    },
    {
      title: 'Multi-Business P&L & Cashflow.',
      subtitle: 'Track client receivables, vendor OPEX, GST liabilities, and real-time net margins.',
      tag: 'Business Finance'
    },
    {
      title: 'Bank-Grade Security & 100% Privacy.',
      subtitle: 'Your personal financial ledger, audited, offline-ready, and entirely under your control.',
      tag: 'Privacy First'
    }
  ];

  readonly activeSlide = signal<number>(0);
  private slideInterval: any = null;

  ngOnInit(): void {
    this.slideInterval = setInterval(() => {
      this.activeSlide.update(curr => (curr + 1) % this.slides.length);
    }, 4500);
  }

  ngOnDestroy(): void {
    if (this.slideInterval) clearInterval(this.slideInterval);
  }

  setSlide(index: number): void {
    this.activeSlide.set(index);
  }

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
    if (this.registerForm.invalid || !this.agreeTerms()) {
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

  // --- Google OAuth ---
  openGoogleModal(): void {
    this.showGoogleModal.set(true);
  }

  closeGoogleModal(): void {
    this.showGoogleModal.set(false);
  }

  simulateGoogleAuth(email: string, fullName: string): void {
    if (!email.trim()) return;

    this.showGoogleModal.set(false);
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.googleLogin({ email: email.trim(), fullName: fullName.trim() }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.errors?.[0] || err.error?.message || 'Google sign-up encountered an issue.');
      }
    });
  }
}
