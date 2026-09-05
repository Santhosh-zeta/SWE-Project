import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <div class="header-section mb-3">
      <h2>Settings</h2>
    </div>

    <mat-card class="settings-card">
      <mat-card-header>
        <mat-card-title>Profile Information</mat-card-title>
        <mat-card-subtitle>Update your personal and financial details</mat-card-subtitle>
      </mat-card-header>

      <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
        <mat-card-content class="d-flex flex-column gap-2 mt-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Email Address</mat-label>
            <input matInput [value]="authService.currentUser()?.email" disabled>
            <mat-hint>Email cannot be changed</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-100 mt-2">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name">
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Age</mat-label>
            <input matInput type="number" formControlName="age">
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Monthly Salary (₹)</mat-label>
            <input matInput type="number" formControlName="monthlySalary">
          </mat-form-field>
        </mat-card-content>
        
        <mat-card-actions align="end" class="p-3">
          <button mat-raised-button color="primary" type="submit" [disabled]="profileForm.invalid || isSaving">
            Save Changes
          </button>
        </mat-card-actions>
      </form>
    </mat-card>
  `,
  styles: [`
    .settings-card { max-width: 600px; }
    .flex-column { flex-direction: column; }
    .gap-2 { gap: 16px; }
    .p-3 { padding: 16px 24px; }
  `]
})
export class SettingsComponent implements OnInit {
  fb = inject(FormBuilder);
  http = inject(HttpClient);
  snackBar = inject(MatSnackBar);
  authService = inject(AuthService);

  isSaving = false;

  profileForm = this.fb.group({
    name: ['', Validators.required],
    age: [null],
    monthlySalary: [0, [Validators.required, Validators.min(0)]]
  });

  ngOnInit() {
    this.http.get('http://localhost:3000/api/profile').subscribe({
      next: (res: any) => {
        const user = res.data;
        this.profileForm.patchValue({
          name: user.name,
          age: user.age,
          monthlySalary: Number(user.monthlySalary)
        });
      }
    });
  }

  saveProfile() {
    if (this.profileForm.valid) {
      this.isSaving = true;
      this.http.put('http://localhost:3000/api/profile', this.profileForm.value).subscribe({
        next: (res: any) => {
          this.isSaving = false;
          this.snackBar.open('Settings saved successfully', 'Close', { duration: 3000 });
          // Update the global state with new user info
          this.authService.getMe().subscribe();
        },
        error: (err) => {
          this.isSaving = false;
          this.snackBar.open('Failed to save settings', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
