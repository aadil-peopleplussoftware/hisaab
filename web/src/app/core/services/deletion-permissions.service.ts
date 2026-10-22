import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

export interface DeletionPermissions {
  transactions: boolean;
  categories: boolean;
  loans: boolean;
  epfo: boolean;
  investments: boolean;
  business: boolean;
  goals: boolean;
}

const STORAGE_KEY = 'hisaab_deletion_permissions';

const DEFAULT_PERMISSIONS: DeletionPermissions = {
  transactions: true,
  categories: true,
  loans: true,
  epfo: true,
  investments: true,
  business: true,
  goals: true
};

@Injectable({
  providedIn: 'root'
})
export class DeletionPermissionsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/settings/deletion-permissions';

  public permissions = signal<DeletionPermissions>(this.loadFromStorage() ?? DEFAULT_PERMISSIONS);
  public isLoaded = signal<boolean>(false);
  public isUpdating = signal<boolean>(false);

  constructor() {
    // Automatically trigger fetch from database upon service creation
    this.fetchPermissions().subscribe({
      next: () => {},
      error: (err) => console.warn('Could not hydrate deletion permissions on init:', err)
    });
  }

  private loadFromStorage(): DeletionPermissions | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          transactions: parsed.transactions ?? true,
          categories: parsed.categories ?? true,
          loans: parsed.loans ?? true,
          epfo: parsed.epfo ?? true,
          investments: parsed.investments ?? true,
          business: parsed.business ?? true,
          goals: parsed.goals ?? true
        };
      }
    } catch (e) {
      console.warn('Failed to parse cached deletion permissions from localStorage', e);
    }
    return null;
  }

  private saveToStorage(perms: DeletionPermissions): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
    } catch (e) {
      console.warn('Failed to cache deletion permissions to localStorage', e);
    }
  }

  public fetchPermissions(): Observable<DeletionPermissions> {
    return this.http.get<DeletionPermissions>(this.apiUrl).pipe(
      tap(perms => {
        if (perms) {
          const normalized: DeletionPermissions = {
            transactions: perms.transactions ?? true,
            categories: perms.categories ?? true,
            loans: perms.loans ?? true,
            epfo: perms.epfo ?? true,
            investments: perms.investments ?? true,
            business: perms.business ?? true,
            goals: perms.goals ?? true
          };
          this.permissions.set(normalized);
          this.saveToStorage(normalized);
          this.isLoaded.set(true);
        }
      }),
      catchError(err => {
        console.warn('Could not load deletion permissions from backend, falling back to cached/defaults', err);
        return of(this.permissions());
      })
    );
  }

  public canDelete(module: keyof DeletionPermissions | string): boolean {
    const key = module.toLowerCase() as keyof DeletionPermissions;
    const current = this.permissions();
    return current[key] ?? true;
  }

  public updatePermissions(newPerms: Partial<DeletionPermissions>): Observable<DeletionPermissions> {
    this.isUpdating.set(true);
    const merged: DeletionPermissions = { ...this.permissions(), ...newPerms };
    return this.http.put<DeletionPermissions>(this.apiUrl, merged).pipe(
      tap(updated => {
        const normalized: DeletionPermissions = {
          transactions: updated.transactions ?? merged.transactions ?? true,
          categories: updated.categories ?? merged.categories ?? true,
          loans: updated.loans ?? merged.loans ?? true,
          epfo: updated.epfo ?? merged.epfo ?? true,
          investments: updated.investments ?? merged.investments ?? true,
          business: updated.business ?? merged.business ?? true,
          goals: updated.goals ?? merged.goals ?? true
        };
        this.permissions.set(normalized);
        this.saveToStorage(normalized);
        this.isUpdating.set(false);
      }),
      catchError(err => {
        this.isUpdating.set(false);
        throw err;
      })
    );
  }

  public clearCache(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    this.permissions.set(DEFAULT_PERMISSIONS);
    this.isLoaded.set(false);
  }
}

