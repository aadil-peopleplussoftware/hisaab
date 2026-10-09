import { Injectable, signal, computed } from '@angular/core';
import { User, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Access token kept in memory only for maximum security against XSS (Section 2 & 4)
  private inMemoryAccessToken: string | null = null;

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());

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

