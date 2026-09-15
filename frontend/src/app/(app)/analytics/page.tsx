'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import styles from './analytics.module.css';

// Dynamic import to avoid SSR issues with Chart.js
const Pie = dynamic(() => import('react-chartjs-2').then(m => m.Pie), { ssr: false });

// Register Chart.js pieces
if (typeof window !== 'undefined') {
  Promise.all([
    import('chart.js/auto'),
  ]);
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

type Period = 'currentMonth' | 'previousMonth' | 'last3Months' | 'last6Months' | 'currentYear' | 'custom';

function getDateRange(period: Period, from: string, to: string): { from: string; to: string } | null {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

  if (period === 'currentMonth') {
    const y = now.getFullYear(), m = now.getMonth() + 1;
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay(y, m))}` };
  }
  if (period === 'previousMonth') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = d.getFullYear(), m = d.getMonth() + 1;
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay(y, m))}` };
  }
  if (period === 'last3Months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const y = now.getFullYear(), m = now.getMonth() + 1;
    return {
      from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
      to: `${y}-${pad(m)}-${pad(lastDay(y, m))}`,
    };
  }
  if (period === 'last6Months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const y = now.getFullYear(), m = now.getMonth() + 1;
    return {
      from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
      to: `${y}-${pad(m)}-${pad(lastDay(y, m))}`,
    };
  }
  if (period === 'currentYear') {
    return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  }
  if (period === 'custom') {
    if (!from || !to) return null;
    return { from, to };
  }
  return null;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('currentMonth');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  function fetchAnalytics(from: string, to: string) {
    setIsLoading(true);
    api.get(`/analytics?from=${from}&to=${to}`)
      .then(res => { setData(res.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    const range = getDateRange(period, fromDate, toDate);
    if (range) fetchAnalytics(range.from, range.to);
  }, [period, fromDate, toDate]);

  const chartData = data && data.totalSpent > 0 ? {
    labels: data.categoryTotals.map((c: any) => c.name),
    datasets: [{
      data: data.categoryTotals.map((c: any) => c.spent),
      backgroundColor: data.categoryTotals.map((c: any) => c.color),
      borderColor: 'transparent',
      hoverOffset: 8,
    }],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right' as const,
        labels: {
          color: '#94a3b8',
          padding: 16,
          font: { size: 12, family: 'Inter' },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${fmt(ctx.raw)}`,
        },
      },
    },
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
      </div>

      {/* Period selector */}
      <div className="card mb-3">
        <div className={styles.filterRow}>
          <div className="form-group" style={{ minWidth: 200 }}>
            <label className="form-label">Period</label>
            <select
              className="form-select"
              value={period}
              onChange={e => setPeriod(e.target.value as Period)}
            >
              <option value="currentMonth">Current Month</option>
              <option value="previousMonth">Previous Month</option>
              <option value="last3Months">Last 3 Months</option>
              <option value="last6Months">Last 6 Months</option>
              <option value="currentYear">Current Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {period === 'custom' && (
            <>
              <div className="form-group" style={{ minWidth: 160 }}>
                <label className="form-label">From</label>
                <input
                  className="form-input"
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ minWidth: 160 }}>
                <label className="form-label">To</label>
                <input
                  className="form-input"
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}><div className="spinner" /></div>
      ) : data && (
        <div className={styles.grid}>
          {/* Doughnut Chart */}
          <div className="card">
            <div className={styles.chartHeader}>
              <h2 className={styles.sectionTitle}>Spending by Category</h2>
              {data.totalSpent > 0 && (
                <span className={styles.totalBadge}>Total: {fmt(data.totalSpent)}</span>
              )}
            </div>
            <div className={styles.chartArea}>
              {data.totalSpent === 0 ? (
                <div className={styles.emptyChart}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-muted)' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-muted">No expenses recorded for this period.</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>Add expenses to see your spending analysis.</p>
                </div>
              ) : chartData ? (
                <Pie data={chartData} options={chartOptions} />
              ) : null}
            </div>
          </div>

          {/* Breakdown */}
          <div className="card">
            <h2 className={styles.sectionTitle} style={{ marginBottom: 20 }}>Category Breakdown</h2>
            {data.totalSpent === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '32px 0' }}>No data available.</p>
            ) : (
              <div className={styles.breakdownList}>
                {data.categoryTotals.map((cat: any, i: number) => (
                  <div key={i} className={styles.breakdownItem}>
                    <div className={styles.breakdownLeft}>
                      <span className="color-dot" style={{ backgroundColor: cat.color }} />
                      <span className="fw-500">{cat.name}</span>
                    </div>
                    <div className={styles.breakdownRight}>
                      <span className="fw-600">{fmt(cat.spent)}</span>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                        {cat.percentage?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
