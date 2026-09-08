'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import styles from './settings.module.css';

export default function SettingsPage() {
  const { currentUser, refreshUser } = useAuth();
  const showToast = useToast();

  const [form, setForm] = useState({
    name: '',
    age: '',
    monthlySalary: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/profile')
      .then(res => {
        const user = res.data;
        setForm({
          name: user.name || '',
          age: user.age ? String(user.age) : '',
          monthlySalary: user.monthlySalary ? String(user.monthlySalary) : '0',
        });
      })
      .catch(() => showToast('Failed to load profile', 'error'))
      .finally(() => setIsLoading(false));
  }, [showToast]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (Number(form.monthlySalary) < 0) e.monthlySalary = 'Salary cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      await api.put('/profile', {
        name: form.name,
        age: form.age ? Number(form.age) : null,
        monthlySalary: Number(form.monthlySalary),
      });
      showToast('Settings saved successfully', 'success');
      await refreshUser();
    } catch (err: any) {
      showToast(err.body?.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className={`card ${styles.settingsCard}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Profile Information</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Update your personal and financial details
          </p>
        </div>

        {isLoading ? (
          <div className={styles.loadingState}>
            <div className="spinner" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                value={currentUser?.email || ''}
                disabled
              />
              <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                Email cannot be changed
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className={`form-input ${errors.name ? 'error' : ''}`}
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Salary (₹)</label>
                <input
                  className={`form-input ${errors.monthlySalary ? 'error' : ''}`}
                  type="number"
                  min="0"
                  value={form.monthlySalary}
                  onChange={e => setForm(f => ({ ...f, monthlySalary: e.target.value }))}
                />
                {errors.monthlySalary && <span className="form-error">{errors.monthlySalary}</span>}
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? <><span className="spinner spinner-sm" />Saving...</> : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
