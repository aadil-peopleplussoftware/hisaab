import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

export interface ModuleRight {
  module: string;
  displayName: string;
  description: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export interface RoleSummary {
  name: string;
  description: string;
  userCount: number;
  isSystemRole: boolean;
  updatedAtUtc?: string | null;
}

export interface UserRoleAssignment {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAtUtc: string;
}

export interface CreateRolePayload {
  roleName: string;
  description?: string;
  copyFromRole?: string;
}

const RIGHTS_STORAGE_KEY = 'hisaab_my_rights';
const ROLE_STORAGE_KEY = 'hisaab_user_role';

@Injectable({
  providedIn: 'root'
})
export class RoleRightsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/role-rights';

  public myRights = signal<Record<string, ModuleRight>>(this.loadRightsFromStorage());
  public currentUserRole = signal<string>(this.loadRoleFromStorage());
  public isLoaded = signal<boolean>(Object.keys(this.myRights()).length > 0);

  constructor() {
    // If we have cached rights or on boot, try to hydrate fresh rights from server
    this.loadMyRights().subscribe({
      next: () => {},
      error: (err) => console.warn('Could not auto-hydrate user role rights on init:', err)
    });
  }

  private loadRightsFromStorage(): Record<string, ModuleRight> {
    try {
      const stored = localStorage.getItem(RIGHTS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse cached rights from localStorage', e);
    }
    return {};
  }

  private loadRoleFromStorage(): string {
    try {
      return localStorage.getItem(ROLE_STORAGE_KEY) || 'User';
    } catch {
      return 'User';
    }
  }

  private saveRightsToStorage(rights: Record<string, ModuleRight>): void {
    try {
      localStorage.setItem(RIGHTS_STORAGE_KEY, JSON.stringify(rights));
    } catch (e) {
      console.warn('Failed to save rights to localStorage', e);
    }
  }

  public setUserRole(role: string): void {
    if (!role) return;
    this.currentUserRole.set(role);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch {}
  }

  public loadMyRights(): Observable<ModuleRight[]> {
    return this.http.get<ModuleRight[]>(`${this.baseUrl}/my-rights`).pipe(
      tap(rights => {
        if (Array.isArray(rights)) {
          const map: Record<string, ModuleRight> = {};
          for (const r of rights) {
            map[r.module.toLowerCase()] = r;
          }
          this.myRights.set(map);
          this.isLoaded.set(true);
          this.saveRightsToStorage(map);
        }
      }),
      catchError(err => {
        console.warn('Could not load user rights from backend:', err);
        this.isLoaded.set(true);
        return of([]);
      })
    );
  }

  private resolveRight(module: string): ModuleRight | undefined {
    const rights = this.myRights();
    const key = module.toLowerCase();

    if (rights[key]) return rights[key];

    // Alias fallbacks for linked sub-modules
    if (key === 'analytics') return rights['reports'];
    if (key === 'market-ai' || key === 'marketai') return rights['investments'];
    if (key === 'datatransfer' || key === 'data-transfer') return rights['reports'] || rights['settings'];
    if (key === 'recyclebin' || key === 'recycle-bin') return rights['settings'] || rights['transactions'];

    return undefined;
  }

  public canView(module: string): boolean {
    const key = module.toLowerCase();

    // Dashboard and profile are fundamental core screens accessible to all authenticated users
    if (key === 'dashboard' || key === 'profile') return true;

    const right = this.resolveRight(module);
    if (right !== undefined) {
      // Safety safeguard: Admin can always view Settings so they can never lock themselves out of configuration
      if (key === 'settings' && this.currentUserRole().toLowerCase() === 'admin') {
        return true;
      }
      return right.canView;
    }

    // Safety fallback for Admin if right is not explicitly defined in the matrix
    if (this.currentUserRole().toLowerCase() === 'admin') {
      return true;
    }

    // If rights are not yet loaded and no cache exists, permit initial render
    if (!this.isLoaded()) {
      return true;
    }

    return false;
  }

  public canCreate(module: string): boolean {
    const right = this.resolveRight(module);
    if (right !== undefined) return right.canCreate && right.canView;
    if (this.currentUserRole().toLowerCase() === 'admin') return true;
    return !this.isLoaded();
  }

  public canEdit(module: string): boolean {
    const right = this.resolveRight(module);
    if (right !== undefined) return right.canEdit && right.canView;
    if (this.currentUserRole().toLowerCase() === 'admin') return true;
    return !this.isLoaded();
  }

  public canDelete(module: string): boolean {
    const right = this.resolveRight(module);
    if (right !== undefined) return right.canDelete && right.canView;
    if (this.currentUserRole().toLowerCase() === 'admin') return true;
    return !this.isLoaded();
  }

  public canExport(module: string): boolean {
    const right = this.resolveRight(module);
    if (right !== undefined) return right.canExport && right.canView;
    if (this.currentUserRole().toLowerCase() === 'admin') return true;
    return !this.isLoaded();
  }

  public clearCache(): void {
    try {
      localStorage.removeItem(RIGHTS_STORAGE_KEY);
      localStorage.removeItem(ROLE_STORAGE_KEY);
    } catch {}
    this.myRights.set({});
    this.currentUserRole.set('User');
    this.isLoaded.set(false);
  }

  getRoles(): Observable<RoleSummary[]> {
    return this.http.get<RoleSummary[]>(`${this.baseUrl}/roles`);
  }

  getRoleRights(roleName: string): Observable<ModuleRight[]> {
    return this.http.get<ModuleRight[]>(`${this.baseUrl}/roles/${encodeURIComponent(roleName)}`);
  }

  updateRoleRights(roleName: string, rights: ModuleRight[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/roles/${encodeURIComponent(roleName)}`, rights);
  }

  createRole(payload: CreateRolePayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/roles`, payload);
  }

  deleteRole(roleName: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/roles/${encodeURIComponent(roleName)}`);
  }

  getUserRoles(): Observable<UserRoleAssignment[]> {
    return this.http.get<UserRoleAssignment[]>(`${this.baseUrl}/users`);
  }

  assignUserRole(userId: string, roleName: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/users/${userId}/role`, { roleName });
  }

  getMyRights(): Observable<ModuleRight[]> {
    return this.http.get<ModuleRight[]>(`${this.baseUrl}/my-rights`);
  }
}

