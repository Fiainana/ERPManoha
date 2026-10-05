import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  TokenResponse,
  UserProfile,
  AppRole,
} from '../models/api-response';

const TOKEN_KEY = 'erpmanoha_token';
const USER_KEY = 'erpmanoha_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly userSignal = signal<UserProfile | null>(this.readUser());

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly roles = computed(() => this.userSignal()?.roles ?? []);
  readonly isAdmin = computed(
    () =>
      !!this.userSignal()?.isAdmin ||
      (this.userSignal()?.roles ?? []).includes('Admin')
  );

  readonly displayName = computed(() => {
    const u = this.userSignal();
    if (!u) return '';
    if (u.prenom || u.nom) {
      return [u.prenom, u.nom].filter(Boolean).join(' ');
    }
    return u.name || u.login || '';
  });

  /**
   * Connexion login + mot de passe.
   * Endpoint API : POST /api/auth/login
   */
  login(login: string, password: string) {
    return this.http
      .post<ApiResponse<TokenResponse>>(`${environment.apiUrl}/auth/login`, {
        login,
        password,
      })
      .pipe(
        map((res) => {
          if (!res.success || !res.data?.accessToken) {
            throw new Error(res.message || 'Identifiants invalides');
          }
          this.persistSession(res.data);
          return res.data;
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    void this.router.navigate(['/login']);
  }

  hasRole(...required: AppRole[]): boolean {
    const current = this.roles();
    if (current.includes('Admin')) return true;
    return required.some((r) => current.includes(r));
  }

  private persistSession(data: TokenResponse): void {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    this.tokenSignal.set(data.accessToken);

    const rawUser = data.user ?? {};
    const profile: UserProfile = {
      ...rawUser,
      name:
        rawUser.name ||
        [rawUser.prenom, rawUser.nom].filter(Boolean).join(' ') ||
        rawUser.login,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    this.userSignal.set(profile);
  }

  private readToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private readUser(): UserProfile | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }
}
