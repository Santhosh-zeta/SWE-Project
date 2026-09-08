'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import styles from './categories.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

interface CategoryForm {
  name: string;
  type: string;
  configuredAmount: string;
  color: string;
  description: string;
}

const emptyForm: CategoryForm = {
  name: '',
  type: 'MONTHLY_RESET',
  configuredAmount: '0',
  color: '#6366f1',
  description: '',
};

export default function CategoriesPage() {
  const showToast = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {}
  }

  function openCreate() {
    setForm({ ...emptyForm });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function validateForm() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Category name is required';
    if (!form.type) e.type = 'Type is required';
    if (Number(form.configuredAmount) < 0) e.configuredAmount = 'Amount must be ≥ 0';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      await api.post('/categories', {
        name: form.name,
        type: form.type,
        configuredAmount: Number(form.configuredAmount),
        color: form.color,
        description: form.description,
      });
      showToast('Category created successfully', 'success');
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      showToast(err.body?.message || 'Error creating category', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive(category: any) {
    if (!confirm(`Archive "${category.name}"?`)) return;
    try {
      await api.patch(`/categories/${category.id}/archive`, {});
      showToast('Category archived', 'success');
      loadCategories();
    } catch {
      showToast('Failed to archive category', 'error');
    }
  }

  const typeLabel: Record<string, string> = {
    FIXED: 'Fixed Expense',
    MONTHLY_RESET: 'Monthly Budget',
    CUSTOM: 'Custom',
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Category
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Color</th>
                <th>Name</th>
                <th>Type</th>
                <th>Configured Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted" style={{ padding: 32 }}>
                    No categories found. Start by adding one.
                  </td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id} style={{ opacity: cat.isActive ? 1 : 0.55 }}>
                    <td>
                      <span
                        className="color-dot"
                        style={{ backgroundColor: cat.color, width: 16, height: 16 }}
                      />
                    </td>
                    <td className="fw-500">{cat.name}</td>
                    <td>
                      <span className={styles.typeChip}>
                        {typeLabel[cat.type] ?? cat.type}
                      </span>
                    </td>
                    <td>{fmt(cat.configuredAmount)}</td>
                    <td>
                      <span className={`badge ${cat.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {cat.isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td>
                      {cat.isActive && (
                        <button
                          className="btn-icon"
                          onClick={() => handleArchive(cat)}
                          title="Archive"
                          style={{ color: 'var(--yellow)' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="21 8 21 21 3 21 3 8" />
                            <rect x="1" y="3" width="22" height="5" />
                            <line x1="10" y1="12" x2="14" y2="12" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Category"
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
            <label className="form-label">Category Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Groceries"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            {formErrors.name && <span className="form-error">{formErrors.name}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              <option value="FIXED">Fixed Expense</option>
              <option value="MONTHLY_RESET">Monthly Budget</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Budget / Configured Amount (₹)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              placeholder="5000"
              value={form.configuredAmount}
              onChange={e => setForm(f => ({ ...f, configuredAmount: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                className={styles.colorInput}
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              />
              <span className={styles.colorValue}>{form.color}</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="Brief description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
