import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User, AuthResponse } from '../models/user.model';

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  avatarUrl?: string;
  timezone: string;
  locale: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface GoogleLoginPayload {
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface SendOtpPayload {
  identifier: string;
}

export interface VerifyOtpPayload {
  identifier: string;
  code: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  newPassword: string;
}

export interface OtpResponse {
  identifier: string;
  sentViaEmail: boolean;
  codeHint?: string;
  message: string;
}

export interface ForgotPasswordResponse {
  email: string;
  sentViaEmail: boolean;
  resetLink?: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/auth';

  // Access token kept in memory only for maximum security against XSS (Section 2 & 4)
  private inMemoryAccessToken: string | null = null;

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload).pipe(
      tap(auth => this.setSession(auth))
    );
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap(auth => this.setSession(auth))
    );
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, {}).pipe(
      tap(auth => this.setSession(auth))
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/logout`, {}).pipe(
      tap(() => this.clearSession())
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/profile`).pipe(
      tap(user => this.currentUser.set(user))
    );
  }

  updateProfile(payload: UpdateProfilePayload): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/profile`, payload).pipe(
      tap(user => this.currentUser.set(user))
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/change-password`, payload).pipe(
      tap(() => this.clearSession())
    );
  }

  googleLogin(payload: GoogleLoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/google`, payload).pipe(
      tap(auth => this.setSession(auth))
    );
  }

  sendOtp(identifier: string): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.baseUrl}/send-otp`, { identifier });
  }

  verifyOtp(identifier: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/verify-otp`, { identifier, code }).pipe(
      tap(auth => this.setSession(auth))
    );
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(payload: ResetPasswordPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/reset-password`, payload);
  }

  setSession(auth: AuthResponse): void {
    this.inMemoryAccessToken = auth.accessToken;
    this.currentUser.set(auth.user);
  }

  getAccessToken(): string | null {
    return this.inMemoryAccessToken;
  }

  clearSession(): void {
    this.inMemoryAccessToken = null;
    this.currentUser.set(null);
  }
}
