'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import styles from '../auth-form.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const showToast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await login({ email, password });
      showToast('Logged in successfully!', 'success');
      router.replace('/dashboard');
    } catch (err: any) {
      const msg = err.body?.message || 'Login failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.icon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your Finance Tracker account</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            className={`form-input ${errors.email ? styles.inputError : ''}`}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className={`form-input ${errors.password ? styles.inputError : ''}`}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {errors.password && <span className="form-error">{errors.password}</span>}
        </div>

        <button type="submit" className={`btn btn-primary w-100 ${styles.submitBtn}`} disabled={isLoading}>
          {isLoading ? (
            <><span className="spinner spinner-sm" />Signing in...</>
          ) : 'Sign In'}
        </button>
      </form>

      <div className={styles.footer}>
        <span>Don&apos;t have an account?</span>
        <Link href="/register" className={styles.link}>Create account</Link>
      </div>
    </div>
  );
}
