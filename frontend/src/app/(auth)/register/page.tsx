'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import styles from '../auth-form.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const showToast = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    monthlySalary: '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        age: form.age ? Number(form.age) : null,
        monthlySalary: Number(form.monthlySalary) || 0,
      });
      showToast('Registration successful!', 'success');
      router.replace('/dashboard');
    } catch (err: any) {
      const msg = err.body?.message || 'Registration failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.icon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>Start tracking your finances today</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            className={`form-input ${errors.name ? styles.inputError : ''}`}
            type="text"
            placeholder="John Doe"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            autoComplete="name"
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            className={`form-input ${errors.email ? styles.inputError : ''}`}
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => handleChange('email', e.target.value)}
            autoComplete="email"
          />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className={`form-input ${errors.password ? styles.inputError : ''}`}
            type="password"
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={e => handleChange('password', e.target.value)}
            autoComplete="new-password"
          />
          {errors.password && <span className="form-error">{errors.password}</span>}
        </div>

        <div className={styles.twoCol}>
          <div className="form-group">
            <label className="form-label">Age (Optional)</label>
            <input
              className="form-input"
              type="number"
              placeholder="25"
              value={form.age}
              onChange={e => handleChange('age', e.target.value)}
              min="0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Monthly Salary (₹)</label>
            <input
              className="form-input"
              type="number"
              placeholder="50000"
              value={form.monthlySalary}
              onChange={e => handleChange('monthlySalary', e.target.value)}
              min="0"
            />
          </div>
        </div>

        <button type="submit" className={`btn btn-primary w-100 ${styles.submitBtn}`} disabled={isLoading}>
          {isLoading ? (
            <><span className="spinner spinner-sm" />Creating account...</>
          ) : 'Create Account'}
        </button>
      </form>

      <div className={styles.footer}>
        <span>Already have an account?</span>
        <Link href="/login" className={styles.link}>Sign in</Link>
      </div>
    </div>
  );
}
