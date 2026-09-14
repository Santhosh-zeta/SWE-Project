import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt';

const mPrismaClient = {
  expense: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mPrismaClient),
}));

describe('Expense Endpoints', () => {
  const token = generateToken(1); // User ID 1
  const authHeader = `Bearer ${token}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/expenses', () => {
    it('should get expenses successfully', async () => {
      mPrismaClient.expense.findMany.mockResolvedValue([
        { id: 1, amount: 100, description: 'Test', date: new Date() }
      ]);
      mPrismaClient.expense.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/expenses')
        .set('Authorization', authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.expenses.length).toBe(1);
    });
  });

  describe('POST /api/expenses', () => {
    it('should create an expense if category is valid', async () => {
      mPrismaClient.category.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      mPrismaClient.expense.create.mockResolvedValue({
        id: 1,
        categoryId: 1,
        amount: 500,
        description: 'New Expense',
        date: new Date('2023-10-15')
      });

      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', authHeader)
        .send({
          categoryId: 1,
          amount: 500,
          date: '2023-10-15',
          description: 'New Expense'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(500);
    });

    it('should fail if validation fails', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', authHeader)
        .send({
          categoryId: 1,
          amount: -500, // Invalid amount
          date: 'invalid-date',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation error');
    });
  });
});
