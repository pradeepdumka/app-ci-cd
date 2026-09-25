import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { SignupData, User } from './user.model';

interface AuthResponse {
  message: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api';
  readonly currentUser = signal<User | null>(null);

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(tap(({ user }) => this.currentUser.set(user)));
  }

  signup(data: SignupData): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/signup`, data)
      .pipe(tap(({ user }) => this.currentUser.set(user)));
  }

  loadCurrentUser(): Observable<boolean> {
    if (this.currentUser()) return of(true);
    return this.http.get<{ user: User }>(`${this.apiUrl}/auth/me`).pipe(
      tap(({ user }) => this.currentUser.set(user)),
      map(() => true),
      catchError(() => {
        this.currentUser.set(null);
        return of(false);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {}).pipe(
      tap(() => this.currentUser.set(null)),
      catchError(() => {
        this.currentUser.set(null);
        return of(undefined);
      }),
    );
  }

  api(path: string): string {
    return `${this.apiUrl}${path}`;
  }
}
