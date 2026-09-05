import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { expenseSchema } from '../validators/expense.validator';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { month, categoryId, search, page = 1, limit = 50 } = req.query;
    
    let whereClause: any = { userId };

    if (month) {
      // month is expected to be 'YYYY-MM'
      const startDate = new Date(`${month}-01T00:00:00Z`);
      const nextMonth = new Date(startDate);
      nextMonth.setUTCMonth(startDate.getUTCMonth() + 1);
      
      whereClause.date = {
        gte: startDate,
        lt: nextMonth
      };
    }

    if (categoryId) {
      whereClause.categoryId = parseInt(categoryId as string);
    }

    if (search) {
      whereClause.description = {
        contains: search as string,
        mode: 'insensitive'
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: whereClause,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.expense.count({ where: whereClause })
    ]);

    return res.status(200).json({ 
      success: true, 
      data: {
        expenses,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      } 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const validatedData = expenseSchema.parse(req.body);

    // Ensure category belongs to user
    const category = await prisma.category.findFirst({
      where: { id: validatedData.categoryId, userId }
    });

    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    const expense = await prisma.expense.create({
      data: {
        userId,
        categoryId: validatedData.categoryId,
        amount: validatedData.amount,
        date: new Date(validatedData.date),
        description: validatedData.description
      },
      include: { category: true }
    });

    return res.status(201).json({ success: true, data: expense });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const expenseId = parseInt(req.params.id as string);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const expense = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const validatedData = expenseSchema.parse(req.body);

    const category = await prisma.category.findFirst({
      where: { id: validatedData.categoryId, userId }
    });

    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        categoryId: validatedData.categoryId,
        amount: validatedData.amount,
        date: new Date(validatedData.date),
        description: validatedData.description
      },
      include: { category: true }
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const expenseId = parseInt(req.params.id as string);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const expense = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    await prisma.expense.delete({ where: { id: expenseId } });

    return res.status(200).json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
