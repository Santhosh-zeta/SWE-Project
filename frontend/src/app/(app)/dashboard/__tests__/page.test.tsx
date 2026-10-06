import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import DashboardPage from '../page';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

vi.mock('@/lib/api');
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    currentUser: { name: 'Test User' },
  })),
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {})); // pending promise
    render(<DashboardPage />);
    const spinner = screen.getByRole('status') || document.querySelector('.spinner');
    expect(spinner).toBeTruthy();
  });
});
