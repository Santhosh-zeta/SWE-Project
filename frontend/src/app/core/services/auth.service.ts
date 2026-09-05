import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private currentUserSignal = signal<any>(null);

  currentUser = computed(() => this.currentUserSignal());
  isAuthenticated = computed(() => !!this.currentUserSignal());

  constructor(private http: HttpClient, private router: Router) {
    this.checkInitialAuth();
  }

  private checkInitialAuth() {
    const token = localStorage.getItem('token');
    if (token) {
      this.getMe().subscribe({
        error: () => this.logout()
      });
    }
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data).pipe(
      tap((res: any) => {
        if (res.success && res.data.token) {
          localStorage.setItem('token', res.data.token);
          this.currentUserSignal.set(res.data.user);
        }
      })
    );
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data).pipe(
      tap((res: any) => {
        if (res.success && res.data.token) {
          localStorage.setItem('token', res.data.token);
          this.currentUserSignal.set(res.data.user);
        }
      })
    );
  }

  getMe(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`).pipe(
      tap((res: any) => {
        if (res.success) {
          this.currentUserSignal.set(res.data);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }
}
