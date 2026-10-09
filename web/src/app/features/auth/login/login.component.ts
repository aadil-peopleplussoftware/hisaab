import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-badge">₹</div>
          <h1>Welcome to Hisaab</h1>
          <p>Secure Enterprise Finance Tracker</p>
        </div>

        @if (errorMessage()) {
          <div class="error-banner" role="alert">
            {{ errorMessage() }}
          </div>
        }

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="name@example.com"
              autocomplete="email"
              [class.invalid]="isFieldInvalid('email')"
            />
            @if (isFieldInvalid('email')) {
              <span class="field-error">Please enter a valid email address.</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="password-input-wrapper">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="••••••••"
                autocomplete="current-password"
                [class.invalid]="isFieldInvalid('password')"
              />
              <button
                type="button"
                class="btn-toggle-pw"
                (click)="togglePasswordVisibility()"
                aria-label="Toggle password visibility"
              >
                {{ showPassword() ? 'Hide' : 'Show' }}
              </button>
            </div>
            @if (isFieldInvalid('password')) {
              <span class="field-error">Password is required.</span>
            }
          </div>

          <button
            type="submit"
            class="btn-submit"
            [disabled]="loginForm.invalid || isLoading()"
          >
            @if (isLoading()) {
              <span>Signing in...</span>
            } @else {
              <span>Sign In</span>
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/auth/register">Create Account</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: var(--color-bg-app);
    }

    .auth-card {
      width: 100%;
      max-width: 400px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 2rem 1.5rem;
      box-shadow: var(--shadow-md);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 1.75rem;

      .brand-badge {
        width: 48px;
        height: 48px;
        margin: 0 auto 0.75rem;
        background: var(--color-primary);
        color: #ffffff;
        font-size: 1.5rem;
        font-weight: 700;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      h1 {
        font-size: 1.35rem;
        font-weight: 700;
        color: var(--color-text-main);
      }

      p {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        margin-top: 0.25rem;
      }
    }

    .error-banner {
      background: var(--color-expense-bg);
      color: var(--color-expense);
      border: 1px solid var(--color-expense);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 1.25rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text-main);
      }

      input {
        width: 100%;
        min-height: var(--min-touch-target);
        padding: 0.65rem 0.85rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-bg-card);
        color: var(--color-text-main);
        font-size: 0.95rem;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
        }

        &.invalid {
          border-color: var(--color-expense);
        }
      }
    }

    .password-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;

      input {
        padding-right: 4rem;
      }

      .btn-toggle-pw {
        position: absolute;
        right: 0.5rem;
        background: transparent;
        border: none;
        color: var(--color-text-muted);
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        padding: 0.5rem;
        min-height: auto;
      }
    }

    .field-error {
      font-size: 0.75rem;
      color: var(--color-expense);
      font-weight: 500;
    }

    .btn-submit {
      width: 100%;
      min-height: var(--min-touch-target);
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      border: none;
      border-radius: var(--radius-md);
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease;
      margin-top: 0.5rem;

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.85rem;
      color: var(--color-text-muted);

      a {
        color: var(--color-primary);
        font-weight: 600;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  isFieldInvalid(fieldName: 'email' | 'password'): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
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
        const detail = err.error?.errors?.[0] || err.error?.detail || 'Invalid email or password.';
        this.errorMessage.set(detail);
      }
    });
  }
}
