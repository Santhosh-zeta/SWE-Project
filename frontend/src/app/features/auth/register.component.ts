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
  selector: 'app-register',
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
          <mat-card-title>Register</mat-card-title>
          <mat-card-subtitle>Create your Finance Tracker account</mat-card-subtitle>
        </mat-card-header>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <mat-card-content>
            <mat-form-field appearance="outline" class="w-100 mt-2">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" placeholder="John Doe">
              <mat-error *ngIf="registerForm.get('name')?.hasError('required')">Name is required</mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" placeholder="pat@example.com">
              <mat-error *ngIf="registerForm.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="registerForm.get('email')?.hasError('email')">Valid email required</mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password">
              <mat-error *ngIf="registerForm.get('password')?.hasError('required')">Password is required</mat-error>
              <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">Minimum 6 characters</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Age (Optional)</mat-label>
              <input matInput type="number" formControlName="age">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Monthly Salary (₹)</mat-label>
              <input matInput type="number" formControlName="monthlySalary">
            </mat-form-field>
          </mat-card-content>
          
          <mat-card-actions class="d-flex justify-between align-center px-3 mb-2">
            <a routerLink="/login" mat-button color="primary">Already have an account?</a>
            <button mat-raised-button color="primary" type="submit" [disabled]="registerForm.invalid || isLoading">
              <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
              <span *ngIf="!isLoading">Register</span>
            </button>
          </mat-card-actions>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #f5f5f5;
      padding: 24px;
    }
    .auth-card {
      width: 100%;
      max-width: 450px;
    }
    .px-3 { padding-left: 16px; padding-right: 16px; }
  `]
})
export class RegisterComponent {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  isLoading = false;
  
  registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    age: [null],
    monthlySalary: [0, [Validators.min(0)]]
  });

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.authService.register(this.registerForm.value).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.snackBar.open('Registration successful', 'Close', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message || 'Registration failed.';
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      });
    }
  }
}
