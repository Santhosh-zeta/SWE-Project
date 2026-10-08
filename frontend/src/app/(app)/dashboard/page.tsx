'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
import styles from './dashboard.module.css';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const { formatCurrency } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const fetchData = useCallback(async (date: Date) => {
    setIsLoading(true);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    try {
      const res = await api.get(`/dashboard?month=${yearMonth}`);
      setSummaryData(res.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(currentDate); }, []);

  function prevMonth() {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
    fetchData(d);
  }
  function nextMonth() {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
    fetchData(d);
  }

  if (isLoading) {
    return (
      <div className={styles.loadingState} role="status" aria-label="Loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!summaryData) return null;

  const salary = Number(summaryData.salary) || 0;
  const totalSpent = Number(summaryData.totalSpent) || 0;
  const remaining = summaryData.remaining ?? (salary - totalSpent);
  
  // Advanced KPIs
  const savingsRate = salary > 0 ? Math.max(0, Math.round((remaining / salary) * 100)) : 0;
  
  // Days in selected month & burn rate
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const isCurrentViewingMonth = currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
  const currentDayElapsed = isCurrentViewingMonth ? Math.max(1, new Date().getDate()) : daysInMonth;
  const dailyBurnRate = Math.round(totalSpent / currentDayElapsed);
  const dailyBudgetAllowance = Math.round(salary / daysInMonth);

  // Check over-budget categories
  const overBudgetCats = (summaryData.categories || []).filter((c: any) => (c.percentage ?? 0) > 100);

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/sms-sync"
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              borderColor: 'rgba(168, 85, 247, 0.4)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.15))',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Sync SMS</span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
              }}
            >
              AI
            </span>
          </Link>
          <div className={styles.monthNav}>
            <button className="btn-icon" onClick={prevMonth} title="Previous month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className={styles.monthLabel}>{currentMonthName}</span>
            <button className="btn-icon" onClick={nextMonth} title="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Smart Alert Banner */}
      {overBudgetCats.length > 0 ? (
        <div className={`${styles.alertBanner} ${styles.alertDanger}`}>
          <span>
            ⚠️ <strong>Attention:</strong> {overBudgetCats.length} categor{overBudgetCats.length > 1 ? 'ies have' : 'y has'} exceeded configured limits ({overBudgetCats.map((c: any) => c.name).join(', ')}).
          </span>
          <Link href="/budget" className="btn btn-sm btn-danger" style={{ background: 'var(--red)', color: 'white' }}>
            Review Budget
          </Link>
        </div>
      ) : remaining < 0 ? (
        <div className={`${styles.alertBanner} ${styles.alertDanger}`}>
          <span>
            🚨 <strong>Critical:</strong> Total expenses have exceeded your monthly salary by {formatCurrency(Math.abs(remaining))}.
          </span>
          <Link href="/expenses" className="btn btn-sm btn-ghost">
            View Expenses
          </Link>
        </div>
      ) : savingsRate >= 30 ? (
        <div className={`${styles.alertBanner} ${styles.alertSuccess}`}>
          <span>
            🎉 <strong>Healthy Budget:</strong> You are currently saving {savingsRate}% of your monthly income. Keep it up!
          </span>
        </div>
      ) : null}

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={`${styles.summaryCard} ${styles.salaryCard}`}>
          <div className={styles.cardIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <p className={styles.cardLabel}>Monthly Salary</p>
            <p className={styles.cardValue}>{formatCurrency(summaryData.salary)}</p>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.spentCard}`}>
          <div className={styles.cardIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div>
            <p className={styles.cardLabel}>Total Spent</p>
            <p className={`${styles.cardValue} ${styles.expenseColor}`}>{formatCurrency(summaryData.totalSpent)}</p>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${remaining >= 0 ? styles.remainingCard : styles.overBudgetCard}`}>
          <div className={styles.cardIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <p className={styles.cardLabel}>Remaining</p>
            <p className={`${styles.cardValue} ${remaining >= 0 ? styles.incomeColor : styles.expenseColor}`}>
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>
      </div>

      {/* Advanced KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>📊</div>
          <div>
            <div className={styles.kpiLabel}>Savings Rate</div>
            <div className={styles.kpiValue} style={{ color: savingsRate >= 20 ? 'var(--green)' : 'var(--yellow)' }}>
              {savingsRate}%
            </div>
            <div className={styles.kpiSubtext}>Target: ≥ 20% of income</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>⚡</div>
          <div>
            <div className={styles.kpiLabel}>Avg Daily Spend</div>
            <div className={styles.kpiValue}>{formatCurrency(dailyBurnRate)}</div>
            <div className={styles.kpiSubtext}>Allowance: {formatCurrency(dailyBudgetAllowance)}/day</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>🎯</div>
          <div>
            <div className={styles.kpiLabel}>Planned Fixed Bills</div>
            <div className={styles.kpiValue}>{formatCurrency(summaryData.fixedPlanned || 0)}</div>
            <div className={styles.kpiSubtext}>Rent & utilities allocated</div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {/* Category Progress */}
        <div className="card">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Category Progress</h2>
            <Link href="/categories" className="btn btn-ghost btn-sm">Manage</Link>
          </div>

          {summaryData.categories.length === 0 ? (
            <div className={styles.emptyState}>
              <p className="text-muted">No categories found.</p>
              <Link href="/categories" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                Create Category
              </Link>
            </div>
          ) : (
            <div className={styles.categoryList}>
              {summaryData.categories.map((cat: any) => {
                const pct = Math.min(cat.percentage ?? 0, 100);
                const over = (cat.percentage ?? 0) > 100;
                return (
                  <div key={cat.id ?? cat.name} className={styles.categoryItem}>
                    <div className={styles.catRow}>
                      <span className={styles.catName}>
                        <span className="color-dot" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                        <span className={styles.catType}>{cat.type?.toLowerCase().replace('_', ' ')}</span>
                      </span>
                      {cat.type !== 'FIXED' && (
                        <span className={over ? styles.overBudget : styles.catAmount}>
                          {formatCurrency(cat.spent)} / {formatCurrency(cat.configuredAmount)}
                          {' '}<span className={over ? styles.overBudget : ''}>({Math.round(cat.percentage ?? 0)}%)</span>
                        </span>
                      )}
                      {cat.type === 'FIXED' && (
                        <span className={styles.catAmount}>
                          Spent: {formatCurrency(cat.spent)} | Planned: {formatCurrency(cat.configuredAmount)}
                        </span>
                      )}
                    </div>
                    {cat.type !== 'FIXED' && (
                      <div className="progress-bar-track">
                        <div
                          className={`progress-bar-fill ${over ? 'danger' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    {over && (
                      <p className={styles.overBudget} style={{ fontSize: '0.75rem', marginTop: 4 }}>
                        {formatCurrency(cat.spent - cat.configuredAmount)} over budget
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Expenses</h2>
            <Link href="/expenses" className="btn btn-ghost btn-sm">View All</Link>
          </div>

          {summaryData.recentExpenses.length === 0 ? (
            <div className={styles.emptyState}>
              <p className="text-muted">No recent expenses.</p>
              <Link href="/expenses" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                Add Expense
              </Link>
            </div>
          ) : (
            <div className={styles.expenseList}>
              {summaryData.recentExpenses.map((exp: any, i: number) => (
                <div key={exp.id ?? i} className={styles.expenseItem}>
                  <div className={styles.expInfo}>
                    <span
                      className="cat-badge"
                      style={{ backgroundColor: exp.category?.color }}
                    >
                      {exp.category?.name}
                    </span>
                    <span className={styles.expDate}>{fmtDate(exp.date)}</span>
                  </div>
                  <span className={`${styles.expAmount} ${styles.expenseColor}`}>
                    {formatCurrency(exp.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
