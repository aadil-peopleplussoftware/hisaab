import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-badge">₹</div>
          <h1>Create Account</h1>
          <p>Join Hisaab Personal Finance</p>
        </div>

        @if (errorMessage()) {
          <div class="error-banner" role="alert">
            {{ errorMessage() }}
          </div>
        }

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
          <div class="form-group">
            <label for="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              formControlName="fullName"
              placeholder="e.g. Rahul Sharma"
              autocomplete="name"
              [class.invalid]="isFieldInvalid('fullName')"
            />
            @if (isFieldInvalid('fullName')) {
              <span class="field-error">Full name is required.</span>
            }
          </div>

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
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="Min. 8 characters"
              autocomplete="new-password"
              [class.invalid]="isFieldInvalid('password')"
              (input)="updatePasswordChecks()"
            />

            <!-- Password Requirements Checklist -->
            <div class="pw-checklist">
              <span [class.met]="hasMinLength()">• 8+ chars</span>
              <span [class.met]="hasUpper()">• Uppercase</span>
              <span [class.met]="hasLower()">• Lowercase</span>
              <span [class.met]="hasDigit()">• Number</span>
              <span [class.met]="hasSpecial()">• Special symbol</span>
            </div>
          </div>

          <button
            type="submit"
            class="btn-submit"
            [disabled]="registerForm.invalid || isLoading()"
          >
            @if (isLoading()) {
              <span>Creating Account...</span>
            } @else {
              <span>Sign Up</span>
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/auth/login">Sign In</a></p>
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
      max-width: 420px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 2rem 1.5rem;
      box-shadow: var(--shadow-md);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 1.5rem;

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
      gap: 1.15rem;
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

    .field-error {
      font-size: 0.75rem;
      color: var(--color-expense);
      font-weight: 500;
    }

    .pw-checklist {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.35rem;

      span {
        font-size: 0.75rem;
        color: var(--color-text-muted);

        &.met {
          color: var(--color-income);
          font-weight: 600;
        }
      }
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
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly registerForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly hasMinLength = signal<boolean>(false);
  readonly hasUpper = signal<boolean>(false);
  readonly hasLower = signal<boolean>(false);
  readonly hasDigit = signal<boolean>(false);
  readonly hasSpecial = signal<boolean>(false);

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
        const detail = err.error?.errors?.[0] || err.error?.detail || 'Failed to create account.';
        this.errorMessage.set(detail);
      }
    });
  }
}
