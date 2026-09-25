import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { AdminSummary, User, UserListResponse } from '../../core/user.model';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, FormsModule],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.currentUser;
  readonly initials = computed(() =>
    (this.user()?.name || 'User')
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
  );
  readonly summary = signal<AdminSummary | null>(null);
  readonly users = signal<User[]>([]);
  readonly cities = signal<string[]>([]);
  readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly deletingId = signal('');
  search = '';
  city = '';

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (this.user()?.role === 'admin') this.loadAdminData();
  }

  loadAdminData(page = 1): void {
    this.loading.set(true);
    this.error.set('');
    let params = new HttpParams().set('page', page).set('limit', 10);
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.city) params = params.set('city', this.city);

    forkJoin({
      summary: this.http.get<AdminSummary>(this.auth.api('/admin/summary')),
      list: this.http.get<UserListResponse>(this.auth.api('/admin/users'), { params }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ summary, list }) => {
          this.summary.set(summary);
          this.users.set(list.users);
          this.cities.set(list.cities);
          this.pagination.set(list.pagination);
        },
        error: (error: HttpErrorResponse) =>
          this.error.set(error.error?.message || 'Could not load users.'),
      });
  }

  clearFilters(): void {
    this.search = '';
    this.city = '';
    this.loadAdminData();
  }

  deleteUser(user: User): void {
    if (!confirm(`Delete ${user.name}? This action cannot be undone.`)) return;
    this.deletingId.set(user.id);
    this.http
      .delete(this.auth.api(`/admin/users/${user.id}`))
      .pipe(finalize(() => this.deletingId.set('')))
      .subscribe({
        next: () => this.loadAdminData(this.pagination().page),
        error: (error: HttpErrorResponse) =>
          this.error.set(error.error?.message || 'Could not delete this user.'),
      });
  }

  logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/login']));
  }
}
