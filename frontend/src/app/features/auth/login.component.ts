import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule,
    MatCardModule, 
    MatInputModule, 
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>Login</mat-card-title>
          <mat-card-subtitle>Welcome back to Finance Tracker</mat-card-subtitle>
        </mat-card-header>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <mat-card-content>
            <mat-form-field appearance="outline" class="w-100 mt-2">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" placeholder="Ex. pat@example.com">
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">Please enter a valid email address</mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password">
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Password is required</mat-error>
            </mat-form-field>
          </mat-card-content>
          
          <mat-card-actions class="d-flex justify-between align-center px-3">
            <a routerLink="/register" mat-button color="primary">Need an account?</a>
            <button mat-raised-button color="primary" type="submit" [disabled]="loginForm.invalid || isLoading">
              <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
              <span *ngIf="!isLoading">Login</span>
            </button>
          </mat-card-actions>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #f5f5f5;
    }
    .auth-card {
      width: 100%;
      max-width: 400px;
    }
    .px-3 { padding-left: 16px; padding-right: 16px; }
  `]
})
export class LoginComponent {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  isLoading = false;
  
  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.authService.login(this.loginForm.getRawValue()).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.snackBar.open('Logged in successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message || 'Login failed. Please try again.';
          this.snackBar.open(msg, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
    }
  }
}
