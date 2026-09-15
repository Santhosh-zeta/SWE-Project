'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import styles from './budget.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function nowYearMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

export default function BudgetPage() {
  const showToast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(nowYearMonth());

  const load = useCallback(async (month: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/dashboard?month=${month}`);
      setSummary(res.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(currentMonth); }, [currentMonth]);

  function startEdit(cat: any) {
    setEditingId(cat.id);
    setEditValue(String(cat.configuredAmount));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  async function saveEdit(cat: any) {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await api.put(`/categories/${cat.id}`, {
        name: cat.name,
        type: cat.type,
        configuredAmount: Number(editValue),
        color: cat.color,
        description: cat.description,
      });
      showToast('Budget updated', 'success');
      setEditingId(null);
      load(currentMonth);
    } catch {
      showToast('Failed to update budget', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  function prevMonth() {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function nextMonth() {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const [year, mon] = currentMonth.split('-').map(Number);
  const monthLabel = new Date(year, mon - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  if (isLoading) return <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div className="spinner" /></div>;
  if (!summary) return null;

  const fixed = summary.categories.filter((c: any) => c.type === 'FIXED');
  const monthly = summary.categories.filter((c: any) => c.type === 'MONTHLY_RESET');
  const custom = summary.categories.filter((c: any) => c.type === 'CUSTOM');

  const totalFixedPlanned = fixed.reduce((s: number, c: any) => s + Number(c.configuredAmount), 0);
  const totalMonthlyBudget = monthly.reduce((s: number, c: any) => s + Number(c.configuredAmount), 0);
  const totalSpent = summary.totalSpent;

  function renderRow(cat: any) {
    const isEditing = editingId === cat.id;
    const pct = Math.min(cat.type !== 'FIXED' ? (cat.configuredAmount > 0 ? (cat.spent / cat.configuredAmount) * 100 : 0) : 0, 100);
    const over = cat.type !== 'FIXED' && cat.configuredAmount > 0 && cat.spent > cat.configuredAmount;

    return (
      <tr key={cat.id}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="color-dot" style={{ backgroundColor: cat.color }} />
            <span className="fw-500">{cat.name}</span>
          </div>
        </td>
        <td>
          {isEditing ? (
            <div className={styles.editingCell}>
              <input
                className={styles.inlineInput}
                type="number"
                min="0"
                value={editValue}
                autoFocus
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat); if (e.key === 'Escape') cancelEdit(); }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => saveEdit(cat)} disabled={isSaving}>✓</button>
              <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="fw-600">{fmt(cat.configuredAmount)}</span>
              <button
                className="btn-icon"
                style={{ padding: 4 }}
                title="Edit budget"
                onClick={() => startEdit(cat)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}
        </td>
        <td>
          <span style={{ color: cat.spent > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{fmt(cat.spent)}</span>
        </td>
        <td className={styles.progressCell}>
          {cat.type === 'FIXED' ? (
            <span className={styles.noSpend}>Fixed</span>
          ) : cat.configuredAmount > 0 ? (
            <>
              <div className={styles.progressLabel}>
                <span style={{ color: over ? 'var(--red)' : 'var(--text-muted)' }}>
                  {over ? `${Math.round(pct)}% — over budget` : `${Math.round(pct)}%`}
                </span>
                <span className="text-muted">{fmt(Math.max(cat.configuredAmount - cat.spent, 0))} left</span>
              </div>
              <div className="progress-bar-track">
                <div className={`progress-bar-fill${over ? ' danger' : ''}`} style={{ width: `${pct}%` }} />
              </div>
            </>
          ) : (
            <span className={styles.noSpend}>No budget set</span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Budget</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-icon" onClick={prevMonth} title="Previous month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 160, textAlign: 'center' }}>{monthLabel}</span>
          <button className="btn-icon" onClick={nextMonth} title="Next month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Monthly Salary</div>
          <div className={styles.summaryValue}>{fmt(summary.salary)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Fixed Planned</div>
          <div className={styles.summaryValue}>{fmt(totalFixedPlanned)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Monthly Budgets</div>
          <div className={styles.summaryValue}>{fmt(totalMonthlyBudget)}</div>
        </div>
      </div>

      {fixed.length > 0 && (
        <div className="card mb-3" style={{ padding: 0, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
            <span className={styles.sectionTitle}>Fixed Expenses</span>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
            <table className="data-table">
              <thead><tr><th>Category</th><th>Planned Amount</th><th>Spent This Month</th><th>Type</th></tr></thead>
              <tbody>{fixed.map(renderRow)}</tbody>
            </table>
          </div>
        </div>
      )}

      {monthly.length > 0 && (
        <div className="card" style={{ padding: 0, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
            <span className={styles.sectionTitle}>Monthly Budgets</span>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
            <table className="data-table">
              <thead><tr><th>Category</th><th>Budget</th><th>Spent</th><th>Progress</th></tr></thead>
              <tbody>{monthly.map(renderRow)}</tbody>
            </table>
          </div>
        </div>
      )}

      {custom.length > 0 && (
        <div className="card" style={{ padding: 0, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
            <span className={styles.sectionTitle}>Custom Categories</span>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
            <table className="data-table">
              <thead><tr><th>Category</th><th>Budget</th><th>Spent</th><th>Progress</th></tr></thead>
              <tbody>{custom.map(renderRow)}</tbody>
            </table>
          </div>
        </div>
      )}

      {summary.categories.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p className="text-muted">No categories yet. Go to Categories to create some.</p>
        </div>
      )}
    </div>
  );
}
