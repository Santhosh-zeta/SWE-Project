'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import styles from './reports.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function exportCsv(allExpenses: any[], year: number) {
  const rows = [
    ['Date', 'Category', 'Amount (INR)', 'Description'],
    ...allExpenses.map((e: any) => [
      new Date(e.date).toISOString().split('T')[0],
      e.category,
      String(e.amount),
      e.description,
    ]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setIsLoading(true);
    api.get(`/reports/monthly?year=${year}`)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [year]);

  const annualTotal = data?.months.reduce((s: number, m: any) => s + m.total, 0) ?? 0;
  const activeMonths = data?.months.filter((m: any) => m.total > 0).length ?? 0;
  const avgMonthly = activeMonths > 0 ? annualTotal / activeMonths : 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        {data && data.allExpenses.length > 0 && (
          <button
            className="btn btn-ghost"
            onClick={() => exportCsv(data.allExpenses, year)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.yearGroup}>
          <button className={styles.yearBtn} onClick={() => setYear(y => y - 1)} title="Previous year">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span className={styles.yearLabel}>{year}</span>
          <button className={styles.yearBtn} onClick={() => setYear(y => y + 1)} title="Next year">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div className="spinner" /></div>
      ) : data && (
        <>
          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Annual Total</div>
              <div className={styles.summaryValue}>{fmt(annualTotal)}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Active Months</div>
              <div className={styles.summaryValue}>{activeMonths}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Avg / Active Month</div>
              <div className={styles.summaryValue}>{fmt(avgMonthly)}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total Spent</th>
                    <th># Expenses</th>
                    <th>Top Category</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m: any) => (
                    <tr key={m.monthNum} className={m.total === 0 ? styles.zeroRow : ''}>
                      <td className="fw-500">{m.month} {m.year}</td>
                      <td className="fw-600" style={{ color: m.total > 0 ? 'var(--red)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {m.total > 0 ? fmt(m.total) : '—'}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{m.count > 0 ? m.count : '—'}</td>
                      <td>
                        {m.topCategory ? (
                          <span>
                            <span className="fw-500">{m.topCategory.name}</span>
                            <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 6 }}>({fmt(m.topCategory.amount)})</span>
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
