import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  providers: [CurrencyPipe],
  template: `
    <div *ngIf="isLoading" class="d-flex justify-center align-center" style="height: 100%;">
      <mat-spinner></mat-spinner>
    </div>

    <div *ngIf="!isLoading && summaryData" class="dashboard-container">
      <div class="header-section d-flex justify-between align-center mb-3">
        <h2>Dashboard</h2>
        <div class="month-selector d-flex align-center">
          <button mat-icon-button (click)="previousMonth()"><mat-icon>chevron_left</mat-icon></button>
          <h3 style="margin: 0 16px;">{{ currentMonthName }}</h3>
          <button mat-icon-button (click)="nextMonth()"><mat-icon>chevron_right</mat-icon></button>
        </div>
      </div>

      <div class="summary-cards d-flex mb-3">
        <mat-card class="summary-card flex-1">
          <mat-card-header>
            <mat-card-title>Monthly Salary</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <h2 class="amount income">{{ summaryData.salary | currency:'INR':'symbol':'1.0-0' }}</h2>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card flex-1">
          <mat-card-header>
            <mat-card-title>Total Spent</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <h2 class="amount expense">{{ summaryData.totalSpent | currency:'INR':'symbol':'1.0-0' }}</h2>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card flex-1">
          <mat-card-header>
            <mat-card-title>Remaining</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <h2 class="amount" [ngClass]="{'income': summaryData.remaining >= 0, 'expense': summaryData.remaining < 0}">
              {{ summaryData.remaining | currency:'INR':'symbol':'1.0-0' }}
            </h2>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="main-content-grid d-flex gap-3">
        <div class="categories-section flex-2">
          <mat-card class="mb-3">
            <mat-card-header class="d-flex justify-between align-center">
              <mat-card-title>Category Progress</mat-card-title>
              <a mat-button color="primary" routerLink="/categories">Manage</a>
            </mat-card-header>
            <mat-card-content>
              <div *ngIf="summaryData.categories.length === 0" class="text-center mt-3 mb-3">
                <p>No categories found.</p>
                <a mat-raised-button color="primary" routerLink="/categories">Create Category</a>
              </div>

              <div *ngFor="let cat of summaryData.categories" class="category-progress-item mb-2">
                <div class="d-flex justify-between mb-1">
                  <span class="fw-500">
                    <span class="color-dot" [style.backgroundColor]="cat.color"></span>
                    {{ cat.name }} ({{ cat.type | titlecase }})
                  </span>
                  <span *ngIf="cat.type === 'MONTHLY_RESET' || cat.type === 'CUSTOM'">
                    {{ cat.spent | currency:'INR':'symbol':'1.0-0' }} / {{ cat.configuredAmount | currency:'INR':'symbol':'1.0-0' }}
                    <span [ngClass]="{'over-budget': cat.percentage > 100}">
                      ({{ cat.percentage | number:'1.0-0' }}%)
                    </span>
                  </span>
                  <span *ngIf="cat.type === 'FIXED'">
                    Spent: {{ cat.spent | currency:'INR':'symbol':'1.0-0' }} | Planned: {{ cat.configuredAmount | currency:'INR':'symbol':'1.0-0' }}
                  </span>
                </div>
                
                <mat-progress-bar 
                  *ngIf="cat.type !== 'FIXED'"
                  mode="determinate" 
                  [value]="cat.percentage > 100 ? 100 : cat.percentage"
                  [color]="cat.percentage > 100 ? 'warn' : 'primary'">
                </mat-progress-bar>
                
                <div *ngIf="cat.percentage > 100" class="over-budget mt-1" style="font-size: 0.8rem;">
                  {{ (cat.spent - cat.configuredAmount) | currency:'INR':'symbol':'1.0-0' }} over budget
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="recent-expenses flex-1">
          <mat-card>
            <mat-card-header class="d-flex justify-between align-center">
              <mat-card-title>Recent Expenses</mat-card-title>
              <a mat-button color="primary" routerLink="/expenses">View All</a>
            </mat-card-header>
            <mat-card-content>
              <mat-list>
                <div *ngIf="summaryData.recentExpenses.length === 0" class="text-center mt-3 mb-3">
                  <p>No recent expenses.</p>
                  <a mat-raised-button color="primary" routerLink="/expenses">Add Expense</a>
                </div>

                <ng-container *ngFor="let exp of summaryData.recentExpenses; let last = last">
                  <mat-list-item>
                    <div class="d-flex justify-between w-100 align-center">
                      <div class="expense-info">
                        <div class="fw-500">{{ exp.category.name }}</div>
                        <div class="text-muted" style="font-size: 0.8rem;">{{ exp.date | date:'MMM d, y' }}</div>
                      </div>
                      <div class="expense-amount expense fw-500">
                        {{ exp.amount | currency:'INR':'symbol':'1.0-0' }}
                      </div>
                    </div>
                  </mat-list-item>
                  <mat-divider *ngIf="!last"></mat-divider>
                </ng-container>
              </mat-list>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding-bottom: 24px; }
    .summary-cards { gap: 16px; flex-wrap: wrap; }
    .flex-1 { flex: 1; min-width: 200px; }
    .flex-2 { flex: 2; min-width: 300px; }
    .gap-3 { gap: 24px; }
    .amount { font-size: 2rem; margin: 0; }
    .income { color: #2e7d32; }
    .expense { color: #d32f2f; }
    .text-muted { color: #757575; }
    .fw-500 { font-weight: 500; }
    .justify-center { justify-content: center; }
    .color-dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .over-budget { color: #d32f2f; font-weight: bold; }
    
    @media (max-width: 768px) {
      .main-content-grid { flex-direction: column; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  http = inject(HttpClient);
  
  isLoading = true;
  summaryData: any = null;
  currentMonthName = '';
  currentDate = new Date();

  ngOnInit() {
    this.updateMonthName();
    this.fetchDashboardData();
  }

  updateMonthName() {
    this.currentMonthName = this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.updateMonthName();
    this.fetchDashboardData();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.updateMonthName();
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    this.isLoading = true;
    const yearMonth = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}`;
    this.http.get(`http://localhost:3000/api/dashboard?month=${yearMonth}`).subscribe({
      next: (res: any) => {
        this.summaryData = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
