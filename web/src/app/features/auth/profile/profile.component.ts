import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-page">
      <div class="profile-header">
        <h2>Account & Profile</h2>
        <p>Manage your personal profile and security credentials</p>
      </div>

      @if (successMessage()) {
        <div class="alert alert-success">{{ successMessage() }}</div>
      }
      @if (errorMessage()) {
        <div class="alert alert-danger">{{ errorMessage() }}</div>
      }

      <div class="profile-grid">
        <!-- Profile Info Card -->
        <div class="card">
          <h3>Personal Details</h3>
          <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()">
            <div class="form-group">
              <label for="fullName">Full Name</label>
              <input id="fullName" type="text" formControlName="fullName" />
            </div>

            <div class="form-group">
              <label for="email">Email Address</label>
              <input id="email" type="email" [value]="authService.currentUser()?.email" disabled class="disabled-input" />
            </div>

            <div class="form-group">
              <label for="timezone">Timezone</label>
              <select id="timezone" formControlName="timezone">
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">UTC (+0:00)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="locale">Locale</label>
              <select id="locale" formControlName="locale">
                <option value="en-IN">en-IN (Indian English - ₹)</option>
                <option value="en-US">en-US (US English)</option>
              </select>
            </div>

            <button type="submit" class="btn btn-primary" [disabled]="profileForm.invalid || isSavingProfile()">
              {{ isSavingProfile() ? 'Saving...' : 'Save Changes' }}
            </button>
          </form>
        </div>

        <!-- Security / Password Card -->
        <div class="card">
          <h3>Security & Password</h3>
          <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()">
            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <input id="currentPassword" type="password" formControlName="currentPassword" />
            </div>

            <div class="form-group">
              <label for="newPassword">New Password</label>
              <input id="newPassword" type="password" formControlName="newPassword" placeholder="Min. 8 characters" />
            </div>

            <button type="submit" class="btn btn-secondary" [disabled]="passwordForm.invalid || isChangingPassword()">
              {{ isChangingPassword() ? 'Updating...' : 'Update Password' }}
            </button>
          </form>

          <hr class="divider" />

          <div class="danger-zone">
            <h4>Session Management</h4>
            <p>Sign out of your account on this device or all active sessions.</p>
            <div class="action-buttons">
              <button type="button" class="btn btn-outline" (click)="onLogout()">
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .profile-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .profile-header p {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;

      &.alert-success {
        background: var(--color-income-bg);
        color: var(--color-income);
        border: 1px solid var(--color-income);
      }

      &.alert-danger {
        background: var(--color-expense-bg);
        color: var(--color-expense);
        border: 1px solid var(--color-expense);
      }
    }

    .profile-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;

      @media (min-width: 1024px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);

      h3 {
        font-size: 1.15rem;
        font-weight: 600;
        margin-bottom: 1.25rem;
      }
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      label {
        font-size: 0.85rem;
        font-weight: 600;
      }

      input, select {
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
        }

        &.disabled-input {
          background: var(--color-bg-subtle);
          color: var(--color-text-muted);
          cursor: not-allowed;
        }
      }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: var(--min-touch-target);
      padding: 0.65rem 1.25rem;
      border-radius: var(--radius-md);
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;

      &.btn-primary {
        background: var(--color-primary);
        color: var(--color-primary-contrast);
        &:hover { background: var(--color-primary-hover); }
      }

      &.btn-secondary {
        background: var(--color-bg-subtle);
        color: var(--color-text-main);
        border: 1px solid var(--color-border);
        &:hover { background: var(--color-border); }
      }

      &.btn-outline {
        background: transparent;
        color: var(--color-expense);
        border: 1px solid var(--color-expense);
        &:hover { background: var(--color-expense-bg); }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .divider {
      margin: 1.5rem 0;
      border: 0;
      border-top: 1px solid var(--color-border);
    }

    .danger-zone {
      h4 {
        font-size: 0.95rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      p {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin-bottom: 0.75rem;
      }
    }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
    }
  `]
})
export class ProfileComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly profileForm = this.fb.group({
    fullName: ['', [Validators.required]],
    timezone: ['Asia/Kolkata', [Validators.required]],
    locale: ['en-IN', [Validators.required]]
  });

  readonly passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly isSavingProfile = signal<boolean>(false);
  readonly isChangingPassword = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        fullName: user.fullName,
        timezone: user.timezone || 'Asia/Kolkata',
        locale: user.locale || 'en-IN'
      });
    }
  }

  onUpdateProfile(): void {
    if (this.profileForm.invalid) return;

    this.isSavingProfile.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const val = this.profileForm.getRawValue();

    this.authService.updateProfile({
      fullName: val.fullName!,
      timezone: val.timezone!,
      locale: val.locale!
    }).subscribe({
      next: () => {
        this.isSavingProfile.set(false);
        this.successMessage.set('Profile details updated successfully.');
      },
      error: (err) => {
        this.isSavingProfile.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to update profile.');
      }
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) return;

    this.isChangingPassword.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const val = this.passwordForm.getRawValue();

    this.authService.changePassword({
      currentPassword: val.currentPassword!,
      newPassword: val.newPassword!
    }).subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        this.passwordForm.reset();
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.isChangingPassword.set(false);
        this.errorMessage.set(err.error?.errors?.[0] || err.error?.detail || 'Failed to change password.');
      }
    });
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login'])
    });
  }
}

