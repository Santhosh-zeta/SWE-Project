'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';
type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

interface SettingsContextValue {
  theme: Theme;
  toggleTheme: () => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatCurrency: (amount: number) => string;
  currencySymbol: string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const CURRENCY_LOCALES: Record<Currency, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currency, setCurrencyState] = useState<Currency>('INR');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Theme preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'dark'; // default to dark
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }

    // 2. Currency preference
    const savedCurrency = localStorage.getItem('currency') as Currency | null;
    if (savedCurrency && CURRENCY_SYMBOLS[savedCurrency]) {
      setCurrencyState(savedCurrency);
    }

    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('currency', c);
  };

  const formatCurrency = (amount: number) => {
    const num = isNaN(amount) ? 0 : amount;
    return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || 'en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        toggleTheme,
        currency,
        setCurrency,
        formatCurrency,
        currencySymbol: CURRENCY_SYMBOLS[currency] || '₹',
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    // Fallback safe defaults if used outside provider
    return {
      theme: 'dark' as Theme,
      toggleTheme: () => {},
      currency: 'INR' as Currency,
      setCurrency: () => {},
      formatCurrency: (n: number) => `₹${n.toLocaleString('en-IN')}`,
      currencySymbol: '₹',
    };
  }
  return ctx;
}
