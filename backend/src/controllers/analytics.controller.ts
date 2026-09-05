import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { from, to } = req.query;

    let startDate: Date;
    let endDate: Date;

    if (from && to) {
      startDate = new Date(`${from}T00:00:00Z`);
      endDate = new Date(`${to}T23:59:59Z`);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    }

    const expenseAggregations = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    });

    const categoryIds = expenseAggregations.map(agg => agg.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } }
    });

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    let totalSpent = 0;
    const categoryTotals = expenseAggregations.map(agg => {
      const amount = Number(agg._sum.amount || 0);
      totalSpent += amount;
      const cat = categoryMap.get(agg.categoryId);
      
      return {
        id: cat?.id,
        name: cat?.name || 'Unknown',
        color: cat?.color || '#000000',
        spent: amount,
        percentage: 0 // Will calculate in next pass
      };
    });

    categoryTotals.forEach(cat => {
      cat.percentage = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
    });

    categoryTotals.sort((a, b) => b.spent - a.spent);

    return res.status(200).json({
      success: true,
      data: {
        totalSpent,
        categoryTotals
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
