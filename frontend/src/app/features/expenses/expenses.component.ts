import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-expense-dialog',
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
    <h2 mat-dialog-title>{{ data?.expense ? 'Edit' : 'Add' }} Expense</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="d-flex flex-column gap-2 mt-2">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Date</mat-label>
          <input matInput type="date" formControlName="date">
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Category</mat-label>
          <mat-select formControlName="categoryId">
            <mat-option *ngFor="let cat of data.categories" [value]="cat.id">
              {{ cat.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Amount (₹)</mat-label>
          <input matInput type="number" formControlName="amount">
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
export class ExpenseDialogComponent implements OnInit {
  fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<ExpenseDialogComponent>);
  data = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    date: ['', Validators.required],
    categoryId: [null, Validators.required],
    amount: [null, [Validators.required, Validators.min(1)]],
    description: ['']
  });

  ngOnInit() {
    if (this.data?.expense) {
      const exp = this.data.expense;
      const dateStr = new Date(exp.date).toISOString().split('T')[0];
      this.form.patchValue({
        date: dateStr,
        categoryId: exp.categoryId,
        amount: exp.amount,
        description: exp.description
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      this.form.patchValue({ date: today });
    }
  }

  save() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  providers: [CurrencyPipe, DatePipe],
  template: `
    <div class="header-section d-flex justify-between align-center mb-3">
      <h2>Expenses</h2>
      <button mat-raised-button color="primary" (click)="openDialog()">
        <mat-icon>add</mat-icon> Add Expense
      </button>
    </div>

    <div class="filters d-flex gap-2 mb-3">
      <mat-form-field appearance="outline">
        <mat-label>Month</mat-label>
        <input matInput type="month" (change)="onFilterChange($event, 'month')" [value]="currentMonth">
      </mat-form-field>
      
      <mat-form-field appearance="outline">
        <mat-label>Category</mat-label>
        <mat-select (selectionChange)="onFilterChange($event.value, 'category')">
          <mat-option value="">All Categories</mat-option>
          <mat-option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <mat-card>
      <mat-card-content class="p-0">
        <div class="table-responsive">
          <table mat-table [dataSource]="expenses" class="w-100">
          
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef> Date </th>
            <td mat-cell *matCellDef="let element"> {{element.date | date:'mediumDate'}} </td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef> Category </th>
            <td mat-cell *matCellDef="let element">
              <span class="category-badge" [style.backgroundColor]="element.category.color">
                {{element.category.name}}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef> Amount </th>
            <td mat-cell *matCellDef="let element" class="fw-500"> {{element.amount | currency:'INR':'symbol':'1.0-0'}} </td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef> Description </th>
            <td mat-cell *matCellDef="let element" class="text-muted"> {{element.description || '-'}} </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button color="primary" (click)="openDialog(element)" title="Edit">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deleteExpense(element)" title="Delete">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        </div>
        
        <div *ngIf="expenses.length === 0" class="text-center p-3 text-muted">
          No expenses found for this period.
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .table-responsive { overflow-x: auto; }
    .p-0 { padding: 0 !important; }
    .p-3 { padding: 24px; }
    .gap-2 { gap: 16px; }
    .text-muted { color: #757575; }
    .fw-500 { font-weight: 500; }
    .category-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      color: white;
      text-shadow: 0 0 2px rgba(0,0,0,0.5);
    }
  `]
})
export class ExpensesComponent implements OnInit {
  http = inject(HttpClient);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);

  expenses: any[] = [];
  categories: any[] = [];
  displayedColumns = ['date', 'category', 'amount', 'description', 'actions'];
  
  currentMonth = '';
  selectedCategory = '';

  ngOnInit() {
    const now = new Date();
    this.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.loadCategories();
    this.loadExpenses();
  }

  loadCategories() {
    this.http.get('http://localhost:3000/api/categories').subscribe({
      next: (res: any) => {
        // Only active categories for adding new expenses
        this.categories = res.data;
      }
    });
  }

  loadExpenses() {
    let url = `http://localhost:3000/api/expenses?month=${this.currentMonth}`;
    if (this.selectedCategory) {
      url += `&categoryId=${this.selectedCategory}`;
    }
    
    this.http.get(url).subscribe({
      next: (res: any) => {
        this.expenses = res.data.expenses;
      }
    });
  }

  onFilterChange(event: any, type: string) {
    if (type === 'month') {
      this.currentMonth = event.target.value;
    } else if (type === 'category') {
      this.selectedCategory = event;
    }
    this.loadExpenses();
  }

  openDialog(expense?: any) {
    const activeCategories = this.categories.filter(c => c.isActive || (expense && expense.categoryId === c.id));
    
    const dialogRef = this.dialog.open(ExpenseDialogComponent, { 
      width: '400px',
      data: { categories: activeCategories, expense }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (expense) {
          this.http.put(`http://localhost:3000/api/expenses/${expense.id}`, result).subscribe({
            next: () => {
              this.snackBar.open('Expense updated successfully', 'Close', { duration: 3000 });
              this.loadExpenses();
            }
          });
        } else {
          this.http.post('http://localhost:3000/api/expenses', result).subscribe({
            next: () => {
              this.snackBar.open('Expense added successfully', 'Close', { duration: 3000 });
              this.loadExpenses();
            }
          });
        }
      }
    });
  }

  deleteExpense(expense: any) {
    if (confirm(`Delete expense of ₹${expense.amount} for ${expense.category.name}?`)) {
      this.http.delete(`http://localhost:3000/api/expenses/${expense.id}`).subscribe({
        next: () => {
          this.snackBar.open('Expense deleted', 'Close', { duration: 3000 });
          this.loadExpenses();
        }
      });
    }
  }
}
