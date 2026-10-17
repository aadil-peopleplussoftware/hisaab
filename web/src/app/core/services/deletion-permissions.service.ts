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

@Injectable({
  providedIn: 'root'
})
export class DeletionPermissionsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/settings/deletion-permissions';

  public permissions = signal<DeletionPermissions>({
    transactions: true,
    categories: true,
    loans: true,
    epfo: true,
    investments: true,
    business: true,
    goals: true
  });

  public isLoaded = signal<boolean>(false);
  public isUpdating = signal<boolean>(false);

  constructor() {
    this.fetchPermissions();
  }

  public fetchPermissions(): Observable<DeletionPermissions> {
    return this.http.get<DeletionPermissions>(this.apiUrl).pipe(
      tap(perms => {
        if (perms) {
          this.permissions.set({
            transactions: perms.transactions ?? true,
            categories: perms.categories ?? true,
            loans: perms.loans ?? true,
            epfo: perms.epfo ?? true,
            investments: perms.investments ?? true,
            business: perms.business ?? true,
            goals: perms.goals ?? true
          });
          this.isLoaded.set(true);
        }
      }),
      catchError(err => {
        console.warn('Could not load deletion permissions, using defaults', err);
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
    const merged = { ...this.permissions(), ...newPerms };
    return this.http.put<DeletionPermissions>(this.apiUrl, merged).pipe(
      tap(updated => {
        this.permissions.set(updated);
        this.isUpdating.set(false);
      }),
      catchError(err => {
        this.isUpdating.set(false);
        throw err;
      })
    );
  }
}

