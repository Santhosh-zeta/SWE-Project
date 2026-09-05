import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Create Category</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="d-flex flex-column gap-2 mt-2">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Category Name</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type">
            <mat-option value="FIXED">Fixed Expense</mat-option>
            <mat-option value="MONTHLY_RESET">Monthly Budget</mat-option>
            <mat-option value="CUSTOM">Custom</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Budget / Configured Amount (₹)</mat-label>
          <input matInput type="number" formControlName="configuredAmount">
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Color</mat-label>
          <input matInput type="color" formControlName="color" style="height: 40px;">
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Description (Optional)</mat-label>
          <input matInput formControlName="description">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .flex-column { flex-direction: column; }
    .gap-2 { gap: 16px; }
  `]
})
export class CategoryDialogComponent {
  fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<CategoryDialogComponent>);

  form = this.fb.group({
    name: ['', Validators.required],
    type: ['MONTHLY_RESET', Validators.required],
    configuredAmount: [0, [Validators.required, Validators.min(0)]],
    color: ['#1976d2', Validators.required],
    description: ['']
  });

  save() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  providers: [CurrencyPipe],
  template: `
    <div class="header-section d-flex justify-between align-center mb-3">
      <h2>Categories</h2>
      <button mat-raised-button color="primary" (click)="openCreateDialog()">
        <mat-icon>add</mat-icon> Add Category
      </button>
    </div>

    <mat-card>
      <mat-card-content class="p-0">
        <table mat-table [dataSource]="categories" class="w-100">
          
          <ng-container matColumnDef="color">
            <th mat-header-cell *matHeaderCellDef> Color </th>
            <td mat-cell *matCellDef="let element">
              <span class="color-dot" [style.backgroundColor]="element.color"></span>
            </td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef> Name </th>
            <td mat-cell *matCellDef="let element"> {{element.name}} </td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef> Type </th>
            <td mat-cell *matCellDef="let element"> {{element.type}} </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef> Configured Amount </th>
            <td mat-cell *matCellDef="let element"> {{element.configuredAmount | currency:'INR':'symbol':'1.0-0'}} </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Status </th>
            <td mat-cell *matCellDef="let element">
              <span class="badge" [ngClass]="element.isActive ? 'badge-active' : 'badge-inactive'">
                {{element.isActive ? 'Active' : 'Archived'}}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button color="warn" (click)="archive(element)" *ngIf="element.isActive" title="Archive">
                <mat-icon>archive</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" [ngClass]="{'row-archived': !row.isActive}"></tr>
        </table>
        <div *ngIf="categories.length === 0" class="text-center p-3 text-muted">
          No categories found. Start by adding one.
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .p-0 { padding: 0 !important; }
    .p-3 { padding: 24px; }
    .color-dot {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-active { background-color: #e8f5e9; color: #2e7d32; }
    .badge-inactive { background-color: #f5f5f5; color: #757575; }
    .row-archived { opacity: 0.6; }
  `]
})
export class CategoriesComponent implements OnInit {
  http = inject(HttpClient);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);

  categories: any[] = [];
  displayedColumns = ['color', 'name', 'type', 'amount', 'status', 'actions'];

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.http.get('http://localhost:3000/api/categories').subscribe({
      next: (res: any) => {
        this.categories = res.data;
      }
    });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(CategoryDialogComponent, { width: '400px' });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.post('http://localhost:3000/api/categories', result).subscribe({
          next: () => {
            this.snackBar.open('Category created successfully', 'Close', { duration: 3000 });
            this.loadCategories();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Error creating category', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  archive(category: any) {
    if (confirm(`Are you sure you want to archive ${category.name}?`)) {
      this.http.patch(`http://localhost:3000/api/categories/${category.id}/archive`, {}).subscribe({
        next: () => {
          this.snackBar.open('Category archived successfully', 'Close', { duration: 3000 });
          this.loadCategories();
        }
      });
    }
  }
}
