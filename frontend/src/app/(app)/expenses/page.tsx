'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import styles from './expenses.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function nowYearMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

interface ExpenseForm {
  date: string;
  categoryId: string;
  amount: string;
  description: string;
}

const emptyForm: ExpenseForm = { date: todayStr(), categoryId: '', amount: '', description: '' };

interface QuickRow {
  date: string;
  categoryId: string;
  amount: string;
  description: string;
}

export default function ExpensesPage() {
  const showToast = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(nowYearMonth());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [quickRow, setQuickRow] = useState<QuickRow>({ date: todayStr(), categoryId: '', amount: '', description: '' });
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  useEffect(() => { loadCategories(); loadExpenses(); }, []);

  async function loadCategories() {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {}
  }

  async function loadExpenses(p = page) {
    try {
      let url = `/expenses?month=${currentMonth}&page=${p}&limit=20`;
      if (selectedCategory) url += `&categoryId=${selectedCategory}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await api.get(url);
      setExpenses(res.data.expenses);
      setPagination(res.data.pagination);
    } catch {}
  }

  useEffect(() => { setPage(1); loadExpenses(1); }, [currentMonth, selectedCategory, searchQuery]);

  function openAdd() {
    setEditingExpense(null);
    setForm({ ...emptyForm, date: todayStr() });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function openEdit(expense: any) {
    setEditingExpense(expense);
    setForm({
      date: new Date(expense.date).toISOString().split('T')[0],
      categoryId: String(expense.categoryId),
      amount: String(expense.amount),
      description: expense.description ?? '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function validateForm() {
    const e: Record<string, string> = {};
    if (!form.date) e.date = 'Date is required';
    if (!form.categoryId) e.categoryId = 'Category is required';
    if (!form.amount || Number(form.amount) < 1) e.amount = 'Amount must be at least ₹1';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setIsSaving(true);
    const payload = {
      date: form.date,
      categoryId: form.categoryId,
      amount: Number(form.amount),
      description: form.description,
    };
    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload);
        showToast('Expense updated successfully', 'success');
      } else {
        await api.post('/expenses', payload);
        showToast('Expense added successfully', 'success');
      }
      setIsModalOpen(false);
      loadExpenses();
    } catch (err: any) {
      showToast(err.body?.message || 'Failed to save expense', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(expense: any) {
    if (!confirm(`Delete expense of ${fmt(expense.amount)} for ${expense.category?.name}?`)) return;
    try {
      await api.delete(`/expenses/${expense.id}`);
      showToast('Expense deleted', 'success');
      loadExpenses();
    } catch {
      showToast('Failed to delete expense', 'error');
    }
  }

  async function handleQuickAdd() {
    if (!quickRow.categoryId || !quickRow.amount || Number(quickRow.amount) < 1) return;
    setIsQuickSaving(true);
    try {
      await api.post('/expenses', {
        date: quickRow.date,
        categoryId: quickRow.categoryId,
        amount: Number(quickRow.amount),
        description: quickRow.description,
      });
      setQuickRow({ date: todayStr(), categoryId: '', amount: '', description: '' });
      loadExpenses();
    } catch {
      showToast('Failed to add expense', 'error');
    } finally {
      setIsQuickSaving(false);
    }
  }

  const activeCategories = categories.filter(c =>
    c.isActive || (editingExpense && editingExpense.categoryId === c.id)
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Expenses</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className="form-group" style={{ minWidth: 160 }}>
          <label className="form-label">Month</label>
          <input
            className="form-input"
            type="month"
            value={currentMonth}
            onChange={e => setCurrentMonth(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ minWidth: 180 }}>
          <label className="form-label">Category</label>
          <select
            className="form-select"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 200, flex: 1 }}>
          <label className="form-label">Search</label>
          <input
            className="form-input"
            type="text"
            placeholder="Search descriptions…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted" style={{ padding: 32 }}>
                    No expenses found for this period.
                  </td>
                </tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id}>
                    <td style={{ borderLeft: `3px solid ${exp.category?.color || 'transparent'}` }}>
                      {fmtDate(exp.date)}
                    </td>
                    <td>
                      <span className="cat-badge" style={{ backgroundColor: exp.category?.color }}>
                        {exp.category?.name}
                      </span>
                    </td>
                    <td className="fw-600" style={{ color: 'var(--red)' }}>{fmt(exp.amount)}</td>
                    <td className="text-muted">{exp.description || '—'}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className="btn-icon"
                          onClick={() => openEdit(exp)}
                          title="Edit"
                          style={{ color: 'var(--accent)' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDelete(exp)}
                          title="Delete"
                          style={{ color: 'var(--red)' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {/* Quick-add row — spreadsheet-style inline entry */}
              <tr className={styles.quickAddRow}>
                <td style={{ borderLeft: '3px solid var(--border)' }}>
                  <input
                    className={styles.quickInput}
                    type="date"
                    value={quickRow.date}
                    onChange={e => setQuickRow(r => ({ ...r, date: e.target.value }))}
                  />
                </td>
                <td>
                  <select
                    className={styles.quickInput}
                    value={quickRow.categoryId}
                    onChange={e => setQuickRow(r => ({ ...r, categoryId: e.target.value }))}
                  >
                    <option value="">Select category…</option>
                    {categories.filter(c => c.isActive).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className={styles.quickInput}
                    type="number"
                    min="1"
                    placeholder="Amount (₹)"
                    value={quickRow.amount}
                    onChange={e => setQuickRow(r => ({ ...r, amount: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
                  />
                </td>
                <td>
                  <input
                    className={styles.quickInput}
                    type="text"
                    placeholder="Description (optional)"
                    value={quickRow.description}
                    onChange={e => setQuickRow(r => ({ ...r, description: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleQuickAdd}
                    disabled={isQuickSaving || !quickRow.categoryId || !quickRow.amount}
                    title="Add expense (Enter)"
                  >
                    {isQuickSaving ? <span className="spinner spinner-sm" /> : '+'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => { const p = page - 1; setPage(p); loadExpenses(p); }}
          >
            ← Prev
          </button>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            Page {pagination.page} of {pagination.totalPages}
            <span style={{ marginLeft: 8 }}>({pagination.total} total)</span>
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= pagination.totalPages}
            onClick={() => { const p = page + 1; setPage(p); loadExpenses(p); }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><span className="spinner spinner-sm" />Saving...</> : 'Save'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              className={`form-input ${formErrors.date ? '' : ''}`}
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
            {formErrors.date && <span className="form-error">{formErrors.date}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">Select a category</option>
              {activeCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {formErrors.categoryId && <span className="form-error">{formErrors.categoryId}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              className="form-input"
              type="number"
              min="1"
              placeholder="500"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            />
            {formErrors.amount && <span className="form-error">{formErrors.amount}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="What was this for?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
