import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt';

const mockExpenseFindMany = jest.fn();
const mockExpenseCount = jest.fn();
const mockExpenseCreate = jest.fn();
const mockExpenseFindFirst = jest.fn();
const mockExpenseDelete = jest.fn();
const mockCategoryFindFirst = jest.fn();

const mockPrismaClient = {
  expense: {
    findMany: mockExpenseFindMany,
    count: mockExpenseCount,
    create: mockExpenseCreate,
    findFirst: mockExpenseFindFirst,
    delete: mockExpenseDelete,
  },
  category: {
    findFirst: mockCategoryFindFirst,
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    expense: {
      findMany: (...args: any[]) => mockExpenseFindMany(...args),
      count: (...args: any[]) => mockExpenseCount(...args),
      create: (...args: any[]) => mockExpenseCreate(...args),
      findFirst: (...args: any[]) => mockExpenseFindFirst(...args),
      delete: (...args: any[]) => mockExpenseDelete(...args),
    },
    category: {
      findFirst: (...args: any[]) => mockCategoryFindFirst(...args),
    },
  })),
}));

import app from '../app';

describe('Expense Endpoints', () => {
  const token = generateToken(1); // User ID 1
  const authHeader = `Bearer ${token}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/expenses', () => {
    it('should get expenses successfully', async () => {
      mockPrismaClient.expense.findMany.mockResolvedValue([
        { id: 1, amount: 100, description: 'Test', date: new Date() }
      ]);
      mockPrismaClient.expense.count.mockResolvedValue(1);

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
      mockPrismaClient.category.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      mockPrismaClient.expense.create.mockResolvedValue({
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
