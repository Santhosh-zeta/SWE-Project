import request from 'supertest';
import { generateToken } from '../utils/jwt';

const mockCategoryFindMany = jest.fn();
const mockCategoryCreate = jest.fn();
const mockExpenseCreate = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    category: {
      findMany: (...args: any[]) => mockCategoryFindMany(...args),
      create: (...args: any[]) => mockCategoryCreate(...args),
    },
    expense: {
      create: (...args: any[]) => mockExpenseCreate(...args),
    },
  })),
}));

// Mock the GeminiService network calls to test deterministic parsing
jest.mock('../services/gemini.service', () => {
  return {
    GeminiService: jest.fn().mockImplementation(() => ({
      parseSmsList: jest.fn().mockImplementation(async (texts: string[]) => {
        return texts.map(t => {
          if (t.toLowerCase().includes('swiggy instamart')) {
            return {
              merchant: 'Swiggy Instamart',
              amount: 349.00,
              date: '2026-10-07',
              categoryName: 'Food',
              description: 'Paid to Swiggy Instamart',
              isExpense: true,
              rawText: t,
              confidence: 0.95,
            };
          }
          if (t.toLowerCase().includes('otp')) {
            return {
              merchant: 'Bank',
              amount: 0,
              date: '2026-10-07',
              categoryName: 'OTP',
              description: 'OTP notification',
              isExpense: false,
              rawText: t,
              confidence: 0.99,
            };
          }
          return {
            merchant: 'General Expense',
            amount: 100,
            date: '2026-10-07',
            categoryName: 'General',
            description: 'Paid',
            isExpense: true,
            rawText: t,
            confidence: 0.8,
          };
        });
      }),
    })),
  };
});

import app from '../app';

describe('SMS Endpoints', () => {
  const token = generateToken(1);
  const authHeader = `Bearer ${token}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/sms/parse', () => {
    it('should parse SMS messages and match categories', async () => {
      mockCategoryFindMany.mockResolvedValue([
        { id: 10, name: 'Food', color: '#10b981' }
      ]);

      const smsText = 'Dear UPI user, A/C *1234 debited by Rs. 349.00 on 07-Oct-26 transfer to Swiggy Instamart UPI Ref 428172910291.';

      const res = await request(app)
        .post('/api/sms/parse')
        .set('Authorization', authHeader)
        .send({ text: smsText });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].merchant).toBe('Swiggy Instamart');
      expect(res.body.data.items[0].amount).toBe(349);
      expect(res.body.data.items[0].categoryId).toBe(10);
      expect(res.body.data.items[0].selected).toBe(true);
    });

    it('should reject requests without auth', async () => {
      const res = await request(app)
        .post('/api/sms/parse')
        .send({ text: 'Some SMS' });

      expect(res.status).toBe(401);
    });

    it('should reject requests with empty body', async () => {
      const res = await request(app)
        .post('/api/sms/parse')
        .set('Authorization', authHeader)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/sms/import', () => {
    it('should successfully import valid expenses', async () => {
      mockCategoryFindMany.mockResolvedValue([
        { id: 10, name: 'Food', color: '#10b981' }
      ]);

      mockExpenseCreate.mockResolvedValue({
        id: 101,
        userId: 1,
        categoryId: 10,
        amount: 349,
        date: new Date('2026-10-07'),
        description: 'Paid to Swiggy Instamart',
      });

      const res = await request(app)
        .post('/api/sms/import')
        .set('Authorization', authHeader)
        .send({
          expenses: [
            {
              amount: 349,
              categoryId: 10,
              date: '2026-10-07',
              description: 'Paid to Swiggy Instamart',
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(mockExpenseCreate).toHaveBeenCalledTimes(1);
    });

    it('should auto-create a category if it does not exist', async () => {
      mockCategoryFindMany.mockResolvedValue([]);
      mockCategoryCreate.mockResolvedValue({
        id: 20,
        name: 'Groceries',
        userId: 1,
        color: '#f59e0b',
      });

      mockExpenseCreate.mockResolvedValue({
        id: 102,
        userId: 1,
        categoryId: 20,
        amount: 500,
        date: new Date('2026-10-07'),
        description: 'Swiggy Instamart',
      });

      const res = await request(app)
        .post('/api/sms/import')
        .set('Authorization', authHeader)
        .send({
          expenses: [
            {
              amount: 500,
              categoryName: 'Groceries',
              date: '2026-10-07',
              description: 'Swiggy Instamart',
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(mockCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Groceries',
            userId: 1,
          })
        })
      );
    });
  });

  describe('POST /api/sms/auto-sync', () => {
    it('should auto-sync and import expenses for a span of days in one click', async () => {
      mockCategoryFindMany.mockResolvedValue([
        { id: 10, name: 'Food', color: '#10b981' }
      ]);
      mockExpenseCreate.mockResolvedValue({
        id: 201,
        userId: 1,
        categoryId: 10,
        amount: 349,
        date: new Date('2026-10-07'),
        description: 'Paid to Swiggy Instamart',
      });

      const res = await request(app)
        .post('/api/sms/auto-sync')
        .set('Authorization', authHeader)
        .send({
          daysSpan: 7,
          autoImport: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.daysSpan).toBe(7);
      expect(res.body.autoImported).toBe(true);
      expect(res.body.importedCount).toBeGreaterThan(0);
    });
  });
});
