import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt';

const mPrismaClient = {
  user: {
    findUnique: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
  },
  expense: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mPrismaClient),
}));

describe('Dashboard Endpoints', () => {
  const token = generateToken(1);
  const authHeader = `Bearer ${token}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard', () => {
    it('should calculate dashboard summary correctly', async () => {
      mPrismaClient.user.findUnique.mockResolvedValue({ monthlySalary: 10000 });
      
      mPrismaClient.category.findMany.mockResolvedValue([
        { id: 1, name: 'Rent', type: 'FIXED', configuredAmount: 3000, color: '#f00' },
        { id: 2, name: 'Food', type: 'MONTHLY_RESET', configuredAmount: 2000, color: '#0f0' },
      ]);

      // Mock spending: 3000 on Rent, 1500 on Food
      mPrismaClient.expense.groupBy.mockResolvedValue([
        { categoryId: 1, _sum: { amount: 3000 } },
        { categoryId: 2, _sum: { amount: 1500 } },
      ]);

      mPrismaClient.expense.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.salary).toBe(10000);
      expect(res.body.data.totalSpent).toBe(4500); // 3000 + 1500
      expect(res.body.data.fixedPlanned).toBe(3000);
      expect(res.body.data.monthlyBudget).toBe(2000);
      expect(res.body.data.remaining).toBe(5500); // 10000 - 4500
      
      const categories = res.body.data.categories;
      expect(categories.find((c: any) => c.id === 2).percentage).toBe(75); // 1500/2000 * 100
    });
  });
});
