import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
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
    expect(screen.getByRole('status', { hidden: true }) || document.querySelector('.spinner')).toBeInTheDocument();
  });
});
