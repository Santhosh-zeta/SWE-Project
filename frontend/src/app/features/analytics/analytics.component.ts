import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    BaseChartDirective,
    MatProgressSpinnerModule
  ],
  providers: [CurrencyPipe],
  template: `
    <div class="header-section d-flex justify-between align-center mb-3">
      <h2>Analytics</h2>
    </div>

    <mat-card class="mb-3">
      <mat-card-content class="d-flex gap-3 align-center py-2">
        <mat-form-field appearance="outline" style="margin-bottom: -1.25em;">
          <mat-label>Period</mat-label>
          <mat-select [formControl]="periodControl" (selectionChange)="onPeriodChange()">
            <mat-option value="currentMonth">Current Month</mat-option>
            <mat-option value="previousMonth">Previous Month</mat-option>
            <mat-option value="last3Months">Last 3 Months</mat-option>
            <mat-option value="last6Months">Last 6 Months</mat-option>
            <mat-option value="currentYear">Current Year</mat-option>
            <mat-option value="custom">Custom Range</mat-option>
          </mat-select>
        </mat-form-field>

        <ng-container *ngIf="periodControl.value === 'custom'">
          <mat-form-field appearance="outline" style="margin-bottom: -1.25em;">
            <mat-label>From Date</mat-label>
            <input matInput type="date" [formControl]="fromDateControl" (change)="onPeriodChange()">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom: -1.25em;">
            <mat-label>To Date</mat-label>
            <input matInput type="date" [formControl]="toDateControl" (change)="onPeriodChange()">
          </mat-form-field>
        </ng-container>
      </mat-card-content>
    </mat-card>

    <div *ngIf="isLoading" class="d-flex justify-center mt-3">
      <mat-spinner></mat-spinner>
    </div>

    <div *ngIf="!isLoading && data" class="d-flex gap-3 responsive-grid">
      <mat-card class="flex-1">
        <mat-card-header>
          <mat-card-title>Spending by Category</mat-card-title>
          <mat-card-subtitle>Total: {{ data.totalSpent | currency:'INR':'symbol':'1.0-0' }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="d-flex justify-center mt-3">
          <div *ngIf="data.totalSpent === 0" class="text-center p-3 w-100 text-muted">
            No expenses recorded for this period. Add an expense to see your spending analysis.
          </div>
          
          <div *ngIf="data.totalSpent > 0" style="display: block; width: 100%; max-width: 400px; max-height: 400px;">
            <canvas baseChart
              [data]="pieChartData"
              [type]="pieChartType"
              [options]="pieChartOptions">
            </canvas>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="flex-1">
        <mat-card-header>
          <mat-card-title>Category Breakdown</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="data.totalSpent === 0" class="text-center p-3 text-muted">
            No data available.
          </div>

          <div *ngFor="let cat of data.categoryTotals" class="category-stat-row mb-2">
            <div class="d-flex justify-between w-100">
              <span class="fw-500">
                <span class="color-dot" [style.backgroundColor]="cat.color"></span>
                {{ cat.name }}
              </span>
              <span>
                {{ cat.spent | currency:'INR':'symbol':'1.0-0' }}
                <span class="text-muted ml-1">({{ cat.percentage | number:'1.0-1' }}%)</span>
              </span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .gap-3 { gap: 24px; }
    .py-2 { padding-top: 16px; padding-bottom: 16px; }
    .p-3 { padding: 24px; }
    .flex-1 { flex: 1; min-width: 300px; }
    .fw-500 { font-weight: 500; }
    .text-muted { color: #757575; }
    .ml-1 { margin-left: 8px; }
    .color-dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .category-stat-row {
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    .category-stat-row:last-child {
      border-bottom: none;
    }
    @media (max-width: 768px) {
      .responsive-grid { flex-direction: column; }
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  http = inject(HttpClient);
  fb = inject(FormBuilder);
  
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  isLoading = true;
  data: any = null;

  periodControl = this.fb.control('currentMonth');
  fromDateControl = this.fb.control('');
  toDateControl = this.fb.control('');

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
      }
    }
  };
  
  public pieChartData: ChartData<'doughnut', number[], string | string[]> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: []
    }]
  };
  public pieChartType: ChartType = 'doughnut';

  ngOnInit() {
    this.onPeriodChange();
  }

  onPeriodChange() {
    const period = this.periodControl.value;
    let from = '';
    let to = '';
    const now = new Date();

    if (period === 'currentMonth') {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    } 
    else if (period === 'previousMonth') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      from = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
      to = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    }
    else if (period === 'last3Months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    }
    else if (period === 'last6Months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    }
    else if (period === 'currentYear') {
      from = `${now.getFullYear()}-01-01`;
      to = `${now.getFullYear()}-12-31`;
    }
    else if (period === 'custom') {
      from = this.fromDateControl.value || '';
      to = this.toDateControl.value || '';
      if (!from || !to) return; // wait until both dates are selected
    }

    this.fetchAnalytics(from, to);
  }

  fetchAnalytics(from: string, to: string) {
    this.isLoading = true;
    this.http.get(`http://localhost:3000/api/analytics?from=${from}&to=${to}`).subscribe({
      next: (res: any) => {
        this.data = res.data;
        this.updateChart();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  updateChart() {
    if (!this.data || this.data.totalSpent === 0) return;

    this.pieChartData.labels = this.data.categoryTotals.map((c: any) => c.name);
    this.pieChartData.datasets[0].data = this.data.categoryTotals.map((c: any) => c.spent);
    this.pieChartData.datasets[0].backgroundColor = this.data.categoryTotals.map((c: any) => c.color);
    
    if (this.chart) {
      this.chart.update();
    }
  }
}
