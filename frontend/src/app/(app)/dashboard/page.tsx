'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import styles from './dashboard.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
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
      <div className={styles.loadingState}>
        <div className="spinner" />
      </div>
    );
  }

  if (!summaryData) return null;

  const remaining = summaryData.remaining ?? 0;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
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
            <p className={styles.cardValue}>{fmt(summaryData.salary)}</p>
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
            <p className={`${styles.cardValue} ${styles.expenseColor}`}>{fmt(summaryData.totalSpent)}</p>
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
              {fmt(remaining)}
            </p>
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
                          {fmt(cat.spent)} / {fmt(cat.configuredAmount)}
                          {' '}<span className={over ? styles.overBudget : ''}>({Math.round(cat.percentage ?? 0)}%)</span>
                        </span>
                      )}
                      {cat.type === 'FIXED' && (
                        <span className={styles.catAmount}>
                          Spent: {fmt(cat.spent)} | Planned: {fmt(cat.configuredAmount)}
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
                        {fmt(cat.spent - cat.configuredAmount)} over budget
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
                    {fmt(exp.amount)}
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
